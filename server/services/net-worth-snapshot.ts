/**
 * Net Worth Snapshot Service
 * Creates and stores net worth snapshots for portfolio history tracking
 */

import { db } from '../db';
import { netWorthSnapshots, holdings, connectedAccounts } from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { getSnapUser } from '../store/snapUsers';
import { getTellerAccessToken } from '../store/tellerUsers';
import { resilientTellerFetch, getTellerBaseUrl, isTellerSandboxUser } from '../teller/client';
import { getBalanceSnapshot } from './balance-cache';

function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export interface SnapshotResult {
  id: number;
  userId: string;
  timestamp: Date;
  totalNetWorth: number;
  cash: number;
  credit: number;
  brokerage: number;
  crypto: number;
}

/**
 * Create a net worth snapshot for a user
 * Aggregates balances from Teller, SnapTrade, and crypto holdings
 */
export async function createSnapshot(userId: string, userEmail?: string): Promise<SnapshotResult | null> {
  try {
    let totalCash = 0;
    let totalCredit = 0;
    let totalBrokerage = 0;
    let totalCrypto = 0;

    // 1. Fetch Teller balances (bank accounts and credit cards)
    try {
      const tellerToken = await getTellerAccessToken(userId);
      if (tellerToken) {
        const authHeader = `Basic ${Buffer.from(tellerToken + ":").toString("base64")}`;
        const baseUrl = getTellerBaseUrl(userEmail);
        
        const accountsResponse = await resilientTellerFetch(
          `${baseUrl}/accounts`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          },
          'Snapshot-FetchAccounts',
          undefined,
          userEmail
        );

        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json();
          
          for (const account of accounts) {
            if (account.type === 'credit') {
              const ledger = parseDecimal(account.balance?.ledger);
              totalCredit += ledger;
            } else {
              const available = parseDecimal(account.balance?.available);
              totalCash += available;
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn('[Snapshot] Failed to fetch Teller balances', { 
        metadata: { userId, error: error.message } 
      });
    }

    // 2. Fetch SnapTrade balances (brokerage accounts)
    try {
      const snapUser = await getSnapUser(userId);
      if (snapUser?.userSecret) {
        const { accountsApi } = await import('../lib/snaptrade');
        const accountsResponse = await accountsApi.listUserAccounts({
          userId: snapUser.userId,
          userSecret: snapUser.userSecret,
        });

        if (accountsResponse.data && Array.isArray(accountsResponse.data)) {
          for (const account of accountsResponse.data) {
            const balanceSnapshot = await getBalanceSnapshot(
              snapUser.userId,
              snapUser.userSecret,
              account.id
            );

            if (balanceSnapshot) {
              totalBrokerage += balanceSnapshot.totalEquity ?? 0;
            } else {
              const liveBalance = parseDecimal((account as any).balance?.total?.amount || (account as any).total_value?.amount);
              totalBrokerage += liveBalance;
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn('[Snapshot] Failed to fetch SnapTrade balances', { 
        metadata: { userId, error: error.message } 
      });
    }

    // 3. Fetch crypto balances from holdings table (MetaMask)
    try {
      const cryptoAccounts = await db
        .select()
        .from(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.userId, userId),
            eq(connectedAccounts.accountType, 'crypto')
          )
        );

      for (const account of cryptoAccounts) {
        const accountHoldings = await db
          .select()
          .from(holdings)
          .where(eq(holdings.accountId, account.id));

        for (const holding of accountHoldings) {
          totalCrypto += parseDecimal(holding.marketValue);
        }
      }
    } catch (error: any) {
      logger.warn('[Snapshot] Failed to fetch crypto holdings', { 
        metadata: { userId, error: error.message } 
      });
    }

    // Calculate total net worth (assets minus credit/debt)
    const totalNetWorth = totalCash + totalBrokerage + totalCrypto - totalCredit;

    // Store snapshot in database
    const [snapshot] = await db
      .insert(netWorthSnapshots)
      .values({
        userId,
        timestamp: new Date(),
        totalNetWorth: totalNetWorth.toFixed(2),
        cash: totalCash.toFixed(2),
        credit: totalCredit.toFixed(2),
        brokerage: totalBrokerage.toFixed(2),
        crypto: totalCrypto.toFixed(2),
      })
      .returning();

    logger.info('[Snapshot] Created net worth snapshot', {
      metadata: {
        userId,
        totalNetWorth,
        cash: totalCash,
        credit: totalCredit,
        brokerage: totalBrokerage,
        crypto: totalCrypto,
      }
    });

    return {
      id: snapshot.id,
      userId: snapshot.userId,
      timestamp: snapshot.timestamp,
      totalNetWorth,
      cash: totalCash,
      credit: totalCredit,
      brokerage: totalBrokerage,
      crypto: totalCrypto,
    };
  } catch (error: any) {
    logger.error('[Snapshot] Failed to create snapshot', {
      metadata: { userId, error: error.message, stack: error.stack }
    });
    return null;
  }
}

/**
 * Create snapshots for all users with connected accounts
 * Used by daily cron job
 */
export async function createSnapshotsForAllUsers(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  try {
    const usersWithAccounts = await db
      .selectDistinct({ userId: connectedAccounts.userId })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.isActive, true));

    logger.info('[Snapshot Cron] Starting daily snapshots', {
      metadata: { userCount: usersWithAccounts.length }
    });

    for (const { userId } of usersWithAccounts) {
      try {
        const result = await createSnapshot(userId);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error: any) {
        logger.error('[Snapshot Cron] Failed for user', {
          metadata: { userId, error: error.message }
        });
        failed++;
      }
    }

    logger.info('[Snapshot Cron] Completed daily snapshots', {
      metadata: { success, failed }
    });

    return { success, failed };
  } catch (error: any) {
    logger.error('[Snapshot Cron] Failed to run daily snapshots', {
      metadata: { error: error.message }
    });
    return { success, failed };
  }
}

/**
 * Get snapshots for portfolio history
 */
export async function getSnapshotsForPeriod(
  userId: string,
  periodDays: number
): Promise<Array<{ timestamp: Date; value: number }>> {
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const snapshots = await db
    .select({
      timestamp: netWorthSnapshots.timestamp,
      totalNetWorth: netWorthSnapshots.totalNetWorth,
    })
    .from(netWorthSnapshots)
    .where(
      and(
        eq(netWorthSnapshots.userId, userId),
        gte(netWorthSnapshots.timestamp, cutoff)
      )
    )
    .orderBy(desc(netWorthSnapshots.timestamp));

  // Group by day and keep most recent per day
  const byDay = new Map<string, { timestamp: Date; value: number }>();
  
  for (const snapshot of snapshots) {
    const dayKey = snapshot.timestamp.toISOString().split('T')[0];
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, {
        timestamp: snapshot.timestamp,
        value: parseDecimal(snapshot.totalNetWorth),
      });
    }
  }

  return Array.from(byDay.values()).reverse();
}
