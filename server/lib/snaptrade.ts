import { Snaptrade } from 'snaptrade-typescript-sdk';
import * as SnaptradeModule from 'snaptrade-typescript-sdk';
import { monitoredSnapTradeCall, retryableSnapTradeCall } from '../utils/snaptradeRequestMonitor';

function hasFn(obj: any, name: string){ return obj && typeof obj[name] === 'function'; }

// Initialize SDK exactly like the official CLI
const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

console.log('[SnapTrade SDK] Initialized with pattern from official CLI:', {
  clientId: process.env.SNAPTRADE_CLIENT_ID,
  consumerKeyLength: process.env.SNAPTRADE_CONSUMER_KEY?.length || 0
});

// Export the API instances
export const authApi = snaptrade.authentication;
export const accountsApi = snaptrade.accountInformation;
export const portfolioApi = snaptrade.transactionsAndReporting;
export const tradingApi = snaptrade.trading;
export const connectionsApi = snaptrade.connections;

// Back-compat alias in case old code referenced a client object
export const snaptradeClient = { authApi, accountsApi, portfolioApi, tradingApi };

console.log('[SnapTrade] SDK init', {
  env: process.env.SNAPTRADE_ENV,
  clientIdTail: process.env.SNAPTRADE_CLIENT_ID?.slice(-6),
  consumerKeyLen: process.env.SNAPTRADE_CONSUMER_KEY?.length,
});

/**
 * Recovery mutex to prevent concurrent re-registration of the same user
 */
const recoveryLocks = new Map<string, Promise<void>>();

/**
 * Auto-recovery function for deleted SnapTrade users
 * This is called automatically when a 404/410/user-not-found error is detected
 */
export async function recoverDeletedSnapTradeUser(flintUserId: string): Promise<void> {
  // Check if recovery is already in progress for this user
  const existingLock = recoveryLocks.get(flintUserId);
  if (existingLock) {
    console.log(`[SnapTrade Recovery] Waiting for existing recovery to complete for user ${flintUserId}`);
    await existingLock;
    return;
  }

  // Create recovery promise and lock
  const recoveryPromise = (async () => {
    try {
      const { db } = await import('../db');
      const { snaptradeUsers } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { logger } = await import('@shared/logger');
      
      console.log(`[SnapTrade Recovery] Re-registering deleted user: ${flintUserId}`);
      
      // Re-register the user with SnapTrade
      const response = await authApi.registerSnapTradeUser({ userId: flintUserId });
      const newUserSecret = (response.data as any).userSecret;
      
      if (!newUserSecret) {
        throw new Error('Failed to get userSecret from SnapTrade registration');
      }
      
      // Update the database with new credentials
      const [updated] = await db
        .update(snaptradeUsers)
        .set({
          snaptradeUserId: flintUserId,
          userSecret: newUserSecret,
          rotatedAt: new Date()
        })
        .where(eq(snaptradeUsers.flintUserId, flintUserId))
        .returning();
      
      if (!updated) {
        throw new Error(`Failed to update snaptrade_users for flintUserId: ${flintUserId}`);
      }
      
      // Audit log the credential rotation
      logger.info('[SnapTrade Recovery] User credentials rotated due to deletion', {
        metadata: {
          flintUserId,
          snaptradeUserId: flintUserId,
          secretLength: newUserSecret.length,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`[SnapTrade Recovery] Successfully re-registered user ${flintUserId}`);
    } catch (error: any) {
      console.error(`[SnapTrade Recovery] Failed to recover user ${flintUserId}:`, error?.message || error);
      throw error;
    } finally {
      // Always remove the lock when done
      recoveryLocks.delete(flintUserId);
    }
  })();
  
  recoveryLocks.set(flintUserId, recoveryPromise);
  await recoveryPromise;
}

/**
 * Validate SnapTrade credentials on startup
 */
export async function validateSnapTradeCredentials() {
  try {
    console.log('[SnapTrade] Validating API credentials...');
    
    const status = await snaptrade.apiStatus.check();
    
    console.log('[SnapTrade] ✅ API credentials valid:', {
      status: status.data?.online ? 'online' : 'offline',
      timestamp: status.data?.timestamp
    });
    
    return true;
  } catch (error: any) {
    console.error('[SnapTrade] ❌ API credentials INVALID:', {
      error: error?.message,
      statusCode: error?.status,
      responseBody: error?.responseBody
    });
    
    console.error('\n⚠️  SNAPTRADE CREDENTIALS ERROR ⚠️');
    console.error('Your SnapTrade API credentials appear to be invalid or expired.');
    console.error('Please update SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in your secrets.');
    console.error('Get new credentials from: https://docs.snaptrade.com\n');
    
    return false;
  }
}

// Version-safe wrapper functions
export async function registerUser(userId: string, flintUserId?: string) {
  return await monitoredSnapTradeCall(
    'registerSnapTradeUser',
    () => authApi.registerSnapTradeUser({ userId }),
    flintUserId
  );
}

/**
 * List all SnapTrade users - Admin endpoint for user management
 * Following official SnapTrade docs: Authentication_listSnapTradeUsers
 */
export async function listAllSnapTradeUsers() {
  return await retryableSnapTradeCall(
    'listSnapTradeUsers',
    () => authApi.listSnapTradeUsers(),
    3
  );
}


export async function createLoginUrl(params: { userId: string; userSecret: string; redirect: string }) {
  const login = await authApi.loginSnapTradeUser({
    userId: params.userId,
    userSecret: params.userSecret,
    immediateRedirect: true,
    customRedirect: params.redirect,
    connectionType: "trade-if-available", // Show both trading and read-only brokerages (Schwab, Robinhood)
  });
  // Return the redirectURI from the response (matches official CLI)
  return (login.data as any)?.redirectURI || (login.data as any)?.url;
}

export async function listAccounts(userId: string, userSecret: string, flintUserId?: string) {
  const response = await retryableSnapTradeCall(
    'listUserAccounts',
    () => accountsApi.listUserAccounts({ userId, userSecret }),
    3,
    flintUserId
  );
  return response.data;
}

export async function getPositions(userId: string, userSecret: string, accountId: string) {
  try {
    // Following SnapTrade best practices: prefer fine-grained APIs over coarse-grained ones
    // Try getUserAccountPositions first (recommended by SnapTrade docs)
    try {
      const positions = await getUserAccountPositions(userId, userSecret, accountId);
      console.log('Using fine-grained getUserAccountPositions API (recommended by SnapTrade)');
      if (positions && positions.length > 0) {
        // Wrap in expected structure for compatibility
        return [{ account: { id: accountId }, positions }];
      }
    } catch (fineGrainedError: any) {
      console.log('Fine-grained API failed, falling back to getAllUserHoldings');
      handleSnapTradeError(fineGrainedError, 'getUserAccountPositions');
    }

    // Fallback to coarse-grained API (getAllUserHoldings)
    const response = await accountsApi.getAllUserHoldings({ userId, userSecret });
    console.log('DEBUG: getAllUserHoldings response length:', response.data?.length);
    
    // Find the specific account's data
    const accountData = response.data?.find((acc: any) => acc.account?.id === accountId);
    if (accountData && accountData.positions) {
      console.log('DEBUG: Found positions for account:', accountId, 'count:', accountData.positions.length);
      // Return the account wrapped in an array to match expected structure
      return [accountData];
    }
    
    console.log('DEBUG: No positions found for account:', accountId);
    return [];
  } catch (e: any) {
    // Final fallback attempt
    try {
      const response = await accountsApi.getUserHoldings({ userId, userSecret, accountId });
      return response.data ? [response.data] : [];
    } catch (fallbackError: any) {
      const errorInfo = handleSnapTradeError(e, 'getPositions');
      console.error('All position fetching methods failed:', errorInfo);
      return [];
    }
  }
}

// ===== ADDITIONAL VERSION-SAFE WRAPPER FUNCTIONS =====

export async function getAccountBalances(userId: string, userSecret: string, accountId: string) {
  // Try common names across SDK versions
  // AccountsApi: getAccountBalances or getBalances
  if (hasFn(accountsApi, 'getAccountBalances')) {
    return (accountsApi as any).getAccountBalances({ userId, userSecret, accountId });
  }
  if (hasFn(accountsApi, 'getBalances')) {
    return (accountsApi as any).getBalances({ userId, userSecret, accountId });
  }
  // Some versions expose balances on PortfolioApi
  if (hasFn((portfolioApi as any), 'getAccountBalances')) {
    return (portfolioApi as any).getAccountBalances({ userId, userSecret, accountId });
  }
  throw new Error('No balances method found');
}

// Orders API name varies; attempt both AccountsApi and PortfolioApi variants
export async function listOpenOrders(userId: string, userSecret: string, accountId: string) {
  if (hasFn(accountsApi, 'listOrders')) {
    return (accountsApi as any).listOrders({ userId, userSecret, accountId, status: 'OPEN' });
  }
  if (hasFn(accountsApi, 'getOpenOrders')) {
    return (accountsApi as any).getOpenOrders({ userId, userSecret, accountId });
  }
  if (hasFn(portfolioApi, 'getOpenOrders')) {
    return (portfolioApi as any).getOpenOrders({ userId, userSecret, accountId });
  }
  return [];
}

export async function listOrderHistory(userId: string, userSecret: string, accountId: string) {
  try {
    // Try portfolioApi first as it's more likely to have order history
    if (hasFn(portfolioApi, 'getOrderHistory')) {
      const response = await (portfolioApi as any).getOrderHistory({ userId, userSecret, accountId });
      console.log('DEBUG: Order history from portfolioApi:', response?.data?.length || 0, 'orders');
      return response?.data || [];
    }
    if (hasFn(accountsApi, 'getOrderHistory')) {
      const response = await (accountsApi as any).getOrderHistory({ userId, userSecret, accountId });
      console.log('DEBUG: Order history from accountsApi:', response?.data?.length || 0, 'orders');
      return response?.data || [];
    }
    if (hasFn(accountsApi, 'listOrders')) {
      const response = await (accountsApi as any).listOrders({ userId, userSecret, accountId, status: 'ALL' });
      console.log('DEBUG: Order history from listOrders:', response?.data?.length || 0, 'orders');
      return response?.data || [];
    }
    console.log('DEBUG: No order history methods found');
    return [];
  } catch (e: any) {
    console.error('DEBUG: Order history error:', e?.message || e);
    return [];
  }
}

// Activity / Transactions (dividends, deposits, withdrawals, trade fills, etc.)
export async function listActivities(userId: string, userSecret: string, accountId: string) {
  try {
    // Try portfolioApi first (most likely to have transactions)
    if (hasFn(portfolioApi, 'getActivities')) {
      const response = await (portfolioApi as any).getActivities({ userId, userSecret, accountId });
      console.log('DEBUG: Activities from portfolioApi.getActivities:', response?.data?.length || 0, 'items');
      return response?.data || [];
    }
    if (hasFn(portfolioApi, 'getTransactions')) {
      const response = await (portfolioApi as any).getTransactions({ userId, userSecret, accountId });
      console.log('DEBUG: Activities from portfolioApi.getTransactions:', response?.data?.length || 0, 'items');
      return response?.data || [];
    }
    if (hasFn(accountsApi, 'getActivities')) {
      const response = await (accountsApi as any).getActivities({ userId, userSecret, accountId });
      console.log('DEBUG: Activities from accountsApi.getActivities:', response?.data?.length || 0, 'items');
      return response?.data || [];
    }
    if (hasFn(accountsApi, 'getTransactions')) {
      const response = await (accountsApi as any).getTransactions({ userId, userSecret, accountId });
      console.log('DEBUG: Activities from accountsApi.getTransactions:', response?.data?.length || 0, 'items');
      return response?.data || [];
    }
    console.log('DEBUG: No activity/transaction methods found in SDK');
    return [];
  } catch (e: any) {
    console.error('DEBUG: Activities error:', e?.message || e);
    return [];
  }
}

// Order Preview and Trading Functions
export async function getOrderImpact(
  userId: string, 
  userSecret: string, 
  accountId: string, 
  params: {
    action: 'BUY' | 'SELL';
    universal_symbol_id: string;
    order_type: 'Market' | 'Limit';
    time_in_force?: 'Day' | 'GTC' | 'IOC' | 'FOK';
    units: number;
    price?: number;
  }
) {
  try {
    const orderImpact = await tradingApi.getOrderImpact({
      userId,
      userSecret,
      account_id: accountId,
      action: params.action,
      universal_symbol_id: params.universal_symbol_id,
      order_type: params.order_type,
      time_in_force: params.time_in_force || 'Day',
      units: params.units,
      price: params.price,
    });
    
    return orderImpact.data;
  } catch (e: any) {
    console.error('SnapTrade getOrderImpact error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

export async function searchSymbols(userId: string, userSecret: string, accountId: string, query: string) {
  try {
    // Try multiple search methods for compatibility
    if (hasFn(snaptrade.referenceData, 'symbolsSearchUserAccount')) {
      const response = await (snaptrade.referenceData as any).symbolsSearchUserAccount({
        userId,
        userSecret,
        accountId,
        query,
      });
      const results = response.data || [];
      console.log('[searchSymbols] symbolsSearchUserAccount results:', {
        query,
        count: results.length,
        firstResult: results[0] ? { id: results[0].id, symbol: results[0].symbol, type: results[0].type } : null
      });
      return results;
    }
    
    if (hasFn(snaptrade.referenceData, 'getSymbolsByTicker')) {
      const response = await (snaptrade.referenceData as any).getSymbolsByTicker({
        query,
      });
      const results = response.data || [];
      console.log('[searchSymbols] getSymbolsByTicker results:', {
        query,
        count: results.length,
        firstResult: results[0] ? { id: results[0].id, symbol: results[0].symbol, type: results[0].type } : null
      });
      return results;
    }
    
    console.log('[searchSymbols] No symbol search methods found');
    return [];
  } catch (e: any) {
    console.error('[searchSymbols] Error:', e?.responseBody || e?.message || e);
    return [];
  }
}

export async function placeOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  params: {
    action: 'BUY' | 'SELL';
    universal_symbol_id: string;
    order_type: 'Market' | 'Limit';
    time_in_force?: 'Day' | 'GTC' | 'IOC' | 'FOK';
    units: number;
    price?: number;
    idempotencyKey?: string;
  }
) {
  try {
    // Try multiple order placement methods for SDK compatibility
    const orderParams = {
      userId,
      userSecret,
      accountId,
      action: params.action,
      universal_symbol_id: params.universal_symbol_id,
      order_type: params.order_type,
      time_in_force: params.time_in_force || 'Day',
      units: params.units,
      price: params.price,
      // Include idempotency key if provided (industry best practice)
      ...(params.idempotencyKey && { idempotencyKey: params.idempotencyKey }),
    };

    console.log('Order placement attempt with params:', {
      ...orderParams,
      userSecret: '[HIDDEN]'
    });

    // Try placeForceOrder first (recommended method from SnapTrade docs)
    if (hasFn(tradingApi, 'placeForceOrder')) {
      console.log('Using placeForceOrder method (recommended by SnapTrade)');
      const order = await (tradingApi as any).placeForceOrder(orderParams);
      console.log('placeForceOrder successful:', { 
        orderId: order.data?.brokerage_order_id || order.data?.id,
        status: order.data?.status 
      });
      return order.data;
    }
    
    // Fallback to standard placeOrder
    if (hasFn(tradingApi, 'placeOrder')) {
      console.log('Using placeOrder method (fallback)');
      const order = await (tradingApi as any).placeOrder(orderParams);
      console.log('placeOrder successful:', { 
        orderId: order.data?.brokerage_order_id || order.data?.id,
        status: order.data?.status 
      });
      return order.data;
    }
    
    throw new Error('No order placement methods available in SDK');
  } catch (e: any) {
    console.error('SnapTrade placeOrder error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

// ============================================
// CRYPTO TRADING FUNCTIONS (Coinbase, Kraken, Binance)
// These use different endpoints than equity trading per SnapTrade docs
// ============================================

/**
 * Search for tradable cryptocurrency pairs for a given account
 * Per SnapTrade docs: GET /accounts/{accountId}/trading/instruments/cryptocurrencyPairs
 */
export async function searchCryptoPairs(
  userId: string,
  userSecret: string,
  accountId: string,
  base?: string,
  quote?: string
): Promise<{ items: Array<{ symbol: string; base: string; quote: string; increment?: string | null }> }> {
  try {
    console.log('[SnapTrade Crypto] Searching crypto pairs:', { accountId: accountId.slice(-6), base, quote });
    
    if (hasFn(tradingApi, 'searchCryptocurrencyPairInstruments')) {
      const response = await (tradingApi as any).searchCryptocurrencyPairInstruments({
        userId,
        userSecret,
        accountId,
        base,
        quote,
      });
      console.log('[SnapTrade Crypto] Found pairs:', response.data?.items?.length || 0);
      return response.data || { items: [] };
    }
    
    console.log('[SnapTrade Crypto] searchCryptocurrencyPairInstruments method not available');
    return { items: [] };
  } catch (e: any) {
    console.error('[SnapTrade Crypto] searchCryptoPairs error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Preview a crypto order before placement
 * Per SnapTrade TypeScript SDK docs: POST /accounts/{accountId}/trading/crypto/preview
 * instrument.symbol = base currency like "BTC" or "XLM" (not the full pair)
 * instrument.type = "CRYPTOCURRENCY" (per TypeScript SDK examples)
 */
export async function previewCryptoOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  params: {
    symbol: string;        // Full pair symbol e.g., "XLM-USD" - we extract base currency
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS_MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_MARKET' | 'TAKE_PROFIT_LIMIT';
    amount: string;        // Amount of base currency (as string for precision)
    time_in_force: 'GTC' | 'FOK' | 'IOC' | 'GTD';
    limit_price?: string;
    stop_price?: string;
    post_only?: boolean;
    expiration_date?: string;
  }
) {
  try {
    // Extract base currency from pair symbol (e.g., "XLM-USD" -> "XLM")
    const baseSymbol = params.symbol.includes('-') ? params.symbol.split('-')[0] : params.symbol;
    
    console.log('[SnapTrade Crypto] Previewing crypto order:', {
      accountId: accountId.slice(-6),
      originalSymbol: params.symbol,
      baseSymbol: baseSymbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      time_in_force: params.time_in_force
    });
    
    if (hasFn(tradingApi, 'previewCryptoOrder')) {
      const response = await (tradingApi as any).previewCryptoOrder({
        userId,
        userSecret,
        accountId,
        instrument: {
          symbol: baseSymbol,       // Base currency only per TypeScript SDK
          type: 'CRYPTOCURRENCY'    // Per TypeScript SDK examples
        },
        side: params.side,
        type: params.type,
        amount: params.amount,
        time_in_force: params.time_in_force,
        limit_price: params.limit_price,
        stop_price: params.stop_price,
        post_only: params.post_only,
        expiration_date: params.expiration_date,
      });
      
      console.log('[SnapTrade Crypto] Preview response:', response.data);
      return response.data;
    }
    
    throw new Error('previewCryptoOrder method not available in SDK');
  } catch (e: any) {
    console.error('[SnapTrade Crypto] previewCryptoOrder error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Place a crypto order
 * Per SnapTrade TypeScript SDK docs: POST /accounts/{accountId}/trading/crypto
 * instrument.symbol = base currency like "BTC" or "XLM" (not the full pair)
 * instrument.type = "CRYPTOCURRENCY" (per TypeScript SDK examples)
 */
export async function placeCryptoOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  params: {
    symbol: string;        // Full pair symbol e.g., "XLM-USD" - we extract base currency
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS_MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_MARKET' | 'TAKE_PROFIT_LIMIT';
    amount: string;        // Amount of base currency (as string for precision)
    time_in_force: 'GTC' | 'FOK' | 'IOC' | 'GTD';
    limit_price?: string;
    stop_price?: string;
    post_only?: boolean;
    expiration_date?: string;
  }
) {
  try {
    // Extract base currency from pair symbol (e.g., "XLM-USD" -> "XLM")
    const baseSymbol = params.symbol.includes('-') ? params.symbol.split('-')[0] : params.symbol;
    
    console.log('[SnapTrade Crypto] Placing crypto order:', {
      accountId: accountId.slice(-6),
      originalSymbol: params.symbol,
      baseSymbol: baseSymbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      time_in_force: params.time_in_force
    });
    
    if (hasFn(tradingApi, 'placeCryptoOrder')) {
      const requestPayload = {
        userId,
        userSecret,
        accountId,
        instrument: {
          symbol: baseSymbol,       // Base currency only per TypeScript SDK
          type: 'CRYPTOCURRENCY'    // Per TypeScript SDK examples
        },
        side: params.side,
        type: params.type,
        amount: params.amount,
        time_in_force: params.time_in_force,
        limit_price: params.limit_price,
        stop_price: params.stop_price,
        post_only: params.post_only,
        expiration_date: params.expiration_date,
      };
      
      console.log('[SnapTrade Crypto] Request payload:', JSON.stringify(requestPayload, null, 2));
      
      const response = await (tradingApi as any).placeCryptoOrder(requestPayload);
      
      console.log('[SnapTrade Crypto] Order placed:', {
        orderId: response.data?.brokerage_order_id,
        status: response.data?.order?.status
      });
      return response.data;
    }
    
    throw new Error('placeCryptoOrder method not available in SDK');
  } catch (e: any) {
    console.error('[SnapTrade Crypto] placeCryptoOrder error:', {
      responseBody: e?.responseBody,
      message: e?.message,
      status: e?.status,
      fullError: JSON.stringify(e, Object.getOwnPropertyNames(e), 2)
    });
    throw e;
  }
}

/**
 * Get a quote for a cryptocurrency pair
 * Per SnapTrade docs: GET /accounts/{accountId}/trading/instruments/cryptocurrencyPairs/{instrumentSymbol}/quote
 */
export async function getCryptoPairQuote(
  userId: string,
  userSecret: string,
  accountId: string,
  instrumentSymbol: string  // e.g., "BTC-USD" - the trading pair
) {
  try {
    console.log('[SnapTrade Crypto] Getting quote for:', { accountId: accountId.slice(-6), instrumentSymbol });
    
    if (hasFn(tradingApi, 'getCryptocurrencyPairQuote')) {
      const response = await (tradingApi as any).getCryptocurrencyPairQuote({
        userId,
        userSecret,
        accountId,
        instrumentSymbol,  // Per SnapTrade docs - use instrumentSymbol not symbol
      });
      
      console.log('[SnapTrade Crypto] Quote:', response.data);
      return response.data;
    }
    
    console.log('[SnapTrade Crypto] getCryptocurrencyPairQuote method not available');
    return null;
  } catch (e: any) {
    console.error('[SnapTrade Crypto] getCryptoPairQuote error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Check if an account is a crypto exchange (Coinbase, Kraken, Binance)
 * These require different trading endpoints
 */
export function isCryptoExchange(institutionName: string): boolean {
  const cryptoExchanges = ['coinbase', 'kraken', 'binance'];
  return cryptoExchanges.some(exchange => 
    institutionName.toLowerCase().includes(exchange)
  );
}

export async function cancelOrder(
  userId: string,
  userSecret: string,
  accountId: string,
  orderId: string
) {
  try {
    console.log('Attempting order cancellation:', {
      userId: userId.slice(-6),
      accountId: accountId.slice(-6),
      orderId: orderId.slice(-6)
    });

    // Check if cancelOrder method is available (capability check)
    if (hasFn(tradingApi, 'cancelOrder')) {
      console.log('Using cancelOrder method');
      const result = await (tradingApi as any).cancelOrder({
        userId,
        userSecret,
        accountId,
        brokerageOrderId: orderId
      });
      
      console.log('Order cancellation successful:', {
        orderId: orderId.slice(-6),
        status: result.data?.status
      });
      
      return result.data;
    }
    
    // Check alternative method names for SDK version compatibility
    if (hasFn(tradingApi, 'cancelOrderRequest')) {
      console.log('Using cancelOrderRequest method');
      const result = await (tradingApi as any).cancelOrderRequest({
        userId,
        userSecret,
        accountId,
        brokerageOrderId: orderId
      });
      return result.data;
    }
    
    // If no cancel methods available, return capability not supported
    console.log('Order cancellation not supported by SDK version');
    throw new Error('ORDER_CANCEL_NOT_SUPPORTED');
    
  } catch (e: any) {
    console.error('SnapTrade cancelOrder error:', e?.responseBody || e?.message || e);
    
    // Handle specific SnapTrade error cases
    if (e?.message?.includes('ORDER_CANCEL_NOT_SUPPORTED')) {
      throw new Error('BROKERAGE_CANCEL_NOT_SUPPORTED');
    }
    
    if (e?.responseBody?.code === 'ORDER_NOT_FOUND') {
      throw new Error('ORDER_NOT_FOUND');
    }
    
    if (e?.responseBody?.code === 'ORDER_ALREADY_FILLED') {
      throw new Error('ORDER_ALREADY_FILLED');
    }
    
    throw e;
  }
}

export async function getOrderStatus(
  userId: string,
  userSecret: string,
  accountId: string,
  orderId: string
) {
  try {
    console.log('Fetching order status:', {
      userId: userId.slice(-6),
      accountId: accountId.slice(-6),
      orderId: orderId.slice(-6)
    });

    // Try different methods to get order status for SDK compatibility
    if (hasFn(tradingApi, 'getOrderStatus')) {
      console.log('Using getOrderStatus method');
      const result = await (tradingApi as any).getOrderStatus({
        userId,
        userSecret,
        accountId,
        brokerageOrderId: orderId
      });
      return result.data;
    }

    if (hasFn(tradingApi, 'getUserAccountOrder')) {
      console.log('Using getUserAccountOrder method');
      const result = await (tradingApi as any).getUserAccountOrder({
        userId,
        userSecret,
        accountId,
        brokerageOrderId: orderId
      });
      return result.data;
    }

    // Fallback: Get from order history and find matching order
    console.log('Fallback: searching order history for status');
    const orderHistory = await listOrderHistory(userId, userSecret, accountId);
    const matchingOrder = orderHistory?.find((order: any) => 
      order.id === orderId || 
      order.brokerage_order_id === orderId ||
      order.brokerageOrderId === orderId
    );

    if (matchingOrder) {
      console.log('Found order in history:', { 
        orderId: orderId.slice(-6),
        status: matchingOrder.status 
      });
      return matchingOrder;
    }

    // Check open orders as well
    const openOrders = await listOpenOrders(userId, userSecret, accountId);
    const matchingOpenOrder = openOrders?.find((order: any) => 
      order.id === orderId || 
      order.brokerage_order_id === orderId ||
      order.brokerageOrderId === orderId
    );

    if (matchingOpenOrder) {
      console.log('Found order in open orders:', { 
        orderId: orderId.slice(-6),
        status: matchingOpenOrder.status 
      });
      return matchingOpenOrder;
    }

    throw new Error('ORDER_NOT_FOUND');
    
  } catch (e: any) {
    console.error('SnapTrade getOrderStatus error:', e?.responseBody || e?.message || e);
    
    if (e?.responseBody?.code === 'ORDER_NOT_FOUND' || e?.message?.includes('ORDER_NOT_FOUND')) {
      throw new Error('ORDER_NOT_FOUND');
    }
    
    throw e;
  }
}

// Return the best instrument record for a symbol (equities/ETF).
export async function resolveInstrumentBySymbol(symbol: string) {
  const S = (SnaptradeModule as any);
  const InstrumentsApi =
    S.InstrumentsApi || S.SymbolsApi || S.SymbolApi || S.SearchApi || S.ReferenceDataApi;
  if (!InstrumentsApi) throw new Error('No instrument/symbol API available in this SDK');

  const instrumentsApi = new InstrumentsApi((S as any).configuration || undefined);

  const cleaned = String(symbol).trim().toUpperCase();
  // Try common method names across SDKs:
  const fns = ['searchInstruments','searchSymbols','search','findSymbols','getSymbols','lookup'];
  for (const fn of fns) {
    if (hasFn(instrumentsApi, fn)) {
      try {
        // Try the simplest param first
        const res = await (instrumentsApi as any)[fn]({ symbol: cleaned, query: cleaned, q: cleaned, search: cleaned } as any)
          .catch(async () => (instrumentsApi as any)[fn](cleaned));
        if (Array.isArray(res) && res.length) {
          // Pick exact ticker match first, otherwise take first result
          const exact = res.find((r:any)=> (r.symbol||r.ticker||'').toUpperCase() === cleaned);
          return exact || res[0];
        }
        if (res?.results && Array.isArray(res.results) && res.results.length) {
          const exact = res.results.find((r:any)=> (r.symbol||r.ticker||'').toUpperCase() === cleaned);
          return exact || res.results[0];
        }
      } catch (e) {
        console.debug('Failed method:', fn, 'for symbol:', symbol);
        continue;
      }
    }
  }
  
  throw new Error(`Instrument for ${cleaned} not found`);
}

// Normalize preview/impact responses => { tradeId, impact }
export function normalizePreview(result: any) {
  if (!result) return { tradeId: null, impact: null };
  const tradeId =
    result.tradeId || result.id || result.previewId || result.orderId || result.trade?.id || null;
  const impact = result.impact || result || null;
  return { tradeId, impact };
}

// ===== COMPREHENSIVE SNAPTRADE API METHODS FOLLOWING OFFICIAL DOCUMENTATION =====

/**
 * API Status - Check whether the API is operational and verify timestamps
 * Following: https://docs.snaptrade.com/reference/API%20Status/ApiStatus_check
 */
export async function checkApiStatus() {
  try {
    const response = await snaptrade.apiStatus.check();
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade checkApiStatus error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Authentication - List all registered SnapTrade users
 * Following: https://docs.snaptrade.com/reference/Authentication/Authentication_listSnapTradeUsers
 */
export async function listSnapTradeUsers() {
  try {
    const response = await authApi.listSnapTradeUsers();
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade listSnapTradeUsers error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Authentication - Delete a SnapTrade user
 * Following: https://docs.snaptrade.com/reference/Authentication/Authentication_deleteSnapTradeUser
 */
export async function deleteSnapTradeUser(userId: string, flintUserId?: string) {
  return await monitoredSnapTradeCall(
    'deleteSnapTradeUser',
    () => authApi.deleteSnapTradeUser({ userId }),
    flintUserId
  );
}

/**
 * Authentication - Reset user secret for a SnapTrade user
 * Following: https://docs.snaptrade.com/reference/Authentication/Authentication_resetSnapTradeUserSecret
 */
export async function resetSnapTradeUserSecret(userId: string, userSecret: string) {
  try {
    const response = await authApi.resetSnapTradeUserSecret({ userId, userSecret });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade resetSnapTradeUserSecret error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get user account details
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountDetails
 */
export async function getUserAccountDetails(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await accountsApi.getUserAccountDetails({ userId, userSecret, accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountDetails error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get user account balance
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountBalance
 */
export async function getUserAccountBalance(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await accountsApi.getUserAccountBalance({ userId, userSecret, accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountBalance error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get user account positions (preferred over getUserHoldings)
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountPositions
 */
export async function getUserAccountPositions(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await accountsApi.getUserAccountPositions({ userId, userSecret, accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountPositions error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get user account orders
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountOrders
 */
export async function getUserAccountOrders(userId: string, userSecret: string, accountId: string, status?: 'OPEN' | 'EXECUTED' | 'CANCELLED' | 'PARTIAL_FILL' | 'PENDING_CANCEL' | 'FAILED') {
  try {
    const params: any = { userId, userSecret, accountId };
    if (status) params.status = status;
    
    const response = await accountsApi.getUserAccountOrders(params);
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountOrders error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get recent orders for user account
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getUserAccountRecentOrders
 */
export async function getUserAccountRecentOrders(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await accountsApi.getUserAccountRecentOrders({ userId, userSecret, accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountRecentOrders error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Account Information - Get account activities (transactions, dividends, etc.)
 * Following: https://docs.snaptrade.com/reference/Account%20Information/AccountInformation_getAccountActivities
 */
export async function getAccountActivities(userId: string, userSecret: string, accountId: string, startDate?: string, endDate?: string, type?: string) {
  try {
    const params: any = { userId, userSecret, accountId };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (type) params.type = type;
    
    const response = await accountsApi.getAccountActivities(params);
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getAccountActivities error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - Get partner info
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_getPartnerInfo
 */
export async function getPartnerInfo() {
  try {
    const response = await snaptrade.referenceData.getPartnerInfo();
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getPartnerInfo error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - Symbol search within user account
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_symbolSearchUserAccount
 */
export async function symbolSearchUserAccount(userId: string, userSecret: string, accountId: string, substring: string) {
  try {
    const response = await snaptrade.referenceData.symbolSearchUserAccount({ 
      userId, 
      userSecret, 
      accountId, 
      substring 
    });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade symbolSearchUserAccount error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - List all brokerage instruments
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_listAllBrokerageInstruments
 */
export async function listAllBrokerageInstruments(size?: number, page?: number) {
  try {
    const params: any = {};
    if (size) params.size = size;
    if (page) params.page = page;
    
    const response = await snaptrade.referenceData.listAllBrokerageInstruments(params);
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade listAllBrokerageInstruments error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - Get security types
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_getSecurityTypes
 */
export async function getSecurityTypes() {
  try {
    const response = await snaptrade.referenceData.getSecurityTypes();
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getSecurityTypes error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - Search symbols
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_getSymbols
 */
export async function getSymbols(substring: string) {
  try {
    const response = await snaptrade.referenceData.getSymbols({ substring });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getSymbols error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Reference Data - Get symbols by ticker
 * Following: https://docs.snaptrade.com/reference/Reference%20Data/ReferenceData_getSymbolsByTicker
 */
export async function getSymbolsByTicker(query: string) {
  try {
    const response = await snaptrade.referenceData.getSymbolsByTicker({ query });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getSymbolsByTicker error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

// ===== ENHANCED UTILITIES BASED ON SNAPTRADE BEST PRACTICES =====

/**
 * Manual refresh connection - Force real-time data sync
 * Following best practices from account-data docs: use manual refresh for real-time data
 */
export async function refreshBrokerageAuthorization(userId: string, userSecret: string, authorizationId: string) {
  try {
    console.log('Manual refresh triggered for authorization:', authorizationId.slice(-6));
    const response = await snaptrade.connections.refreshBrokerageAuthorization({
      userId,
      userSecret,
      authorizationId
    });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade refreshBrokerageAuthorization error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * List brokerage authorizations - Check connection status and disabled state
 * Following fix-broken-connections docs: check disabled status for connection health
 */
export async function listBrokerageAuthorizations(userId: string, userSecret: string, flintUserId?: string) {
  return await retryableSnapTradeCall(
    'listBrokerageAuthorizations',
    () => connectionsApi.listBrokerageAuthorizations({ userId, userSecret }),
    3,
    flintUserId,
    flintUserId ? () => recoverDeletedSnapTradeUser(flintUserId) : undefined
  );
}

/**
 * Get connection details - Check specific connection status
 * Following fix-broken-connections docs: check disabled status for specific connection
 */
export async function detailBrokerageAuthorization(userId: string, userSecret: string, authorizationId: string) {
  try {
    const response = await snaptrade.connections.detailBrokerageAuthorization({
      userId,
      userSecret,
      authorizationId
    });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade detailBrokerageAuthorization error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Enhanced error handling with request ID tracking
 * Following request-ids docs: capture X-Request-ID for debugging
 */
export function handleSnapTradeError(error: any, context: string) {
  const requestId = error?.response?.headers?.['x-request-id'] || error?.headers?.['x-request-id'];
  const rateLimit = error?.response?.headers?.['x-ratelimit-remaining'] || error?.headers?.['x-ratelimit-remaining'];
  
  console.error(`SnapTrade ${context} error:`, {
    message: error?.responseBody?.message || error?.message,
    code: error?.responseBody?.code || error?.code,
    requestId,
    rateLimitRemaining: rateLimit,
    fullError: error?.responseBody || error
  });
  
  // Rate limiting detection
  if (error?.status === 429 || error?.responseBody?.code === 'RATE_LIMIT_EXCEEDED') {
    throw new Error(`RATE_LIMIT_EXCEEDED: Please wait before retrying. Request ID: ${requestId}`);
  }
  
  // Connection disabled detection  
  if (error?.responseBody?.code === 'CONNECTION_DISABLED') {
    throw new Error(`CONNECTION_DISABLED: User needs to reconnect their account. Request ID: ${requestId}`);
  }
  
  return {
    error: error?.responseBody || error,
    requestId,
    rateLimitRemaining: rateLimit
  };
}

/**
 * Reconnect disabled connection - Fix broken connections
 * Following fix-broken-connections docs: use reconnect parameter to fix existing connections
 */
export async function createReconnectLoginUrl(params: { 
  userId: string; 
  userSecret: string; 
  redirect: string;
  authorizationId: string; // The disabled connection to fix
}) {
  try {
    const login = await authApi.loginSnapTradeUser({
      userId: params.userId,
      userSecret: params.userSecret,
      immediateRedirect: true,
      customRedirect: params.redirect,
      reconnect: params.authorizationId, // This is the key parameter for fixing connections
      connectionType: "trade-if-available",
    });
    
    console.log('Reconnect URL generated for disabled connection:', params.authorizationId.slice(-6));
    return (login.data as any)?.redirectURI || (login.data as any)?.url;
  } catch (e: any) {
    console.error('SnapTrade createReconnectLoginUrl error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

export async function disableBrokerageAuthorization(userId: string, userSecret: string, authorizationId: string) {
  try {
    console.log('Disabling brokerage authorization:', authorizationId.slice(-6));
    const response = await snaptrade.connections.disableBrokerageAuthorization({
      userId,
      userSecret,
      authorizationId
    });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade disableBrokerageAuthorization error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

export async function removeBrokerageAuthorization(userId: string, userSecret: string, authorizationId: string) {
  try {
    console.log('Removing brokerage authorization:', authorizationId.slice(-6));
    const response = await snaptrade.connections.removeBrokerageAuthorization({
      userId,
      userSecret,
      authorizationId
    });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade removeBrokerageAuthorization error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

/**
 * Enhanced position fetching using fine-grained APIs
 * Following account-data docs: prefer fine-grained APIs over getUserHoldings
 */
export async function getAccountPositionsDetailed(userId: string, userSecret: string, accountId: string) {
  try {
    // Use fine-grained API as recommended by SnapTrade docs
    const response = await getUserAccountPositions(userId, userSecret, accountId);
    console.log('Using fine-grained getUserAccountPositions API (recommended)');
    return response;
  } catch (e: any) {
    console.error('Fine-grained positions API failed, falling back to getAllUserHoldings');
    // Fallback to original method if fine-grained API fails
    return await getPositions(userId, userSecret, accountId);
  }
}

export async function getUserAccountActivities(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await portfolioApi.getActivities({ userId, userSecret, accounts: accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getUserAccountActivities error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

export async function getSnapTradeAccountDetails(userId: string, userSecret: string, accountId: string) {
  try {
    const response = await accountsApi.getUserAccountDetails({ userId, userSecret, accountId });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getSnapTradeAccountDetails error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

export async function getAllUserHoldings(userId: string, userSecret: string) {
  try {
    const response = await accountsApi.getAllUserHoldings({ userId, userSecret });
    return response.data;
  } catch (e: any) {
    console.error('SnapTrade getAllUserHoldings error:', e?.responseBody || e?.message || e);
    throw e;
  }
}

