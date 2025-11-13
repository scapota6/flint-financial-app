/**
 * Balance Cache Service
 * Provides on-demand caching of SnapTrade account balances with 10-second TTL
 * Ensures cross-platform consistency by serving same cached data to iOS and web
 */

import { db } from '../db';
import { snaptradeBalances, snaptradeAccounts } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getAccountBalances } from '../lib/snaptrade';

/**
 * Safely parse decimal values from Drizzle (which returns string | null)
 * Returns null for invalid/missing values, number for valid decimals
 */
function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const CACHE_TTL_SECONDS = 10;

// In-memory fetch locks to prevent concurrent API calls for same account
const fetchLocks = new Map<string, Promise<BalanceSnapshot | null>>();

export interface BalanceSnapshot {
  accountId: string;
  cash: number | null;
  totalEquity: number | null;
  buyingPower: number | null;
  currency: string;
  lastUpdated: Date;
}

/**
 * Get balance snapshot for an account with 10-second caching
 * 
 * Flow:
 * 1. Check if cached data is fresh (<10 seconds old)
 * 2. If fresh, return cached data (fast, consistent across platforms)
 * 3. If stale/missing, check for in-flight fetch (prevent concurrent API calls)
 * 4. If no fetch in progress, fetch from SnapTrade API and update cache
 * 5. Return fresh snapshot with lastUpdated timestamp
 */
export async function getBalanceSnapshot(
  userId: string,
  userSecret: string,
  accountId: string
): Promise<BalanceSnapshot | null> {
  try {
    // Step 1: Check for fresh cached data (within TTL)
    const now = new Date();
    const ttlThreshold = new Date(now.getTime() - CACHE_TTL_SECONDS * 1000);

    const [cachedBalance] = await db
      .select()
      .from(snaptradeBalances)
      .where(
        and(
          eq(snaptradeBalances.accountId, accountId),
          gte(snaptradeBalances.lastUpdated, ttlThreshold)
        )
      )
      .limit(1);

    // Return fresh cached data if available
    if (cachedBalance) {
      console.log(`[BalanceCache] Cache HIT for account ${accountId} (age: ${now.getTime() - cachedBalance.lastUpdated!.getTime()}ms)`);
      
      return {
        accountId: cachedBalance.accountId,
        cash: parseDecimal(cachedBalance.cash),
        totalEquity: parseDecimal(cachedBalance.totalEquity),
        buyingPower: parseDecimal(cachedBalance.buyingPower),
        currency: cachedBalance.currency || 'USD',
        lastUpdated: cachedBalance.lastUpdated!,
      };
    }

    // Step 2: Check for in-flight fetch (prevent concurrent API calls)
    const lockKey = `${userId}:${accountId}`;
    const existingFetch = fetchLocks.get(lockKey);
    
    if (existingFetch) {
      console.log(`[BalanceCache] Waiting for in-flight fetch for account ${accountId}`);
      return await existingFetch;
    }

    // Step 3: Fetch fresh data from SnapTrade API
    console.log(`[BalanceCache] Cache MISS for account ${accountId}, fetching from SnapTrade...`);
    
    const fetchPromise = fetchAndCacheBalance(userId, userSecret, accountId);
    fetchLocks.set(lockKey, fetchPromise);

    try {
      const snapshot = await fetchPromise;
      return snapshot;
    } finally {
      // Clean up fetch lock
      fetchLocks.delete(lockKey);
    }

  } catch (error: any) {
    console.error('[BalanceCache] Error fetching balance snapshot:', {
      accountId,
      error: error.message,
    });
    
    // Return null on error - caller should handle gracefully
    return null;
  }
}

/**
 * Fetch balance from SnapTrade API and update database cache
 */
async function fetchAndCacheBalance(
  userId: string,
  userSecret: string,
  accountId: string
): Promise<BalanceSnapshot | null> {
  try {
    // Fetch fresh balance data from SnapTrade
    const balanceData = await getAccountBalances(userId, userSecret, accountId);
    
    // Extract balance fields using parseDecimal
    const cash = parseDecimal(balanceData?.data?.cash?.amount || balanceData?.data?.total?.cash);
    const totalEquity = parseDecimal(balanceData?.data?.total?.amount || balanceData?.data?.equity);
    const buyingPower = parseDecimal(balanceData?.data?.buyingPower?.amount || balanceData?.data?.buying_power);
    const currency = balanceData?.data?.total?.currency || balanceData?.data?.cash?.currency || 'USD';

    const now = new Date();

    // Upsert to database - store null when SnapTrade omits fields
    await db
      .insert(snaptradeBalances)
      .values({
        accountId,
        cash: cash !== null ? cash.toString() : null,
        totalEquity: totalEquity !== null ? totalEquity.toString() : null,
        buyingPower: buyingPower !== null ? buyingPower.toString() : null,
        currency,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: snaptradeBalances.accountId,
        set: {
          cash: cash !== null ? cash.toString() : null,
          totalEquity: totalEquity !== null ? totalEquity.toString() : null,
          buyingPower: buyingPower !== null ? buyingPower.toString() : null,
          currency,
          lastUpdated: now,
        },
      });

    console.log(`[BalanceCache] Cached fresh balance for account ${accountId}:`, {
      cash,
      totalEquity,
      buyingPower,
      currency,
    });

    return {
      accountId,
      cash,
      totalEquity,
      buyingPower,
      currency,
      lastUpdated: now,
    };
  } catch (error: any) {
    console.error('[BalanceCache] SnapTrade API error (returning null for fallback):', {
      accountId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Invalidate cache for an account (force refresh on next request)
 */
export async function invalidateBalanceCache(accountId: string): Promise<void> {
  try {
    await db
      .delete(snaptradeBalances)
      .where(eq(snaptradeBalances.accountId, accountId));
    
    console.log(`[BalanceCache] Invalidated cache for account ${accountId}`);
  } catch (error: any) {
    console.error('[BalanceCache] Error invalidating cache:', error);
  }
}

/**
 * Clear all cached balances (admin/testing utility)
 */
export async function clearAllBalanceCache(): Promise<void> {
  try {
    await db.delete(snaptradeBalances);
    console.log('[BalanceCache] Cleared all cached balances');
  } catch (error: any) {
    console.error('[BalanceCache] Error clearing cache:', error);
  }
}
