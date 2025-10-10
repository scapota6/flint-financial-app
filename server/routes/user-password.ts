import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password-utils';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

router.post('/change-password', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.passwordHash) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          message: 'Current password is incorrect',
        });
      }
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'New password does not meet requirements',
        errors: validation.errors,
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      message: 'Failed to change password',
    });
  }
});

export default router;
