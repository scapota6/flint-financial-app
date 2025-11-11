/**
 * Portfolio History Calculation
 * Generates real historical portfolio data by fetching transactions and calculating balances
 */

import { storage } from "../storage";
import { getTellerAccessToken } from "../store/tellerUsers";
import { getSnapUser } from "../store/snapUsers";
import { resilientTellerFetch, getTellerBaseUrl } from "../teller/client";
import { accountsApi } from "./snaptrade";
import { logger } from "@shared/logger";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type Period = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface NormalizedTransaction {
  date: Date;
  amount: number; // Normalized: positive = balance increase, negative = balance decrease
  description: string;
  accountId: string;
  accountType: 'bank' | 'card' | 'brokerage';
}

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
}

export interface PeriodConfig {
  daysBack: number;
  intervalMs: number;
  bucketCount: number;
}

// ============================================================================
// Period Configuration
// ============================================================================

export function getPeriodConfig(period: Period): PeriodConfig {
  switch (period) {
    case '1D':
      return {
        daysBack: 1,
        intervalMs: 60 * 60 * 1000, // 1 hour
        bucketCount: 24
      };
    case '1W':
      return {
        daysBack: 7,
        intervalMs: 4 * 60 * 60 * 1000, // 4 hours
        bucketCount: 42 // 7 days * 6 buckets per day
      };
    case '1M':
      return {
        daysBack: 30,
        intervalMs: 24 * 60 * 60 * 1000, // 1 day
        bucketCount: 30
      };
    case '3M':
      return {
        daysBack: 90,
        intervalMs: 24 * 60 * 60 * 1000, // 1 day
        bucketCount: 90
      };
    case '1Y':
      return {
        daysBack: 365,
        intervalMs: 24 * 60 * 60 * 1000, // 1 day
        bucketCount: 365
      };
    default:
      return getPeriodConfig('1D');
  }
}

// ============================================================================
// Transaction Fetching
// ============================================================================

/**
 * Fetch Teller transactions with pagination support
 * @param userId Flint user ID
 * @param accountId External Teller account ID
 * @param daysBack Number of days to fetch back
 * @returns Normalized transactions
 */
export async function fetchTellerTransactions(
  userId: string,
  accountId: string,
  accountType: 'bank' | 'card',
  daysBack: number
): Promise<NormalizedTransaction[]> {
  try {
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      logger.warn('No Teller access token found for portfolio history', { userId });
      return [];
    }

    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    const allTransactions: any[] = [];
    let fromId: string | undefined = undefined;
    let hasMore = true;
    const maxPages = 20; // Prevent infinite loops
    let pageCount = 0;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      
      // Build URL with pagination parameters
      let url = `${getTellerBaseUrl()}/accounts/${accountId}/transactions?count=500`;
      if (fromId) {
        url += `&from_id=${fromId}`;
      }

      const response = await resilientTellerFetch(
        url,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        },
        'FetchTransactions'
      );

      if (!response.ok) {
        logger.error('Failed to fetch Teller transactions', {
          error: new Error(`HTTP ${response.status}`)
        });
        break;
      }

      const transactions = await response.json();
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        hasMore = false;
        break;
      }

      // Filter transactions by date
      const validTransactions = transactions.filter((tx: any) => {
        const txDate = new Date(tx.date);
        return txDate >= cutoffDate;
      });

      allTransactions.push(...validTransactions);

      // Check if we've gone past our cutoff date
      const oldestTx = transactions[transactions.length - 1];
      if (oldestTx && new Date(oldestTx.date) < cutoffDate) {
        hasMore = false;
      }

      // Set pagination cursor for next page
      if (transactions.length === 500) {
        fromId = transactions[transactions.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    logger.info(`Fetched ${allTransactions.length} Teller transactions in ${pageCount} pages`, { userId });

    // Normalize transactions with credit card logic
    return allTransactions.map((tx: any) => normalizeTransaction(tx, accountType, accountId));
  } catch (error) {
    logger.error('Error fetching Teller transactions', { error: error as Error });
    return [];
  }
}

/**
 * Fetch SnapTrade activities/transactions with pagination
 * @param userId SnapTrade user ID
 * @param userSecret SnapTrade user secret
 * @param accountId SnapTrade account ID
 * @param daysBack Number of days to fetch back
 * @returns Normalized transactions
 */
export async function fetchSnapTradeActivities(
  userId: string,
  userSecret: string,
  accountId: string,
  daysBack: number
): Promise<NormalizedTransaction[]> {
  try {
    const allActivities: any[] = [];
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // SnapTrade activities API with date filtering
    const response = await accountsApi.getAccountActivities({
      userId,
      userSecret,
      accountId,
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      endDate: endDate.toISOString().split('T')[0]
    });

    // Extract activities from response
    let activities = [];
    if (response.data && Array.isArray(response.data.data)) {
      activities = response.data.data;
    } else if (Array.isArray(response.data)) {
      activities = response.data;
    } else if (Array.isArray(response)) {
      activities = response;
    }

    logger.info(`Fetched ${activities.length} SnapTrade activities`);

    // Normalize SnapTrade activities to common format
    return activities.map((activity: any) => ({
      date: new Date(activity.trade_date || activity.settlement_date || new Date()),
      // For SnapTrade, net_amount already represents the portfolio impact
      // Positive = money in, Negative = money out
      amount: parseFloat(activity.net_amount || activity.amount || '0'),
      description: activity.description || activity.type || 'Transaction',
      accountId: accountId,
      accountType: 'brokerage' as const
    }));
  } catch (error) {
    logger.error('Error fetching SnapTrade activities', { error: error as Error });
    return [];
  }
}

/**
 * Normalize a Teller transaction with credit card logic
 * @param tx Raw Teller transaction
 * @param accountType Account type (bank or card)
 * @param accountId Account ID
 * @returns Normalized transaction
 */
function normalizeTransaction(
  tx: any,
  accountType: 'bank' | 'card',
  accountId: string
): NormalizedTransaction {
  const rawAmount = parseFloat(tx.amount || '0');
  
  // CRITICAL: Apply credit card reversal logic
  // For BANK ACCOUNTS:
  //   Positive amount = Money IN (deposits, refunds)
  //   Negative amount = Money OUT (purchases, withdrawals)
  // For CREDIT CARDS (reversed):
  //   Positive amount = Charges/Purchases (debt INCREASE = balance DECREASE)
  //   Negative amount = Payments/Refunds (debt DECREASE = balance INCREASE)
  
  let normalizedAmount: number;
  
  if (accountType === 'card') {
    // Credit card: reverse the sign
    // Positive charge = debt increase = negative balance change
    // Negative payment = debt decrease = positive balance change
    normalizedAmount = -rawAmount;
  } else {
    // Bank account: keep original sign
    normalizedAmount = rawAmount;
  }

  return {
    date: new Date(tx.date),
    amount: normalizedAmount,
    description: tx.description || tx.counterparty?.name || 'Transaction',
    accountId,
    accountType
  };
}

// ============================================================================
// Balance Calculation
// ============================================================================

/**
 * Calculate historical balances by walking backwards from current balance
 * @param transactions All transactions for the account (sorted oldest to newest)
 * @param currentBalance Current account balance
 * @returns Array of {timestamp, value} data points
 */
export function calculateHistoricalBalances(
  transactions: NormalizedTransaction[],
  currentBalance: number
): HistoricalDataPoint[] {
  // Sort transactions by date (oldest first)
  const sortedTxs = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const dataPoints: HistoricalDataPoint[] = [];
  
  // Start from current balance and work backwards
  let balance = currentBalance;
  
  // Add current point
  dataPoints.push({
    timestamp: new Date().toISOString(),
    value: Math.round(balance * 100) / 100
  });
  
  // Walk backwards through transactions
  for (let i = sortedTxs.length - 1; i >= 0; i--) {
    const tx = sortedTxs[i];
    
    // Subtract transaction to get previous balance
    // (walking backwards: current - transaction = previous)
    balance -= tx.amount;
    
    dataPoints.push({
      timestamp: tx.date.toISOString(),
      value: Math.round(balance * 100) / 100
    });
  }
  
  // Reverse to get chronological order
  return dataPoints.reverse();
}

// ============================================================================
// Time Bucketing
// ============================================================================

/**
 * Bucket data points into time intervals based on period
 * @param dataPoints Historical data points (chronological order)
 * @param period Time period
 * @returns Bucketed data points
 */
export function bucketByTimeInterval(
  dataPoints: HistoricalDataPoint[],
  period: Period
): HistoricalDataPoint[] {
  if (dataPoints.length === 0) {
    return [];
  }

  const config = getPeriodConfig(period);
  const now = Date.now();
  const buckets: HistoricalDataPoint[] = [];
  
  // Seed with earliest known balance to carry backwards for buckets before oldest transaction
  const earliestBalance = dataPoints[0]?.value || 0;
  
  // Create time buckets
  for (let i = config.bucketCount; i >= 0; i--) {
    const bucketTime = now - (i * config.intervalMs);
    const bucketDate = new Date(bucketTime);
    
    // Find the last data point before or at this bucket time
    // Initialize with earliest balance so pre-transaction buckets inherit it
    let value = earliestBalance;
    for (const point of dataPoints) {
      const pointTime = new Date(point.timestamp).getTime();
      if (pointTime <= bucketTime) {
        value = point.value;
      } else {
        break;
      }
    }
    
    buckets.push({
      timestamp: bucketDate.toISOString(),
      value: Math.round(value * 100) / 100
    });
  }
  
  return buckets;
}

/**
 * Fill gaps in data points by carrying forward last known balance
 * @param dataPoints Data points with potential gaps
 * @param period Time period for gap filling
 * @returns Data points with gaps filled
 */
export function fillInactiveGaps(
  dataPoints: HistoricalDataPoint[],
  period: Period
): HistoricalDataPoint[] {
  if (dataPoints.length === 0) {
    return [];
  }

  const config = getPeriodConfig(period);
  const filled: HistoricalDataPoint[] = [];
  const now = Date.now();
  
  let lastValue = dataPoints[0]?.value || 0;
  
  // Create a map of existing data points for quick lookup
  const pointMap = new Map<number, number>();
  dataPoints.forEach(point => {
    const bucketTime = Math.floor(new Date(point.timestamp).getTime() / config.intervalMs) * config.intervalMs;
    pointMap.set(bucketTime, point.value);
  });
  
  // Fill in all buckets
  for (let i = config.bucketCount; i >= 0; i--) {
    const bucketTime = now - (i * config.intervalMs);
    const normalizedTime = Math.floor(bucketTime / config.intervalMs) * config.intervalMs;
    
    const value = pointMap.get(normalizedTime) ?? lastValue;
    lastValue = value;
    
    filled.push({
      timestamp: new Date(bucketTime).toISOString(),
      value: Math.round(value * 100) / 100
    });
  }
  
  return filled;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Generate complete portfolio history for a user
 * @param userId Flint user ID
 * @param period Time period
 * @returns Historical data points for charting
 */
export async function generatePortfolioHistory(
  userId: string,
  period: Period
): Promise<HistoricalDataPoint[]> {
  try {
    const config = getPeriodConfig(period);
    
    // Fetch all connected accounts
    const connectedAccounts = await storage.getConnectedAccounts(userId);
    
    if (connectedAccounts.length === 0) {
      logger.warn('No connected accounts for portfolio history', { userId });
      return [];
    }

    // CRITICAL FIX: Use Map to aggregate by timestamp for proper cross-account summation
    const referenceNow = Math.floor(Date.now() / config.intervalMs) * config.intervalMs;
    const portfolioMap = new Map<string, number>(); // ISO timestamp -> total value
    
    // Pre-create normalized timestamps for all buckets
    const normalizedTimestamps: string[] = [];
    for (let i = config.bucketCount; i >= 0; i--) {
      const timestamp = new Date(referenceNow - (i * config.intervalMs)).toISOString();
      normalizedTimestamps.push(timestamp);
      portfolioMap.set(timestamp, 0); // Initialize with 0
    }
    
    // Process each account
    for (const account of connectedAccounts) {
      try {
        const currentBalance = parseFloat(account.balance) || 0;
        let transactions: NormalizedTransaction[] = [];
        
        // Fetch transactions based on provider
        if (account.provider === 'teller') {
          const accountType = account.accountType === 'card' ? 'card' : 'bank';
          transactions = await fetchTellerTransactions(
            userId,
            account.externalAccountId!,
            accountType,
            config.daysBack
          );
        } else if (account.provider === 'snaptrade') {
          // Fetch SnapTrade credentials
          const snapUser = await getSnapUser(userId);
          if (snapUser?.userSecret && account.externalAccountId) {
            transactions = await fetchSnapTradeActivities(
              snapUser.userId,
              snapUser.userSecret,
              account.externalAccountId,
              config.daysBack
            );
          }
        }
        
        // CRITICAL FIX: For each normalized timestamp, determine this account's balance at that point
        if (transactions.length === 0) {
          // No transactions: flat line at current balance
          normalizedTimestamps.forEach(timestamp => {
            const currentTotal = portfolioMap.get(timestamp) || 0;
            portfolioMap.set(timestamp, currentTotal + currentBalance);
          });
        } else {
          // Has transactions: calculate historical balances
          const rawHistory = calculateHistoricalBalances(transactions, currentBalance);
          
          // Sort historical points chronologically for efficient lookup
          const sortedHistory = rawHistory
            .map(point => ({
              time: new Date(point.timestamp).getTime(),
              value: point.value
            }))
            .sort((a, b) => a.time - b.time);
          
          // Find the earliest balance (for buckets before first transaction)
          const earliestBalance = sortedHistory.length > 0 ? sortedHistory[0].value : currentBalance;
          
          // For each normalized bucket, find the account's balance at that time
          let lastKnownValue = earliestBalance; // Start with earliest known balance
          let historyIndex = 0; // Pointer for sorted history
          
          normalizedTimestamps.forEach(timestamp => {
            const bucketTime = new Date(timestamp).getTime();
            
            // Update lastKnownValue by consuming all history points up to this bucket
            while (historyIndex < sortedHistory.length && sortedHistory[historyIndex].time <= bucketTime) {
              lastKnownValue = sortedHistory[historyIndex].value;
              historyIndex++;
            }
            
            // Always add the last known value (never skip buckets)
            const currentTotal = portfolioMap.get(timestamp) || 0;
            portfolioMap.set(timestamp, currentTotal + lastKnownValue);
          });
        }
        
      } catch (accountError) {
        logger.error('Error processing account for portfolio history', { 
          error: accountError instanceof Error ? accountError.message : String(accountError)
        });
        // Continue with other accounts
      }
    }
    
    // Convert map to array, maintaining chronological order
    const result: HistoricalDataPoint[] = normalizedTimestamps.map(timestamp => ({
      timestamp,
      value: Math.round((portfolioMap.get(timestamp) || 0) * 100) / 100
    }));
    
    logger.info('Portfolio history generated', { 
      dataPoints: result.length,
      period 
    });
    
    return result;
    
  } catch (error) {
    logger.error('Error generating portfolio history', { error: error as Error });
    
    // Return empty array on error
    return [];
  }
}
