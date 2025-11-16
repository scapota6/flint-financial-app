import { Router } from 'express';
import { db } from '../db';
import { snaptradeUsers } from '@shared/schema';
import { listAllSnapTradeUsers, deleteSnapTradeUser } from '../lib/snaptrade';
import { logger } from '@shared/logger';

const router = Router();

/**
 * GET /api/admin/snaptrade/audit
 * Audit all SnapTrade users and find orphaned ones
 * Admin only endpoint
 */
router.get('/snaptrade/audit', async (req: any, res) => {
  try {
    console.log('[SnapTrade Audit] Starting audit...');
    
    // Get all users from SnapTrade API
    const response = await listAllSnapTradeUsers();
    const snaptradeUserIds = response.data || [];
    
    // Get all users from Flint database
    const flintSnapUsers = await db.select().from(snaptradeUsers);
    const flintUserIds = new Set(flintSnapUsers.map(u => u.snaptradeUserId));
    
    // Find orphaned users (in SnapTrade but not in Flint)
    const orphanedUsers = snaptradeUserIds.filter((userId: string) => !flintUserIds.has(userId));
    
    // Find users in Flint but not in SnapTrade (already deleted)
    const deletedUsers = flintSnapUsers.filter(u => !snaptradeUserIds.includes(u.snaptradeUserId));
    
    const audit = {
      total_snaptrade_users: snaptradeUserIds.length,
      total_flint_users: flintSnapUsers.length,
      orphaned_users: orphanedUsers.length,
      orphaned_user_ids: orphanedUsers,
      deleted_from_snaptrade: deletedUsers.length,
      deleted_user_ids: deletedUsers.map(u => u.snaptradeUserId),
      billing_leak: orphanedUsers.length > 0 ? `⚠️ You're being charged for ${orphanedUsers.length} orphaned users!` : '✅ No billing leaks detected',
      recommendation: orphanedUsers.length > 0 ? 'Delete orphaned users to stop billing' : 'All users are properly linked'
    };
    
    console.log('[SnapTrade Audit] Results:', audit);
    logger.logMetric('snaptrade_audit_completed', audit);
    
    res.json(audit);
  } catch (error: any) {
    console.error('[SnapTrade Audit] Error:', error?.message || error);
    logger.error('SnapTrade audit failed', { error: error.message });
    res.status(500).json({
      error: 'Audit failed',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/snaptrade/cleanup-orphaned
 * Delete orphaned SnapTrade users that aren't linked to any Flint user
 * Admin only endpoint
 */
router.post('/snaptrade/cleanup-orphaned', async (req: any, res) => {
  try {
    console.log('[SnapTrade Cleanup] Starting cleanup of orphaned users...');
    
    // Get all users from SnapTrade API
    const response = await listAllSnapTradeUsers();
    const snaptradeUserIds = response.data || [];
    
    // Get all users from Flint database
    const flintSnapUsers = await db.select().from(snaptradeUsers);
    const flintUserIds = new Set(flintSnapUsers.map(u => u.snaptradeUserId));
    
    // Find orphaned users
    const orphanedUsers = snaptradeUserIds.filter((userId: string) => !flintUserIds.has(userId));
    
    if (orphanedUsers.length === 0) {
      console.log('[SnapTrade Cleanup] No orphaned users found');
      return res.json({
        message: '✅ No orphaned users to clean up',
        deleted: 0,
        orphaned_users: []
      });
    }
    
    // Delete each orphaned user
    const deleteResults = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const userId of orphanedUsers) {
      try {
        await deleteSnapTradeUser(userId);
        console.log(`[SnapTrade Cleanup] ✅ Deleted orphaned user: ${userId}`);
        deleteResults.push({ userId, status: 'deleted' });
        successCount++;
      } catch (error: any) {
        console.error(`[SnapTrade Cleanup] ❌ Failed to delete user ${userId}:`, error?.message);
        deleteResults.push({ userId, status: 'failed', error: error?.message });
        failureCount++;
      }
    }
    
    const result = {
      message: `Cleanup complete: ${successCount} deleted, ${failureCount} failed`,
      total_orphaned: orphanedUsers.length,
      deleted: successCount,
      failed: failureCount,
      results: deleteResults
    };
    
    console.log('[SnapTrade Cleanup] Results:', result);
    logger.logMetric('snaptrade_cleanup_completed', result);
    
    res.json(result);
  } catch (error: any) {
    console.error('[SnapTrade Cleanup] Error:', error?.message || error);
    logger.error('SnapTrade cleanup failed', { error: error.message });
    res.status(500).json({
      error: 'Cleanup failed',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;
