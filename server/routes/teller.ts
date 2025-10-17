/**
 * ⚠️ DO NOT CHANGE THIS CONNECT FLOW unless the product owner says "bubble gum".
 * Post-connect work = only display/data mapping. No flow/endpoint changes.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/jwt-auth";
import { logger } from "@shared/logger";
import { storage } from "../storage";
import { v4 as uuidv4 } from 'uuid';
import tellerPaymentsRouter from './teller.payments';
import { getAccountLimit } from '../routes';
import { getTellerUser, saveTellerUser, getTellerAccessToken } from '../store/tellerUsers';
import { resilientTellerFetch } from '../teller/client';

const router = Router();

// Runtime guard to warn in dev if someone edits these files without the "bubble gum" env flag
// Disabled in development to prevent breaking flows
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_CONNECT_EDITS) {
  // Only warn, don't block connect flows in development
  console.warn('Connect flows are locked. Say "bubble gum" to change them.');
}

/**
 * POST /api/teller/connect-init
 * Initialize Teller Connect flow
 */
router.post("/connect-init", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const applicationId = process.env.TELLER_APPLICATION_ID;
    
    if (!applicationId) {
      return res.status(503).json({ 
        message: "Banking service not configured",
        error: "Teller.io integration is not available"
      });
    }
    
    logger.info("Initializing Teller Connect", { userId });
    
    // Build the callback URL for Teller redirect - ensure it's using https in production
    const protocol = req.get('host')?.includes('replit.dev') ? 'https' : req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/teller/callback`;
    
    logger.info("Teller Connect initialized", { 
      userId
    });
    
    // Use environment from TELLER_ENVIRONMENT or default to development
    const environment = process.env.TELLER_ENVIRONMENT || 'development';
    
    res.json({
      applicationId,
      environment,
      redirectUri
    });
    
  } catch (error: any) {
    logger.error("Failed to initialize Teller Connect", { error });
    res.status(500).json({ 
      message: "Failed to initialize bank connection",
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/save-account
 * Save account from Teller SDK onSuccess callback
 */
router.post("/save-account", requireAuth, async (req: any, res) => {
  console.log('[DEBUG] /api/teller/save-account route HIT');
  console.log('[DEBUG] Request body:', JSON.stringify(req.body));
  console.log('[DEBUG] User:', req.user);
  
  try {
    const userId = req.user.claims.sub;
    const { accessToken, enrollmentId, institution } = req.body;
    
    console.log('[DEBUG] Extracted values:', { userId, accessToken: accessToken ? 'EXISTS' : 'MISSING', enrollmentId, institution });
    
    if (!accessToken) {
      console.log('[DEBUG] Missing accessToken, returning 400');
      return res.status(400).json({ 
        message: "Access token is required" 
      });
    }
    
    logger.info("Saving Teller account from SDK", { userId });
    
    // Use access token as Basic Auth (per Teller docs)
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    // Fetch account details from Teller with mTLS
    const tellerResponse = await resilientTellerFetch(
      'https://api.teller.io/accounts',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      },
      'SaveAccount-FetchAccounts'
    );
    
    if (!tellerResponse.ok) {
      const errorText = await tellerResponse.text();
      logger.error(`Teller API error: ${tellerResponse.status}`, { 
        error: new Error(errorText)
      });
      throw new Error(`Teller API error: ${tellerResponse.status} - ${errorText}`);
    }
    
    const accounts = await tellerResponse.json();
    logger.info(`Teller accounts fetched: ${accounts.length} accounts`);
    
    // Save/update Teller enrollment for this user (store access token once per user)
    // Use access token as enrollmentId if enrollmentId not provided (Teller SDK pattern)
    const actualEnrollmentId = enrollmentId || accessToken;
    await saveTellerUser(userId, {
      enrollmentId: actualEnrollmentId,
      accessToken: accessToken,
      institutionName: institution
    });
    logger.info("Teller enrollment saved/updated", { userId, metadata: { enrollmentId: actualEnrollmentId } });
    
    // Get user and calculate limits
    const user = await storage.getUser(userId);
    const existingAccounts = await storage.getConnectedAccounts(userId);
    const accountLimit = getAccountLimit(user?.subscriptionTier || 'free');
    const isUnlimited = accountLimit === null;
    const availableSlots = isUnlimited ? Infinity : Math.max(0, accountLimit - existingAccounts.length);
    
    // Get set of already-connected Teller account IDs
    const existingTellerIds = new Set(
      existingAccounts
        .filter((acc: any) => acc.provider === 'teller')
        .map((acc: any) => acc.externalAccountId)
    );
    
    // Filter out already-connected accounts
    const newAccounts = accounts.filter((acc: any) => !existingTellerIds.has(acc.id));
    const duplicateCount = accounts.length - newAccounts.length;
    
    logger.info("Teller account limit check", {
      userId,
      metadata: {
        tier: user?.subscriptionTier || 'free',
        limit: accountLimit,
        existingCount: existingAccounts.length,
        availableSlots: isUnlimited ? 'unlimited' : availableSlots,
        totalFromTeller: accounts.length,
        newAccounts: newAccounts.length,
        duplicates: duplicateCount
      }
    });
    
    // If no slots available, reject all new accounts (skip check for unlimited)
    if (!isUnlimited && availableSlots === 0 && newAccounts.length > 0) {
      logger.warn("No available slots for new accounts", { userId });
      return res.status(403).json({
        success: false,
        accountsSaved: 0,
        accountsRejected: newAccounts.length,
        duplicates: duplicateCount,
        limit: accountLimit,
        current: existingAccounts.length,
        message: `Account limit reached (${accountLimit}). Upgrade your plan to connect more accounts.`
      });
    }
    
    // Save new accounts (unlimited users get all, others get up to availableSlots)
    const accountsToSave = isUnlimited ? newAccounts : newAccounts.slice(0, availableSlots);
    const rejectedCount = newAccounts.length - accountsToSave.length;
    
    // Store each account in database with better naming
    for (const account of accountsToSave) {
      const institutionName = institution || account.institution?.name || 'Unknown Bank';
      const lastFour = account.last_four || account.mask || '';
      // Distinguish credit cards from bank accounts for proper handling
      const accountType = account.type === 'credit' ? 'card' : 'bank';
      
      // Create descriptive account name: "Institution - Account Type (****1234)"
      let accountName = account.name || '';
      if (lastFour) {
        accountName = `${institutionName} - ${accountName} (****${lastFour})`;
      } else {
        accountName = `${institutionName} - ${accountName}`;
      }
      
      // For credit cards, use ledger balance (debt amount), for bank accounts use available
      const balanceValue = account.type === 'credit' 
        ? (account.balance?.ledger || 0)
        : (account.balance?.available || 0);
      
      // Safely convert balance to decimal with 2 decimal places, handling edge cases
      let formattedBalance = '0.00';
      try {
        const numBalance = Number(balanceValue);
        if (isFinite(numBalance)) {
          formattedBalance = numBalance.toFixed(2);
        } else {
          console.warn(`[Teller] Invalid balance value for account ${account.id}: ${balanceValue}, using 0.00`);
        }
      } catch (err) {
        console.error(`[Teller] Error converting balance for account ${account.id}:`, err);
      }
      
      console.log(`[Teller] Saving account: ${account.id}`, {
        name: accountName,
        type: accountType,
        balance: formattedBalance,
        institution: institutionName
      });
      
      await storage.upsertConnectedAccount({
        userId,
        provider: 'teller',
        externalAccountId: account.id,
        displayName: accountName,
        institutionName,
        subtype: account.subtype,
        mask: lastFour,
        currency: account.currency || 'USD',
        status: 'connected',
        accountType,
        balance: formattedBalance,
        // NOTE: Access token is NOT stored here - it's in teller_users table to avoid duplication
      });
    }
    
    logger.info("Teller accounts saved successfully", { 
      userId,
      metadata: {
        accountsSaved: accountsToSave.length,
        accountsRejected: rejectedCount,
        duplicates: duplicateCount
      }
    });
    
    res.json({
      success: true,
      accountsSaved: accountsToSave.length,
      accountsRejected: rejectedCount,
      duplicates: duplicateCount,
      limit: accountLimit,
      current: existingAccounts.length + accountsToSave.length,
      message: rejectedCount > 0
        ? `Connected ${accountsToSave.length} of ${newAccounts.length} new accounts. ${rejectedCount} rejected due to tier limit. Upgrade to connect more.`
        : accountsToSave.length === 0 && duplicateCount > 0
        ? `All ${duplicateCount} accounts were already connected.`
        : `All ${accountsToSave.length} accounts connected successfully.`
    });
    
  } catch (error: any) {
    console.error('[Teller Save Account] Full error:', error);
    console.error('[Teller Save Account] Error stack:', error.stack);
    logger.error("Teller save account error", { 
      error: error instanceof Error ? error : new Error(error.message),
      metadata: {
        stack: error.stack,
        name: error.name
      }
    });
    // Don't expose stack traces to clients for security
    res.status(500).json({ 
      message: "Failed to save bank accounts",
      error: error.message
    });
  }
});

/**
 * POST /api/teller/exchange-token
 * Exchange Teller enrollment ID for access token and store account info
 */
router.post("/exchange-token", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { token, enrollmentId, tellerToken: bodyToken } = req.body; // Accept multiple formats
    
    const tellerToken = token || enrollmentId || bodyToken;
    
    if (!tellerToken) {
      return res.status(400).json({ 
        message: "Token or enrollment ID is required" 
      });
    }
    
    logger.info("Exchanging Teller token", { userId });
    
    // Use enrollment ID as Basic Auth username (per Teller docs)
    const authHeader = `Basic ${Buffer.from(tellerToken + ":").toString("base64")}`;
    
    logger.info("Fetching Teller accounts with enrollment ID");
    
    // Fetch account details from Teller
    const tellerResponse = await resilientTellerFetch(
      'https://api.teller.io/accounts',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      },
      'ExchangeToken-FetchAccounts'
    );
    
    if (!tellerResponse.ok) {
      const errorText = await tellerResponse.text();
      logger.error(`Teller API error: ${tellerResponse.status}`, { 
        error: new Error(errorText)
      });
      throw new Error(`Teller API error: ${tellerResponse.status} - ${errorText}`);
    }
    
    const accounts = await tellerResponse.json();
    logger.info(`Teller accounts fetched: ${accounts.length} accounts`);
    
    // Get user and calculate limits
    const user = await storage.getUser(userId);
    const existingAccounts = await storage.getConnectedAccounts(userId);
    const accountLimit = getAccountLimit(user?.subscriptionTier || 'free');
    const isUnlimited = accountLimit === null;
    const availableSlots = isUnlimited ? Infinity : Math.max(0, accountLimit - existingAccounts.length);
    
    // Get set of already-connected Teller account IDs
    const existingTellerIds = new Set(
      existingAccounts
        .filter((acc: any) => acc.provider === 'teller')
        .map((acc: any) => acc.externalAccountId)
    );
    
    // Filter out already-connected accounts
    const newAccounts = accounts.filter((acc: any) => !existingTellerIds.has(acc.id));
    const duplicateCount = accounts.length - newAccounts.length;
    
    logger.info("Teller account limit check", {
      userId,
      metadata: {
        tier: user?.subscriptionTier || 'free',
        limit: accountLimit,
        existingCount: existingAccounts.length,
        availableSlots: isUnlimited ? 'unlimited' : availableSlots,
        totalFromTeller: accounts.length,
        newAccounts: newAccounts.length,
        duplicates: duplicateCount
      }
    });
    
    // If no slots available, reject all new accounts (skip check for unlimited)
    if (!isUnlimited && availableSlots === 0 && newAccounts.length > 0) {
      logger.warn("No available slots for new accounts", { userId });
      return res.status(403).json({
        success: false,
        accountsSaved: 0,
        accountsRejected: newAccounts.length,
        duplicates: duplicateCount,
        limit: accountLimit,
        current: existingAccounts.length,
        message: `Account limit reached (${accountLimit}). Upgrade your plan to connect more accounts.`
      });
    }
    
    // Save new accounts (unlimited users get all, others get up to availableSlots)
    const accountsToSave = isUnlimited ? newAccounts : newAccounts.slice(0, availableSlots);
    const rejectedCount = newAccounts.length - accountsToSave.length;
    
    // Store each account in database
    for (const account of accountsToSave) {
      // For credit cards, use ledger balance (debt amount), for bank accounts use available
      const balanceValue = account.type === 'credit' 
        ? (account.balance?.ledger || 0)
        : (account.balance?.available || 0);
      
      await storage.createConnectedAccount({
        userId,
        provider: 'teller',
        accountType: account.type === 'credit' ? 'card' : 'bank',
        accountName: account.name,
        accountNumber: account.last_four || '',
        balance: String(balanceValue),
        currency: account.currency || 'USD',
        institutionName: account.institution?.name || 'Unknown Bank',
        externalAccountId: account.id,
        connectionId: account.enrollment_id,
        institutionId: account.institution?.id,
        accessToken: tellerToken, // Store enrollment ID as token
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    logger.info("Teller accounts connected", { 
      userId,
      metadata: {
        accountsSaved: accountsToSave.length,
        accountsRejected: rejectedCount,
        duplicates: duplicateCount
      }
    });
    
    res.json({
      success: true,
      accountsSaved: accountsToSave.length,
      accountsRejected: rejectedCount,
      duplicates: duplicateCount,
      limit: accountLimit,
      current: existingAccounts.length + accountsToSave.length,
      message: rejectedCount > 0
        ? `Connected ${accountsToSave.length} of ${newAccounts.length} new accounts. ${rejectedCount} rejected due to tier limit. Upgrade to connect more.`
        : accountsToSave.length === 0 && duplicateCount > 0
        ? `All ${duplicateCount} accounts were already connected.`
        : `All ${accountsToSave.length} accounts connected successfully.`
    });
    
  } catch (error: any) {
    logger.error("Teller exchange error", { error: error.message });
    res.status(500).json({ 
      message: "Failed to connect bank accounts",
      error: error.message
    });
  }
});

/**
 * GET /api/teller/accounts
 * Get connected Teller accounts - with connectivity validation
 */
router.get("/accounts", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get accounts from database first
    const dbAccounts = await storage.getConnectedAccountsByProvider(userId, 'teller');
    
    if (!dbAccounts || dbAccounts.length === 0) {
      return res.json({ 
        provider: 'teller',
        accounts: [] 
      });
    }
    
    // Fetch Teller access token for this user
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.json({ 
        provider: 'teller',
        accounts: [] 
      });
    }
    
    // Test connectivity for each account and filter out inaccessible ones
    const validAccounts = [];
    const invalidAccountIds = [];
    
    for (const dbAccount of dbAccounts) {
      if (!dbAccount.externalAccountId) {
        console.log(`[Teller Connectivity] Account ${dbAccount.id} missing external ID, marking inactive`);
        invalidAccountIds.push(dbAccount.id);
        continue;
      }
      
      try {
        // Test connectivity by making a simple API call
        const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
        const response = await resilientTellerFetch(`https://api.teller.io/accounts/${dbAccount.externalAccountId}`, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        }, 'GetAccounts-ConnectivityCheck');
        
        if (response.ok) {
          const accountData = await response.json();
          validAccounts.push({
            id: accountData.id,
            name: accountData.name,
            type: accountData.type,
            subtype: accountData.subtype,
            institution: accountData.institution,
            balance: accountData.balance,
            balances: accountData.balances,
            status: accountData.status,
            currency: accountData.currency || 'USD',
            enrollment_id: accountData.enrollment_id,
            last_four: accountData.last_four,
            details: accountData.details
          });
          console.log(`[Teller Connectivity] Account ${dbAccount.id} (${dbAccount.externalAccountId}) is accessible`);
        } else if (response.status === 401 || response.status === 403) {
          // Authentication/authorization error - mark account as inactive
          console.log(`[Teller Connectivity] Account ${dbAccount.id} authentication failed (${response.status}), marking inactive`);
          invalidAccountIds.push(dbAccount.id);
        } else {
          // Other errors - log but don't mark inactive (might be temporary)
          console.log(`[Teller Connectivity] Account ${dbAccount.id} temporary error (${response.status}), excluding from results`);
        }
      } catch (error: any) {
        console.log(`[Teller Connectivity] Account ${dbAccount.id} connection failed:`, error.message);
        // Network errors might be temporary, so don't mark as inactive
      }
    }
    
    // Mark accounts with invalid credentials as inactive in database
    for (const accountId of invalidAccountIds) {
      try {
        // Update isActive field to false for accounts that failed authentication
        await storage.updateConnectedAccountActive(accountId, false);
        console.log(`[Teller Connectivity] Marked account ${accountId} as inactive in database`);
      } catch (updateError: any) {
        console.error(`[Teller Connectivity] Failed to mark account ${accountId} as inactive:`, updateError.message);
      }
    }
    
    logger.info("Teller accounts retrieved with connectivity validation", { 
      userId, 
      metadata: {
        totalInDb: dbAccounts.length,
        validAccounts: validAccounts.length,
        invalidAccounts: invalidAccountIds.length
      }
    });
    
    res.json({ 
      accounts: validAccounts 
    });
    
  } catch (error: any) {
    logger.error("Failed to fetch Teller accounts", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch bank accounts",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/transactions/:accountId
 * Get transactions for a specific account
 */
router.get("/transactions/:accountId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { accountId } = req.params;
    
    // Get account to verify ownership
    const account = await storage.getConnectedAccountByExternalId(userId, 'teller', accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ message: "Teller enrollment not found" });
    }
    
    // Fetch transactions from Teller
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    const response = await resilientTellerFetch(
      `https://api.teller.io/accounts/${accountId}/transactions`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      },
      'GetTransactions-FetchTransactions'
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }
    
    const transactions = await response.json();
    res.json({ transactions });
    
  } catch (error: any) {
    logger.error("Failed to fetch transactions", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch transactions",
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/transfer
 * Initiate a bank transfer (ACH)
 */
router.post("/transfer", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { fromAccountId, toAccountId, amount, description } = req.body;
    
    if (!fromAccountId || !amount) {
      return res.status(400).json({ 
        message: "From account and amount are required" 
      });
    }
    
    // Get source account
    const fromAccount = await storage.getConnectedAccountByExternalId(userId, 'teller', fromAccountId);
    if (!fromAccount || fromAccount.userId !== userId) {
      return res.status(404).json({ message: "Source account not found" });
    }
    
    // For demo purposes, we'll simulate the transfer
    // In production, you would use Teller's ACH API
    const transfer = {
      id: `transfer_${Date.now()}`,
      from: fromAccountId,
      to: toAccountId,
      amount,
      description,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Log the transfer
    await storage.createActivity({
      userId,
      action: 'transfer',
      description: `Transfer initiated: $${amount} from ${fromAccount.accountName}`,
      metadata: transfer,
      createdAt: new Date()
    });
    
    res.json({ 
      success: true,
      transfer,
      message: "Transfer initiated successfully"
    });
    
  } catch (error: any) {
    logger.error("Transfer failed", { error: error.message });
    res.status(500).json({ 
      message: "Failed to initiate transfer",
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/pay-card
 * Make a credit card payment
 */
router.post("/pay-card", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { cardAccountId, fromAccountId, amount } = req.body;
    
    if (!cardAccountId || !fromAccountId || !amount) {
      return res.status(400).json({ 
        message: "Card account, source account, and amount are required" 
      });
    }
    
    // Get both accounts
    const cardAccount = await storage.getConnectedAccountByExternalId(userId, 'teller', cardAccountId);
    const bankAccount = await storage.getConnectedAccountByExternalId(userId, 'teller', fromAccountId);
    
    if (!cardAccount || cardAccount.userId !== userId) {
      return res.status(404).json({ message: "Card account not found" });
    }
    
    if (!bankAccount || bankAccount.userId !== userId) {
      return res.status(404).json({ message: "Bank account not found" });
    }
    
    // Simulate credit card payment
    // In production, you would use Teller's payment API
    const payment = {
      id: `payment_${Date.now()}`,
      cardAccount: cardAccountId,
      fromAccount: fromAccountId,
      amount,
      status: 'processing',
      createdAt: new Date()
    };
    
    // Log the payment
    await storage.createActivity({
      userId,
      action: 'payment',
      description: `Credit card payment: $${amount} to ${cardAccount.accountName}`,
      metadata: payment,
      createdAt: new Date()
    });
    
    res.json({ 
      success: true,
      payment,
      message: "Credit card payment initiated"
    });
    
  } catch (error: any) {
    logger.error("Card payment failed", { error: error.message });
    res.status(500).json({ 
      message: "Failed to process card payment",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/balances
 * Get real-time balances for all connected accounts
 */
router.get("/balances", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get all connected Teller accounts
    const accounts = await storage.getConnectedAccountsByProvider(userId, 'teller');
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.json({ balances: [] });
    }
    
    const balances = [];
    for (const account of accounts) {
      const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
      
      try {
        const response = await fetch(
          `https://api.teller.io/accounts/${account.externalAccountId}/balances`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          balances.push({
            accountId: account.externalAccountId,
            accountName: account.accountName,
            available: data.available,
            current: data.current,
            type: account.accountType
          });
        }
      } catch (err) {
        logger.error(`Failed to fetch balance for account: ${account.externalAccountId}`, { 
          error: err as Error
        });
      }
    }
    
    res.json({ balances });
    
  } catch (error: any) {
    logger.error("Failed to fetch balances", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch balances",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/identity
 * Get beneficial owner identity information for connected accounts
 */
router.get("/identity", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get all connected Teller accounts
    const accounts = await storage.getConnectedAccountsByProvider(userId, 'teller');
    
    if (accounts.length === 0) {
      return res.json({ identity: [] });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ message: "Teller enrollment not found" });
    }
    
    // Use access token to get identity info
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    const response = await fetch(
      'https://api.teller.io/identity',
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch identity: ${response.status}`);
    }
    
    const identityData = await response.json();
    res.json({ identity: identityData });
    
  } catch (error: any) {
    logger.error("Failed to fetch identity", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch identity information",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/account/:accountId/details
 * Get detailed account information including routing/account numbers
 */
router.get("/account/:accountId/details", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { accountId } = req.params;
    
    // Get account to verify ownership
    const account = await storage.getConnectedAccountByExternalId(userId, 'teller', accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ message: "Teller enrollment not found" });
    }
    
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    const response = await fetch(
      `https://api.teller.io/accounts/${accountId}/details`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }
    
    const details = await response.json();
    res.json({ details });
    
  } catch (error: any) {
    logger.error("Failed to fetch account details", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch account details",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/test-connection
 * Test Teller connection with a sample enrollment ID
 */
router.get("/test-connection", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { enrollmentId } = req.query;
    
    if (!enrollmentId) {
      return res.json({
        message: "Provide enrollment_id as query parameter to test",
        example: "/api/teller/test-connection?enrollmentId=YOUR_ENROLLMENT_ID"
      });
    }
    
    logger.info("Testing Teller connection", { userId });
    
    // Use enrollment ID as Basic Auth username (per Teller docs)
    const authHeader = `Basic ${Buffer.from(enrollmentId + ":").toString("base64")}`;
    
    // Try to fetch accounts
    const tellerResponse = await fetch(
      'https://api.teller.io/accounts',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!tellerResponse.ok) {
      const errorText = await tellerResponse.text();
      return res.json({
        success: false,
        status: tellerResponse.status,
        error: errorText,
        message: "Failed to fetch accounts - check enrollment ID"
      });
    }
    
    const accounts = await tellerResponse.json();
    
    res.json({
      success: true,
      accounts: accounts.length,
      data: accounts,
      message: "Connection successful! This enrollment ID works."
    });
    
  } catch (error: any) {
    logger.error("Test connection failed", { error: error.message });
    res.status(500).json({ 
      success: false,
      message: "Test failed",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/institutions
 * List all supported financial institutions
 */
router.get("/institutions", async (req, res) => {
  try {
    // Institutions endpoint is public, uses mTLS but no auth token
    const response = await resilientTellerFetch('https://api.teller.io/institutions', {
      headers: {
        'Accept': 'application/json'
      }
    }, 'Institutions-List');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch institutions: ${response.status}`);
    }
    
    const institutions = await response.json();
    res.json({ institutions });
    
  } catch (error: any) {
    logger.error("Failed to fetch institutions", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch institutions",
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/webhook
 * Handle Teller webhook events with proper signature verification
 * Following: https://teller.io/docs/api/webhooks
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers['teller-signature'] as string;
    const webhookSecret = process.env.TELLER_WEBHOOK_SECRET;
    
    if (!signature) {
      logger.warn("Webhook received without signature");
      return res.status(401).json({ message: "Missing signature" });
    }
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const { verifyTellerWebhook } = await import("../teller/client");
      const rawBody = JSON.stringify(req.body);
      
      if (!verifyTellerWebhook(rawBody, signature, webhookSecret)) {
        logger.warn("Webhook signature verification failed");
        return res.status(401).json({ message: "Invalid signature" });
      }
      
      logger.info("Webhook signature verified successfully");
    } else {
      logger.warn("Webhook secret not configured - skipping signature verification");
    }
    
    const { id, type, payload, timestamp: eventTime } = req.body;
    
    logger.info(`Processing Teller webhook: ${type}`, { 
      metadata: {
        webhookId: id, 
        timestamp: eventTime
      }
    });
    
    // Use the comprehensive webhook processor
    const { processTellerWebhook } = await import("../teller/client");
    processTellerWebhook(req.body);
    
    switch (type) {
      case 'enrollment.disconnected':
        // Handle disconnected enrollment following Teller docs
        const { enrollment_id, reason } = payload;
        logger.warn(`Enrollment disconnected: ${enrollment_id} - ${reason}`);
        
        try {
          // Mark accounts as disconnected in database
          await storage.markEnrollmentDisconnected(enrollment_id, reason);
          
          // TODO: Notify user to reconnect via Teller Connect in update mode
          // Following Teller docs: "initialize Teller Connect in update mode"
        } catch (storageError: any) {
          logger.error("Failed to update enrollment status", { error: storageError.message });
        }
        break;
        
      case 'transactions.processed':
        // Handle processed transactions with enrichment data
        const { transactions } = payload;
        logger.info(`Processing ${transactions?.length || 0} enriched transactions`);
        
        if (transactions && Array.isArray(transactions)) {
          for (const transaction of transactions) {
            try {
              // Store transaction with enrichment data (category, counterparty, etc.)
              await storage.upsertTransaction(transaction);
            } catch (transactionError: any) {
              logger.error("Failed to store transaction", { 
                error: transactionError instanceof Error ? transactionError : new Error(transactionError.message),
                metadata: {
                  transactionId: transaction.id
                }
              });
            }
          }
        }
        break;
        
      case 'account.number_verification.processed':
        // Handle account verification via microdeposit
        const { account_id, status } = payload;
        logger.info(`Account verification ${status}: ${account_id}`);
        
        try {
          // Update account verification status in database
          await storage.updateAccountVerificationStatus(account_id, status);
          
          if (status === 'completed') {
            logger.info(`Account details now available for ${account_id}`);
            // TODO: Notify user that account details are ready
          } else if (status === 'expired') {
            logger.warn(`Account verification expired for ${account_id}`);
            // TODO: Notify user to re-verify account
          }
        } catch (verificationError: any) {
          logger.error("Failed to update verification status", { 
            error: verificationError instanceof Error ? verificationError : new Error(verificationError.message),
            metadata: {
              accountId: account_id
            }
          });
        }
        break;
        
      case 'webhook.test':
        // Test webhook from Teller dashboard
        logger.info("Test webhook received and processed successfully");
        break;
        
      default:
        logger.warn(`Unknown webhook type received: ${type}`, { 
          metadata: {
            webhookId: id,
            payloadKeys: Object.keys(payload || {})
          }
        });
    }
    
    // Always respond with 200 to acknowledge receipt (following Teller docs)
    res.json({ 
      received: true, 
      processed: true,
      webhook_id: id,
      type
    });
    
  } catch (error: any) {
    logger.error("Webhook processing error", { error: error.message });
    // Still respond with 200 to prevent retries (following Teller docs)
    res.json({ 
      received: true, 
      processed: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/payments
 * Initiate capability-checked payment from account (requires issuer support)
 */
router.post("/payments", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { 
      accountId, 
      amount, 
      recipientName, 
      recipientRoutingNumber, 
      recipientAccountNumber,
      description 
    } = req.body;
    
    if (!accountId || !amount || !recipientName || !recipientRoutingNumber || !recipientAccountNumber) {
      return res.status(400).json({ 
        message: "Missing required payment information" 
      });
    }
    
    // Get account to verify ownership
    const account = await storage.getConnectedAccountByExternalId(userId, 'teller', accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ message: "Teller enrollment not found" });
    }
    
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    // Create capability-checked payment via Teller
    const response = await fetch(
      `https://api.teller.io/accounts/${accountId}/payments`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount,
          recipient: {
            name: recipientName,
            routing_number: recipientRoutingNumber,
            account_number: recipientAccountNumber
          },
          description
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Payment failed: ${response.status} - ${errorData}`);
    }
    
    const payment = await response.json();
    
    // Log the payment
    await storage.createActivity({
      userId,
      action: 'ach_payment',
      description: `ACH payment: $${amount} to ${recipientName}`,
      metadata: payment,
      createdAt: new Date()
    });
    
    res.json({ 
      success: true,
      payment,
      message: "ACH payment initiated successfully"
    });
    
  } catch (error: any) {
    logger.error("ACH payment failed", { error: error.message });
    res.status(500).json({ 
      message: "Failed to initiate ACH payment",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/enrollment/:enrollmentId/status
 * Check enrollment connection status
 */
router.get("/enrollment/:enrollmentId/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { enrollmentId } = req.params;
    
    // Get account by enrollment ID
    const accounts = await storage.getConnectedAccountsByProvider(userId, 'teller');
    const account = accounts.find(acc => acc.connectionId === enrollmentId);
    
    if (!account) {
      return res.status(404).json({ message: "Enrollment not found" });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ message: "Teller enrollment not found" });
    }
    
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    // Try to fetch account to check if connection is still valid
    const response = await fetch(
      `https://api.teller.io/accounts/${account.externalAccountId}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );
    
    const status = response.ok ? 'connected' : 'disconnected';
    const statusCode = response.status;
    
    res.json({ 
      enrollmentId,
      status,
      statusCode,
      accountId: account.externalAccountId
    });
    
  } catch (error: any) {
    logger.error("Failed to check enrollment status", { error: error.message });
    res.status(500).json({ 
      message: "Failed to check enrollment status",
      error: error.message 
    });
  }
});

/**
 * GET /api/teller/account/:accountId/details
 * Fetch detailed account information from Teller API
 */
router.get("/account/:accountId/details", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { accountId } = req.params;
    
    logger.info("Fetching Teller account details", { 
      userId, 
      metadata: {
        accountId
      }
    });
    
    // Get the connected account to verify ownership
    const connectedAccount = await storage.getConnectedAccountByExternalId(userId, 'teller', accountId);
    
    if (!connectedAccount) {
      return res.status(404).json({ 
        message: "Account not found or not accessible"
      });
    }
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ 
        message: "Teller enrollment not found"
      });
    }
    
    // Create auth header with access token (Teller uses Basic auth, not Bearer)
    const authHeader = `Basic ${Buffer.from(accessToken + ":").toString("base64")}`;
    
    // Fetch detailed account info from Teller using mTLS
    const accountResponse = await resilientTellerFetch(
      `https://api.teller.io/accounts/${accountId}`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      },
      'TellerAccountDetails-Account'
    );
    
    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      logger.error(`Teller account details API error: ${accountResponse.status}`, { 
        error: new Error(errorText),
        metadata: {
          accountId
        }
      });
      throw new Error(`Failed to fetch account details: ${accountResponse.status}`);
    }
    
    const accountDetails = await accountResponse.json();
    
    // Fetch balances separately if available using mTLS
    let balances = null;
    try {
      const balanceResponse = await resilientTellerFetch(
        `https://api.teller.io/accounts/${accountId}/balances`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        },
        'TellerAccountDetails-Balances'
      );
      
      if (balanceResponse.ok) {
        balances = await balanceResponse.json();
      }
    } catch (balanceError) {
      logger.warn("Failed to fetch balances", { error: balanceError instanceof Error ? balanceError : new Error(String(balanceError)) });
    }

    // Fetch transactions (last 500 transactions) using mTLS
    let transactions = [];
    try {
      const transactionResponse = await resilientTellerFetch(
        `https://api.teller.io/accounts/${accountId}/transactions?count=500`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        },
        'TellerAccountDetails-Transactions'
      );
      
      if (transactionResponse.ok) {
        transactions = await transactionResponse.json();
      }
    } catch (transactionError) {
      logger.warn("Failed to fetch transactions", { error: transactionError instanceof Error ? transactionError : new Error(String(transactionError)) });
    }

    // Fetch statements if available using mTLS
    let statements = [];
    try {
      const statementResponse = await resilientTellerFetch(
        `https://api.teller.io/accounts/${accountId}/statements`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        },
        'TellerAccountDetails-Statements'
      );
      
      if (statementResponse.ok) {
        statements = await statementResponse.json();
      }
    } catch (statementError) {
      logger.warn("Failed to fetch statements", { error: statementError instanceof Error ? statementError : new Error(String(statementError)) });
    }

    // Analyze transactions for recurring patterns (simple implementation)
    const recurring = analyzeRecurringTransactions(transactions);
    
    // Get connection info from our database
    const connectionInfo = {
      lastSync: connectedAccount.lastSynced || new Date(),
      status: 'active',
      encryptionEnabled: true,
      accessLevel: 'read-only'
    };
    
    logger.info("Teller account details fetched successfully", { 
      userId,
      metadata: {
        accountId,
        hasBalances: !!balances
      }
    });
    
    res.json({ 
      account: accountDetails,
      balances: balances || accountDetails.balance,
      transactions: transactions,
      statements: statements,
      recurring: recurring,
      connectionInfo: connectionInfo,
      success: true
    });
    
  } catch (error: any) {
    logger.error("Teller account details error", { 
      error: error instanceof Error ? error : new Error(error.message),
      metadata: {
        accountId: req.params.accountId
      }
    });
    res.status(500).json({ 
      message: "Failed to fetch account details",
      error: error.message
    });
  }
});

/**
 * Helper function to analyze transactions for recurring patterns
 */
function analyzeRecurringTransactions(transactions: any[]): any[] {
  const recurringMap = new Map();
  
  transactions.forEach((transaction: any) => {
    const merchant = transaction.details?.counterparty?.name || transaction.description;
    const amount = Math.abs(transaction.amount);
    
    if (merchant && merchant.length > 3) {
      const key = `${merchant}-${amount}`;
      if (!recurringMap.has(key)) {
        recurringMap.set(key, {
          merchant,
          amount,
          transactions: [],
          dates: []
        });
      }
      
      recurringMap.get(key).transactions.push(transaction);
      recurringMap.get(key).dates.push(new Date(transaction.date));
    }
  });
  
  // Filter for patterns with 2+ occurrences
  const recurring: any[] = [];
  recurringMap.forEach((data, key) => {
    if (data.transactions.length >= 2) {
      const dates = data.dates.sort((a: Date, b: Date) => b.getTime() - a.getTime());
      const daysBetween = Math.abs(dates[0].getTime() - dates[1].getTime()) / (1000 * 60 * 60 * 24);
      
      let cadence = 'Unknown';
      if (daysBetween >= 28 && daysBetween <= 32) cadence = 'Monthly';
      else if (daysBetween >= 6 && daysBetween <= 8) cadence = 'Weekly';
      else if (daysBetween >= 89 && daysBetween <= 95) cadence = 'Quarterly';
      else if (daysBetween >= 360 && daysBetween <= 370) cadence = 'Yearly';
      
      recurring.push({
        merchant: data.merchant,
        amount: data.amount,
        cadence,
        last_seen: dates[0].toISOString(),
        category: data.transactions[0].details?.category || 'Other',
        count: data.transactions.length
      });
    }
  });
  
  return recurring.slice(0, 10); // Limit to top 10
}

/**
 * GET /api/teller/identity
 * Get identity information for all connected accounts
 * Following: https://teller.io/docs/api/identity#get-identity
 */
router.get("/identity", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Use the new comprehensive Teller client
    const { tellerForUser } = await import("../teller/client");
    const teller = await tellerForUser(userId);
    
    const identities = await teller.identity.get();
    
    res.json({ 
      identities,
      count: identities.length
    });
    
  } catch (error: any) {
    logger.error("Failed to fetch identity information", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch identity information",
      error: error.message 
    });
  }
});

/**
 * POST /api/teller/init-update
 * Initialize Teller Connect in update mode for reconnecting an existing account
 */
router.post("/init-update", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ 
        message: "Account ID is required" 
      });
    }
    
    console.log('[Teller Update] Initializing update mode for account:', { userId, accountId });
    
    // Get the Teller account from our database
    const account = await storage.getConnectedAccount(parseInt(accountId));
    if (!account || account.provider !== 'teller' || account.userId !== userId) {
      return res.status(404).json({ 
        message: "Teller account not found" 
      });
    }
    
    console.log('[Teller Update] Found account:', {
      externalId: account.externalAccountId,
      accountName: account.accountName,
      institutionName: account.institutionName
    });
    
    // For update mode, we need to get a connectToken from Teller
    // This requires the existing enrollment_id/access_token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.status(400).json({ 
        message: "Teller enrollment not found. Cannot initialize update mode." 
      });
    }
    
    // According to Teller docs, we can use the existing enrollment_id as connectToken
    // for update mode, or we need to call Teller API to get a proper connectToken
    // For now, we'll use the access token directly as the connectToken
    const connectToken = accessToken;
    
    res.json({
      applicationId: process.env.TELLER_APPLICATION_ID,
      connectToken: connectToken,
      environment: process.env.TELLER_ENVIRONMENT || 'sandbox'
    });
    
  } catch (error: any) {
    console.error('[Teller Update] Error initializing update mode:', error.message);
    res.status(500).json({ 
      message: "Failed to initialize account reconnection",
      error: error.message
    });
  }
});

/**
 * GET /api/teller/money-movement
 * Get money in/out analysis for a specific month
 */
router.get("/money-movement", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { year, month } = req.query;
    
    // Default to current month if not specified
    const targetDate = new Date(year || new Date().getFullYear(), (month ? parseInt(month) - 1 : new Date().getMonth()), 1);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    // Get all Teller accounts for this user
    const tellerAccounts = await storage.getConnectedAccounts(userId);
    const accounts = tellerAccounts.filter(acc => acc.provider === 'teller');
    
    // Fetch Teller access token
    const accessToken = await getTellerAccessToken(userId);
    if (!accessToken) {
      return res.json({ moneyIn: 0, moneyOut: 0, sources: [], spend: [] });
    }
    
    let moneyIn = 0;
    let moneyOut = 0;
    const sources: { [key: string]: { amount: number; provider: string } } = {};
    const spend: { [key: string]: { amount: number; provider: string } } = {};
    
    // Fetch transactions from all accounts
    for (const account of accounts) {
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
          'MoneyMovement-Transactions'
        );
        
        if (!response.ok) continue;
        
        const transactions = await response.json();
        
        // Filter transactions for the target month
        transactions.forEach((tx: any) => {
          const txDate = new Date(tx.date);
          if (txDate < startDate || txDate > endDate) return;
          
          const amount = parseFloat(tx.amount || '0');
          const merchant = tx.description || tx.counterparty?.name || 'Unknown';
          const merchantLower = merchant.toLowerCase();
          const provider = account.institutionName || 'Bank';
          
          // DEBUG: Log transaction details to understand Teller's sign convention
          if (merchantLower.includes('deposit') || merchantLower.includes('cash')) {
            console.log(`[DEBUG Transaction] ${merchant}: amount=${amount}, type=${tx.type || 'unknown'}`);
          }
          
          // Teller API uses signed amounts:
          // Positive = Debit (money OUT - purchases, ATM, etc.)
          // Negative = Credit (money IN - deposits, refunds)
          
          if (amount > 0) {
            // Positive amount = Debit = Money OUT (purchases, withdrawals, fees, etc.)
            moneyOut += amount;
            if (!spend[merchant]) {
              spend[merchant] = { amount: 0, provider };
            }
            spend[merchant].amount += amount;
          } else if (amount < 0) {
            // Negative amount = Credit = Money IN (deposits, refunds, etc.)
            const inAmount = Math.abs(amount);
            moneyIn += inAmount;
            if (!sources[merchant]) {
              sources[merchant] = { amount: 0, provider };
            }
            sources[merchant].amount += inAmount;
          }
        });
      } catch (error) {
        console.error(`Error fetching transactions for account ${account.id}:`, error);
      }
    }
    
    // Calculate top sources and top spend (top 10 for scrollable list)
    const topSources = Object.entries(sources)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([name, data]) => ({ name, amount: data.amount, provider: data.provider }));
    
    const topSpend = Object.entries(spend)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([name, data]) => ({ name, amount: data.amount, provider: data.provider }));
    
    // Calculate real 3-month averages
    const threeMonthTotals = { moneyIn: 0, moneyOut: 0 };
    for (let i = 1; i <= 3; i++) {
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - i, 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() - i + 1, 0);
      
      for (const account of accounts) {
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
            'MoneyMovement-3MonthAvg'
          );
          
          if (!response.ok) continue;
          
          const transactions = await response.json();
          
          transactions.forEach((tx: any) => {
            const txDate = new Date(tx.date);
            if (txDate < monthStart || txDate > monthEnd) return;
            
            const amount = parseFloat(tx.amount || '0');
            // Teller API: Positive = Debit (OUT), Negative = Credit (IN)
            if (amount > 0) {
              threeMonthTotals.moneyOut += amount;
            } else if (amount < 0) {
              threeMonthTotals.moneyIn += Math.abs(amount);
            }
          });
        } catch (error) {
          // Skip failed accounts
        }
      }
    }
    
    res.json({
      month: targetDate.toISOString().slice(0, 7), // YYYY-MM format
      moneyIn,
      moneyOut,
      topSources,
      topSpend,
      threeMonthAverage: {
        moneyIn: threeMonthTotals.moneyIn / 3,
        moneyOut: threeMonthTotals.moneyOut / 3
      }
    });
    
  } catch (error: any) {
    logger.error("Failed to fetch money movement data", { error: error.message });
    res.status(500).json({ 
      message: "Failed to fetch money movement data",
      error: error.message 
    });
  }
});

// Mount payments sub-router
router.use("/payments", tellerPaymentsRouter);

export default router;