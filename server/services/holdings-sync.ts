/**
 * Background Holdings Sync Service
 * 
 * This service runs periodically to refresh holdings/positions data from SnapTrade
 * for all connected brokerage accounts, ensuring the UI always shows fresh data.
 * 
 * Runs every 5 minutes to maintain near real-time accuracy.
 */

import { CronJob } from 'cron';
import { storage } from '../storage';
import { logger } from '@shared/logger';
import { getPositions } from '../lib/snaptrade';
import { db } from '../db';
import { snaptradePositions } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface SyncResult {
  accountId: string;
  success: boolean;
  positionsCount?: number;
  error?: string;
}

/**
 * Sync holdings for a single account
 */
async function syncAccountHoldings(
  userId: string,
  userSecret: string,
  accountId: string
): Promise<SyncResult> {
  try {
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
    logger.error('Error syncing holdings for account', { 
      error: new Error(error.message),
      metadata: { accountId }
    });
    
    return {
      accountId,
      success: false,
      error: error.message
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
        logger.error('[Holdings Sync] Error processing user', {
          error: new Error(error.message),
          metadata: { userId: snapUser.userId }
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
    
    logger.error('[Holdings Sync] Background holdings sync failed', {
      error: new Error(error.message + '\n' + error.stack),
      metadata: { durationMs: duration }
    });
  }
}

/**
 * Initialize the background holdings sync service
 */
export function startHoldingsSyncService(): void {
  // Run every 5 minutes: '*/5 * * * *'
  const job = new CronJob(
    '*/5 * * * *',
    async () => {
      await syncAllHoldings();
    },
    null, // onComplete
    false, // start
    'America/New_York' // timezone
  );
  
  // Start the cron job
  job.start();
  
  logger.info('[Holdings Sync] Service started - runs every 5 minutes');
  
  // Run initial sync after 30 seconds to avoid startup congestion
  setTimeout(() => {
    syncAllHoldings().catch(error => {
      logger.error('[Holdings Sync] Initial sync failed', { error });
    });
  }, 30000);
}
