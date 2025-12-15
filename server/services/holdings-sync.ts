/**
 * Background Holdings Sync Service
 * 
 * This service runs periodically as a backup to refresh holdings/positions data from SnapTrade
 * for all connected brokerage accounts. Primary updates come via SnapTrade webhooks (real-time).
 * 
 * Runs every 15 minutes as a safety net for missed webhooks or stale data.
 * This reduced frequency prevents triggering brokerage security systems (e.g., Schwab 2FA).
 */

import { CronJob } from 'cron';
import { storage } from '../storage';
import { logger } from '@shared/logger';
import { getPositions } from '../lib/snaptrade';
import { db } from '../db';
import { snaptradePositions, snaptradeAccounts, connectedAccounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface SyncResult {
  accountId: string;
  success: boolean;
  positionsCount?: number;
  error?: string;
}

/**
 * Sync holdings for a single account
 * Exported for use by webhook handlers to immediately refresh data
 */
export async function syncAccountHoldings(
  userId: string,
  userSecret: string,
  accountId: string
): Promise<SyncResult> {
  try {
    // CRITICAL: First check if the account still exists in our database
    // This prevents FK constraint errors when syncing orphaned/disconnected accounts
    const [existingAccount] = await db
      .select()
      .from(snaptradeAccounts)
      .where(eq(snaptradeAccounts.id, accountId))
      .limit(1);
    
    if (!existingAccount) {
      logger.warn('[Holdings Sync] Account not found in database - skipping sync (may be disconnected)', { 
        metadata: { accountId } 
      });
      
      // Clean up any orphaned positions that might still exist
      await db.delete(snaptradePositions).where(eq(snaptradePositions.accountId, accountId));
      
      return {
        accountId,
        success: true,
        positionsCount: 0,
        error: 'Account not found - may be disconnected'
      };
    }
    
    // Fetch fresh positions from SnapTrade
    const positionsData = await getPositions(userId, userSecret, accountId);
    const positions = positionsData?.[0]?.positions || [];
    
    if (positions.length === 0) {
      logger.info('No positions found for account', { metadata: { accountId } });
      return {
        accountId,
        success: true,
        positionsCount: 0
      };
    }
    
    // Update positions in database
    // Delete existing positions
    await db.delete(snaptradePositions).where(eq(snaptradePositions.accountId, accountId));
    
    // Insert fresh positions
    const positionsToInsert = positions.map((pos: any) => {
      const symbol = pos.symbol?.symbol?.symbol || pos.symbol?.symbol || '';
      const price = pos.price || 0;
      const units = pos.units || pos.fractional_units || 0;
      const averagePurchasePrice = pos.average_purchase_price || 0;
      const currency = pos.currency?.code || pos.symbol?.currency?.code || 'USD';
      
      return {
        accountId,
        symbol,
        quantity: units,
        price,
        averagePurchasePrice,
        currency,
        value: units * price,
        costBasis: units * averagePurchasePrice,
        unrealizedPnl: (price - averagePurchasePrice) * units,
        lastUpdated: new Date()
      };
    });
    
    if (positionsToInsert.length > 0) {
      await db.insert(snaptradePositions).values(positionsToInsert);
    }
    
    logger.info('Holdings synced successfully', { 
      metadata: { 
        accountId, 
        positionsCount: positions.length 
      }
    });
    
    return {
      accountId,
      success: true,
      positionsCount: positions.length
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    const errorCode = error?.code || '';
    
    // Check for FK constraint error - this means the account was deleted
    if (errorCode === '23503' || errorMessage.includes('foreign key constraint')) {
      logger.warn('[Holdings Sync] FK constraint error - account was deleted externally, cleaning up orphaned data', { 
        metadata: { 
          accountId,
          errorCode
        }
      });
      
      // Clean up orphaned positions
      try {
        await db.delete(snaptradePositions).where(eq(snaptradePositions.accountId, accountId));
        logger.info('[Holdings Sync] Cleaned up orphaned positions for deleted account', { 
          metadata: { accountId } 
        });
      } catch (cleanupError) {
        logger.error('[Holdings Sync] Failed to clean up orphaned positions', { 
          metadata: { accountId, cleanupError } 
        });
      }
      
      return {
        accountId,
        success: false,
        error: 'Account was deleted - cleaned up orphaned data'
      };
    }
    
    logger.error('Error syncing holdings for account', { 
      metadata: { 
        accountId,
        errorMessage,
        errorStack,
        errorDetails: error?.response?.data || error
      }
    });
    
    return {
      accountId,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Sync holdings for all active brokerage accounts
 */
async function syncAllHoldings(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('[Holdings Sync] Starting background holdings sync...');
    
    // Get all SnapTrade users
    const snapUsers = await storage.getAllSnapTradeUsers();
    
    if (snapUsers.length === 0) {
      logger.info('[Holdings Sync] No SnapTrade users found');
      return;
    }
    
    const results: SyncResult[] = [];
    let totalAccounts = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const snapUser of snapUsers) {
      try {
        // Get all accounts for this user
        const { accountsApi } = await import('../lib/snaptrade');
        const accountsResponse = await accountsApi.listUserAccounts({
          userId: snapUser.snaptradeUserId,
          userSecret: snapUser.snaptradeUserSecret
        });
        
        const accounts = accountsResponse.data || [];
        totalAccounts += accounts.length;
        
        // Sync holdings for each account
        for (const account of accounts) {
          const result = await syncAccountHoldings(
            snapUser.snaptradeUserId,
            snapUser.snaptradeUserSecret,
            account.id
          );
          
          results.push(result);
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        // SnapTrade SDK errors have responseBody directly on the error object
        const errorCode = error?.responseBody?.code || error?.response?.data?.code;
        const httpStatus = error?.status || error?.response?.status;
        
        // Check for invalid SnapTrade credentials (401 with code 1083)
        // This means the user was deleted from SnapTrade's side
        if ((httpStatus === 401 || errorMessage.includes('401')) && 
            (errorCode === '1083' || errorCode === 1083 || 
             errorMessage.includes('Invalid userID or userSecret'))) {
          logger.warn('[Holdings Sync] Invalid SnapTrade credentials detected - cleaning up stale user', {
            metadata: { 
              flintUserId: snapUser.userId,
              snaptradeUserId: snapUser.snaptradeUserId,
              reason: 'SnapTrade returned 401 - user no longer exists'
            }
          });
          
          // Clean up the invalid SnapTrade user from our database
          try {
            const { snaptradeUsers, snaptradeConnections, connectedAccounts } = await import('@shared/schema');
            const { eq, and } = await import('drizzle-orm');
            
            // Delete SnapTrade user credentials (this will allow re-registration)
            await db.delete(snaptradeUsers).where(eq(snaptradeUsers.flintUserId, snapUser.userId));
            
            // Delete any associated connections
            await db.delete(snaptradeConnections).where(eq(snaptradeConnections.flintUserId, snapUser.userId));
            
            // Delete connected_accounts entries for snaptrade provider
            await db.delete(connectedAccounts).where(
              and(
                eq(connectedAccounts.userId, snapUser.userId),
                eq(connectedAccounts.provider, 'snaptrade')
              )
            );
            
            logger.info('[Holdings Sync] Cleaned up stale SnapTrade user - user will need to reconnect', {
              metadata: { 
                flintUserId: snapUser.userId,
                snaptradeUserId: snapUser.snaptradeUserId 
              }
            });
            
            // Log metric for tracking
            logger.logMetric('snaptrade_stale_user_cleaned', {
              flint_user_id: snapUser.userId,
              snaptrade_user_id: snapUser.snaptradeUserId,
              cleanup_reason: 'invalid_credentials_401'
            });
          } catch (cleanupError: any) {
            logger.error('[Holdings Sync] Failed to cleanup stale SnapTrade user', {
              metadata: { 
                flintUserId: snapUser.userId,
                error: cleanupError?.message 
              }
            });
          }
          
          errorCount++;
          continue;
        }
        
        logger.error('[Holdings Sync] Error processing user', {
          metadata: { 
            userId: snapUser.userId,
            errorMessage,
            errorStack: error?.stack || '',
            errorDetails: error?.response?.data || error
          }
        });
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.info('[Holdings Sync] Background holdings sync completed', {
      metadata: {
        totalAccounts,
        successCount,
        errorCount,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000)
      }
    });
    
    // Log metrics for VC dashboards
    logger.info('Metric: holdings_sync_completed', {
      metadata: {
        event_name: 'metric.holdings_sync_completed',
        event_type: 'holdings_sync_completed',
        total_accounts: totalAccounts,
        success_count: successCount,
        error_count: errorCount,
        duration_ms: duration
      }
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || String(error);
    
    logger.error('[Holdings Sync] Background holdings sync failed', {
      metadata: { 
        durationMs: duration,
        errorMessage,
        errorStack: error?.stack || '',
        errorDetails: error?.response?.data || error
      }
    });
  }
}

/**
 * Initialize the background holdings sync service
 * 
 * Runs every 15 minutes as a backup safety net.
 * Primary data updates come via SnapTrade webhooks (real-time, event-driven).
 * This polling serves as a fallback for missed webhooks or stale data.
 */
export function startHoldingsSyncService(): void {
  // Run every 15 minutes as backup: '*/15 * * * *'
  // Webhooks handle 99% of updates, this is just a safety net
  const job = new CronJob(
    '*/15 * * * *',
    async () => {
      await syncAllHoldings();
    },
    null, // onComplete
    false, // start
    'America/New_York' // timezone
  );
  
  // Start the cron job
  job.start();
  
  logger.info('[Holdings Sync] Service started - runs every 15 minutes as backup (webhooks provide real-time updates)');
  
  // Run initial sync after 30 seconds to allow time for webhooks to register
  setTimeout(() => {
    syncAllHoldings().catch(error => {
      logger.error('[Holdings Sync] Initial sync failed', { error });
    });
  }, 30000);
}
