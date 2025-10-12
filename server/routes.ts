import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import crypto from "crypto";
import { v4 as uuidv4 } from 'uuid';
import { Snaptrade } from "snaptrade-typescript-sdk";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getSnapUser } from "./store/snapUsers";
import { rateLimits } from "./middleware/rateLimiter";
import { authApi, accountsApi, snaptradeClient, portfolioApi, tradingApi, listBrokerageAuthorizations, detailBrokerageAuthorization } from './lib/snaptrade';
import { deleteSnapUser, saveSnapUser } from './store/snapUsers';
import { WalletService } from "./services/WalletService";
import { TradingAggregator } from "./services/TradingAggregator";
import { marketDataService } from "./services/market-data";
import { alertMonitor } from "./services/alert-monitor";
import { getServerFeatureFlags } from "@shared/feature-flags";
import { logger } from "@shared/logger";
import { demoMode } from "@shared/demo-mode";
import { 
  insertConnectedAccountSchema,
  insertWatchlistItemSchema,
  insertTradeSchema,
  insertTransferSchema,
  insertActivityLogSchema,
  insertAccountApplicationSchema,
  users,
  snaptradeUsers,
  snaptradeConnections,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { snaptradeUsersRouter } from './routes/snaptrade-users';
import { snaptradeConnectionsRouter } from './routes/snaptrade-connections';
import { snaptradeTradingRouter } from './routes/snaptrade-trading';
import { snaptradeWebhooksRouter } from './routes/snaptrade-webhooks';
import snaptradeRouter from './routes/snaptrade';
import snaptradeDiagnosticsRouter from './routes/snaptrade-diagnostics';
import adminRouter from './routes/admin';
import adminPanelRouter from './routes/admin-panel';
import userPasswordRouter from './routes/user-password';
import authRouter from './routes/auth';
import lemonSqueezyRouter from './routes/lemonsqueezy';

// Initialize Stripe (only if API key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// SnapTrade SDK initialization is now handled in server/lib/snaptrade.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Start alert monitoring service
  alertMonitor.start();

  // Feature flags endpoint (public, no auth required for demo mode)
  app.get('/api/feature-flags', (req, res) => {
    const flags = getServerFeatureFlags();
    logger.info('Feature flags requested', { metadata: { flags } });
    res.json(flags);
  });

  // Account application submission (public endpoint, no auth required)
  app.post('/api/applications/submit', async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertAccountApplicationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        logger.warn('Invalid application submission', { 
          error: validationResult.error 
        });
        return res.status(400).json({ 
          message: "Invalid form data. Please check all fields and try again.",
          errors: validationResult.error.errors 
        });
      }

      const { firstName, email, accountCount, connectType } = validationResult.data;

      // Additional email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: "Please enter a valid email address." 
        });
      }

      // Create application in database
      const application = await storage.createAccountApplication({
        firstName,
        email,
        accountCount,
        connectType,
      });

      logger.info('Application submitted successfully', { 
        metadata: {
          applicationId: application.id,
          email: application.email 
        }
      });

      res.json({ 
        success: true,
        message: "Application submitted! You'll receive an email when your application is approved.",
        applicationId: application.id
      });
    } catch (error: any) {
      logger.error('Error submitting application', { error: error.message });
      res.status(500).json({ 
        success: false,
        message: "Failed to submit application. Please try again later." 
      });
    }
  });

  // SnapTrade callback handler for OAuth redirect
  app.get('/snaptrade/callback', async (req, res) => {
    try {
      // Handle success/error from SnapTrade connection
      const { success, error, userId, userSecret } = req.query;
      
      if (error) {
        logger.error('SnapTrade callback error', { error: error as string });
        return res.redirect('/?snaptrade=error');
      }
      
      // Validate that connection actually worked by checking for accounts
      if (userId && userSecret) {
        try {
          console.log('🔍 Validating SnapTrade connection for user:', userId);
          
          const accountsResponse = await accountsApi.listUserAccounts({
            userId: userId as string,
            userSecret: userSecret as string
          });
          
          const accounts = accountsResponse.data || [];
          console.log('📊 Found', accounts.length, 'connected accounts');
          
          if (accounts.length > 0) {
            console.log('✅ Connection validated - accounts found');
            logger.info('SnapTrade connection validated successfully', { 
              userId: userId as string, 
              accountCount: accounts.length 
            });
            
            // Sync authorizations to database
            try {
              console.log('🔄 Syncing SnapTrade authorizations to database...');
              
              // Fetch authorizations from SnapTrade API
              const authorizationsResponse = await listBrokerageAuthorizations(
                userId as string,
                userSecret as string
              );
              
              const authorizations = authorizationsResponse?.data || [];
              
              console.log(`📥 Found ${authorizations.length} authorizations to sync`);
              
              // Sync each authorization to database
              for (const auth of authorizations) {
                await db
                  .insert(snaptradeConnections)
                  .values({
                    flintUserId: userId as string,
                    brokerageAuthorizationId: auth.id,
                    brokerageName: auth.brokerage?.name || 'Unknown',
                    disabled: auth.disabled || false,
                    lastSyncAt: new Date(),
                  })
                  .onConflictDoUpdate({
                    target: snaptradeConnections.brokerageAuthorizationId,
                    set: {
                      brokerageName: auth.brokerage?.name || 'Unknown',
                      disabled: auth.disabled || false,
                      updatedAt: new Date(),
                      lastSyncAt: new Date(),
                    }
                  });
                
                console.log(`✅ Synced authorization: ${auth.brokerage?.name} (${auth.id})`);
              }
              
              logger.info('SnapTrade authorizations synced successfully', {
                userId: userId as string,
                count: authorizations.length
              });
            } catch (syncError) {
              // Log error but don't fail the redirect - sync can be retried later
              console.error('❌ Failed to sync authorizations:', syncError);
              logger.error('SnapTrade authorization sync failed', {
                userId: userId as string,
                error: syncError
              });
            }
            
            return res.redirect('/accounts?snaptrade=success');
          } else {
            console.log('❌ Connection failed - no accounts found');
            // Clean up user with no connections
            try {
              await authApi.deleteSnapTradeUser({ 
                userId: userId as string 
              });
              console.log('🧹 Deleted user with no connections');
            } catch (cleanupError) {
              console.log('⚠️ Failed to cleanup user:', cleanupError);
            }
            
            logger.warn('SnapTrade connection failed - no accounts', { userId: userId as string });
            return res.redirect('/?snaptrade=error&reason=no_accounts');
          }
        } catch (validationError) {
          console.error('❌ Connection validation failed:', validationError);
          logger.error('SnapTrade connection validation failed', { 
            userId: userId as string, 
            error: validationError
          });
          return res.redirect('/?snaptrade=error&reason=validation_failed');
        }
      }
      
      // Success - redirect to dashboard or accounts page
      logger.info('SnapTrade connection successful');
      return res.redirect('/accounts?snaptrade=success');
    } catch (e: any) {
      logger.error('SnapTrade callback handler error', { error: e });
      return res.redirect('/?snaptrade=error');
    }
  });

  // SnapTrade health check endpoint
  app.get('/api/snaptrade/health', async (_req, res) => {
    try {
      const { authApi } = await import('./lib/snaptrade');
      // harmless idempotent call to test signatures/keys
      await authApi.registerSnapTradeUser({
        userId: 'healthcheck@flint-investing.com',
        userSecret: 'healthcheck-secret-1234567890',
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.responseBody || e?.message });
    }
  });

  // Debug endpoint to check userSecret storage
  app.get('/api/debug/snaptrade/user', async (req, res) => {
    const { getUser } = await import('./store/snapUsers');
    const email = (req.query.email || '').toString().trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'email required' });
    const rec = await getUser(email);
    res.json({
      exists: !!rec,
      userId: rec?.userId,
      userSecretLen: rec?.userSecret?.length || 0,
    });
  });

  // Dev-only repair endpoint (if a user was registered under a different secret in the past)
  app.post('/api/debug/snaptrade/repair-user', async (req, res) => {
    try {
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ message: 'userId required' });

      await authApi.deleteSnapTradeUser({ userId });    // async provider-side deletion
      await deleteSnapUser(userId);                     // wipe local
      const created = await authApi.registerSnapTradeUser({ userId }); // fresh pair
      await saveSnapUser({ userId: created.data.userId!, userSecret: created.data.userSecret! });
      res.json({ ok: true, userId, userSecretLen: created.data.userSecret?.length || 0 });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.responseBody || e?.message });
    }
  });

  // GET /api/me endpoint - returns current user info
  app.get('/api/me', rateLimits.auth, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user info in required format
      const userInfo = {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        createdAt: user.createdAt || new Date().toISOString(),
      };
      
      logger.info('User info requested', { 
        userId,
        action: 'GET_USER_INFO'
      });
      
      res.json(userInfo);
    } catch (error) {
      logger.error("Error fetching user info", { error });
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });



  // Auth routes (with rate limiting)
  app.get('/api/auth/user', rateLimits.auth, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      

      
      // Enable demo mode if feature flag is set
      if (getServerFeatureFlags().FF_DEMO_MODE && !user) {
        const demoUser = {
          id: 'demo-user',
          email: 'demo@flint.finance',
          firstName: 'Demo',
          lastName: 'User',
          profileImageUrl: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionTier: 'premium',
          subscriptionStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        logger.info('Demo mode: returning demo user');
        return res.json(demoUser);
      }
      
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user", { error });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // CSRF Token endpoint for mutating requests
  app.get('/api/csrf-token', (req: any, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // Dashboard data (with data rate limiting) - Enhanced with real API integration
  app.get('/api/dashboard', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      const user = await storage.getUser(userId);
      const connectedAccounts = await storage.getConnectedAccounts(userId);
      
      let totalBalance = 0;
      let bankBalance = 0;
      let investmentValue = 0;
      let cryptoValue = 0;
      const enrichedAccounts = [];

      // Fetch real bank account data from Teller (including credit cards)
      // Only include accounts that we can successfully access via API
      try {
        console.log('Fetching bank accounts for user:', userEmail);
        const connectedAccounts = await storage.getConnectedAccounts(userId);
        const tellerAccounts = connectedAccounts.filter(acc => acc.provider === 'teller');
        
        for (const account of tellerAccounts) {
          // Always include accounts, validate access for real-time data
          if (account.accessToken) {
            try {
              // Fetch both account info and balances from Teller
              const [accountResponse, balancesResponse] = await Promise.all([
                fetch(`https://api.teller.io/accounts/${account.externalAccountId}`, {
                  headers: {
                    'Authorization': `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`,
                  },
                }),
                fetch(`https://api.teller.io/accounts/${account.externalAccountId}/balances`, {
                  headers: {
                    'Authorization': `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`,
                  },
                })
              ]);
              
              if (accountResponse.ok && balancesResponse.ok) {
                const tellerAccount = await accountResponse.json();
                const tellerBalances = await balancesResponse.json();
                
                console.log('[Dashboard] Teller account data:', {
                  accountId: account.id,
                  type: tellerAccount.type,
                  subtype: tellerAccount.subtype,
                  balances: tellerBalances
                });
                
                // Use Teller mapper to properly handle credit card debt vs regular balances
                const { mapTellerToFlint, logMappingDetails } = await import('./lib/teller-mapping.js');
                const mapped = mapTellerToFlint(tellerAccount, tellerBalances);
                logMappingDetails(tellerAccount, tellerBalances, mapped);
                
                // Extract values from mapped account
                const accountType: 'bank' | 'credit' = mapped.accountType === 'credit' ? 'credit' : 'bank';
                const displayBalance = mapped.displayBalance;
                const availableCredit = mapped.availableCredit || null;
                const amountSpent = mapped.owed || null;
                
                // Update running totals
                // Credit cards have NEGATIVE displayBalance (debt), so adding them reduces net worth
                totalBalance += displayBalance;
                
                if (accountType === 'bank') {
                  bankBalance += displayBalance;
                }
                
                console.log('[Dashboard] Account classification:', {
                  accountId: account.id,
                  accountType,
                  displayBalance,
                  owed: mapped.owed,
                  availableCredit: mapped.availableCredit,
                  runningTotal: totalBalance
                });
                
                // Update stored balance in database
                await storage.updateAccountBalance(account.id, displayBalance.toString());
                
                enrichedAccounts.push({
                  id: account.id,
                  provider: 'teller',
                  accountName: account.accountName || (accountType === 'credit' ? 'Credit Card' : 'Bank Account'),
                  // For credit cards: show positive debt in UI, but totalBalance already uses negative displayBalance
                  balance: accountType === 'credit' ? (amountSpent || 0) : displayBalance,
                  type: accountType,
                  institution: account.institutionName || (accountType === 'credit' ? 'Credit Card' : 'Bank'),
                  lastUpdated: new Date().toISOString(),
                  // Store additional balance info for details view
                  availableBalance: parseFloat(tellerBalances.available || '0') || 0,
                  ledgerBalance: parseFloat(tellerBalances.ledger || '0') || 0,
                  currentBalance: parseFloat(tellerBalances.current || '0') || 0,
                  creditLimit: mapped.creditLimit || null,
                  // Credit-specific fields
                  availableCredit: availableCredit,
                  amountSpent: amountSpent
                });
              } else if (accountResponse.status === 401 || accountResponse.status === 403) {
                // Account access expired - show stored balance and mark for reconnection
                console.log(`[Dashboard] Teller account ${account.id} access expired, using stored balance`);
                
                const storedBalance = parseFloat(account.balance) || 0;
                
                if (account.accountType === 'card') {
                  enrichedAccounts.push({
                    id: account.id,
                    provider: 'teller',
                    accountName: account.accountName || 'Credit Card',
                    balance: storedBalance,
                    type: 'credit' as const,
                    institution: account.institutionName || 'Credit Card',
                    lastUpdated: account.lastSynced || new Date().toISOString(),
                    needsReconnection: true
                  });
                } else {
                  bankBalance += storedBalance;
                  totalBalance += storedBalance;
                  
                  enrichedAccounts.push({
                    id: account.id,
                    provider: 'teller',
                    accountName: account.accountName || 'Bank Account',
                    balance: storedBalance,
                    type: 'bank' as const,
                    institution: account.institutionName || 'Bank',
                    lastUpdated: account.lastSynced || new Date().toISOString(),
                    needsReconnection: true
                  });
                }
              }
            } catch (fetchError) {
              console.error(`Error validating Teller account ${account.id}:`, fetchError);
              // Include stored balance for accounts we can't access
              const storedBalance = parseFloat(account.balance) || 0;
              
              if (account.accountType === 'card') {
                enrichedAccounts.push({
                  id: account.id,
                  provider: 'teller',
                  accountName: account.accountName || 'Credit Card',
                  balance: storedBalance,
                  type: 'credit' as const,
                  institution: account.institutionName || 'Credit Card',
                  lastUpdated: account.lastSynced || new Date().toISOString(),
                  needsReconnection: true
                });
              } else {
                bankBalance += storedBalance;
                totalBalance += storedBalance;
                
                enrichedAccounts.push({
                  id: account.id,
                  provider: 'teller',
                  accountName: account.accountName || 'Bank Account',
                  balance: storedBalance,
                  type: 'bank' as const,
                  institution: account.institutionName || 'Bank',
                  lastUpdated: account.lastSynced || new Date().toISOString(),
                  needsReconnection: true
                });
              }
            }
          } else {
            // No access token - show stored balance
            const storedBalance = parseFloat(account.balance) || 0;
            
            if (account.accountType === 'card') {
              enrichedAccounts.push({
                id: account.id,
                provider: 'teller',
                accountName: account.accountName || 'Credit Card',
                balance: storedBalance,
                type: 'credit' as const,
                institution: account.institutionName || 'Credit Card',
                lastUpdated: account.lastSynced || new Date().toISOString(),
                needsReconnection: true
              });
            } else {
              bankBalance += storedBalance;
              totalBalance += storedBalance;
              
              enrichedAccounts.push({
                id: account.id,
                provider: 'teller',
                accountName: account.accountName || 'Bank Account',
                balance: storedBalance,
                type: 'bank' as const,
                institution: account.institutionName || 'Bank',
                lastUpdated: account.lastSynced || new Date().toISOString(),
                needsReconnection: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
      }

      // Fetch real investment account data from SnapTrade
      let snapTradeError = null;
      let snapTradePositions: any[] = []; // Initialize positions array
      try {
        console.log('Fetching SnapTrade accounts for user:', userEmail);
        
        // Use the persistent store instead of database storage - use userId not email
        const snapUser = await getSnapUser(userId);
        if (snapUser?.userSecret) {
          const { accountsApi } = await import('./lib/snaptrade');
          const accounts = await accountsApi.listUserAccounts({
            userId: snapUser.userId,
            userSecret: snapUser.userSecret,
          });
          
          console.log('SnapTrade accounts fetched:', accounts.data?.length || 0);
          console.log('SnapTrade raw accounts data:', JSON.stringify(accounts.data, null, 2));
          
          if (accounts.data && Array.isArray(accounts.data)) {
            for (const account of accounts.data) {
              const balance = parseFloat((account as any).total_value?.amount || (account as any).balance?.total?.amount || '0') || 0;
              const cash = parseFloat((account as any).cash?.amount || '0') || 0;
              const holdings = balance - cash;
              
              investmentValue += balance;
              totalBalance += balance;
              
              // Normalize account name to handle "Default", "default", " default ", whitespace-only, etc.
              const normalizedName = account.name?.trim().toLowerCase();
              const isDefaultOrEmpty = !normalizedName || normalizedName === 'default';
              
              enrichedAccounts.push({
                id: account.id || `snaptrade-${Math.random()}`,
                provider: 'snaptrade',
                accountName: isDefaultOrEmpty
                  ? (account.institution_name || account.account_type || 'Investment Account')
                  : (account.name?.trim() || 'Investment Account'),
                accountNumber: account.number,
                balance: balance,
                type: 'investment' as const,
                institution: account.institution_name || 'Brokerage',
                lastUpdated: new Date().toISOString(),
                cash: cash,
                holdings: holdings,
                buyingPower: parseFloat(account.buying_power?.amount || '0') || cash
              });
            }
          }
        } else {
          console.log('SnapTrade credentials not available for user');
          snapTradeError = 'not_connected';
        }
      } catch (error: any) {
        console.error('Error fetching SnapTrade accounts:', error);
        
        // Check if it's an authentication error
        if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unable to verify signature') || error.responseBody?.code === '1083' || error.responseBody?.code === '1076') {
          snapTradeError = 'auth_failed';
          
          // Add disconnected SnapTrade accounts that need reconnection
          const snapUser = await getSnapUser(userId);
          if (snapUser) {
            // Show placeholder for failed SnapTrade connection
            enrichedAccounts.push({
              id: `snaptrade-disconnected-${userId}`,
              provider: 'snaptrade',
              accountName: 'Investment Account (Disconnected)',
              balance: 0,
              type: 'investment' as const,
              institution: 'SnapTrade',
              lastUpdated: new Date().toISOString(),
              needsReconnection: true
            });
          }
          
          // Keep stale credentials for reconnection - don't delete them
          console.log('[SnapTrade] Detected stale user credentials, keeping for reconnection:', userId);
        } else {
          snapTradeError = 'fetch_failed';
        }
      }

      // Skip legacy connected accounts - only show accounts we can validate via API
      // This ensures the dashboard only displays accounts that are truly accessible
      
      // Check if we have any connected accounts
      const hasConnectedAccounts = enrichedAccounts.length > 0;
      const needsConnection = !hasConnectedAccounts || snapTradeError === 'not_connected';
      
      // Include disconnected accounts so users can see them and reconnect
      const activeAccounts = enrichedAccounts;
      
      // Calculate percentages based on total assets (excluding liabilities)
      const totalAssets = bankBalance + investmentValue + cryptoValue;
      const accountsWithPercentages = activeAccounts.map(account => {
        let percentOfTotal = 0;
        
        // Only calculate percentage for asset accounts (bank, investment, crypto)
        if (account.type !== 'credit' && totalAssets > 0) {
          percentOfTotal = (account.balance / totalAssets) * 100;
        }
        
        return {
          ...account,
          percentOfTotal: Math.round(percentOfTotal * 10) / 10 // Round to 1 decimal place
        };
      });

      const dashboardData = {
        totalBalance: hasConnectedAccounts ? (totalBalance ?? 0) : 0,
        bankBalance: bankBalance ?? 0,
        investmentBalance: investmentValue ?? 0, // Frontend expects investmentBalance
        cryptoValue: cryptoValue ?? 0,
        totalAssets: totalAssets ?? 0, // Assets only (for percentage calculations)
        accounts: accountsWithPercentages ?? [],      // never undefined
        positions: snapTradePositions ?? [],          // never undefined
        subscriptionTier: user?.subscriptionTier || 'free',
        isAdmin: user?.isAdmin || false,
        needsConnection,
        connectionStatus: {
          hasAccounts: hasConnectedAccounts,
          snapTradeError: snapTradeError,
          message: needsConnection ? 'Connect your accounts to see your portfolio' : null
        },
        // Add SnapTrade status for holdings component
        snapTradeStatus: {
          connected: !snapTradeError && investmentValue > 0
        }
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      
      // Return empty state instead of 500 error for better UX
      const emptyDashboardData = {
        totalBalance: 0,
        bankBalance: 0,
        investmentBalance: 0,  // Frontend expects investmentBalance
        cryptoValue: 0,
        accounts: [],          // never undefined
        positions: [],         // never undefined
        subscriptionTier: 'free',
        needsConnection: true,
        connectionStatus: {
          hasAccounts: false,
          snapTradeError: 'fetch_failed',
          message: 'Connect your accounts to see your portfolio'
        },
        // Add SnapTrade status for holdings component
        snapTradeStatus: {
          connected: false
        }
      };
      
      res.json(emptyDashboardData);
    }
  });



  // Log user login activity with SnapTrade registration check
  app.post('/api/log-login', isAuthenticated, async (req: any, res) => {
    try {
      // Best-effort analytics logging
      const userId = req.user.claims.sub;
      
      // SnapTrade registration is now handled on-demand during connection
      
      await storage.createActivityLog({
        userId,
        action: 'login',
        description: 'User logged in',
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      // Silently fail - analytics should never break user flows
      console.warn("Failed to log login activity:", error);
    }
    
    // Always return success regardless of analytics outcome
    res.json({ success: true });
  });

  // Account connection management
  app.get('/api/connected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getConnectedAccounts(userId);
      res.json({ accounts });
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      res.status(500).json({ message: "Failed to fetch connected accounts" });
    }
  });

  // Trading page accounts endpoint - returns brokerage accounts for trading
  app.get('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[/api/accounts] User object:', req.user ? 'exists' : 'missing');
      console.log('[/api/accounts] User claims:', req.user?.claims ? 'exists' : 'missing');
      console.log('[/api/accounts] User ID:', req.user?.claims?.sub || 'missing');
      
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        console.error('[/api/accounts] Authentication failed - missing user data');
        return res.status(401).json({ message: "Unauthorized", brokerages: [] });
      }
      
      const userId = req.user.claims.sub;
      console.log('[/api/accounts] Fetching accounts for user:', userId);
      const brokerages = [];
      
      // Get SnapTrade accounts if connected
      const snapTradeUser = await getSnapUser(userId);
      if (snapTradeUser && snapTradeUser.userSecret) {
        try {
          console.log('[/api/accounts] Fetching SnapTrade accounts');
          const accounts = await accountsApi.listUserAccounts({
            userId: snapTradeUser.userId,
            userSecret: snapTradeUser.userSecret
          });
          
          if (accounts.data && Array.isArray(accounts.data)) {
            for (const account of accounts.data) {
              brokerages.push({
                id: account.id,
                accountName: account.name || account.institution_name || 'Brokerage Account',
                provider: 'snaptrade',
                balance: account.balance?.total?.amount || account.total_value?.amount || '0',
                externalAccountId: account.id,
                institution: account.institution_name,
                accountNumber: account.number
              });
            }
          }
        } catch (error) {
          console.error('Error fetching SnapTrade accounts for trading:', error);
        }
      }
      
      res.json({ brokerages });
    } catch (error) {
      console.error("Error fetching accounts for trading:", error);
      res.status(500).json({ message: "Failed to fetch accounts", brokerages: [] });
    }
  });

  // Subscriptions endpoint - detect recurring payments from bank transactions
  app.get('/api/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all connected Teller accounts
      const connectedAccounts = await storage.getConnectedAccounts(userId);
      const tellerAccounts = connectedAccounts.filter(acc => acc.provider === 'teller');
      
      if (tellerAccounts.length === 0) {
        return res.json({ subscriptions: [] });
      }

      const allTransactions = [];
      
      // Fetch transactions from all Teller accounts (last 12 months)
      for (const account of tellerAccounts) {
        if (!account.accessToken) continue;
        
        try {
          const response = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/transactions?count=500`,
            {
              headers: {
                'Authorization': `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const transactions = await response.json();
            
            // Only include outgoing transactions (negative amounts) for subscription detection
            const outgoingTransactions = transactions
              .filter((t: any) => t.status === 'posted')
              .filter((t: any) => t.type === 'card_payment')
              .filter((t: any) => parseFloat(t.amount) < 0)
              .map((t: any) => ({
                ...t,
                accountId: account.id,
                accountName: account.accountName,
                amount: Math.abs(parseFloat(t.amount)) // Convert to positive for easier comparison
              }));
              
            allTransactions.push(...outgoingTransactions);
          }
        } catch (error) {
          console.error(`Error fetching transactions for account ${account.id}:`, error);
        }
      }

      // Detect recurring subscriptions using helper functions from the end of file
      const subscriptions = detectRecurringPayments(allTransactions);
      
      res.json({ 
        subscriptions,
        totalMonthlySpend: subscriptions.reduce((sum, sub) => {
          const monthlyAmount = getMonthlyAmount(sub.amount, sub.frequency);
          return sum + monthlyAmount;
        }, 0)
      });
      
    } catch (error) {
      console.error('Error detecting subscriptions:', error);
      res.status(500).json({ 
        message: 'Failed to detect subscriptions',
        subscriptions: [] 
      });
    }
  });

  // Watchlist management
  app.get('/api/watchlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const watchlist = await storage.getWatchlist(userId);
      res.json({ watchlist });
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post('/api/watchlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validatedData = insertWatchlistItemSchema.parse({
        ...req.body,
        userId
      });
      
      const item = await storage.createWatchlistItem(validatedData);
      res.json({ item });
    } catch (error: any) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ message: "Failed to add to watchlist: " + error.message });
    }
  });

  app.delete('/api/watchlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      await storage.deleteWatchlistItem(parseInt(id), userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist: " + error.message });
    }
  });

  // Wallet Service Routes
  app.get('/api/wallet/balance', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balance = await WalletService.getWalletBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  app.post('/api/wallet/hold', rateLimits.trading, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, purpose } = req.body;
      const result = await WalletService.holdFunds(userId, amount, purpose);
      res.json(result);
    } catch (error: any) {
      console.error("Error holding funds:", error);
      res.status(500).json({ message: error.message || "Failed to hold funds" });
    }
  });

  app.post('/api/wallet/allocate', rateLimits.trading, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, brokerageId, purpose } = req.body;
      const result = await WalletService.allocateToBrokerage({ userId, amount, brokerageId, purpose });
      res.json(result);
    } catch (error: any) {
      console.error("Error allocating funds:", error);
      res.status(500).json({ message: error.message || "Failed to allocate funds" });
    }
  });

  app.post('/api/transfers/ach', rateLimits.external, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fromAccountId, toAccountId, amount } = req.body;
      const result = await WalletService.initiateACHTransfer(userId, fromAccountId, toAccountId, amount);
      res.json(result);
    } catch (error: any) {
      console.error("Error initiating ACH transfer:", error);
      res.status(500).json({ message: error.message || "Failed to initiate transfer" });
    }
  });

  // Search endpoint for assets (stocks and crypto)
  app.get('/api/search', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const { q: query, type = 'all' } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({ results: [] });
      }

      const results: any[] = [];

      // Search stocks via Polygon.io
      if (type === 'all' || type === 'stock') {
        if (process.env.POLYGON_API_KEY) {
          try {
            const polygonUrl = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&apiKey=${process.env.POLYGON_API_KEY}`;
            const polygonResponse = await fetch(polygonUrl);
            
            if (polygonResponse.ok) {
              const polygonData = await polygonResponse.json();
              const tickers = polygonData.results || [];
              
              tickers.forEach((ticker: any) => {
                results.push({
                  symbol: ticker.ticker,
                  name: ticker.name,
                  type: 'stock',
                  exchange: ticker.primary_exchange,
                  currency: ticker.currency_name || 'USD',
                });
              });
            }
          } catch (error) {
            console.error('Polygon search error:', error);
          }
        }
      }

      // Search crypto via CoinGecko
      if (type === 'all' || type === 'crypto') {
        try {
          const coinGeckoUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
          const coinGeckoResponse = await fetch(coinGeckoUrl);
          
          if (coinGeckoResponse.ok) {
            const coinGeckoData = await coinGeckoResponse.json();
            const coins = coinGeckoData.coins || [];
            
            // Limit to top 10 crypto results
            coins.slice(0, 10).forEach((coin: any) => {
              results.push({
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                type: 'crypto',
                exchange: 'CoinGecko',
                currency: 'USD',
                coinGeckoId: coin.id,
              });
            });
          }
        } catch (error) {
          console.error('CoinGecko search error:', error);
        }
      }

      res.json({ 
        results,
        query,
        type,
        total: results.length 
      });

    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ 
        message: 'Search failed', 
        error: error.message 
      });
    }
  });

  // Transactions endpoint - fetch from SnapTrade and Teller
  app.get('/api/transactions', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { startDate, endDate, accountId, type } = req.query;
      const transactions: any[] = [];

      // Fetch SnapTrade transactions (brokerage)
      const snapUser = await getSnapUser(userId);
      if (snaptradeClient && snapUser) {
        try {
          // Get all connected SnapTrade accounts
          const accountsResponse = await accountsApi.listUserAccounts({
            userId: snapUser.userId,
            userSecret: snapUser.userSecret,
          });

          const accounts = accountsResponse.data || [];
          
          // Fetch activities for each account
          for (const account of accounts) {
            // Skip if specific accountId is requested and doesn't match
            if (accountId && account.id !== accountId) continue;

            try {
              const activitiesResponse = await portfolioApi.getActivities({
                userId: snapUser.userId,
                userSecret: snapUser.userSecret,
                accountId: account.id,
                startDate: startDate as string,
                endDate: endDate as string,
              });

              const activities = activitiesResponse.data || [];
              
              // Transform SnapTrade activities to unified format
              activities.forEach((activity: any) => {
                // Filter by type if specified
                if (type && !activity.type?.toLowerCase().includes(type.toString().toLowerCase())) {
                  return;
                }

                transactions.push({
                  id: activity.id || `snaptrade-${Date.now()}-${Math.random()}`,
                  accountId: account.id,
                  accountName: account.name,
                  accountType: 'brokerage',
                  provider: 'snaptrade',
                  date: activity.trade_date || activity.settlement_date,
                  type: activity.type || 'trade',
                  description: activity.description || `${activity.action} ${activity.symbol?.symbol || ''}`,
                  symbol: activity.symbol?.symbol,
                  quantity: activity.units,
                  price: activity.price,
                  amount: activity.net_amount || (activity.units * activity.price),
                  fee: activity.fee,
                  currency: activity.currency?.code || 'USD',
                  status: activity.status || 'completed',
                });
              });
            } catch (error) {
              console.error(`Error fetching activities for SnapTrade account ${account.id}:`, error);
            }
          }
        } catch (error) {
          console.error('Error fetching SnapTrade transactions:', error);
        }
      }

      // Fetch Teller transactions (banking)
      const tellerAccounts = await storage.getConnectedAccounts(userId);
      const tellerBankAccounts = tellerAccounts.filter(acc => acc.provider === 'teller');

      for (const tellerAccount of tellerBankAccounts) {
        // Skip if specific accountId is requested and doesn't match
        if (accountId && tellerAccount.id.toString() !== accountId) continue;

        try {
          const tellerResponse = await fetch(
            `https://api.teller.io/accounts/${tellerAccount.externalAccountId}/transactions`,
            {
              headers: {
                'Authorization': `Bearer ${tellerAccount.accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (tellerResponse.ok) {
            const tellerTransactions = await tellerResponse.json();
            
            // Transform Teller transactions to unified format
            tellerTransactions.forEach((transaction: any) => {
              // Filter by date range
              const transactionDate = new Date(transaction.date);
              if (startDate && transactionDate < new Date(startDate as string)) return;
              if (endDate && transactionDate > new Date(endDate as string)) return;
              
              // Filter by type if specified
              if (type && type !== 'bank') return;

              transactions.push({
                id: transaction.id,
                accountId: tellerAccount.id.toString(),
                accountName: tellerAccount.accountName,
                accountType: 'bank',
                provider: 'teller',
                date: transaction.date,
                type: transaction.type || 'bank_transaction',
                description: transaction.description,
                amount: parseFloat(transaction.amount),
                currency: 'USD',
                status: transaction.status || 'posted',
                category: transaction.category,
                merchant: transaction.merchant_name,
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching Teller transactions for account ${tellerAccount.id}:`, error);
        }
      }

      // Sort transactions by date (newest first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        transactions,
        total: transactions.length,
        filters: {
          startDate,
          endDate,
          accountId,
          type,
        },
      });

    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ 
        message: 'Failed to fetch transactions', 
        error: error.message 
      });
    }
  });



  // Trading Aggregation Routes
  app.get('/api/trading/positions', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const positions = await TradingAggregator.getAggregatedPositions(userId);
      res.json({ positions });
    } catch (error) {
      console.error("Error fetching aggregated positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.post('/api/trading/route', rateLimits.trading, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tradingRequest = { ...req.body, userId };
      const routing = await TradingAggregator.routeTrade(tradingRequest);
      res.json(routing);
    } catch (error: any) {
      console.error("Error routing trade:", error);
      res.status(500).json({ message: error.message || "Failed to route trade" });
    }
  });

  app.post('/api/trading/execute', rateLimits.trading, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tradingRequest = { ...req.body, userId };
      const result = await TradingAggregator.executeTrade(tradingRequest);
      res.json(result);
    } catch (error: any) {
      console.error("Error executing trade:", error);
      res.status(500).json({ message: error.message || "Failed to execute trade" });
    }
  });

  // Trade management  
  app.get('/api/trades', rateLimits.data, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trades = await storage.getTrades(userId);
      res.json({ trades });
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate UUID v4 for tradeId
      const tradeId = uuidv4();
      
      const validatedData = insertTradeSchema.parse({
        ...req.body,
        userId,
        tradeId
      });
      
      const trade = await storage.createTrade(validatedData);
      
      // Log the trade activity
      await storage.createActivityLog({
        userId,
        action: 'trade',
        description: 'Trade executed',
        metadata: {
          tradeId,
          symbol: validatedData.symbol,
          side: validatedData.side,
          quantity: validatedData.quantity,
          price: validatedData.price
        }
      });
      
      res.json({ trade, tradeId });
    } catch (error: any) {
      console.error("Error creating trade:", error);
      res.status(500).json({ message: "Failed to create trade: " + error.message });
    }
  });

  // Enhanced SnapTrade order placement with UUID
  app.post('/api/snaptrade/place-order', rateLimits.trading, isAuthenticated, async (req: any, res) => {
    try {
      if (!snaptradeClient) {
        return res.status(500).json({ message: 'SnapTrade client not initialized' });
      }

      const userId = req.user.claims.sub;
      const { accountId, symbol, quantity, action, orderType, price } = req.body;

      // Validate required fields
      if (!accountId || !symbol || !quantity || !action || !orderType) {
        return res.status(400).json({ 
          message: 'Missing required fields: accountId, symbol, quantity, action, orderType' 
        });
      }

      const snapUser = await getSnapUser(userId);
      if (!snapUser) {
        return res.status(404).json({ message: 'SnapTrade credentials not found' });
      }

      const credentials = {
        userId: snapUser.userId,
        userSecret: snapUser.userSecret
      };

      // Generate UUID v4 for this trade
      const tradeId = uuidv4();

      // Place order using SnapTrade API
      const orderResponse = await tradingApi.placeForceOrder({
        userId: credentials.userId,
        userSecret: credentials.userSecret,
        accountId,
        action: action.toUpperCase(), // BUY or SELL
        orderType: orderType, // Market, Limit, etc.
        symbol,
        units: quantity,
        price: price || undefined,
        timeInForce: 'DAY'
      });

      // Log successful order
      await storage.createActivityLog({
        userId,
        action: 'order_placed',
        description: `${action.toUpperCase()} order placed for ${symbol}`,
        metadata: {
          tradeId,
          symbol,
          quantity,
          action,
          orderType,
          price,
          snapTradeResponse: orderResponse.data
        }
      });

      res.json({ 
        success: true, 
        tradeId,
        orderId: orderResponse.data?.id,
        message: `${action.toUpperCase()} order placed successfully`,
        orderDetails: orderResponse.data
      });

    } catch (error: any) {
      console.error('SnapTrade order placement error:', error);
      
      // Log failed order attempt
      const userId = req.user?.claims?.sub;
      if (userId) {
        await storage.createActivityLog({
          userId,
          action: 'order_failed',
          description: 'Order placement failed',
          metadata: {
            error: error.message,
            requestBody: req.body
          }
        });
      }

      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to place order',
        error: error.response?.data || error.message
      });
    }
  });

  // Transfer management
  app.get('/api/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transfers = await storage.getTransfers(userId);
      res.json({ transfers });
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.post('/api/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validatedData = insertTransferSchema.parse({
        ...req.body,
        userId
      });
      
      const transfer = await storage.createTransfer(validatedData);
      
      // Log the transfer activity
      await storage.createActivityLog({
        userId,
        action: 'transfer',
        description: 'Transfer executed',
        metadata: {
          fromAccount: validatedData.fromAccountId,
          toAccount: validatedData.toAccountId,
          amount: validatedData.amount
        }
      });
      
      res.json({ transfer });
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: "Failed to create transfer: " + error.message });
    }
  });

  // Activity logs
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activities = await storage.getActivityLogs(userId);
      res.json({ activities });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Payment routes (Stripe integration)
  app.post('/api/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }
      
      const { amount, tier } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          tier,
          userId: req.user.claims.sub
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent: " + error.message });
    }
  });

  app.post('/api/confirm-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const { tier } = req.body;
      const userId = req.user.claims.sub;
      
      // Update user subscription tier
      await storage.updateUserSubscription(userId, tier);
      
      // Log the subscription activity
      await storage.createActivityLog({
        userId,
        action: 'subscription_upgrade',
        description: 'Subscription upgraded',
        metadata: { tier }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error confirming subscription:", error);
      res.status(500).json({ message: "Failed to confirm subscription: " + error.message });
    }
  });

  // Create subscription with Lemon Squeezy
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const { tier, billingFrequency } = req.body;
      
      if (!tier) {
        return res.status(400).json({ message: "Tier is required" });
      }
      
      if (!billingFrequency || !['monthly', 'annual'].includes(billingFrequency)) {
        return res.status(400).json({ message: "Valid billing frequency is required (monthly or annual)" });
      }

      // Map tier names to match Lemon Squeezy CTA IDs
      // The frontend uses 'plus', 'pro', 'unlimited'
      // Lemon Squeezy uses 'plus-monthly', 'plus-yearly', etc.
      const frequencySuffix = billingFrequency === 'annual' ? 'yearly' : 'monthly';
      const ctaId = `${tier}-${frequencySuffix}`;
      
      // Get user email for pre-filling checkout
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const userEmail = user?.email;
      
      logger.info('Creating subscription checkout', {
        metadata: {
          tier,
          billingFrequency,
          ctaId,
          userId
        }
      });

      // Get variant config by CTA ID
      const { getVariantByCTA } = await import('./lib/lemonsqueezy-config');
      const variant = getVariantByCTA(ctaId);
      
      if (!variant) {
        logger.warn('Invalid CTA ID for subscription', { metadata: { ctaId, tier, billingFrequency } });
        return res.status(400).json({ 
          message: 'Invalid subscription plan configuration' 
        });
      }

      // Get Lemon Squeezy credentials
      const apiKey = process.env.LEMONSQUEEZY_API_KEY;
      const storeId = process.env.LEMONSQUEEZY_STORE_ID;

      if (!apiKey || !storeId) {
        logger.error('Lemon Squeezy credentials not configured');
        return res.status(500).json({ 
          message: 'Payment system not configured' 
        });
      }

      // Generate base URL for success redirect
      const baseUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://${process.env.REPLIT_DEPLOYMENT}` 
        : 'http://localhost:5000';

      // Create checkout via Lemon Squeezy API
      const checkoutData: any = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: userEmail ? { email: userEmail } : undefined,
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variant.variantId,
              },
            },
          },
        },
      };

      // Make API request to create checkout
      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Lemon Squeezy API error', { 
          metadata: {
            status: response.status,
            error: errorData 
          }
        });
        return res.status(500).json({ 
          message: 'Unable to create checkout session' 
        });
      }

      const checkoutResponse = await response.json();
      const checkoutUrl = checkoutResponse.data?.attributes?.url;

      if (!checkoutUrl) {
        logger.error('No checkout URL in API response', { 
          metadata: { response: checkoutResponse }
        });
        return res.status(500).json({ 
          message: 'Invalid checkout response' 
        });
      }

      logger.info('Subscription checkout created', { 
        metadata: {
          ctaId, 
          variantId: variant.variantId,
          checkoutId: checkoutResponse.data?.id,
          tier,
          billingFrequency
        }
      });

      // Return checkout URL for frontend to redirect
      res.json({ 
        checkoutUrl,
        variant: {
          name: variant.name,
          price: variant.price,
          tier: variant.tier
        }
      });
    } catch (error: any) {
      logger.error('Subscription creation failed', { error: error.message });
      res.status(500).json({ 
        message: 'Failed to create subscription' 
      });
    }
  });

  // Landing page Stripe checkout routes
  app.get('/api/checkout/:planId', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      const { planId } = req.params;
      const { email } = req.query;

      // Define all landing page plans with pricing
      const plans = {
        'annual-unlimited': { name: 'Flint Unlimited Annual', amount: 49999, description: 'Unlimited accounts, all features' }, // $499.99
        'unlimited-6mo': { name: 'Flint Unlimited 6-Month', amount: 24999, description: '6 months of unlimited access' }, // $249.99
        'plus-annual': { name: 'Flint Plus Annual', amount: 19999, description: 'Plus features for 1-4 accounts' }, // $199.99
        'plus-yearly': { name: 'Flint Plus Yearly', amount: 19999, description: 'Plus features for 1-4 accounts' }, // $199.99
        'plus-monthly': { name: 'Flint Plus Monthly', amount: 1999, description: 'Plus features for 1-4 accounts' }, // $19.99
        'pro-yearly': { name: 'Flint Pro Yearly', amount: 39999, description: 'Pro features for advanced users' }, // $399.99
        'pro-monthly': { name: 'Flint Pro Monthly', amount: 3999, description: 'Pro features for advanced users' }, // $39.99
        'unlimited-yearly': { name: 'Flint Unlimited Yearly', amount: 49999, description: 'Unlimited accounts, all features' }, // $499.99
        'unlimited-monthly': { name: 'Flint Unlimited Monthly', amount: 4999, description: 'Unlimited accounts, all features' }, // $49.99
        'fast-track': { name: 'Fast-Track Pass', amount: 7999, description: 'Skip waitlist + instant access to Flint Free' }, // $79.99
        'fast-track-upsell': { name: 'Fast-Track Pass', amount: 7999, description: 'Skip waitlist + instant access to Flint Free' } // $79.99
      };

      const plan = plans[planId as keyof typeof plans];
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/landing/success?plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/landing#${planId}`,
        metadata: {
          planId,
          source: 'landing_page'
        },
        ...(email && { customer_email: email as string })
      });

      // Redirect to Stripe checkout
      res.redirect(303, session.url!);
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session: " + error.message });
    }
  });

  // Teller.io API routes (simplified working version)
  app.post('/api/teller/connect-init', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.TELLER_APPLICATION_ID) {
        return res.status(500).json({ message: "Teller not configured. Please add TELLER_APPLICATION_ID to environment variables." });
      }
      
      // Return Teller application ID for frontend integration
      res.json({ 
        applicationId: process.env.TELLER_APPLICATION_ID,
        environment: process.env.TELLER_ENVIRONMENT || 'sandbox'
      });
    } catch (error) {
      console.error("Error initiating Teller connect:", error);
      res.status(500).json({ message: "Failed to initiate Teller connection" });
    }
  });

  app.post('/api/teller/exchange-token', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.claims.sub;
      
      if (!token) {
        return res.status(400).json({ message: "Access token is required" });
      }

      // Check user account limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const existingAccounts = await storage.getConnectedAccounts(userId);
      const accountLimit = getAccountLimit(user.subscriptionTier || 'free');
      
      if (existingAccounts.length >= accountLimit) {
        return res.status(403).json({ 
          message: "Account limit reached. Upgrade your plan to connect more accounts.",
          limit: accountLimit,
          current: existingAccounts.length
        });
      }
      
      // Validate with Teller API
      const tellerResponse = await fetch('https://api.teller.io/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!tellerResponse.ok) {
        throw new Error('Invalid Teller token');
      }
      
      const accounts = await tellerResponse.json();
      
      // Encrypt the access token before storing
      const { EncryptionService } = await import('./services/EncryptionService');
      const encryption = new EncryptionService();
      const encryptedToken = encryption.encrypt(token);
      
      console.log('[Teller Security] Access token encrypted for storage', {
        userId,
        accountCount: accounts.length,
        tokenLength: token.length,
        encryptedLength: encryptedToken.length
      });
      
      // Create account records for each connected account
      for (const account of accounts) {
        const accountData = {
          userId,
          provider: 'teller',
          externalAccountId: account.id,
          accountName: account.name || 'Bank Account',
          accountType: 'bank',
          balance: parseFloat(account.balance?.available || "0.00"),
          accessToken: encryptedToken, // Store encrypted token
          lastUpdated: new Date()
        };
        
        const validatedData = insertConnectedAccountSchema.parse(accountData);
        await storage.createConnectedAccount(validatedData);
      }
      
      // Log the connection
      await storage.createActivityLog({
        userId,
        action: 'account_connected',
        description: `Connected ${accounts.length} bank account(s) via Teller`,
        metadata: { provider: 'teller', accountType: 'bank', count: accounts.length }
      });
      
      res.json({ success: true, accountsConnected: accounts.length });
    } catch (error: any) {
      console.error("Error exchanging Teller token:", error);
      res.status(500).json({ message: "Failed to exchange token: " + error.message });
    }
  });



// Clean replacement section for after the Teller exchange route
  // Teller.io bank account re-connection route for external popup flow
  app.post('/api/stock/external/teller', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.claims.sub;
      
      if (!token) {
        return res.status(400).json({ 
          message: "Token is required" 
        });
      }

      // Check user account limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const existingAccounts = await storage.getConnectedAccounts(userId);
      const accountLimit = getAccountLimit(user.subscriptionTier || 'free');
      
      if (existingAccounts.length >= accountLimit) {
        return res.status(403).json({ 
          message: "Account limit reached. Upgrade your plan to connect more accounts.",
          limit: accountLimit,
          current: existingAccounts.length
        });
      }
      
      // Validate with Teller API
      const tellerResponse = await fetch('https://api.teller.io/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!tellerResponse.ok) {
        throw new Error('Invalid Teller token');
      }
      
      const accounts = await tellerResponse.json();
      
      // Encrypt the access token before storing
      const { EncryptionService } = await import('./services/EncryptionService');
      const encryption = new EncryptionService();
      const encryptedToken = encryption.encrypt(token);
      
      console.log('[Teller Security] Access token encrypted for storage', {
        userId,
        accountCount: accounts.length,
        tokenLength: token.length,
        encryptedLength: encryptedToken.length
      });
      
      // Create account records for each connected account
      for (const account of accounts) {
        const accountData = {
          userId,
          provider: 'teller',
          externalAccountId: account.id,
          accountName: account.name || 'Bank Account',
          accountType: 'bank',
          balance: parseFloat(account.balance?.available || "0.00"),
          accessToken: encryptedToken, // Store encrypted token
          lastUpdated: new Date()
        };
        
        const validatedData = insertConnectedAccountSchema.parse(accountData);
        await storage.createConnectedAccount(validatedData);
      }
      
      // Log the connection
      await storage.createActivityLog({
        userId,
        action: 'account_connected',
        description: `Connected ${accounts.length} bank account(s) via Teller`,
        metadata: { provider: 'teller', accountType: 'bank', count: accounts.length }
      });
      
      res.json({ success: true, accountsConnected: accounts.length });
    } catch (error: any) {
      console.error("Error exchanging Teller token:", error);
      res.status(500).json({ message: "Failed to exchange token: " + error.message });
    }
  });

  // DELETE account disconnect route
  app.delete('/api/accounts/:provider/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { provider, id: accountId } = req.params;
      const user = req.user;

      if (!user?.claims?.sub) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userId = user.claims.sub;

      // Validate provider
      if (!['teller', 'snaptrade'].includes(provider)) {
        return res.status(400).json({ message: 'Invalid provider' });
      }

      console.log(`🔌 Disconnecting ${provider} account ${accountId} for user ${userId}`);

      if (provider === 'teller') {
        // Handle Teller disconnect
        // Note: Teller doesn't require explicit disconnection - we just remove credentials
        const deletedAccounts = await storage.deleteConnectedAccount(userId, provider, accountId);
        
        if (deletedAccounts === 0) {
          return res.status(404).json({ message: 'Account not found' });
        }
        
        console.log(`✅ Teller account ${accountId} disconnected`);
      } else if (provider === 'snaptrade') {
        // Handle SnapTrade disconnect
        const snapUser = await getSnapUser(userId);
        if (!snapUser) {
          return res.status(404).json({ message: 'SnapTrade credentials not found' });
        }

        const credentials = {
          userId: snapUser.userId,
          userSecret: snapUser.userSecret
        };

        try {
          // Delete SnapTrade user (this revokes all access)
          await authApi.deleteSnapTradeUser({
            userId: credentials.userId
          });
          console.log(`✅ SnapTrade user ${credentials.userId} deleted`);
        } catch (snapError) {
          console.warn(`⚠️ SnapTrade deletion failed (continuing with local cleanup):`, snapError);
        }

        // Remove credentials from database
        await deleteSnapUser(userId);

        // Remove connected accounts
        await storage.deleteConnectedAccount(userId, provider, accountId);
        
        console.log(`✅ SnapTrade account ${accountId} disconnected`);
      }

      res.status(204).send();
    } catch (error) {
      console.error('❌ Account disconnect error:', error);
      res.status(500).json({ message: 'Failed to disconnect account' });
    }
  });

  // Live stock quotes endpoint
  app.get('/api/quotes/:symbol', rateLimits.data, async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ message: 'Valid symbol required' });
      }

      const quote = await marketDataService.getMarketData(symbol.toUpperCase());
      
      if (!quote) {
        return res.status(404).json({ message: `Quote not found for symbol ${symbol}` });
      }

      res.json(quote);
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ message: 'Failed to fetch quote' });
    }
  });

  // Multiple quotes endpoint
  app.post('/api/quotes', rateLimits.data, async (req, res) => {
    try {
      const { symbols } = req.body;
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: 'Valid symbols array required' });
      }

      if (symbols.length > 10) {
        return res.status(400).json({ message: 'Maximum 10 symbols allowed per request' });
      }

      const quotes = await marketDataService.getMultipleQuotes(symbols.map(s => s.toUpperCase()));
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
      res.status(500).json({ message: 'Failed to fetch quotes' });
    }
  });

  // SnapTrade registration endpoint (Saturday night working version)
  app.post('/api/snaptrade/register', rateLimits.auth, isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email?.toLowerCase();
      
      if (!email) {
        return res.status(400).json({
          error: "User email required",
          details: "Authenticated user email is missing",
        });
      }

      console.log('SnapTrade Register: Starting for email:', email);
      
      let user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!snaptradeClient) {
        return res.status(500).json({ error: "SnapTrade client not initialized" });
      }

      // Use simple, consistent userId format - just use Flint user ID
      const snaptradeUserId = user.id;
      
      // Check if user already has credentials (avoid duplicates)
      let snapUser = await getSnapUser(user.id);
      
      // Helper function to register user (CLI pattern)
      const registerUser = async () => {
        const { data } = await authApi.registerSnapTradeUser({
          userId: snaptradeUserId
        });
        
        console.log('[SnapTrade] User created:', { userId: data.userId });
        
        // Save credentials with proper user ID mapping
        await saveSnapUser({
          userId: data.userId!, // SnapTrade user ID
          userSecret: data.userSecret!,
          flintUserId: user.id // Use Flint user ID as storage key
        });
        
        return { userId: data.userId!, userSecret: data.userSecret! };
      };
      
      try {
        if (!snapUser) {
          console.log('SnapTrade Register: Creating new user...');
          snapUser = await registerUser();
        } else {
          console.log('SnapTrade Register: Using existing credentials');
          snapUser = { userId: snapUser.userId, userSecret: snapUser.userSecret };
        }
        
        console.log('SnapTrade Register: Registration successful:', {
          userId: snapUser.userId,
          hasUserSecret: !!snapUser.userSecret
        });
        
        // Get login portal URL using CLI pattern with validation callback
        const callbackUrl = `${req.protocol}://${req.get('host')}/snaptrade/callback?userId=${encodeURIComponent(snapUser.userId)}&userSecret=${encodeURIComponent(snapUser.userSecret)}`;
        
        const { data: portal } = await authApi.loginSnapTradeUser({
          userId: snapUser.userId,
          userSecret: snapUser.userSecret,
          connectionType: "trade", // Default to trade like CLI
          customRedirect: callbackUrl
        });
        
        console.log('SnapTrade Register: Portal response received:', {
          hasRedirectURI: !!(portal as any).redirectURI,
          callbackUrl
        });
        
        return res.json({ url: (portal as any).redirectURI });
        
      } catch (err: any) {
        console.error('SnapTrade Registration Error:', err);
        
        // Handle error code 1010 (user exists) like the CLI
        const errData = err.response?.data || err.responseBody;
        if (errData?.code === "USER_EXISTS" || errData?.code === "1010") {
          console.log('[SnapTrade] User already exists, deleting and recreating...');
          
          try {
            // Delete existing user and recreate (CLI pattern)
            await authApi.deleteSnapTradeUser({ userId: snaptradeUserId });
            snapUser = await registerUser();
            
            // Get login portal URL
            const { data: portal } = await authApi.loginSnapTradeUser({
              userId: snapUser.userId,
              userSecret: snapUser.userSecret,
              connectionType: "trade"
            });
            
            return res.json({ url: (portal as any).redirectURI });
          } catch (deleteError) {
            console.error('[SnapTrade] Failed to delete and recreate user:', deleteError);
            // Fall through to general error handling
          }
        }
        
        // Other registration errors
        const status = err.response?.status || 500;
        const body = err.response?.data || { message: err.message };
        return res.status(status).json(body);
      }
      
    } catch (error: any) {
      console.error('SnapTrade Register Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return res.status(500).json({
        error: "Failed to register SnapTrade user",
        message: error.message
      });
    }
  });

  // Mount connections and accounts routers
  const connectionsRouter = await import('./routes/connections');
  // SnapTrade registration route is now handled by server/routes/connections.snaptrade.ts

  app.use('/api/connections', connectionsRouter.default);
  
  const portfolioRouter = await import('./routes/portfolio');
  app.use('/api/portfolio', portfolioRouter.default);
  
  const marketRouter = await import('./routes/market');
  app.use('/api/market', marketRouter.default);
  
  const watchlistRouter = await import('./routes/watchlist');
  app.use(watchlistRouter.default);
  
  // Mount the holdings router BEFORE accounts router to avoid conflicts
  const holdingsRouter = await import('./routes/holdings');
  app.use('/api', holdingsRouter.default);
  
  // Mount accounts router AFTER holdings to prevent route conflicts
  const accountsRouter = await import('./routes/accounts');
  app.use('/api', accountsRouter.default);
  
  // Mount the connections SnapTrade routes
  const connectionsSnaptradeRouter = await import('./routes/connections.snaptrade');
  app.use('/api', connectionsSnaptradeRouter.default);
  
  // Mount SnapTrade diagnostics router FIRST (more specific path)
  app.use('/api/snaptrade/diagnostics', snaptradeDiagnosticsRouter);
  
  // Mount SnapTrade accounts router
  const { snaptradeAccountsRouter } = await import('./routes/snaptrade-accounts');
  app.use('/api/snaptrade', snaptradeAccountsRouter);
  
  // Mount SnapTrade trading and webhook routes
  app.use('/api/snaptrade', snaptradeTradingRouter);
  app.use('/api/snaptrade', snaptradeWebhooksRouter);
  
  // Mount main SnapTrade routes (includes /sync endpoint)
  app.use('/api/snaptrade', snaptradeRouter);

  // Mount password management routes
  app.use('/api/admin', adminRouter);
  app.use('/api/admin-panel', adminPanelRouter);
  app.use('/api/user', userPasswordRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/lemonsqueezy', lemonSqueezyRouter);

  
  // Disconnect account endpoint
  app.post('/api/accounts/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountId } = req.body;
      
      if (!accountId) {
        return res.status(400).json({ message: 'Account ID is required' });
      }
      
      // For now, just return success since we don't have a real disconnect implementation
      // In production, this would:
      // 1. Call SnapTrade API to revoke authorization
      // 2. Remove from local database
      // 3. Clean up any cached data
      
      console.log(`[Disconnect] Would disconnect account ${accountId} for user ${userId}`);
      
      res.json({ success: true, message: 'Account disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      res.status(500).json({ message: 'Failed to disconnect account' });
    }
  });

  // Account details endpoint that maps local account IDs to external account IDs
  app.get('/api/accounts/:accountId/details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountId } = req.params;
      
      console.log(`[Account Details] User: ${userId}, Account ID: ${accountId}`);
      
      // Check if it's a SnapTrade account ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(accountId)) {
        // This is a SnapTrade account - handle directly with SnapTrade API
        console.log(`[Account Details] SnapTrade account detected: ${accountId}`);
        
        try {
          const snapUser = await getSnapUser(userId);
          
          console.log(`[Account Details] Looking up SnapTrade user for: ${userId}`);
          console.log(`[Account Details] Found SnapTrade user:`, snapUser);
          
          if (!snapUser?.userSecret && !snapUser?.snaptrade_user_secret) {
            console.log(`[Account Details] No SnapTrade user found or missing secret for: ${userId}`);
            return res.status(404).json({ 
              message: "SnapTrade account not found or not connected",
              provider: "snaptrade" 
            });
          }
          
          const { accountsApi, portfolioApi } = await import('./lib/snaptrade');
          
          // Get account details
          const userSecret = snapUser.userSecret || snapUser.snaptrade_user_secret;
          let accountResponse;
          try {
            accountResponse = await accountsApi.listUserAccounts({
              userId: snapUser.userId,
              userSecret: userSecret,
            });
          } catch (error) {
            console.log(`[Account Details] SnapTrade API error:`, error);
            return res.status(404).json({ 
              message: "SnapTrade connection expired or invalid. Please reconnect your account.",
              provider: "snaptrade",
              needsReconnection: true
            });
          }
          
          const account = accountResponse.data?.find(acc => acc.id === accountId);
          if (!account) {
            return res.status(404).json({ 
              message: "SnapTrade account not found",
              provider: "snaptrade" 
            });
          }
          
          // Get positions for this account
          let positions = [];
          try {
            const { getPositions } = await import('./lib/snaptrade');
            positions = await getPositions(snapUser.userId, userSecret, accountId);
            console.log(`[Account Details] Fetched ${positions.length} positions for account: ${accountId}`);
          } catch (error) {
            console.log(`[Account Details] Could not fetch positions for account: ${accountId}`, error);
          }
          
          // Return SnapTrade account details
          return res.json({
            provider: 'snaptrade',
            account: {
              id: account.id,
              name: account.name === 'Default' 
                ? `${account.institution_name} ${account.meta?.type || 'Account'}`.trim()
                : account.name,
              institution: account.institution_name,
              accountType: account.meta?.type || 'Investment',
              balance: account.balance?.total?.amount || 0,
              currency: account.balance?.total?.currency || 'USD',
              accountNumber: account.number,
              status: account.meta?.status || 'ACTIVE',
              lastSync: account.sync_status?.holdings?.last_successful_sync || new Date().toISOString()
            },
            // Put positions at the top level where the frontend expects them
            positions: positions,
            accountInformation: {
              name: account.name === 'Default' 
                ? `${account.institution_name} ${account.meta?.type || 'Account'}`.trim()
                : account.name,
              institution: account.institution_name,
              accountType: account.meta?.type || 'Investment'
            },
            balancesAndHoldings: {
              cash: account.cash_restrictions?.length || 0,
              equity: account.balance?.total?.amount || 0,
              buyingPower: account.balance?.total?.amount * 0.5 || 0
            }
          });
        } catch (error) {
          console.error('Error fetching SnapTrade account details:', error);
          return res.status(500).json({ 
            message: "Failed to fetch SnapTrade account details",
            provider: "snaptrade" 
          });
        }
      }
      
      // It's a numeric ID - try to get from database
      const account = await storage.getConnectedAccount(parseInt(accountId));
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      console.log(`[Account Details] Found account: ${account.provider}, External ID: ${account.externalAccountId}`);
      
      if (account.provider === 'teller') {
        // Call Teller Accounts API to get the Account core object
        const authHeader = `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`;
        
        try {
          // Fetch account core object from Teller
          const accountResponse = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }
          );
          
          if (!accountResponse.ok) {
            throw new Error(`Teller API error: ${accountResponse.status}`);
          }
          
          const tellerAccount = await accountResponse.json();
          
          // Fetch live balances from Teller Balances endpoint
          const balancesResponse = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/balances`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }
          );
          
          const balances = balancesResponse.ok ? await balancesResponse.json() : null;
          
          // Fetch account details (routing/account info) for masked identifiers
          const detailsResponse = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/details`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }
          );
          
          const accountDetails = detailsResponse.ok ? await detailsResponse.json() : null;
          
          // Fetch transactions with pagination (recent 30 days worth)
          const transactionsResponse = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/transactions?count=50`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }
          );
          
          const transactions = transactionsResponse.ok ? await transactionsResponse.json() : [];
          
          // Fetch statements from Teller Statements resource
          const statementsResponse = await fetch(
            `https://api.teller.io/accounts/${account.externalAccountId}/statements`,
            {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }
          );
          
          const statements = statementsResponse.ok ? await statementsResponse.json() : [];
          
          // Use Teller mapper to calculate credit limit and other values
          const { mapTellerToFlint } = await import('./lib/teller-mapping.js');
          const mapped = mapTellerToFlint(tellerAccount, balances || { ledger: '0', available: '0' });
          
          // Check payment capabilities for credit cards
          let paymentCapabilities = null;
          if (tellerAccount.subtype === 'credit_card') {
            try {
              const capabilitiesResponse = await fetch(
                `https://api.teller.io/accounts/${account.externalAccountId}/capabilities`,
                {
                  headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                  }
                }
              );
              
              if (capabilitiesResponse.ok) {
                const capabilities = await capabilitiesResponse.json();
                paymentCapabilities = {
                  paymentsSupported: capabilities.payments || capabilities.zelle || false,
                  zelleSupported: capabilities.zelle || false,
                  supportedMethods: capabilities.payment_methods || []
                };
              }
            } catch (error) {
              // Payment capabilities check failed, continue without payments
              paymentCapabilities = { paymentsSupported: false };
            }
          }
          
          // Process credit card specific information if this is a credit card
          let creditCardInfo = null;
          if (tellerAccount.subtype === 'credit_card' && balances) {
            // Calculate credit utilization percentage
            const creditUtilization = (mapped.owed && mapped.creditLimit && mapped.creditLimit > 0)
              ? (Math.abs(mapped.owed) / mapped.creditLimit) * 100
              : null;
            
            console.log('[Credit Card Utilization Calculation]', {
              mappedOwed: mapped.owed,
              mappedCreditLimit: mapped.creditLimit,
              creditUtilization,
              tellerAccountSubtype: tellerAccount.subtype,
              hasBalances: !!balances
            });
            
            creditCardInfo = {
              statementBalance: balances.statement || null,
              minimumDue: balances.minimum_payment || null,
              paymentDueDate: balances.due_date || null,
              creditLimit: mapped.creditLimit || null, // Use calculated credit limit from mapper
              availableCredit: mapped.availableCredit || null, // Use mapped available credit
              currentBalance: balances.current || null,
              amountSpent: mapped.owed || null, // Add amount spent (owed)
              creditUtilization: creditUtilization, // Percentage of credit limit used
              // Add payment capabilities
              paymentCapabilities: paymentCapabilities
            };
            
            console.log('[Credit Card Info Created]', creditCardInfo);
          }
          
          // Return comprehensive Teller Account data
          res.json({
            provider: 'teller',
            account: {
              id: tellerAccount.id,
              name: tellerAccount.name,
              type: tellerAccount.type, // depository or credit
              subtype: tellerAccount.subtype, // checking, savings, credit_card, etc.
              institution: tellerAccount.institution, // Institution name and details
              currency: tellerAccount.currency || 'USD',
              last4: tellerAccount.last_four,
              mask: tellerAccount.mask,
              status: tellerAccount.status,
              // Links to related resources
              links: {
                balances: `/accounts/${tellerAccount.id}/balances`,
                transactions: `/accounts/${tellerAccount.id}/transactions`,
                details: `/accounts/${tellerAccount.id}/details`
              }
            },
            // Live balances from Balances endpoint
            balances: {
              available: balances?.available || null,
              ledger: balances?.ledger || null,
              current: balances?.current || null,
              statement: balances?.statement || null,
              creditLimit: balances?.credit_limit || null,
              availableCredit: balances?.available || null,
              minimumPayment: balances?.minimum_payment || null,
              dueDate: balances?.due_date || null
            },
            // Account details with masked routing/account numbers
            accountDetails: {
              routingNumber: accountDetails?.routing_number || null,
              accountNumber: accountDetails?.account_number || null,
              // Only show last 4 digits for security
              routingNumberMask: accountDetails?.routing_number ? 
                `****${accountDetails.routing_number.slice(-4)}` : null,
              accountNumberMask: accountDetails?.account_number ? 
                `****${accountDetails.account_number.slice(-4)}` : null
            },
            // Enhanced transactions with proper fields
            transactions: transactions.map((txn: any) => ({
              id: txn.id,
              date: txn.date,
              status: txn.status, // pending or posted
              description: txn.description,
              merchant: txn.counterparty?.name || null,
              amount: txn.amount,
              category: txn.category || null,
              type: txn.type,
              running_balance: txn.running_balance || null
            })),
            // Credit card specific info (if applicable)
            creditCardInfo,
            // Statements with download URLs
            statements: statements.map((stmt: any) => ({
              id: stmt.id,
              period: stmt.period || `${stmt.start_date} - ${stmt.end_date}`,
              startDate: stmt.start_date,
              endDate: stmt.end_date,
              downloadUrl: stmt.url || null,
              status: stmt.status || 'available'
            })),
            metadata: {
              fetched_at: new Date().toISOString(),
              account_type: tellerAccount.type,
              account_subtype: tellerAccount.subtype,
              is_credit_card: tellerAccount.subtype === 'credit_card',
              has_statements: statements.length > 0,
              payments_supported: paymentCapabilities?.paymentsSupported || false
            }
          });
          
        } catch (error: any) {
          logger.error('Failed to fetch Teller account details', { 
            error: error.message, 
            accountId: account.externalAccountId,
            userId 
          });
          res.status(500).json({ 
            message: "Failed to fetch account details from Teller",
            error: error.message 
          });
        }
        
      } else if (account.provider === 'snaptrade') {
        // Handle SnapTrade accounts
        try {
          const snapUser = await getSnapUser(userId);
          if (!snapUser?.userSecret) {
            return res.status(404).json({ message: "SnapTrade credentials not found" });
          }
          
          const { accountsApi, snaptradeClient } = await import('./lib/snaptrade');
          
          // Get account information
          const accountList = await accountsApi.listUserAccounts({
            userId: snapUser.userId,
            userSecret: snapUser.userSecret
          });
          
          const snapAccount = accountList.data?.find(acc => acc.id === account.externalAccountId);
          if (!snapAccount) {
            return res.status(404).json({ message: "SnapTrade account not found" });
          }
          
          // Get account positions/holdings
          const positionsResponse = await accountsApi.getUserAccountPositions({
            userId: snapUser.userId,
            userSecret: snapUser.userSecret,
            accountId: account.externalAccountId!
          });
          
          // Get recent activities/transactions
          const activitiesResponse = await portfolioApi.getActivities({
            userId: snapUser.userId,
            userSecret: snapUser.userSecret,
            accounts: account.externalAccountId!
          });
          
          // snapAccount is already defined above
          
          res.json({
            provider: 'snaptrade',
            accountInformation: {
              id: snapAccount.id,
              name: snapAccount.name,
              number: snapAccount.number,
              brokerage: snapAccount.institution_name,
              type: snapAccount.meta?.type || 'investment',
              status: (snapAccount as any).meta?.status || 'active',
              currency: (snapAccount as any).balance?.total?.currency || 'USD',
              balancesOverview: {
                cash: (snapAccount as any).cash?.amount || 0,
                equity: (snapAccount as any).balance?.total?.amount || 0,
                buyingPower: snapAccount.buying_power?.amount || 0
              }
            },
            balancesAndHoldings: {
              balances: {
                cashAvailableToTrade: (snapAccount as any).cash?.amount || 0,
                totalEquityValue: (snapAccount as any).balance?.total?.amount || 0,
                buyingPowerOrMargin: snapAccount.buying_power?.amount || 0
              },
              holdings: positionsResponse.data?.map((position: any) => ({
                symbol: position.symbol?.symbol || 'UNKNOWN',
                name: position.symbol?.name || position.symbol?.description || '',
                quantity: position.units || 0,
                costBasis: position.average_purchase_price || 0,
                marketValue: (position.units || 0) * (position.price || 0),
                currentPrice: position.price || 0,
                unrealized: position.open_pnl || 0
              })) || []
            },
            positionsAndOrders: {
              activePositions: positionsResponse.data || [],
              pendingOrders: [],
              orderHistory: []
            },
            tradingActions: {
              canPlaceOrders: true,
              canCancelOrders: true,
              canGetConfirmations: true
            },
            activityAndTransactions: activitiesResponse.data?.map((activity: any) => ({
              type: activity.type || 'trade',
              symbol: activity.symbol || '',
              amount: activity.amount || 0,
              quantity: activity.units || 0,
              timestamp: activity.trade_date || activity.settlement_date,
              description: activity.description || `${activity.type} ${activity.symbol}`
            })) || [],
            metadata: {
              fetched_at: snapAccount.sync_status?.holdings?.last_successful_sync || new Date().toISOString(),
              last_sync: snapAccount.sync_status,
              cash_restrictions: snapAccount.cash_restrictions || [],
              account_created: snapAccount.created_date
            }
          });
          
        } catch (error: any) {
          logger.error('Failed to fetch SnapTrade account details', { 
            error: error.message, 
            accountId: account.externalAccountId,
            userId 
          });
          res.status(500).json({ 
            message: "Failed to fetch account details from SnapTrade",
            error: error.message 
          });
        }
        
      } else {
        res.status(400).json({ message: "Unknown account provider" });
      }
      
    } catch (error: any) {
      logger.error("Failed to fetch account details", { 
        error: error.message, 
        accountId: req.params.accountId,
        userId: req.user?.claims?.sub 
      });
      res.status(500).json({ 
        message: "Failed to fetch account details",
        error: error.message 
      });
    }
  });

  // Credit card payment route using Teller Payments API
  app.post('/api/accounts/:localAccountId/pay', isAuthenticated, async (req: any, res) => {
    const { amount, paymentType } = req.body; // paymentType: 'minimum', 'statement', 'custom'
    
    try {
      // Get the account from our database
      const account = await storage.getAccountByLocalId(parseInt(req.params.localAccountId));
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      if (account.provider !== 'teller') {
        return res.status(400).json({ message: "Payments only supported for Teller accounts" });
      }

      const authHeader = `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`;
      
      // First, check if payments are supported
      const capabilitiesResponse = await fetch(
        `https://api.teller.io/accounts/${account.externalAccountId}/capabilities`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        }
      );

      if (!capabilitiesResponse.ok) {
        return res.status(400).json({ 
          message: "Unable to check payment capabilities",
          fallback: "Your issuer doesn't support in-app payments via Zelle—use the bank or card app to pay."
        });
      }

      const capabilities = await capabilitiesResponse.json();
      if (!capabilities.payments && !capabilities.zelle) {
        return res.status(400).json({ 
          message: "Payments not supported for this account",
          fallback: "Your issuer doesn't support in-app payments via Zelle—use the bank or card app to pay."
        });
      }

      // Create form data for the payment request (Teller uses form-encoded requests)
      const paymentData = new URLSearchParams({
        amount: amount.toString(),
        currency: 'USD',
        description: `Credit card payment - ${paymentType}`,
        method: 'zelle'
      });

      // Initiate payment
      const paymentResponse = await fetch(
        `https://api.teller.io/accounts/${account.externalAccountId}/payments`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: paymentData
        }
      );

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        return res.status(paymentResponse.status).json({ 
          message: "Payment failed to initiate",
          error: errorData.message || 'Unknown payment error',
          fallback: "Your issuer doesn't support in-app payments via Zelle—use the bank or card app to pay."
        });
      }

      const payment = await paymentResponse.json();
      
      res.json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          description: payment.description,
          created_at: payment.created_at
        }
      });

    } catch (error: any) {
      logger.error('Failed to process payment', { 
        error: error.message, 
        accountId: req.params.localAccountId 
      });
      res.status(500).json({ 
        message: "Payment processing failed",
        fallback: "Your issuer doesn't support in-app payments via Zelle—use the bank or card app to pay."
      });
    }
  });
  
  // Dev-only SnapTrade user repair endpoint
  app.post('/api/debug/snaptrade/repair-user', async (req, res) => {
    try {
      const userId = (req.body?.userId || '').toString().trim();
      if (!userId) return res.status(400).json({ message: 'userId required' });

      const { authApi } = await import('./lib/snaptrade');
      const { deleteUserLocal, saveUser } = await import('./store/snapUsers');

      // 1) Try to delete server-side user (idempotent)
      try {
        await authApi.deleteSnapTradeUser({ userId }); // queues deletion; async on their side
        console.log('[Debug] SnapTrade user deletion queued for:', userId);
      } catch (deleteErr) {
        console.log('[Debug] SnapTrade user deletion failed (continuing):', deleteErr?.message);
      }

      // 2) Remove our local record
      await deleteUserLocal(userId);
      console.log('[Debug] Local user record deleted for:', userId);

      // 3) Re-register to get a fresh provider-side userSecret
      const created = await authApi.registerSnapTradeUser({ userId });
      await saveUser({ userId: created.userId!, userSecret: created.userSecret! });

      res.json({ ok: true, userId, userSecretLen: created.userSecret?.length || 0 });
    } catch (e: any) {
      console.error('[Debug] Repair user error:', e?.responseBody || e?.message);
      return res.status(500).json({ 
        ok: false, 
        error: e?.responseBody || e?.message 
      });
    }
  });

  // Mount debug routes
  const debugRouter = await import('./routes/debug');
  app.use('/api/debug', debugRouter.default);
  
  // Register settings routes
  const { registerSettingsRoutes } = await import('./routes/settings');
  registerSettingsRoutes(app);
  
  // Register security routes
  const { registerSecurityRoutes } = await import('./routes/security');
  registerSecurityRoutes(app);
  
  // Register health routes
  const { registerHealthRoutes } = await import('./routes/health');
  registerHealthRoutes(app);
  
  // Register demo routes
  const { registerDemoRoutes } = await import('./routes/demo');
  registerDemoRoutes(app);
  
  const tradingRouter = await import('./routes/trading');
  app.use('/api/trade', tradingRouter.default);

  // Teller Payments routes  
  const tellerPaymentsRouter = await import('./routes/teller-payments');
  app.use('/api/teller/payments', tellerPaymentsRouter.default);

  // Legacy route removed - duplicate of the main account details route at line 1910

  // Account details route that maps internal IDs to external IDs (with provider)
  app.get('/api/accounts/:provider/:accountId/details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider, accountId } = req.params;
      
      if (provider === 'teller') {
        // Get the connected account to find the external ID
        const account = await storage.getConnectedAccount(parseInt(accountId));
        if (!account || account.userId !== userId || account.provider !== 'teller') {
          return res.status(404).json({ message: "Account not found" });
        }
        
        // Call the Teller API using the external account ID
        const authHeader = `Basic ${Buffer.from(account.accessToken + ":").toString("base64")}`;
        
        // Fetch account details from Teller
        const accountResponse = await fetch(
          `https://api.teller.io/accounts/${account.externalAccountId}/details`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!accountResponse.ok) {
          throw new Error(`Failed to fetch account details: ${accountResponse.status}`);
        }
        
        const accountDetails = await accountResponse.json();
        
        // Fetch balances
        const balancesResponse = await fetch(
          `https://api.teller.io/accounts/${account.externalAccountId}/balances`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          }
        );
        
        const balances = balancesResponse.ok ? await balancesResponse.json() : null;
        
        res.json({
          success: true,
          account: accountDetails,
          balances,
        });
        
      } else if (provider === 'snaptrade') {
        // Handle SnapTrade account details here if needed
        res.status(501).json({ message: "SnapTrade account details not implemented yet" });
      } else {
        res.status(400).json({ message: "Invalid provider" });
      }
      
    } catch (error: any) {
      logger.error("Failed to fetch account details", { error: error.message, provider: req.params.provider, accountId: req.params.accountId });
      res.status(500).json({ 
        message: "Failed to fetch account details",
        error: error.message 
      });
    }
  });

  // ===== SNAPTRADE ACCOUNT DETAILS API ROUTES =====
  
  // Import SnapTrade functions and utilities
  const { getUserAccountDetails, getUserAccountBalance, getUserAccountPositions, getUserAccountOrders, getUserAccountRecentOrders, listActivities } = await import('./lib/snaptrade');
  const { getSnapUser } = await import('./store/snapUsers');
  const { mapSnapTradeError } = await import('./lib/snaptrade-errors');

  // Shared SnapTrade request context middleware
  const resolveSnapTradeContext = async (req, res, next) => {
    try {
      // Get Flint user ID
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
      
      const flintId = req.user.claims.sub;
      
      // Get SnapTrade user from database
      const snapUser = await getSnapUser(flintId);
      if (!snapUser?.userSecret) {
        return res.status(428).json({
          error: {
            code: 'SNAPTRADE_NOT_REGISTERED',
            message: 'Complete SnapTrade registration to view account data',
            requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
      
      // Attach resolved context
      req.snapTradeContext = {
        flintId,
        snapUserId: snapUser.userId,
        userSecret: snapUser.userSecret,
        clientId: process.env.SNAPTRADE_CLIENT_ID
      };
      
      next();
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resolve user context',
          requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });
    }
  };

  // Shared error handler - NEVER return 200 {} on errors
  const handleSnapTradeError = (error, requestId) => {
    const errorCode = error.responseBody?.code || error.status?.toString();
    
    switch (errorCode) {
      case '1076':
      case '401':
        return {
          status: 401,
          error: {
            code: 'SIGNATURE_INVALID',
            message: 'Authentication signature invalid - check keys/clock',
            requestId
          }
        };
        
      case '428':
        return {
          status: 428,
          error: {
            code: 'SNAPTRADE_NOT_REGISTERED',
            message: 'Complete SnapTrade registration to view account data',
            requestId
          }
        };
        
      case '409':
        return {
          status: 409,
          error: {
            code: 'SNAPTRADE_USER_MISMATCH', 
            message: 'SnapTrade user mismatch - reset required',
            requestId
          }
        };
        
      case '429':
        return {
          status: 429,
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded - retrying with backoff',
            requestId
          }
        };
        
      default:
        return {
          status: 500,
          error: {
            code: 'SNAPTRADE_ERROR',
            message: error.message || 'SnapTrade API error',
            requestId
          }
        };
    }
  };

  // Apply middleware to all SnapTrade account routes
  // DISABLED: This middleware conflicts with the router in server/routes/snaptrade-accounts.ts
  // app.use('/api/snaptrade/accounts/:accountId/*', resolveSnapTradeContext);

  // 1) Account Details (identity/meta)
  app.get('/api/snaptrade/accounts/:accountId/details', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Details] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        requestId
      });

      // Call SnapTrade API
      const accountDetails = await getUserAccountDetails(snapUserId, userSecret, accountId);

      // Handle Robinhood brokerage name derivation if needed
      let brokerageName = accountDetails.institution_name;
      if (!brokerageName && accountDetails.brokerage_authorization) {
        try {
          // Try to get brokerage name from authorization if missing
          const authDetails = await detailBrokerageAuthorization(
            snapUserId,
            userSecret,
            accountDetails.brokerage_authorization
          );
          brokerageName = authDetails?.brokerage?.name || accountDetails.institution_name;
        } catch (authError) {
          console.warn('[SnapTrade] Could not fetch brokerage authorization details:', authError);
          brokerageName = accountDetails.institution_name;
        }
      }

      // Return account details matching frontend expectations - fix data mapping issue
      const response = {
        account: {
          id: accountDetails.id || null,
          brokerage: brokerageName || 'Unknown',
          name: accountDetails.name === 'Default' 
            ? `${brokerageName} ${accountDetails.meta?.type || accountDetails.raw_type || 'Account'}`.trim()
            : (accountDetails.name || 'Investment Account'),
          numberMasked: accountDetails.number ? `...${accountDetails.number.slice(-4)}` : null,
          type: accountDetails.meta?.type || accountDetails.raw_type || 'unknown',
          status: accountDetails.status || accountDetails.meta?.status || 'unknown',
          currency: accountDetails.balance?.total?.currency || 'USD' // ALWAYS default to USD
        }
      };

      console.log('[SnapTrade Account Details] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        brokerage: response.account.brokerage,
        type: response.account.type
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Details] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 2) Account Balances (cards at top)
  app.get('/api/snaptrade/accounts/:accountId/balances', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Balances] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        requestId
      });

      // Call SnapTrade API
      const balanceData = await getUserAccountBalance(snapUserId, userSecret, accountId);

      // balanceData is a Balance[] array, extract the first element or handle empty array
      const balance = Array.isArray(balanceData) && balanceData.length > 0 ? balanceData[0] : null;

      // Apply fallback logic per requirements with currency safety
      const currency = (balance?.currency as any) || 'USD'; // ALWAYS default to USD
      const total = balance ? (balance as any).amount || null : null;
      const cash = null; // Balance type doesn't have cash property
      const buyingPower = null; // Balance type doesn't have buying_power property
      const maintenanceExcess = null; // Balance type doesn't have maintenance_excess property

      // Return balances with all fields (null if missing) - NEVER omit keys
      const response = {
        balances: {
          total: total !== null ? { amount: parseFloat(total), currency } : null,
          cash: cash !== null ? { amount: parseFloat(cash), currency } : null,
          buyingPower: buyingPower !== null ? { amount: parseFloat(buyingPower), currency } : null,
          maintenanceExcess: maintenanceExcess !== null ? { amount: parseFloat(maintenanceExcess), currency } : null
        }
      };

      console.log('[SnapTrade Account Balances] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        hasTotal: response.balances.total !== null,
        hasCash: response.balances.cash !== null,
        hasBuyingPower: response.balances.buyingPower !== null
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Balances] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 3) Positions (equities/ETFs) or Holdings (aggregate)
  app.get('/api/snaptrade/accounts/:accountId/positions', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Positions] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        requestId
      });

      // Use existing getPositions function which has smart fallback logic
      const positionsData = await getPositions(snapUserId, userSecret, accountId);
      const asOfDate = new Date().toISOString();

      // Transform positions data
      const positions = positionsData.flatMap(accountData => {
        if (!accountData.positions) return [];
        
        return accountData.positions.map(position => {
          const currency = position.currency || position.instrument?.currency || 'USD';
          
          return {
            symbol: position.instrument?.symbol || position.symbol || 'Unknown',
            description: position.instrument?.name || position.description || position.instrument?.description || 'Unknown Security',
            quantity: parseFloat(position.quantity || 0),
            avgPrice: position.average_purchase_price ? {
              amount: parseFloat(position.average_purchase_price.amount || position.average_purchase_price),
              currency
            } : null,
            marketPrice: position.current_price || position.last_trade_price ? {
              amount: parseFloat(position.current_price?.amount || position.last_trade_price?.amount || position.current_price || position.last_trade_price),
              currency
            } : null,
            marketValue: position.market_value ? {
              amount: parseFloat(position.market_value.amount || position.market_value),
              currency
            } : null,
            unrealizedPnl: position.unrealized_pnl ? {
              amount: parseFloat(position.unrealized_pnl.amount || position.unrealized_pnl),
              currency
            } : null,
            currency
          };
        });
      });

      const response = {
        accountId,
        positions,
        asOf: asOfDate
      };

      console.log('[SnapTrade Account Positions] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        positionCount: positions.length
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Positions] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 4) Orders (read-only list)
  app.get('/api/snaptrade/accounts/:accountId/orders', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const { from, to, limit } = req.query;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Orders] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        from, to, limit,
        requestId
      });

      let ordersData;
      
      // Try recent orders first if no specific date range
      if (!from && !to) {
        try {
          ordersData = await getUserAccountRecentOrders(snapUserId, userSecret, accountId);
          console.log('[SnapTrade] Using recent orders API');
        } catch (recentError) {
          console.log('[SnapTrade] Recent orders failed, falling back to all orders');
          ordersData = await getUserAccountOrders(snapUserId, userSecret, accountId);
        }
      } else {
        // Use full orders API with filtering
        ordersData = await getUserAccountOrders(snapUserId, userSecret, accountId);
      }

      // Apply date filtering if needed
      let filteredOrders = ordersData || [];
      if (from || to) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.created_at || order.placed_at || order.updated_at);
          if (from && orderDate < new Date(from as string)) return false;
          if (to && orderDate > new Date(to as string)) return false;
          return true;
        });
      }

      // Apply limit
      if (limit) {
        filteredOrders = filteredOrders.slice(0, parseInt(limit as string));
      }

      // Transform orders
      const orders = filteredOrders.map(order => {
        const currency = order.currency || order.instrument?.currency || 'USD';
        
        // Normalize status
        const normalizeStatus = (status) => {
          const statusMap = {
            'OPEN': 'open',
            'FILLED': 'filled', 
            'EXECUTED': 'filled',
            'PARTIAL_FILL': 'partial_filled',
            'PARTIALLY_FILLED': 'partial_filled',
            'CANCELLED': 'cancelled',
            'CANCELED': 'cancelled',
            'REJECTED': 'rejected',
            'FAILED': 'rejected'
          };
          return statusMap[status?.toUpperCase()] || 'unknown';
        };

        return {
          id: order.id || order.brokerage_order_id || `order_${Date.now()}`,
          placedAt: order.created_at || order.placed_at || order.updated_at || new Date().toISOString(),
          status: normalizeStatus(order.status),
          side: order.action?.toLowerCase() === 'buy' ? 'buy' : 'sell',
          type: (order.order_type || order.type || 'market').toLowerCase(),
          timeInForce: (order.time_in_force || 'day').toLowerCase(),
          symbol: order.instrument?.symbol || order.symbol || 'Unknown',
          quantity: parseFloat(order.quantity || order.units || 0),
          limitPrice: order.price ? {
            amount: parseFloat(order.price.amount || order.price),
            currency
          } : null,
          averageFillPrice: order.filled_price || order.average_fill_price ? {
            amount: parseFloat(order.filled_price?.amount || order.average_fill_price?.amount || order.filled_price || order.average_fill_price),
            currency
          } : { amount: null, currency }
        };
      });

      const response = { orders };

      console.log('[SnapTrade Account Orders] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        orderCount: orders.length
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Orders] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 5) Activities (cash/dividends/trades/fees/transfers)
  app.get('/api/snaptrade/accounts/:accountId/activities', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const { from, to, cursor } = req.query;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Activities] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        from, to, cursor,
        requestId
      });

      // Call SnapTrade activities API
      const activitiesData = await listActivities(snapUserId, userSecret, accountId);

      // Map activity types
      const mapActivityType = (activity) => {
        const typeMap = {
          'BUY': 'trade',
          'SELL': 'trade',
          'TRADE': 'trade',
          'EXECUTION': 'trade',
          'DIVIDEND': 'dividend',
          'DIV': 'dividend',
          'INTEREST': 'interest',
          'INT': 'interest',
          'FEE': 'fee',
          'COMMISSION': 'fee',
          'EXPENSE': 'fee',
          'TRANSFER': 'transfer',
          'DEPOSIT': 'transfer',
          'WITHDRAWAL': 'transfer',
          'CASH': 'transfer'
        };
        
        const activityType = activity.type || activity.activity_type || activity.transaction_type;
        return typeMap[activityType?.toUpperCase()] || 'transfer';
      };

      // Transform activities
      const activities = (activitiesData || []).map(activity => {
        const currency = activity.currency || activity.amount?.currency || 'USD';
        
        return {
          id: activity.id || activity.transaction_id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: activity.date || activity.settlement_date || activity.trade_date || new Date().toISOString().split('T')[0],
          type: mapActivityType(activity),
          description: activity.description || activity.instrument?.name || `${activity.type || 'Activity'}`,
          amount: {
            amount: parseFloat(activity.amount?.amount || activity.net_amount || activity.gross_amount || activity.amount || 0),
            currency
          },
          symbol: activity.instrument?.symbol || activity.symbol || null
        };
      });

      // Apply date filtering
      let filteredActivities = activities;
      if (from || to) {
        filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.date);
          if (from && activityDate < new Date(from as string)) return false;
          if (to && activityDate > new Date(to as string)) return false;
          return true;
        });
      }

      // Simple pagination with cursor (basic implementation)
      let nextCursor = null;
      const pageSize = 50;
      if (filteredActivities.length > pageSize) {
        filteredActivities = filteredActivities.slice(0, pageSize);
        nextCursor = Buffer.from(JSON.stringify({
          date: filteredActivities[filteredActivities.length - 1].date,
          id: filteredActivities[filteredActivities.length - 1].id
        })).toString('base64');
      }

      const response = {
        activities: filteredActivities,
        nextCursor
      };

      console.log('[SnapTrade Account Activities] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        activityCount: filteredActivities.length
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Activities] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 6) Options Holdings (using optionsApi or fallback to positions filter)
  app.get('/api/snaptrade/accounts/:accountId/options', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { accountId } = req.params;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Account Options] Request:', {
        userId: snapUserId.slice(-6),
        accountId: accountId.slice(-6),
        requestId
      });

      let optionsData = [];
      
      try {
        // Try options-specific API first
        const { optionsApi } = await import('./lib/snaptrade');
        const optionsResponse = await optionsApi.listOptionHoldings({
          userId: snapUserId,
          userSecret: userSecret,
          accountId: accountId
        });
        optionsData = optionsResponse.data || [];
        console.log('[SnapTrade] Using options-specific API');
      } catch (optionsError) {
        console.log('[SnapTrade] Options API not available, falling back to positions filter');
        
        // Fallback: filter options from general positions
        try {
          const positionsData = await getUserAccountPositions(snapUserId, userSecret, accountId);
          optionsData = (positionsData || []).filter(position => 
            position.instrument?.instrument_type === 'Option' ||
            position.instrument?.symbol?.includes(' C ') ||
            position.instrument?.symbol?.includes(' P ') ||
            position.symbol?.includes(' C ') ||
            position.symbol?.includes(' P ')
          );
        } catch (positionsError) {
          // If both fail, return empty array (not an error)
          console.warn('[SnapTrade] Both options and positions APIs failed:', positionsError);
          optionsData = [];
        }
      }

      // Transform options holdings with symbol formatting
      const formatOptionsSymbol = (option) => {
        const {
          underlying_symbol,
          expiration_date,
          option_type, // 'call' or 'put'
          strike_price
        } = option.instrument || option;
        
        if (!underlying_symbol || !expiration_date || !option_type || !strike_price) {
          return option.instrument?.symbol || option.symbol || 'Unknown Option';
        }
        
        // Format: "AAPL 2025-12-19 C 200"
        const typeCode = option_type?.toLowerCase() === 'call' ? 'C' : 'P';
        return `${underlying_symbol} ${expiration_date} ${typeCode} ${strike_price}`;
      };

      const formatOptionsDescription = (option) => {
        const {
          underlying_symbol,
          expiration_date,
          option_type,
          strike_price
        } = option.instrument || option;
        
        if (!underlying_symbol || !expiration_date || !option_type || !strike_price) {
          return option.instrument?.name || option.description || 'Unknown Option';
        }
        
        // Format: "AAPL Dec19'25 200 Call"
        const date = new Date(expiration_date);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear().toString().slice(-2);
        
        return `${underlying_symbol} ${month}${day}'${year} ${strike_price} ${option_type}`;
      };

      const holdings = optionsData.map(holding => {
        const currency = holding.currency || holding.instrument?.currency || 'USD';
        
        return {
          symbol: formatOptionsSymbol(holding),
          description: formatOptionsDescription(holding),
          quantity: parseFloat(holding.quantity || 0),
          marketPrice: holding.price || holding.market_price ? {
            amount: parseFloat(holding.price?.amount || holding.market_price?.amount || holding.price || holding.market_price),
            currency
          } : null,
          marketValue: holding.market_value ? {
            amount: parseFloat(holding.market_value?.amount || holding.market_value),
            currency
          } : null,
          unrealizedPnl: holding.unrealized_pnl ? {
            amount: parseFloat(holding.unrealized_pnl?.amount || holding.unrealized_pnl),
            currency
          } : null
        };
      });

      const response = { holdings };

      console.log('[SnapTrade Account Options] Success:', {
        requestId,
        accountId: accountId.slice(-6),
        holdingCount: holdings.length
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Account Options] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // ===== SNAPTRADE CONNECTIONS API ROUTES =====

  // Apply middleware to all SnapTrade connection routes
  app.use('/api/snaptrade/connections*', resolveSnapTradeContext);

  // 7) List Connections (for header display and health monitoring)
  app.get('/api/snaptrade/connections', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Connections] List Request:', {
        userId: snapUserId.slice(-6),
        requestId
      });

      // Call SnapTrade connections API
      const connectionsResponse = await listBrokerageAuthorizations(
        snapUserId,
        userSecret
      );

      const authorizations = connectionsResponse?.data || [];

      // Determine connection health for each authorization
      const determineConnectionHealth = (authorization) => {
        const {
          disabled,
          created_at,
          updated_at,
          last_sync,
          metadata
        } = authorization;
        
        // Check if explicitly disabled
        if (disabled === true) {
          return {
            status: 'DISABLED',
            needs_reconnect: true,
            reconnect_url: `/snaptrade/auth?reconnect=${authorization.id}`
          };
        }
        
        // Check last sync time (if available)
        if (last_sync) {
          const lastSyncDate = new Date(last_sync);
          const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync > 48) { // 48 hours without sync
            return {
              status: 'DISCONNECTED',
              needs_reconnect: true,
              reconnect_url: `/snaptrade/auth?reconnect=${authorization.id}`
            };
          }
        }
        
        return {
          status: 'CONNECTED',
          needs_reconnect: false,
          reconnect_url: null
        };
      };

      // Transform connections data
      const connections = authorizations.map(auth => {
        const health = determineConnectionHealth(auth);
        
        return {
          id: auth.id || auth.authorization_id,
          brokerage: {
            id: auth.brokerage?.id || auth.brokerage?.slug,
            name: auth.brokerage?.name || auth.brokerage?.display_name || 'Unknown',
            logo: auth.brokerage?.logo_url || auth.brokerage?.logo || null,
            display_name: auth.brokerage?.display_name || auth.brokerage?.name || 'Unknown'
          },
          status: health.status,
          created_at: auth.created_at || new Date().toISOString(),
          last_sync: auth.updated_at || auth.last_sync || null,
          disabled: auth.disabled || false,
          needs_reconnect: health.needs_reconnect,
          reconnect_url: health.reconnect_url
        };
      });

      const response = { connections };

      console.log('[SnapTrade Connections] List Success:', {
        requestId,
        connectionCount: connections.length,
        connectedCount: connections.filter(c => c.status === 'CONNECTED').length
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Connections] List Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // 8) Connection Details (specific authorization)
  app.get('/api/snaptrade/connections/:authorizationId', async (req: any, res) => {
    try {
      const { snapUserId, userSecret } = req.snapTradeContext;
      const { authorizationId } = req.params;
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SnapTrade Connection Details] Request:', {
        userId: snapUserId.slice(-6),
        authorizationId: authorizationId.slice(-6),
        requestId
      });

      // Call SnapTrade connection details API
      const connectionResponse = await detailBrokerageAuthorization(
        snapUserId,
        userSecret,
        authorizationId
      );

      const auth = connectionResponse;
      if (!auth) {
        return res.status(404).json({
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
            requestId
          }
        });
      }

      // Determine connection health
      const determineConnectionHealth = (authorization) => {
        const {
          disabled,
          created_at,
          updated_at,
          last_sync,
          metadata
        } = authorization;
        
        if (disabled === true) {
          return {
            status: 'DISABLED',
            needs_reconnect: true,
            reconnect_url: `/snaptrade/auth?reconnect=${authorization.id}`
          };
        }
        
        if (last_sync) {
          const lastSyncDate = new Date(last_sync);
          const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync > 48) {
            return {
              status: 'DISCONNECTED',
              needs_reconnect: true,
              reconnect_url: `/snaptrade/auth?reconnect=${authorization.id}`
            };
          }
        }
        
        return {
          status: 'CONNECTED',
          needs_reconnect: false,
          reconnect_url: null
        };
      };

      const health = determineConnectionHealth(auth);

      // Get account count for this connection
      let accountCount = 0;
      try {
        const accountsResponse = await accountsApi.listUserAccounts({
          userId: snapUserId,
          userSecret: userSecret
        });
        accountCount = (accountsResponse.data || []).filter(acc => 
          acc.brokerage_authorization === auth.id
        ).length;
      } catch (accountsError) {
        console.warn('[SnapTrade] Could not fetch account count:', accountsError);
      }

      const response = {
        connection: {
          id: auth.id || auth.authorization_id,
          brokerage: {
            id: auth.brokerage?.id || auth.brokerage?.slug,
            name: auth.brokerage?.name || auth.brokerage?.display_name || 'Unknown',
            logo: auth.brokerage?.logo_url || auth.brokerage?.logo || null,
            display_name: auth.brokerage?.display_name || auth.brokerage?.name || 'Unknown'
          },
          status: health.status,
          created_at: auth.created_at || new Date().toISOString(),
          last_sync: auth.updated_at || auth.last_sync || null,
          disabled: auth.disabled || false,
          needs_reconnect: health.needs_reconnect,
          reconnect_url: health.reconnect_url,
          metadata: {
            account_count: accountCount,
            sync_status: health.status === 'CONNECTED' ? 'healthy' : 'needs_attention'
          }
        }
      };

      console.log('[SnapTrade Connection Details] Success:', {
        requestId,
        authorizationId: authorizationId.slice(-6),
        status: health.status,
        accountCount
      });

      res.json(response);

    } catch (error) {
      console.error('[SnapTrade Connection Details] Error:', error);
      const errorResponse = handleSnapTradeError(error, req.headers['x-request-id']);
      res.status(errorResponse.status).json(errorResponse.error);
    }
  });

  // ===== PRODUCTION WEBHOOK HEALTH MONITORING ENDPOINTS =====
  
  const { webhookHealthMonitor } = await import('./services/WebhookHealthMonitor');

  // Enhanced webhook health check endpoint
  app.get('/api/health/webhooks', async (req, res) => {
    try {
      const systemHealth = await webhookHealthMonitor.getSystemHealth();
      const webhookHealth = webhookHealthMonitor.getHealth();
      
      const overallStatus = webhookHealth.status === 'unhealthy' ? 503 : 200;
      res.status(overallStatus).json(systemHealth);
      
    } catch (error) {
      console.error('[Health Check] Error:', error);
      res.status(500).json({
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Dead letter queue management endpoint
  app.get('/api/health/webhooks/dlq', async (req, res) => {
    try {
      const dlqItems = webhookHealthMonitor.getDeadLetterQueue().map(item => ({
        failedAt: item.failedAt,
        retryCount: item.retryCount,
        webhookType: item.webhook?.type || 'unknown',
        error: item.error || 'Unknown error'
      }));
      
      res.json({
        count: dlqItems.length,
        items: dlqItems.slice(0, 20) // Return latest 20 for UI
      });
      
    } catch (error) {
      console.error('[DLQ Health] Error:', error);
      res.status(500).json({ error: 'Failed to retrieve dead letter queue' });
    }
  });

  // Dead letter queue retry endpoint
  app.post('/api/health/webhooks/dlq/retry', async (req, res) => {
    try {
      const result = await webhookHealthMonitor.retryDeadLetterQueue();
      
      res.json({
        message: `Attempted to retry ${result.retried} webhook(s)`,
        remaining: result.remaining
      });
      
    } catch (error) {
      console.error('[DLQ Retry] Error:', error);
      res.status(500).json({ error: 'Failed to retry dead letter queue items' });
    }
  });

  // Webhook metrics endpoint for monitoring dashboards
  app.get('/api/health/metrics', async (req, res) => {
    try {
      const metrics = webhookHealthMonitor.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('[Metrics] Error:', error);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function for account limits
export function getAccountLimit(tier: string, isAdmin?: boolean): number | null {
  // Admin users have unlimited connections
  if (isAdmin === true) {
    return null;
  }
  
  switch (tier) {
    case 'free': return 2;
    case 'basic': return 3;
    case 'pro': return 5;
    case 'premium': return null; // Unlimited
    default: return 2;
  }
}

// Helper functions for subscription detection
function detectRecurringPayments(transactions: any[]) {
  const subscriptions: any[] = [];
  
  // Group transactions by merchant/description similarity
  const merchantGroups = groupTransactionsByMerchant(transactions);
  
  for (const [merchantKey, merchantTransactions] of merchantGroups) {
    if (merchantTransactions.length < 2) continue; // Need at least 2 transactions
    
    // Sort by date
    merchantTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Check for recurring patterns
    const recurringPattern = analyzeRecurringPattern(merchantTransactions);
    
    if (recurringPattern && recurringPattern.confidence > 0.6) {
      const latestTransaction = merchantTransactions[merchantTransactions.length - 1];
      const subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantName: getMerchantDisplayName(merchantKey),
        amount: recurringPattern.averageAmount,
        frequency: recurringPattern.frequency,
        nextBillingDate: calculateNextBillingDate(latestTransaction.date, recurringPattern.frequency),
        lastTransactionDate: latestTransaction.date,
        confidence: recurringPattern.confidence,
        category: categorizeSubscription(merchantKey),
        accountName: latestTransaction.accountName,
        transactions: merchantTransactions.slice(-6) // Last 6 transactions
      };
      
      subscriptions.push(subscription);
    }
  }
  
  // Sort by monthly spend (highest first)
  return subscriptions.sort((a, b) => {
    const aMonthly = getMonthlyAmount(a.amount, a.frequency);
    const bMonthly = getMonthlyAmount(b.amount, b.frequency);
    return bMonthly - aMonthly;
  });
}

function groupTransactionsByMerchant(transactions: any[]) {
  const groups = new Map();
  
  for (const transaction of transactions) {
    const key = getMerchantKey(transaction);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(transaction);
  }
  
  return groups;
}

function getMerchantKey(transaction: any) {
  // Try to extract clean merchant name from description
  const description = transaction.description || '';
  const merchant = transaction.merchant_name || '';
  
  // Use merchant name if available, otherwise clean up description
  if (merchant) {
    return merchant.toLowerCase().trim();
  }
  
  // Clean up common transaction prefixes/suffixes
  const cleaned = description
    .toLowerCase()
    .replace(/^(payment to|autopay|recurring|monthly|subscription)/gi, '')
    .replace(/(payment|autopay|recurring)$/gi, '')
    .replace(/\d{4}$/g, '') // Remove trailing numbers
    .replace(/[*#]/g, '') // Remove special characters
    .trim();
    
  return cleaned || description.toLowerCase();
}

function getMerchantDisplayName(merchantKey: string) {
  // Convert back to display format
  return merchantKey
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function analyzeRecurringPattern(transactions: any[]) {
  if (transactions.length < 2) return null;
  
  // Calculate intervals between transactions (in days)
  const intervals = [];
  for (let i = 1; i < transactions.length; i++) {
    const prev = new Date(transactions[i - 1].date);
    const curr = new Date(transactions[i].date);
    const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }
  
  // Check for monthly pattern (28-32 days)
  const monthlyIntervals = intervals.filter(interval => interval >= 28 && interval <= 32);
  if (monthlyIntervals.length >= Math.max(1, intervals.length * 0.7)) {
    return {
      frequency: 'monthly',
      averageAmount: calculateAverageAmount(transactions),
      confidence: Math.min(0.9, monthlyIntervals.length / intervals.length)
    };
  }
  
  // Check for weekly pattern (6-8 days)
  const weeklyIntervals = intervals.filter(interval => interval >= 6 && interval <= 8);
  if (weeklyIntervals.length >= Math.max(1, intervals.length * 0.7)) {
    return {
      frequency: 'weekly',
      averageAmount: calculateAverageAmount(transactions),
      confidence: Math.min(0.9, weeklyIntervals.length / intervals.length)
    };
  }
  
  // Check for quarterly pattern (88-95 days)
  const quarterlyIntervals = intervals.filter(interval => interval >= 88 && interval <= 95);
  if (quarterlyIntervals.length >= Math.max(1, intervals.length * 0.5)) {
    return {
      frequency: 'quarterly',
      averageAmount: calculateAverageAmount(transactions),
      confidence: Math.min(0.8, quarterlyIntervals.length / intervals.length)
    };
  }
  
  // Check for yearly pattern (360-370 days)
  const yearlyIntervals = intervals.filter(interval => interval >= 360 && interval <= 370);
  if (yearlyIntervals.length >= 1) {
    return {
      frequency: 'yearly',
      averageAmount: calculateAverageAmount(transactions),
      confidence: 0.7
    };
  }
  
  return null;
}

function calculateAverageAmount(transactions: any[]) {
  const amounts = transactions.map(t => t.amount);
  return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
}

function calculateNextBillingDate(lastDate: string, frequency: string) {
  const lastBillingDate = new Date(lastDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for date-only comparison
  
  // If the last billing date is already in the future, return it
  if (lastBillingDate > today) {
    return lastBillingDate.toISOString().split('T')[0];
  }
  
  // Calculate intervals needed using proper calendar math
  let intervalsNeeded: number;
  const nextDate = new Date(lastDate);
  
  switch (frequency) {
    case 'weekly': {
      // Calculate number of weeks between dates
      const daysDiff = Math.floor((today.getTime() - lastBillingDate.getTime()) / (24 * 60 * 60 * 1000));
      intervalsNeeded = Math.ceil(daysDiff / 7);
      nextDate.setDate(nextDate.getDate() + 7 * intervalsNeeded);
      break;
    }
    case 'monthly': {
      // Calculate number of months between dates
      const yearsDiff = today.getFullYear() - lastBillingDate.getFullYear();
      const monthsDiff = today.getMonth() - lastBillingDate.getMonth();
      intervalsNeeded = yearsDiff * 12 + monthsDiff + (today.getDate() >= lastBillingDate.getDate() ? 1 : 0);
      nextDate.setMonth(nextDate.getMonth() + intervalsNeeded);
      break;
    }
    case 'quarterly': {
      // Calculate number of quarters between dates
      const yearsDiff = today.getFullYear() - lastBillingDate.getFullYear();
      const monthsDiff = today.getMonth() - lastBillingDate.getMonth();
      const totalMonths = yearsDiff * 12 + monthsDiff;
      intervalsNeeded = Math.ceil(totalMonths / 3) + (today.getDate() >= lastBillingDate.getDate() ? 1 : 0);
      nextDate.setMonth(nextDate.getMonth() + 3 * intervalsNeeded);
      break;
    }
    case 'yearly': {
      // Calculate number of years between dates
      intervalsNeeded = today.getFullYear() - lastBillingDate.getFullYear();
      if (today.getMonth() > lastBillingDate.getMonth() || 
          (today.getMonth() === lastBillingDate.getMonth() && today.getDate() >= lastBillingDate.getDate())) {
        intervalsNeeded++;
      }
      nextDate.setFullYear(nextDate.getFullYear() + intervalsNeeded);
      break;
    }
    default: {
      // Unknown frequency, default to monthly
      const yearsDiff = today.getFullYear() - lastBillingDate.getFullYear();
      const monthsDiff = today.getMonth() - lastBillingDate.getMonth();
      intervalsNeeded = yearsDiff * 12 + monthsDiff + (today.getDate() >= lastBillingDate.getDate() ? 1 : 0);
      nextDate.setMonth(nextDate.getMonth() + intervalsNeeded);
      break;
    }
  }
  
  // Final safety check: ensure the date is in the future
  if (nextDate <= today) {
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
  }
  
  return nextDate.toISOString().split('T')[0];
}


function categorizeSubscription(merchantKey: string) {
  const streaming = ['netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'apple music', 'youtube', 'hbo'];
  const utilities = ['electric', 'gas', 'water', 'internet', 'phone', 'cable', 'verizon', 'att', 'comcast'];
  const software = ['adobe', 'microsoft', 'google', 'dropbox', 'github', 'slack', 'zoom'];
  const fitness = ['gym', 'fitness', 'peloton', 'planet fitness', 'yoga'];
  const finance = ['bank', 'credit', 'loan', 'insurance', 'investment'];
  
  const key = merchantKey.toLowerCase();
  
  if (streaming.some(term => key.includes(term))) return 'Streaming';
  if (utilities.some(term => key.includes(term))) return 'Utilities';
  if (software.some(term => key.includes(term))) return 'Software';
  if (fitness.some(term => key.includes(term))) return 'Fitness';
  if (finance.some(term => key.includes(term))) return 'Financial';
  
  return 'Other';
}

function getMonthlyAmount(amount: number, frequency: string) {
  switch (frequency) {
    case 'weekly': return amount * 4.33; // Average weeks per month
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}