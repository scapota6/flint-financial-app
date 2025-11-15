/**
 * Automatic Orphaned Connection Detection & Cleanup Service
 * 
 * This service runs periodically to detect and clean up:
 * 1. Orphaned SnapTrade connections (connections without parent users)
 * 2. Orphaned SnapTrade users (users without any connections)
 * 3. Stale connections (not synced in 30+ days, likely broken)
 * 
 * Runs every 6 hours to keep the database clean and prevent connection issues.
 */

import { CronJob } from 'cron';
import { db } from '../db';
import { snaptradeConnections, snaptradeUsers, snaptradeAccounts, snaptradeBalances, snaptradePositions, snaptradeOrders, snaptradeActivities, snaptradeOptionHoldings, users } from '@shared/schema';
import { eq, sql, inArray, lt } from 'drizzle-orm';
import { logger } from '@shared/logger';

interface OrphanedConnection {
  id: number;
  flintUserId: string;
  brokerageAuthorizationId: string;
  brokerageName: string;
  userEmail: string | null;
}

interface OrphanedUser {
  flintUserId: string;
  snaptradeUserId: string;
  userEmail: string | null;
}

interface StaleConnection {
  id: number;
  flintUserId: string;
  brokerageAuthorizationId: string;
  brokerageName: string;
  lastSyncAt: Date | null;
  daysSinceSync: number;
}

/**
 * Find connections that don't have a corresponding SnapTrade user record
 */
async function findOrphanedConnections(): Promise<OrphanedConnection[]> {
  try {
    const orphaned = await db
      .select({
        id: snaptradeConnections.id,
        flintUserId: snaptradeConnections.flintUserId,
        brokerageAuthorizationId: snaptradeConnections.brokerageAuthorizationId,
        brokerageName: snaptradeConnections.brokerageName,
        userEmail: users.email,
      })
      .from(snaptradeConnections)
      .leftJoin(users, eq(users.id, snaptradeConnections.flintUserId))
      .leftJoin(snaptradeUsers, eq(snaptradeUsers.flintUserId, snaptradeConnections.flintUserId))
      .where(sql`${snaptradeUsers.flintUserId} IS NULL`);

    return orphaned.map(c => ({
      id: c.id,
      flintUserId: c.flintUserId,
      brokerageAuthorizationId: c.brokerageAuthorizationId,
      brokerageName: c.brokerageName,
      userEmail: c.userEmail,
    }));
  } catch (error: any) {
    logger.error('Error finding orphaned connections', { error: error.message });
    return [];
  }
}

/**
 * Find SnapTrade users that are truly orphaned:
 * - The Flint user no longer exists in the users table (deleted account)
 * 
 * NOTE: We do NOT delete SnapTrade users just because they have no connections,
 * as users may temporarily disconnect all accounts or be setting up new connections.
 */
async function findOrphanedUsers(): Promise<OrphanedUser[]> {
  try {
    const orphaned = await db
      .select({
        flintUserId: snaptradeUsers.flintUserId,
        snaptradeUserId: snaptradeUsers.snaptradeUserId,
        userEmail: users.email,
      })
      .from(snaptradeUsers)
      .leftJoin(users, eq(users.id, snaptradeUsers.flintUserId))
      .where(sql`${users.id} IS NULL`); // Only find users where Flint user doesn't exist

    return orphaned.map(u => ({
      flintUserId: u.flintUserId,
      snaptradeUserId: u.snaptradeUserId,
      userEmail: u.userEmail,
    }));
  } catch (error: any) {
    logger.error('Error finding orphaned users', { error: error.message });
    return [];
  }
}

/**
 * Find connections that haven't synced in 30+ days (likely broken)
 */
async function findStaleConnections(): Promise<StaleConnection[]> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const stale = await db
      .select({
        id: snaptradeConnections.id,
        flintUserId: snaptradeConnections.flintUserId,
        brokerageAuthorizationId: snaptradeConnections.brokerageAuthorizationId,
        brokerageName: snaptradeConnections.brokerageName,
        lastSyncAt: snaptradeConnections.lastSyncAt,
      })
      .from(snaptradeConnections)
      .where(
        sql`${snaptradeConnections.lastSyncAt} < ${thirtyDaysAgo} OR ${snaptradeConnections.lastSyncAt} IS NULL`
      );

    return stale.map(c => {
      const daysSinceSync = c.lastSyncAt 
        ? Math.floor((Date.now() - c.lastSyncAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      return {
        id: c.id,
        flintUserId: c.flintUserId,
        brokerageAuthorizationId: c.brokerageAuthorizationId,
        brokerageName: c.brokerageName,
        lastSyncAt: c.lastSyncAt,
        daysSinceSync,
      };
    });
  } catch (error: any) {
    logger.error('Error finding stale connections', { error: error.message });
    return [];
  }
}

/**
 * Delete a connection and all its child records (cascading delete)
 */
async function deleteConnection(connectionId: number, reason: string): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      // Step 1: Find all accounts for this connection
      const accounts = await tx
        .select()
        .from(snaptradeAccounts)
        .where(eq(snaptradeAccounts.connectionId, connectionId));
      
      const accountIds = accounts.map(acc => acc.id);
      
      if (accountIds.length > 0) {
        // Step 2: Delete all child records SEQUENTIALLY to maintain transaction integrity
        // IMPORTANT: Do NOT use Promise.all inside a Drizzle transaction
        await tx.delete(snaptradeBalances).where(inArray(snaptradeBalances.accountId, accountIds));
        await tx.delete(snaptradePositions).where(inArray(snaptradePositions.accountId, accountIds));
        await tx.delete(snaptradeOrders).where(inArray(snaptradeOrders.accountId, accountIds));
        await tx.delete(snaptradeActivities).where(inArray(snaptradeActivities.accountId, accountIds));
        await tx.delete(snaptradeOptionHoldings).where(inArray(snaptradeOptionHoldings.accountId, accountIds));
        
        // Step 3: Delete all accounts
        await tx.delete(snaptradeAccounts).where(inArray(snaptradeAccounts.id, accountIds));
      }
      
      // Step 4: Delete the connection itself
      await tx.delete(snaptradeConnections).where(eq(snaptradeConnections.id, connectionId));
    });

    logger.logMetric('connection_cleanup_success', { reason, connection_id: connectionId });
    return true;
  } catch (error: any) {
    // Preserve full error details for debugging
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    };
    
    logger.error('Error deleting connection', { 
      metadata: { 
        connectionId, 
        reason, 
        error: errorDetails
      } 
    });
    
    logger.logMetric('connection_cleanup_failed', { 
      reason, 
      connection_id: connectionId, 
      error_message: errorDetails.message,
      error_code: errorDetails.code || 'unknown',
      error_name: errorDetails.name || 'Error'
    });
    
    return false;
  }
}

/**
 * Delete an orphaned SnapTrade user
 */
async function deleteOrphanedUser(flintUserId: string): Promise<boolean> {
  try {
    await db.delete(snaptradeUsers).where(eq(snaptradeUsers.flintUserId, flintUserId));
    logger.logMetric('connection_cleanup_success', { reason: 'orphaned_user', flint_user_id: flintUserId });
    return true;
  } catch (error: any) {
    // Preserve full error details for debugging
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    };
    
    logger.error('Error deleting orphaned user', { 
      metadata: { 
        flintUserId, 
        error: errorDetails
      } 
    });
    
    logger.logMetric('connection_cleanup_failed', { 
      reason: 'orphaned_user', 
      flint_user_id: flintUserId, 
      error_message: errorDetails.message,
      error_code: errorDetails.code || 'unknown',
      error_name: errorDetails.name || 'Error'
    });
    
    return false;
  }
}

/**
 * Main cleanup function - runs the entire detection and cleanup process
 */
async function runCleanup(): Promise<void> {
  const startTime = Date.now();
  console.log('\n🧹 [Orphaned Connections Cleanup] Starting automated cleanup...');
  
  try {
    // 1. Find and clean orphaned connections
    const orphanedConnections = await findOrphanedConnections();
    console.log(`[Orphaned Connections Cleanup] Found ${orphanedConnections.length} orphaned connections`);
    
    let connectionsDeleted = 0;
    let connectionsFailed = 0;
    for (const conn of orphanedConnections) {
      // Log detection metric IMMEDIATELY when orphan is found (before deletion attempt)
      logger.logMetric('connection_orphaned', {
        brokerage_name: conn.brokerageName,
        user_id: conn.flintUserId,
        authorization_id: conn.brokerageAuthorizationId
      });
      
      console.log(`[Orphaned Connections Cleanup] Deleting orphaned connection: ${conn.brokerageName} (${conn.userEmail || conn.flintUserId})`);
      const deleted = await deleteConnection(conn.id, 'orphaned_connection');
      if (deleted) {
        connectionsDeleted++;
      } else {
        connectionsFailed++;
        // High-severity error for failed deletion - requires manual intervention
        logger.error('CRITICAL: Orphaned connection cleanup failed', {
          metadata: {
            severity: 'HIGH',
            brokerageName: conn.brokerageName,
            userId: conn.flintUserId,
            authorizationId: conn.brokerageAuthorizationId,
            connectionId: conn.id,
            action_required: 'Manual cleanup may be needed'
          }
        });
      }
    }
    
    // 2. Find and clean orphaned users
    const orphanedUsers = await findOrphanedUsers();
    console.log(`[Orphaned Connections Cleanup] Found ${orphanedUsers.length} orphaned users`);
    
    let usersDeleted = 0;
    let usersFailed = 0;
    for (const user of orphanedUsers) {
      console.log(`[Orphaned Connections Cleanup] Deleting orphaned user: ${user.userEmail || user.flintUserId}`);
      const deleted = await deleteOrphanedUser(user.flintUserId);
      if (deleted) {
        usersDeleted++;
      } else {
        usersFailed++;
        // High-severity error for failed deletion
        logger.error('CRITICAL: Orphaned user cleanup failed', {
          metadata: {
            severity: 'HIGH',
            userId: user.flintUserId,
            userEmail: user.userEmail,
            action_required: 'Manual cleanup may be needed'
          }
        });
      }
    }
    
    // 3. Find stale connections (report only, don't auto-delete yet)
    const staleConnections = await findStaleConnections();
    console.log(`[Orphaned Connections Cleanup] Found ${staleConnections.length} stale connections (30+ days since sync)`);
    
    if (staleConnections.length > 0) {
      // Log stale connections for monitoring
      for (const conn of staleConnections) {
        logger.info('Stale connection detected', {
          metadata: {
            brokerageName: conn.brokerageName,
            flintUserId: conn.flintUserId,
            daysSinceSync: conn.daysSinceSync,
            authorizationId: conn.brokerageAuthorizationId
          }
        });
      }
    }
    
    const duration = Date.now() - startTime;
    const totalFailures = connectionsFailed + usersFailed;
    const hadFailures = totalFailures > 0;
    
    // Summary log
    console.log(`[Orphaned Connections Cleanup] Cleanup complete in ${duration}ms:`);
    console.log(`  - Orphaned connections deleted: ${connectionsDeleted}`);
    console.log(`  - Orphaned connections FAILED: ${connectionsFailed}`);
    console.log(`  - Orphaned users deleted: ${usersDeleted}`);
    console.log(`  - Orphaned users FAILED: ${usersFailed}`);
    console.log(`  - Stale connections detected: ${staleConnections.length}`);
    
    if (hadFailures) {
      const errorMsg = `[Orphaned Connections Cleanup] ⚠️  CLEANUP HAD ${totalFailures} FAILURES - Manual intervention may be required`;
      console.error(errorMsg);
      
      // High-severity alert for monitoring systems
      logger.error('ALERT: Orphaned cleanup completed with failures', {
        metadata: {
          severity: 'HIGH',
          alert_type: 'ORPHANED_CLEANUP_FAILURES',
          total_failures: totalFailures,
          connections_failed: connectionsFailed,
          users_failed: usersFailed,
          action_required: 'Review failed deletions and clean up manually or wait for retry',
          monitoring_note: 'Set up Better Stack alert on this message'
        }
      });
    }
    
    // Log metrics for VC dashboard with success/failure status
    logger.logMetric('orphaned_cleanup_completed', {
      duration_ms: duration,
      success: !hadFailures,
      connections_deleted: connectionsDeleted,
      connections_failed: connectionsFailed,
      users_deleted: usersDeleted,
      users_failed: usersFailed,
      stale_connections: staleConnections.length,
      total_failures: totalFailures
    });
    
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    };
    
    console.error('[Orphaned Connections Cleanup] CRITICAL: Cleanup orchestration failed:', errorDetails);
    
    // Critical error - entire cleanup run failed
    logger.error('CRITICAL: Orphaned cleanup orchestration failed', { 
      metadata: { 
        severity: 'CRITICAL',
        error: errorDetails,
        alert_type: 'ORPHANED_CLEANUP_CRASHED',
        action_required: 'Investigate cleanup service failure immediately'
      } 
    });
    
    // Log failed run metric
    logger.logMetric('orphaned_cleanup_completed', {
      duration_ms: Date.now() - startTime,
      success: false,
      connections_deleted: 0,
      connections_failed: 0,
      users_deleted: 0,
      users_failed: 0,
      stale_connections: 0,
      total_failures: 1,
      orchestration_error: errorDetails.message
    });
  }
}

/**
 * Initialize the cleanup service with cron schedule
 */
export function startOrphanedConnectionsCleanup(): void {
  // Run every 6 hours: 0 */6 * * *
  const job = new CronJob('0 */6 * * *', async () => {
    await runCleanup();
  });
  
  job.start();
  console.log('[Orphaned Connections Cleanup] Service started - runs every 6 hours');
  
  // Run initial cleanup after 5 minutes (to allow server to fully start)
  setTimeout(() => {
    console.log('[Orphaned Connections Cleanup] Running initial cleanup...');
    runCleanup().catch(error => {
      console.error('[Orphaned Connections Cleanup] Initial cleanup failed:', error);
    });
  }, 5 * 60 * 1000);
}

// Export for manual execution if needed
export { runCleanup };
