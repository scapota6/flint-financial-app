/**
 * Portfolio Summary Routes
 * Provides unified portfolio metrics and net worth calculations
 */

import { Router } from "express";
import { storage } from "../storage";
import { marketDataService } from "../services/market-data";
import { logger } from "@shared/logger";
import { getSnapUser } from "../store/snapUsers";
import { requireAuth } from "../middleware/jwt-auth";
import { getTellerAccessToken } from "../store/tellerUsers";
import { resilientTellerFetch } from "../teller/client";
import { getBalanceSnapshot } from "../services/balance-cache";

/**
 * Safely parse decimal values from SnapTrade API responses
 * Returns null for invalid/missing values, number for valid decimals
 */
function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const router = Router();

/**
 * GET /api/portfolio/summary
 * Returns comprehensive portfolio summary with net worth breakdown
 */
router.get("/summary", requireAuth, async (req: any, res) => {
  try {
    // Get userId from session like dashboard route
    const userId = req.user?.claims?.sub;
    const userEmail = req.user?.claims?.email;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Initialize totals
    let totalCash = 0;
    let totalStocks = 0;
    let totalCrypto = 0;
    let totalDebt = 0;
    let totalDayChange = 0;
    let totalDayChangePercent = 0;
    let totalYtdChange = 0;
    let totalYtdChangePercent = 0;
    let accountCount = 0;
    let mostRecentBalanceUpdate: Date | null = null;

    // Fetch real investment account data from SnapTrade (same pattern as dashboard)
    try {
      console.log('Fetching SnapTrade accounts for portfolio user:', userEmail);
      
      // Use the same auth pattern as dashboard
      const snapUser = await getSnapUser(userId);
      if (snapUser?.userSecret) {
        const { accountsApi } = await import('../lib/snaptrade');
        const accounts = await accountsApi.listUserAccounts({
          userId: snapUser.userId,
          userSecret: snapUser.userSecret,
        });
        
        console.log('SnapTrade accounts for portfolio:', accounts.data?.length || 0);
        
        if (accounts.data && Array.isArray(accounts.data)) {
          accountCount = accounts.data.length;
          
          for (const account of accounts.data) {
            // First parse the live API balance as fallback
            const liveBalance = parseDecimal((account as any).balance?.total?.amount || (account as any).total_value?.amount) ?? 0;
            const liveCash = parseDecimal((account as any).cash?.amount);
            
            // Try to get cached balance
            const balanceSnapshot = await getBalanceSnapshot(snapUser.userId, snapUser.userSecret, account.id);
            
            let balance: number;
            let cash: number | null;
            let holdings: number;
            
            if (balanceSnapshot) {
              // Use cached balance data
              balance = balanceSnapshot.totalEquity ?? liveBalance;
              cash = balanceSnapshot.cash ?? liveCash;
              
              // Track most recent balance update
              if (!mostRecentBalanceUpdate || balanceSnapshot.lastUpdated > mostRecentBalanceUpdate) {
                mostRecentBalanceUpdate = balanceSnapshot.lastUpdated;
              }
            } else {
              // Fallback to live API data on cache failure
              balance = liveBalance;
              cash = liveCash;
              
              console.warn(`[Portfolio] Cache miss for account ${account.id}, using live API balance: $${liveBalance}`);
            }
            
            // Calculate holdings properly
            holdings = cash !== null ? (balance - cash) : balance;
            
            // Add to totals
            totalCash += cash ?? 0;
            totalStocks += holdings; // Holdings represent invested value
            
            // Try to get positions for more detailed breakdown and performance
            try {
              const { getPositions } = await import('../lib/snaptrade');
              const positionsData = await getPositions(
                snapUser.userId,
                snapUser.userSecret,
                account.id
              );
              const positions = positionsData?.[0]?.positions || [];
              
              if (positions && positions.length > 0) {
                for (const position of positions) {
                  const value = (position.units || 0) * (position.price || 0);
                  const symbol = position.symbol?.symbol?.symbol || position.symbol?.symbol;
                  
                  // Note: open_pnl is total unrealized P&L since purchase, not daily change
                  // We would need historical data to calculate true daily performance
                  
                  // Determine if it's crypto
                  if (symbol && ['BTC', 'ETH', 'DOGE', 'ADA', 'SOL', 'USDC', 'USDT'].includes(symbol)) {
                    totalCrypto += value;
                    totalStocks -= value; // Remove from stocks and add to crypto
                  }
                }
              }
            } catch (posError) {
              console.log('Could not fetch positions for account:', account.id);
              console.error('[Portfolio] Position fetch error details:', posError);
            }
          }
        }
      } else {
        console.log('SnapTrade credentials not available for portfolio user');
      }
    } catch (error: any) {
      console.error('Error fetching SnapTrade accounts for portfolio:', error);
    }

    // Fetch bank accounts and credit cards from Teller
    try {
      console.log('Fetching Teller accounts for portfolio user:', userEmail);
      const connectedAccounts = await storage.getConnectedAccounts(userId);
      const tellerAccounts = connectedAccounts.filter(acc => acc.provider === 'teller');
      
      // Fetch Teller access token for this user
      const accessToken = await getTellerAccessToken(userId);
      if (!accessToken) {
        console.log('No Teller access token found for portfolio user');
      } else {
        for (const account of tellerAccounts) {
          try {
            const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
            const requestOptions = {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            };
            
            // Fetch account info and balances from Teller
            const [accountResponse, balancesResponse] = await Promise.all([
              resilientTellerFetch(
                `https://api.teller.io/accounts/${account.externalAccountId}`,
                requestOptions,
                'Portfolio-FetchAccount'
              ),
              resilientTellerFetch(
                `https://api.teller.io/accounts/${account.externalAccountId}/balances`,
                requestOptions,
                'Portfolio-FetchBalances'
              )
            ]);
            
            if (accountResponse.ok && balancesResponse.ok) {
              const tellerAccount = await accountResponse.json();
              const tellerBalances = await balancesResponse.json();
              
              // Check if this is a credit card
              if (tellerAccount.subtype === 'credit_card') {
                // For credit cards, ledger is the amount owed (debt)
                const ledger = parseFloat(tellerBalances.ledger) || 0;
                totalDebt += Math.abs(ledger); // Add absolute value to debt
                console.log(`[Portfolio] Credit card debt from ${tellerAccount.name}: $${Math.abs(ledger)}`);
              } else if (tellerAccount.type === 'depository') {
                // For depository accounts, add to cash
                const available = parseFloat(tellerBalances.available) || 0;
                totalCash += available;
              }
              
              accountCount++;
            }
          } catch (fetchError) {
            console.error('Error fetching Teller account:', account.externalAccountId, fetchError);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Teller accounts for portfolio:', error);
    }
    
    // Calculate totals
    const investable = totalStocks + totalCrypto;
    const netWorth = investable + totalCash - totalDebt;
    
    // Note: True day/YTD performance calculations require historical portfolio snapshots
    // Setting to 0 until historical tracking is implemented
    // totalDayChange, totalDayChangePercent, totalYtdChange, totalYtdChangePercent remain at 0
    
    // Prepare breakdown for visualization
    const breakdown = [
      { bucket: 'Stocks', value: totalStocks },
      { bucket: 'Crypto', value: totalCrypto },
      { bucket: 'Cash', value: totalCash },
      { bucket: 'Credit Cards', value: -totalDebt }
    ].filter(item => Math.abs(item.value) > 0); // Only include non-zero values
    
    // Prepare response
    const summary = {
      totals: {
        netWorth: Math.round(netWorth * 100) / 100,
        investable: Math.round(investable * 100) / 100,
        cash: Math.round(totalCash * 100) / 100,
        debt: Math.round(totalDebt * 100) / 100
      },
      breakdown,
      performance: {
        dayPct: Math.round(totalDayChangePercent * 100) / 100,
        dayValue: Math.round(totalDayChange * 100) / 100,
        ytdPct: Math.round(totalYtdChangePercent * 100) / 100,
        ytdValue: Math.round(totalYtdChange * 100) / 100
      },
      metadata: {
        accountCount: accountCount,
        lastUpdated: mostRecentBalanceUpdate ? mostRecentBalanceUpdate.toISOString() : null,
        lastBalanceUpdate: mostRecentBalanceUpdate ? mostRecentBalanceUpdate.toISOString() : null,
        currency: 'USD',
        dataDelayed: false // Set to true if using cached data
      }
    };
    
    logger.info("Portfolio summary generated", { 
      userId, 
      netWorth: summary.totals.netWorth,
      accounts: accountCount 
    });
    
    res.json(summary);
    
  } catch (error) {
    logger.error("Error generating portfolio summary", { error });
    res.status(500).json({ 
      message: "Failed to generate portfolio summary",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/portfolio/history
 * Returns historical portfolio values for charting (query parameter version)
 */
router.get("/history", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const period = (req.query.period || '1D') as '1D' | '1W' | '1M' | '3M' | '1Y';
    
    // Generate real portfolio history using transaction data
    const { generatePortfolioHistory } = await import('../lib/portfolio-history');
    const dataPoints = await generatePortfolioHistory(userId, period);
    
    logger.info("Portfolio history generated", {
      userId,
      period,
      dataPointsCount: dataPoints.length
    });
    
    res.json({
      period,
      dataPoints,
      currency: 'USD'
    });
    
  } catch (error) {
    logger.error("Error fetching portfolio history", { error });
    res.status(500).json({ 
      message: "Failed to fetch portfolio history",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/portfolio/history/:period
 * Returns historical portfolio values for charting (path parameter version)
 */
router.get("/history/:period", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { period = '1D' } = req.params;
    
    // Generate real portfolio history using transaction data
    const { generatePortfolioHistory } = await import('../lib/portfolio-history');
    const dataPoints = await generatePortfolioHistory(
      userId,
      period as '1D' | '1W' | '1M' | '3M' | '1Y'
    );
    
    logger.info("Portfolio history generated", {
      userId,
      period,
      dataPointsCount: dataPoints.length
    });
    
    res.json({
      period,
      dataPoints,
      currency: 'USD'
    });
    
  } catch (error) {
    logger.error("Error fetching portfolio history", { error });
    res.status(500).json({ 
      message: "Failed to fetch portfolio history",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;