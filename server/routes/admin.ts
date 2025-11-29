import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/jwt-auth';
import { isAdmin } from '../middleware/rbac';
import { hashPassword, validatePasswordStrength } from '../lib/password-utils';
import { db } from '../db';
import { users, snaptradeConnections, snaptradeAccounts, snaptradePositions, snaptradeBalances, snaptradeOrders, snaptradeActivities, snaptradeOptionHoldings, connectedAccounts, snaptradeUsers } from '@shared/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { emailService } from '../services/email';
import { logger } from '@shared/logger';
import { listAllSnapTradeUsers, authApi } from '../lib/snaptrade';

const router = Router();

const setPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

router.post('/users/:userId/password', requireAuth, isAdmin(), async (req, res) => {
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

const updateSnapTradeEnvironmentSchema = z.object({
  snaptradeEnvironment: z.enum(['development', 'production']),
});

router.patch('/users/:userId/snaptrade-environment', requireAuth, isAdmin(), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const parseResult = updateSnapTradeEnvironmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { snaptradeEnvironment } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db
      .update(users)
      .set({ 
        snaptradeEnvironment,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.status(200).json({
      message: 'SnapTrade environment updated successfully',
      userId,
      snaptradeEnvironment,
    });
  } catch (error) {
    console.error('Error updating SnapTrade environment:', error);
    return res.status(500).json({
      message: 'Failed to update SnapTrade environment',
    });
  }
});

const testEmailSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  recipientName: z.string().min(1, 'Recipient name is required'),
});

router.post('/test-email', requireAuth, isAdmin(), async (req, res) => {
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

/**
 * GET /api/admin/snaptrade/orphaned-users
 * List all SnapTrade users that exist in SnapTrade but not in our database
 * These are "orphaned" users that should be cleaned up
 */
router.get('/snaptrade/orphaned-users', requireAuth, isAdmin(), async (req, res) => {
  try {
    console.log('[Admin] Listing orphaned SnapTrade users...');
    
    // Get all users from SnapTrade API
    const snaptradeResponse = await listAllSnapTradeUsers();
    const snaptradeUserIds: string[] = snaptradeResponse.data || [];
    
    // Get all users from our database
    const dbSnaptradeUsers = await db
      .select({ snaptradeUserId: snaptradeUsers.snaptradeUserId, flintUserId: snaptradeUsers.flintUserId })
      .from(snaptradeUsers);
    
    const dbUserIds = new Set(dbSnaptradeUsers.map(u => u.snaptradeUserId));
    const flintUserIds = new Set(dbSnaptradeUsers.map(u => u.flintUserId));
    
    // Find orphaned users (in SnapTrade but not in our DB)
    const orphanedUserIds = snaptradeUserIds.filter(id => !dbUserIds.has(id) && !flintUserIds.has(id));
    
    console.log(`[Admin] Found ${orphanedUserIds.length} orphaned SnapTrade users out of ${snaptradeUserIds.length} total`);
    
    return res.status(200).json({
      totalSnaptradeUsers: snaptradeUserIds.length,
      totalDbUsers: dbSnaptradeUsers.length,
      orphanedCount: orphanedUserIds.length,
      orphanedUserIds,
      allSnaptradeUserIds: snaptradeUserIds,
    });
  } catch (error: any) {
    console.error('[Admin] Error listing orphaned SnapTrade users:', error);
    return res.status(500).json({
      message: 'Failed to list orphaned SnapTrade users',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/snaptrade/users/:snaptradeUserId
 * Delete a specific user from SnapTrade API (does NOT require user secret)
 */
router.delete('/snaptrade/users/:snaptradeUserId', requireAuth, isAdmin(), async (req, res) => {
  try {
    const { snaptradeUserId } = req.params;
    
    console.log(`[Admin] Deleting SnapTrade user: ${snaptradeUserId}`);
    
    // Delete from SnapTrade API
    await authApi.deleteSnapTradeUser({ userId: snaptradeUserId });
    
    // Also clean up any database records if they exist
    await db.delete(snaptradeUsers).where(eq(snaptradeUsers.snaptradeUserId, snaptradeUserId));
    await db.delete(snaptradeUsers).where(eq(snaptradeUsers.flintUserId, snaptradeUserId));
    
    logger.info('[Admin] SnapTrade user deleted from API', {
      metadata: {
        snaptradeUserId,
        adminUser: (req as any).user?.claims?.email || 'unknown',
      }
    });
    
    return res.status(200).json({
      message: 'SnapTrade user deleted successfully',
      snaptradeUserId,
    });
  } catch (error: any) {
    console.error('[Admin] Error deleting SnapTrade user:', error);
    return res.status(500).json({
      message: 'Failed to delete SnapTrade user',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/snaptrade/cleanup-orphaned
 * Delete ALL orphaned SnapTrade users (users in SnapTrade but not in our database)
 */
router.post('/snaptrade/cleanup-orphaned', requireAuth, isAdmin(), async (req, res) => {
  try {
    console.log('[Admin] Starting cleanup of orphaned SnapTrade users...');
    
    // Get all users from SnapTrade API
    const snaptradeResponse = await listAllSnapTradeUsers();
    const snaptradeUserIds: string[] = snaptradeResponse.data || [];
    
    // Get all users from our database
    const dbSnaptradeUsers = await db
      .select({ snaptradeUserId: snaptradeUsers.snaptradeUserId, flintUserId: snaptradeUsers.flintUserId })
      .from(snaptradeUsers);
    
    const dbUserIds = new Set(dbSnaptradeUsers.map(u => u.snaptradeUserId));
    const flintUserIds = new Set(dbSnaptradeUsers.map(u => u.flintUserId));
    
    // Find orphaned users
    const orphanedUserIds = snaptradeUserIds.filter(id => !dbUserIds.has(id) && !flintUserIds.has(id));
    
    console.log(`[Admin] Found ${orphanedUserIds.length} orphaned users to delete`);
    
    const results: { userId: string; success: boolean; error?: string }[] = [];
    
    for (const userId of orphanedUserIds) {
      try {
        await authApi.deleteSnapTradeUser({ userId });
        results.push({ userId, success: true });
        console.log(`[Admin] Deleted orphaned user: ${userId}`);
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
        console.error(`[Admin] Failed to delete orphaned user ${userId}:`, error.message);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    logger.info('[Admin] Orphaned SnapTrade cleanup completed', {
      metadata: {
        totalOrphaned: orphanedUserIds.length,
        successCount,
        failCount,
        adminUser: (req as any).user?.claims?.email || 'unknown',
      }
    });
    
    return res.status(200).json({
      message: 'Orphaned SnapTrade users cleanup completed',
      totalOrphaned: orphanedUserIds.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('[Admin] Error cleaning up orphaned SnapTrade users:', error);
    return res.status(500).json({
      message: 'Failed to cleanup orphaned SnapTrade users',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/users/:userId/cleanup-snaptrade
 * Manually trigger cleanup of orphaned SnapTrade data for a specific user
 * This removes all SnapTrade connections, accounts, positions, etc. and cleans up connected_accounts
 */
router.post('/users/:userId/cleanup-snaptrade', requireAuth, isAdmin(), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`[Admin] Starting SnapTrade cleanup for user: ${user.email} (${userId})`);
    
    // Find all connections for this user
    const connections = await db
      .select()
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.flintUserId, userId));
    
    if (connections.length === 0) {
      return res.status(200).json({
        message: 'No SnapTrade connections found for user',
        userId,
        deletedConnections: 0,
        deletedAccounts: 0,
      });
    }
    
    let totalAccountsDeleted = 0;
    
    // Use transaction for atomic cleanup
    await db.transaction(async (tx) => {
      for (const connection of connections) {
        // Find all accounts for this connection
        const accounts = await tx
          .select()
          .from(snaptradeAccounts)
          .where(eq(snaptradeAccounts.connectionId, connection.id));
        
        const accountIds = accounts.map(acc => acc.id);
        totalAccountsDeleted += accountIds.length;
        
        if (accountIds.length > 0) {
          // Delete all child records
          await tx.delete(snaptradeBalances).where(inArray(snaptradeBalances.accountId, accountIds));
          await tx.delete(snaptradePositions).where(inArray(snaptradePositions.accountId, accountIds));
          await tx.delete(snaptradeOrders).where(inArray(snaptradeOrders.accountId, accountIds));
          await tx.delete(snaptradeActivities).where(inArray(snaptradeActivities.accountId, accountIds));
          await tx.delete(snaptradeOptionHoldings).where(inArray(snaptradeOptionHoldings.accountId, accountIds));
          
          // Delete accounts
          await tx.delete(snaptradeAccounts).where(inArray(snaptradeAccounts.id, accountIds));
          
          // Clean up connected_accounts table
          for (const accountId of accountIds) {
            await tx.delete(connectedAccounts).where(
              and(
                eq(connectedAccounts.userId, userId),
                eq(connectedAccounts.provider, 'snaptrade'),
                eq(connectedAccounts.externalAccountId, accountId)
              )
            );
          }
        }
        
        // Delete the connection
        await tx.delete(snaptradeConnections).where(eq(snaptradeConnections.id, connection.id));
      }
    });
    
    logger.info('[Admin] SnapTrade cleanup completed', {
      metadata: {
        userId,
        userEmail: user.email,
        deletedConnections: connections.length,
        deletedAccounts: totalAccountsDeleted,
        adminUser: (req as any).user?.claims?.email || 'unknown',
      }
    });
    
    logger.logMetric('admin_snaptrade_cleanup', {
      user_id: userId,
      connections_deleted: connections.length,
      accounts_deleted: totalAccountsDeleted,
    });
    
    return res.status(200).json({
      message: 'SnapTrade cleanup completed successfully',
      userId,
      userEmail: user.email,
      deletedConnections: connections.length,
      deletedAccounts: totalAccountsDeleted,
    });
  } catch (error: any) {
    console.error('[Admin] Error during SnapTrade cleanup:', error);
    logger.error('[Admin] SnapTrade cleanup failed', {
      metadata: {
        error: error.message,
        stack: error.stack,
      }
    });
    return res.status(500).json({
      message: 'Failed to cleanup SnapTrade data',
      error: error.message,
    });
  }
});

export default router;
