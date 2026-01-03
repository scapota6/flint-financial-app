/**
 * Accounts Management Routes
 * Handles brokerage and bank account data retrieval
 */

import { Router } from "express";
import { authApi, accountsApi, snaptradeClient } from "../lib/snaptrade";
import crypto from "crypto";
import { requireAuth } from "../middleware/jwt-auth";
import { storage } from "../storage";
import { logger } from "@shared/logger";
import { resilientTellerFetch } from "../teller/client";
import { getTellerAccessToken } from "../store/tellerUsers";
import { getBrokerageCapabilities } from "../lib/brokerage-capabilities";
import { db } from "../db";
import { holdings } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/accounts
 * Returns all connected accounts (banks + brokerages) for the authenticated user
 * This is the unified endpoint that combines bank and brokerage data
 */
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get all connected accounts from all providers (bank, brokerage, crypto)
    const [bankAccounts, brokerageAccounts, cryptoAccounts] = await Promise.all([
      storage.getConnectedAccountsByProvider(userId, 'teller'),
      storage.getConnectedAccountsByProvider(userId, 'snaptrade'),
      storage.getConnectedAccountsByProvider(userId, 'metamask')
    ]);
    
    // Filter only connected accounts
    const connectedBankAccounts = (bankAccounts || []).filter(account => account.status === 'connected');
    const connectedBrokerageAccounts = (brokerageAccounts || []).filter(account => account.status === 'connected');
    const connectedCryptoAccounts = (cryptoAccounts || []).filter(account => account.status === 'connected');
    
    // Get disconnected accounts for UI warnings
    const disconnectedBankAccounts = (bankAccounts || []).filter(account => account.status === 'disconnected');
    const disconnectedBrokerageAccounts = (brokerageAccounts || []).filter(account => account.status === 'disconnected');
    const disconnectedCryptoAccounts = (cryptoAccounts || []).filter(account => account.status === 'disconnected');
    
    // Fetch holdings for crypto accounts to calculate real balances (parallel)
    const cryptoAccountsWithBalances = await Promise.all(
      connectedCryptoAccounts.map(async (account) => {
        const accountHoldings = await db.select()
          .from(holdings)
          .where(eq(holdings.accountId, account.id));
        
        // Sum up all market values from holdings (use Number() for robust conversion)
        let totalValue = 0;
        for (const holding of accountHoldings) {
          const value = Number(holding.marketValue) || 0;
          if (!isNaN(value)) {
            totalValue += value;
          }
        }
        
        return {
          ...account,
          calculatedBalance: totalValue,
        };
      })
    );
    
    // Combine all connected accounts
    const allConnectedAccounts = [
      ...connectedBankAccounts.map(account => ({
        id: account.id,
        provider: account.provider,
        accountName: account.accountName || account.institutionName,
        accountNumber: account.accountNumber,
        balance: account.balance || 0,
        type: account.accountType || 'bank',
        institution: account.institutionName,
        lastUpdated: account.updatedAt?.toISOString() || new Date().toISOString(),
        currency: account.currency || 'USD',
        status: account.status,
        lastCheckedAt: account.lastCheckedAt
      })),
      ...connectedBrokerageAccounts.map(account => ({
        id: account.id,
        provider: account.provider,
        accountName: account.accountName || account.institutionName,
        accountNumber: account.accountNumber,
        balance: account.balance || 0,
        type: 'investment' as const,
        institution: account.institutionName,
        lastUpdated: account.updatedAt?.toISOString() || new Date().toISOString(),
        currency: account.currency || 'USD',
        status: account.status,
        lastCheckedAt: account.lastCheckedAt
      })),
      ...cryptoAccountsWithBalances.map(account => ({
        id: account.id,
        provider: account.provider,
        accountName: account.accountName || account.institutionName,
        accountNumber: account.externalAccountId, // Wallet address
        balance: account.calculatedBalance, // Derived from holdings
        type: 'crypto' as const,
        institution: account.institutionName || 'MetaMask',
        lastUpdated: account.updatedAt?.toISOString() || new Date().toISOString(),
        currency: 'USD',
        status: account.status,
        lastCheckedAt: account.lastCheckedAt
      }))
    ];
    
    // Combine all disconnected accounts
    const allDisconnectedAccounts = [
      ...disconnectedBankAccounts.map(account => ({
        id: account.id,
        name: account.accountName || account.institutionName,
        institutionName: account.institutionName,
        status: account.status || 'disconnected',
        lastCheckedAt: account.lastCheckedAt || new Date().toISOString()
      })),
      ...disconnectedBrokerageAccounts.map(account => ({
        id: account.id,
        name: account.accountName || account.institutionName,
        institutionName: account.institutionName,
        status: account.status || 'disconnected',
        lastCheckedAt: account.lastCheckedAt || new Date().toISOString()
      })),
      ...disconnectedCryptoAccounts.map(account => ({
        id: account.id,
        name: account.accountName || account.institutionName,
        institutionName: account.institutionName || 'MetaMask',
        status: account.status || 'disconnected',
        lastCheckedAt: account.lastCheckedAt || new Date().toISOString()
      }))
    ];
    
    res.json({
      accounts: allConnectedAccounts,
      disconnected: allDisconnectedAccounts.length > 0 ? allDisconnectedAccounts : undefined
    });
    
  } catch (error: any) {
    logger.error("Error fetching accounts", { error });
    res.status(500).json({ 
      message: "Failed to load account data",
      error: error.message 
    });
  }
});

/**
 * GET /api/accounts/health
 * Returns connection health status for all user accounts
 */
router.get("/health", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get all user accounts regardless of active status
    const allAccounts = await storage.getConnectedAccounts(userId);
    
    const healthStatuses = await Promise.all(
      allAccounts.map(async (account) => {
        let status: 'connected' | 'disconnected' | 'expired' = account.status as any || 'disconnected';
        const now = new Date();
        
        try {
          if (account.provider === 'snaptrade') {
            // Verify SnapTrade connection
            const snaptradeUser = await storage.getSnapTradeUser(userId);
            if (snaptradeUser?.snaptradeUserId && snaptradeUser?.userSecret) {
              const accounts = await accountsApi.listUserAccounts({
                userId: snaptradeUser.snaptradeUserId,
                userSecret: snaptradeUser.userSecret
              });
              
              const isAccountAccessible = accounts.data.some((acc: any) => acc.id === account.externalAccountId);
              status = isAccountAccessible ? 'connected' : 'disconnected';
            } else {
              status = 'disconnected';
            }
          } else if (account.provider === 'teller') {
            // Verify Teller connection with lightweight call
            const accessToken = await getTellerAccessToken(userId);
            if (accessToken && account.externalAccountId) {
              const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
              const response = await resilientTellerFetch(
                `https://api.teller.io/accounts/${account.externalAccountId}`,
                {
                  headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                  }
                },
                'AccountHealth-CheckTeller'
              );
              
              status = response.ok ? 'connected' : 'disconnected';
            } else {
              status = 'disconnected';
            }
          }
          
          // Update status in database
          await storage.updateAccountConnectionStatus(account.id, status);
          
        } catch (error: any) {
          console.log(`[Health Check] Account ${account.id} check failed:`, error.message);
          status = 'disconnected';
          await storage.updateAccountConnectionStatus(account.id, status);
        }
        
        return {
          id: account.id,
          provider: account.provider as 'snaptrade' | 'teller',
          status,
          lastCheckedAt: now.toISOString()
        };
      })
    );
    
    res.json(healthStatuses);
    
  } catch (error: any) {
    logger.error("Error checking account health", { error });
    res.status(500).json({ 
      message: "Failed to check account health",
      error: error.message 
    });
  }
});

/**
 * GET /api/brokerages
 * Returns all brokerage accounts for the authenticated user
 */
router.get("/brokerages", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get connected brokerage accounts from database
    const dbAccounts = await storage.getConnectedAccountsByProvider(userId, 'snaptrade');
    
    if (!dbAccounts || dbAccounts.length === 0) {
      return res.json({ accounts: [] });
    }
    
    // Get SnapTrade user credentials for connectivity validation
    const snaptradeUser = await storage.getSnapTradeUser(userId);
    
    if (!snaptradeUser?.snaptradeUserId || !snaptradeUser?.userSecret) {
      // No SnapTrade credentials - mark all SnapTrade accounts as inactive
      console.log('[SnapTrade Connectivity] No user credentials found, marking all accounts inactive');
      for (const account of dbAccounts) {
        await storage.updateConnectedAccountActive(account.id, false);
      }
      return res.json({ accounts: [] });
    }
    
    // Test connectivity and filter accessible accounts
    const validAccounts = [];
    const invalidAccountIds = [];
    
    try {
      // Test connectivity by fetching account list from SnapTrade
      const snaptradeAccounts = await accountsApi.listUserAccounts({
        userId: snaptradeUser.snaptradeUserId,
        userSecret: snaptradeUser.userSecret
      });
      
      // Create a map of accessible account IDs from SnapTrade
      const accessibleAccountIds = new Set(snaptradeAccounts.data.map((acc: any) => acc.id));
      
      for (const dbAccount of dbAccounts) {
        if (!dbAccount.externalAccountId) {
          console.log(`[SnapTrade Connectivity] Account ${dbAccount.id} missing externalAccountId, marking inactive`);
          invalidAccountIds.push(dbAccount.id);
          continue;
        }
        
        if (accessibleAccountIds.has(dbAccount.externalAccountId)) {
          // Account is accessible via SnapTrade API
          const snapAccount = snaptradeAccounts.data.find((acc: any) => acc.id === dbAccount.externalAccountId);
          if (snapAccount) {
            // Update balance with fresh data
            await storage.updateAccountBalance(
              dbAccount.id,
              String(snapAccount.balance?.total?.amount || 0)
            );
            
            // Get trading capabilities for this brokerage
            const brokerageName = snapAccount.institution_name || dbAccount.institutionName;
            const capabilities = getBrokerageCapabilities(brokerageName);
            
            validAccounts.push({
              id: dbAccount.id,
              name: dbAccount.accountName,
              currency: dbAccount.currency || 'USD',
              balance: parseFloat(String(snapAccount.balance?.total?.amount || 0)),
              buyingPower: parseFloat(String(snapAccount.balance?.total?.amount || 0)) * 0.5,
              lastSync: new Date(),
              institutionName: brokerageName,
              tradingEnabled: capabilities.tradingEnabled,
              capabilities: capabilities.capabilities
            });
            console.log(`[SnapTrade Connectivity] Account ${dbAccount.id} (${dbAccount.externalAccountId}) is accessible - Trading: ${capabilities.tradingEnabled}`);
          }
        } else {
          // Account not found in SnapTrade API response - mark as inactive
          console.log(`[SnapTrade Connectivity] Account ${dbAccount.id} (${dbAccount.externalAccountId}) not accessible, marking inactive`);
          invalidAccountIds.push(dbAccount.id);
        }
      }
      
    } catch (error: any) {
      // SnapTrade API error - could be authentication issue
      console.log('[SnapTrade Connectivity] API call failed:', error.message);
      if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('authentication')) {
        // Authentication error - mark all accounts as inactive
        for (const account of dbAccounts) {
          invalidAccountIds.push(account.id);
        }
      }
      // For other errors, don't mark accounts as inactive (might be temporary)
    }
    
    // Mark accounts with invalid credentials as inactive in database
    for (const accountId of invalidAccountIds) {
      try {
        await storage.updateConnectedAccountActive(accountId, false);
        console.log(`[SnapTrade Connectivity] Marked account ${accountId} as inactive in database`);
      } catch (updateError: any) {
        console.error(`[SnapTrade Connectivity] Failed to mark account ${accountId} as inactive:`, updateError.message);
      }
    }
    
    logger.info("SnapTrade accounts retrieved with connectivity validation", { 
      userId, 
      dbAccountCount: dbAccounts.length,
      validAccountCount: validAccounts.length,
      invalidAccountCount: invalidAccountIds.length
    });
    
    res.json({ accounts: validAccounts });
    
  } catch (error: any) {
    logger.error("Error fetching brokerage accounts", { error });
    res.status(500).json({ 
      message: "Failed to fetch brokerage accounts",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/brokerages/:id/holdings
 * Returns holdings for a specific brokerage account
 */
router.get("/brokerages/:id/holdings", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const accountId = parseInt(req.params.id);
    
    // Verify account ownership
    const account = await storage.getConnectedAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    let holdings: any[] = [];
    
    // Fetch from SnapTrade if available
    if (snaptradeClient && account.provider === 'snaptrade') {
      const snaptradeUser = await storage.getSnapTradeUser(userId);
      
      if (snaptradeUser?.snaptradeUserId && snaptradeUser?.userSecret) {
        try {
          const { data: positions } = await snaptradeClient.accountsApi.getUserAccountPositions({
            userId: snaptradeUser.snaptradeUserId,
            userSecret: snaptradeUser.userSecret,
            accountId: account.externalAccountId!
          });
          
          holdings = positions.map((position: any) => ({
            symbol: position.symbol?.symbol || 'UNKNOWN',
            qty: position.units || 0,
            avgPrice: position.average_purchase_price || 0,
            marketPrice: position.price || 0,
            value: (position.units || 0) * (position.price || 0),
            dayPnl: 0, // SnapTrade doesn't provide day P&L directly
            totalPnl: ((position.price || 0) - (position.average_purchase_price || 0)) * (position.units || 0)
          }));
        } catch (error: any) {
          logger.error("Failed to fetch SnapTrade positions", { error });
        }
      }
    }
    
    // If no live data, return cached holdings from database
    if (holdings.length === 0) {
      const dbHoldings = await storage.getHoldingsByAccount(accountId);
      holdings = dbHoldings.map(h => ({
        symbol: h.symbol,
        qty: parseFloat(h.quantity),
        avgPrice: parseFloat(h.averagePrice),
        marketPrice: parseFloat(h.currentPrice),
        value: parseFloat(h.marketValue),
        dayPnl: 0,
        totalPnl: parseFloat(h.gainLoss)
      }));
    }
    
    res.json({ holdings });
    
  } catch (error: any) {
    logger.error("Error fetching holdings", { error });
    res.status(500).json({ 
      message: "Failed to fetch holdings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/brokerages/:id/transactions
 * Returns transactions for a specific brokerage account
 */
router.get("/brokerages/:id/transactions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const accountId = parseInt(req.params.id);
    
    // Verify account ownership
    const account = await storage.getConnectedAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    let transactions: any[] = [];
    
    // Fetch from SnapTrade if available
    if (snaptradeClient && account.provider === 'snaptrade') {
      const snaptradeUser = await storage.getSnapTradeUser(userId);
      
      if (snaptradeUser?.snaptradeUserId && snaptradeUser?.userSecret) {
        try {
          const { data: activities } = await snaptradeClient.accountsApi.getAccountActivities({
            userId: snaptradeUser.snaptradeUserId,
            userSecret: snaptradeUser.userSecret,
            accounts: account.externalAccountId!
          });
          
          transactions = activities.map((activity: any) => ({
            id: activity.id || crypto.randomUUID(),
            type: activity.type || 'trade',
            symbol: activity.symbol,
            qty: activity.units,
            price: activity.price,
            amount: activity.amount,
            date: activity.trade_date || new Date().toISOString()
          }));
        } catch (error: any) {
          logger.error("Failed to fetch SnapTrade activities", { error });
        }
      }
    }
    
    // If no live data, return recent trades from database
    if (transactions.length === 0) {
      const trades = await storage.getTrades(userId, 100);
      transactions = trades
        .filter(t => t.accountId === String(accountId))
        .map(t => ({
          id: t.id,
          type: t.side,
          symbol: t.symbol,
          qty: parseFloat(t.quantity),
          price: parseFloat(t.price),
          amount: parseFloat(t.totalAmount),
          date: t.executedAt || t.createdAt
        }));
    }
    
    res.json({ transactions });
    
  } catch (error: any) {
    logger.error("Error fetching transactions", { error });
    res.status(500).json({ 
      message: "Failed to fetch transactions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/banks
 * Returns all bank and card accounts for the authenticated user
 */
router.get("/banks", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get connected bank/card accounts from database
    const accounts = await storage.getConnectedAccounts(userId);
    const bankAccounts = accounts.filter(acc => 
      acc.accountType === 'bank' || acc.accountType === 'card'
    );
    
    // Fetch fresh data from Teller for all bank accounts
    if (process.env.TELLER_APPLICATION_ID) {
      const { mapTellerToFlint } = await import('../lib/teller-mapping.js');
      
      // Get Teller access token for this user
      const accessToken = await getTellerAccessToken(userId);
      
      for (const account of bankAccounts) {
        if (account.provider === 'teller' && accessToken) {
          try {
            const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
            const requestOptions = {
              headers: { 
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            };
            
            // Fetch account info to get type
            const accountResponse = await resilientTellerFetch(
              `https://api.teller.io/accounts/${account.externalAccountId}`,
              requestOptions,
              'Banks-FetchAccount'
            );
            
            if (!accountResponse.ok) continue;
            const tellerAccount = await accountResponse.json();
            
            // Fetch live balances from Teller Balances endpoint
            const balancesResponse = await resilientTellerFetch(
              `https://api.teller.io/accounts/${account.externalAccountId}/balances`,
              requestOptions,
              'Banks-FetchBalances'
            );
            
            if (balancesResponse.ok) {
              const balances = await balancesResponse.json();
              
              // Use mapper to calculate proper display balance
              const mapped = mapTellerToFlint(tellerAccount, balances);
              
              // Update balance in database
              await storage.updateAccountBalance(
                account.id,
                String(mapped.displayBalance)
              );
            }
          } catch (error: any) {
            logger.error("Failed to fetch Teller account", { error, accountId: account.id });
          }
        }
      }
    }
    
    // Fetch updated accounts from database
    const updatedAccounts = await storage.getConnectedAccounts(userId);
    // Filter accounts by connection status
    const allBankAccounts = updatedAccounts
      .filter(acc => acc.accountType === 'bank' || acc.accountType === 'card');
    
    const connectedBankAccounts = allBankAccounts
      .filter(acc => acc.status !== 'disconnected' && acc.status !== 'expired');
      
    const disconnectedBankAccounts = allBankAccounts
      .filter(acc => acc.status === 'disconnected' || acc.status === 'expired');

    const finalBankAccounts = connectedBankAccounts
      .map(account => ({
        id: account.id,
        name: account.accountName,
        type: account.accountType === 'bank' ? 
          (account.accountName.toLowerCase().includes('saving') ? 'savings' : 'checking') : 
          'credit',
        externalId: account.externalAccountId,
        institutionName: account.institutionName,
        lastFour: account.accountNumber ? account.accountNumber.slice(-4) : null,
        currency: account.currency || 'USD',
        balance: parseFloat(account.balance),
        lastSync: account.lastSynced
      }));
    
    // Include disconnected accounts in separate array if any exist
    const response = { 
      accounts: finalBankAccounts,
      ...(disconnectedBankAccounts.length > 0 && {
        disconnected: disconnectedBankAccounts.map(account => ({
          id: account.id,
          name: account.accountName,
          institutionName: account.institutionName,
          status: account.status,
          lastCheckedAt: account.lastCheckedAt
        }))
      })
    };
    
    res.json(response);
    
  } catch (error: any) {
    logger.error("Error fetching bank accounts", { error });
    res.status(500).json({ 
      message: "Failed to fetch bank accounts",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/banks/:id/transactions
 * Returns transactions for a specific bank/card account
 */
router.get("/banks/:id/transactions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const accountId = parseInt(req.params.id);
    
    // Verify account ownership
    const account = await storage.getConnectedAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    let transactions: any[] = [];
    
    // Fetch from Teller if available
    if (account.provider === 'teller') {
      const accessToken = await getTellerAccessToken(userId);
      if (accessToken) {
        try {
          const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
          const response = await resilientTellerFetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/transactions`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            },
            'BankTransactions-FetchTransactions'
          );
        
        if (response.ok) {
          const tellerTransactions = await response.json();
          
          transactions = tellerTransactions.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            category: tx.details?.category || 'Other',
            amount: tx.amount,
            date: tx.date
          }));
        }
        } catch (error: any) {
          logger.error("Failed to fetch Teller transactions", { error });
        }
      }
    }
    
    // If no live data, return transfers from database as fallback
    if (transactions.length === 0) {
      const transfers = await storage.getTransfers(userId, 100);
      transactions = transfers
        .filter(t => 
          t.fromAccountId === String(accountId) || 
          t.toAccountId === String(accountId)
        )
        .map(t => ({
          id: t.id,
          description: t.description || 'Transfer',
          category: 'Transfer',
          amount: t.fromAccountId === String(accountId) ? 
            -parseFloat(t.amount) : 
            parseFloat(t.amount),
          date: t.executedAt || t.createdAt
        }));
    }
    
    res.json({ transactions });
    
  } catch (error: any) {
    logger.error("Error fetching bank transactions", { error });
    res.status(500).json({ 
      message: "Failed to fetch transactions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add /api/accounts/banks route for compatibility  
router.get("/banks", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get connected bank accounts from database
    const dbAccounts = await storage.getConnectedAccountsByProvider(userId, 'teller');
    
    if (!dbAccounts || dbAccounts.length === 0) {
      return res.json({ accounts: [] });
    }
    
    // Filter only connected accounts
    const connectedAccounts = dbAccounts.filter(account => account.status === 'connected');
    const disconnectedAccounts = dbAccounts.filter(account => account.status === 'disconnected');
    
    // Format accounts for frontend
    const formattedAccounts = connectedAccounts.map(account => ({
      id: account.id,
      provider: account.provider,
      accountName: account.accountName || account.institutionName,
      accountNumber: account.accountNumber,
      balance: account.balance || 0,
      type: account.type || 'bank',
      institution: account.institutionName,
      lastUpdated: account.lastUpdated || new Date().toISOString(),
      currency: account.currency || 'USD',
      status: account.status,
      lastCheckedAt: account.lastCheckedAt
    }));
    
    const response = { 
      accounts: formattedAccounts,
      ...(disconnectedAccounts.length > 0 && {
        disconnected: disconnectedAccounts.map(account => ({
          id: account.id,
          name: account.accountName || account.institutionName,
          institutionName: account.institutionName,
          status: account.status,
          lastCheckedAt: account.lastCheckedAt
        }))
      })
    };
    
    res.json(response);
    
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ 
      message: "Failed to fetch bank accounts",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add /api/accounts/brokerages route for compatibility
router.get("/brokerages", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get connected brokerage accounts from database
    const dbAccounts = await storage.getConnectedAccountsByProvider(userId, 'snaptrade');
    
    if (!dbAccounts || dbAccounts.length === 0) {
      return res.json({ accounts: [] });
    }
    
    // Filter only connected accounts
    const connectedAccounts = dbAccounts.filter(account => account.status === 'connected');
    const disconnectedAccounts = dbAccounts.filter(account => account.status === 'disconnected');
    
    // Format accounts for frontend
    const formattedAccounts = connectedAccounts.map(account => ({
      id: account.id,
      provider: account.provider,
      accountName: account.accountName || account.institutionName,
      accountNumber: account.accountNumber,
      balance: account.balance || 0,
      type: 'investment',
      institution: account.institutionName,
      lastUpdated: account.lastUpdated || new Date().toISOString(),
      currency: account.currency || 'USD',
      status: account.status,
      lastCheckedAt: account.lastCheckedAt
    }));
    
    const response = { 
      accounts: formattedAccounts,
      ...(disconnectedAccounts.length > 0 && {
        disconnected: disconnectedAccounts.map(account => ({
          id: account.id,
          name: account.accountName || account.institutionName,
          institutionName: account.institutionName,
          status: account.status,
          lastCheckedAt: account.lastCheckedAt
        }))
      })
    };
    
    res.json(response);
    
  } catch (error: any) {
    console.error('Error fetching brokerage accounts:', error);
    res.status(500).json({ 
      message: "Failed to fetch brokerage accounts",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/banks/disconnect
 * Disconnects a bank/card account
 */
router.post("/banks/disconnect", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ message: "accountId is required" });
    }
    
    logger.info("Bank disconnect request", {
      userId,
      metadata: { accountId }
    });
    
    // Get the account to verify ownership
    const account = await storage.getConnectedAccount(Number(accountId));
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    if (account.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to disconnect this account" });
    }
    
    // Delete the account from database
    await storage.deleteConnectedAccount(userId, account.provider, account.externalAccountId);
    
    // Log the activity
    try {
      await storage.createActivityLog({
        userId,
        action: 'account_disconnected',
        description: `Disconnected ${account.institutionName} account`,
        metadata: { provider: account.provider, accountId, accountType: account.accountType }
      });
    } catch (logError) {
      // Don't fail the disconnect if activity log fails
      logger.warn("Failed to log disconnect activity", { error: logError });
    }
    
    logger.info("Bank account disconnected successfully", {
      userId,
      metadata: { accountId, institutionName: account.institutionName }
    });
    
    res.json({ success: true, message: "Account disconnected successfully" });
    
  } catch (error: any) {
    logger.error("Error disconnecting bank account", { error });
    res.status(500).json({ 
      message: "Failed to disconnect account",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;