import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Triple-layer admin access control middleware
 * 1. Checks authentication
 * 2. Verifies email is scapota@flint-investing.com
 * 3. Confirms isAdmin flag in database
 */
export function requireAdmin() {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Layer 1: Check authentication
      if (!req.user || !req.user.claims) {
        return res.status(401).json({ 
          code: 'UNAUTHORIZED',
          message: 'Authentication required' 
        });
      }

      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email?.toLowerCase();

      // Layer 2: Verify email is admin email
      const ADMIN_EMAIL = 'scapota@flint-investing.com';
      if (userEmail !== ADMIN_EMAIL) {
        console.warn(`[ADMIN ACCESS DENIED] User ${userEmail} attempted to access admin area`);
        return res.status(403).json({ 
          code: 'FORBIDDEN',
          message: 'Access denied: Admin privileges required' 
        });
      }

      // Layer 3: Verify isAdmin flag in database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ 
          code: 'USER_NOT_FOUND',
          message: 'User not found' 
        });
      }

      if (!user.isAdmin) {
        console.warn(`[ADMIN ACCESS DENIED] User ${userEmail} has correct email but isAdmin=false`);
        return res.status(403).json({ 
          code: 'FORBIDDEN',
          message: 'Access denied: Admin flag not set' 
        });
      }

      // All checks passed - attach admin info to request
      req.adminEmail = userEmail;
      req.adminUserId = userId;
      
      console.log(`[ADMIN ACCESS GRANTED] ${userEmail} accessed admin area`);
      next();
    } catch (error) {
      console.error('[ADMIN MIDDLEWARE ERROR]', error);
      res.status(500).json({ 
        code: 'SERVER_ERROR',
        message: 'Admin authorization check failed' 
      });
    }
  };
}

/**
 * Helper function to log admin actions to audit log
 */
export async function logAdminAction(
  adminEmail: string,
  action: string,
  details?: any,
  targetUserId?: string
) {
  try {
    const { auditLogs } = await import('@shared/schema');
    await db.insert(auditLogs).values({
      adminEmail,
      action,
      details: details ? details : undefined,
      targetUserId: targetUserId || undefined,
    });
    console.log(`[AUDIT LOG] ${adminEmail} - ${action}`, details || '');
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error);
    // Don't fail the request if audit logging fails
  }
}
