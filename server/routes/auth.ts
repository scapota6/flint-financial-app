import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { validatePassword } from '../lib/password-validation';
import { 
  hashPassword, 
  generateRecoveryCodes, 
  hashRecoveryCodes,
  updatePasswordHistory,
  isPasswordReused 
} from '../lib/argon2-utils';
import { hashToken, verifyToken, generateSecureToken } from '../lib/token-utils';
import { sendPasswordResetEmail, sendApprovalEmail } from '../services/email';

const router = Router();

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

const requestResetSchema = z.object({
  email: z.string().email('Valid email is required'),
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

    // Find all non-expired, unused tokens and verify against our hash
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

    // Check if token has already been used
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

    // Hardened password validation (12-128 chars, 3 of 4 classes, common passwords, etc.)
    const validation = validatePassword(password, user.email || undefined);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: validation.errors,
      });
    }

    // Check password history to prevent reuse
    if (user.lastPasswordHashes && user.lastPasswordHashes.length > 0) {
      const isReused = await isPasswordReused(password, user.lastPasswordHashes);
      if (isReused) {
        return res.status(400).json({
          message: 'Password has been used recently. Please choose a different password.',
          errors: ['This password has been used recently'],
        });
      }
    }

    // Hash password using Argon2id
    const passwordHash = await hashPassword(password);

    // Generate recovery codes (8 codes)
    const plainRecoveryCodes = generateRecoveryCodes(8);
    const hashedRecoveryCodes = await hashRecoveryCodes(plainRecoveryCodes);

    // Update password history
    const updatedPasswordHistory = updatePasswordHistory(
      passwordHash, 
      user.lastPasswordHashes || [], 
      5
    );

    // Update user password and recovery codes in a transaction
    await db.transaction(async (tx) => {
      // Update user with new password, recovery codes, and mark email as verified
      await tx
        .update(users)
        .set({
          passwordHash,
          recoveryCodes: hashedRecoveryCodes,
          lastPasswordHashes: updatedPasswordHistory,
          emailVerified: true,
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
      recoveryCodes: plainRecoveryCodes, // Send plain codes to user once
    });
  } catch (error) {
    console.error('Error setting up password:', error);
    return res.status(500).json({
      message: 'Failed to set up password',
    });
  }
});

// POST /api/auth/request-reset - Request password reset
router.post('/request-reset', async (req, res) => {
  try {
    const parseResult = requestResetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Valid email is required',
      });
    }

    const { email } = parseResult.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Check if user has been set up (has a password or has been given a setup token)
    // This prevents unapproved users from requesting resets
    const existingToken = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id))
      .limit(1);
    
    if (!user.passwordHash && existingToken.length === 0) {
      // User hasn't been approved/set up yet
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate password reset token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      expiresAt,
      used: false,
    });

    // Build reset link
    const baseUrl = process.env.BASE_URL 
      || (process.env.REPL_SLUG && process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : req.protocol + '://' + req.get('host'));
    const resetLink = `${baseUrl}/setup-password?token=${plainToken}`;

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email || '',
      user.firstName || 'User',
      resetLink
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    return res.status(200).json({
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return res.status(500).json({
      message: 'Failed to process password reset request',
    });
  }
});

// POST /api/auth/resend-setup-email - Resend password setup email
router.post('/resend-setup-email', async (req, res) => {
  try {
    const parseResult = requestResetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Valid email is required',
      });
    }

    const { email } = parseResult.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address.',
      });
    }

    // Check if user already has a password set
    if (user.passwordHash) {
      return res.status(400).json({
        message: 'Your account is already set up. Please use the login page or request a password reset.',
      });
    }

    // Delete any existing unused tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.used, false)
      ));

    // Generate new password setup token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      expiresAt,
      used: false,
    });

    // Generate password setup link
    const baseUrl = process.env.REPLIT_DEPLOYMENT 
      ? `https://${process.env.REPLIT_DEPLOYMENT}` 
      : process.env.BASE_URL 
      || (process.env.REPL_SLUG && process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : req.protocol + '://' + req.get('host'));
    const passwordSetupLink = `${baseUrl}/setup-password?token=${plainToken}`;

    // Send approval email with password setup link
    await sendApprovalEmail(
      user.email || '',
      user.firstName || 'User',
      passwordSetupLink
    );

    return res.status(200).json({
      success: true,
      message: 'Setup email has been resent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending setup email:', error);
    return res.status(500).json({
      message: 'Failed to resend setup email. Please try again.',
    });
  }
});

export default router;
