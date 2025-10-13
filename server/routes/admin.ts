import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';
import { isAdmin } from '../middleware/rbac';
import { hashPassword, validatePasswordStrength } from '../lib/password-utils';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { emailService } from '../services/email';

const router = Router();

const setPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

router.post('/users/:userId/password', isAuthenticated, isAdmin(), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const parseResult = setPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { password } = parseResult.data;

    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: validation.errors,
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error setting user password:', error);
    return res.status(500).json({
      message: 'Failed to set user password',
    });
  }
});

const testEmailSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  recipientName: z.string().min(1, 'Recipient name is required'),
});

router.post('/test-email', isAuthenticated, isAdmin(), async (req, res) => {
  try {
    const parseResult = testEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { recipientEmail, recipientName } = parseResult.data;

    const result = await emailService.sendTestEmail(recipientEmail, recipientName);

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to send test email',
        error: result.error,
      });
    }

    return res.status(200).json({
      message: 'Test email sent successfully',
      recipient: recipientEmail,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      message: 'Failed to send test email',
    });
  }
});

export default router;
