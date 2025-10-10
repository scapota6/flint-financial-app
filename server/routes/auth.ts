import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword, validatePasswordStrength } from '../lib/password-utils';
import { hashToken, verifyToken } from '../lib/token-utils';

const router = Router();

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/setup-password - Set up password for approved user
router.post('/setup-password', async (req, res) => {
  try {
    const parseResult = setupPasswordSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { token, password } = parseResult.data;

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: validation.errors,
      });
    }

    // Hash the plain token from the user to compare with stored hash
    const tokenHash = hashToken(token);

    // Find all non-expired, unused tokens and verify against our hash
    // We need to get all tokens because we can't query by hash directly
    const allTokens = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.used, false));

    // Find matching token using timing-safe comparison
    let resetToken = null;
    for (const dbToken of allTokens) {
      if (verifyToken(token, dbToken.token)) {
        resetToken = dbToken;
        break;
      }
    }

    if (!resetToken) {
      return res.status(400).json({
        message: 'Invalid or expired token',
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        message: 'Token has expired',
      });
    }

    // Check if token has already been used (double-check)
    if (resetToken.used) {
      return res.status(400).json({
        message: 'Token has already been used',
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId));

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update user password and mark token as used in a transaction
    await db.transaction(async (tx) => {
      // Update user password
      await tx
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({
          used: true,
        })
        .where(eq(passwordResetTokens.id, resetToken.id));
    });

    return res.status(200).json({
      message: 'Password set successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error setting up password:', error);
    return res.status(500).json({
      message: 'Failed to set up password',
    });
  }
});

export default router;
