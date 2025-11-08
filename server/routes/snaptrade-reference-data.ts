/**
 * SnapTrade Reference Data endpoints
 * Handle partner info, symbol search, security types, and instrument metadata
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/jwt-auth';
import { db } from '../db';
import { snaptradeUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractSnapTradeRequestId, createApiError } from '../lib/validation';
import type { ErrorResponse } from '@shared/types';
import { storage } from '../storage';

const router = Router();

// Helper to get SnapTrade credentials for authenticated user
async function getSnapTradeCredentials(userId: string) {
  const credentials = await storage.getSnapTradeUser(userId);
  
  if (!credentials) {
    throw new Error('SnapTrade account not connected');
  }
  
  return {
    userId: credentials.snaptradeUserId || credentials.flintUserId,
    userSecret: credentials.userSecret
  };
}

/**
 * GET /api/snaptrade/reference/partner-info
 * Get partner information for admin diagnostics
 */
router.get('/partner-info', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required',
          requestId: null
        }
      });
    }
    
    console.log('[SnapTrade Reference] Getting partner info for admin diagnostics:', {
      userId
    });
    
    // Get partner info from SnapTrade
    const { referenceDataApi } = await import('../lib/snaptrade');
    const response = await referenceDataApi.getPartnerInfo();
    const partnerInfo = response.data;
    
    console.log('[SnapTrade Reference] Retrieved partner info:', {
      partnerName: partnerInfo?.name || 'Unknown',
      allowedBrokerages: partnerInfo?.allowed_brokerages?.length || 0
    });
    
    res.json({
      partnerInfo: {
        name: partnerInfo?.name || null,
        allowedBrokerages: partnerInfo?.allowed_brokerages || [],
        redirectUris: partnerInfo?.redirect_uris || [],
        logoUrl: partnerInfo?.logo_url || null,
        pinRequired: partnerInfo?.pin_required || false,
        canAccessTrades: partnerInfo?.can_access_trades || false,
        canAccessHoldings: partnerInfo?.can_access_holdings || false,
        canAccessAccountHistory: partnerInfo?.can_access_account_history || false,
        canAccessReferenceData: partnerInfo?.can_access_reference_data || false,
        canAccessPortfolioManagement: partnerInfo?.can_access_portfolio_management || false,
        canAccessOrders: partnerInfo?.can_access_orders || false
      }
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Reference] Error getting partner info:', {
      email: req.user?.claims?.email,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to get partner info',
      error.response?.data?.code || 'GET_PARTNER_INFO_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * GET /api/snaptrade/reference/symbol-search
 * Symbol search for trading with account compatibility checking
 * Query params: substring (required)
 * 
 * Returns symbols with compatibility information for user's connected accounts
 */
router.get('/symbol-search', requireAuth, async (req: any, res) => {
  try {
    const { substring } = req.query;
    const userId = req.user.claims.sub;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required',
          requestId: null
        }
      });
    }
    
    if (!substring || substring.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SUBSTRING',
          message: 'Search substring required',
          requestId: null
        }
      });
    }
    
    const credentials = await getSnapTradeCredentials(userId);
    
    console.log('[SnapTrade Reference] Symbol search with compatibility:', {
      userId,
      substring
    });
    
    // Get user's connected accounts for compatibility checking
    const { accountsApi } = await import('../lib/snaptrade');
    const accountsResponse = await accountsApi.listUserAccounts({
      userId: credentials.userId,
      userSecret: credentials.userSecret
    });
    const accounts = accountsResponse.data || [];
    
    console.log('[SnapTrade Reference] Found user accounts:', {
      count: accounts.length,
      brokerages: accounts.map((acc: any) => acc.institution?.name || 'Unknown')
    });
    
    // Perform symbol search
    const { referenceDataApi } = await import('../lib/snaptrade');
    const { classifySymbol, getAssetTypeLabel } = await import('../lib/snaptradeSymbolClassifier');
    const { isTradingSupported } = await import('../lib/brokerage-capabilities');
    
    let searchResults = [];
    try {
      // Use getSymbols for substring search (supports descriptive queries like "bitcoin")
      const response = await referenceDataApi.getSymbols({
        substring: substring
      });
      searchResults = response.data || [];
    } catch (e: any) {
      console.log('[SnapTrade Reference] General symbol search error:', e.message);
      // Try account-specific search as fallback if we have accounts
      if (accounts.length > 0) {
        try {
          const firstAccount = accounts[0];
          const response = await referenceDataApi.symbolSearchUserAccount({
            userId: credentials.userId,
            userSecret: credentials.userSecret,
            accountId: firstAccount.id,
            substring: substring
          });
          searchResults = response.data || [];
        } catch (fallbackError: any) {
          console.error('[SnapTrade Reference] Fallback search also failed:', fallbackError.message);
        }
      }
    }
    
    console.log('[SnapTrade Reference] Symbol search results:', {
      substring,
      count: searchResults?.length || 0
    });
    
    // Classify and check compatibility for each symbol
    const results = searchResults.map((result: any) => {
      const assetType = classifySymbol(result);
      const assetTypeLabel = getAssetTypeLabel(assetType);
      
      // Check which accounts are compatible with this asset type
      const compatibleAccounts: any[] = [];
      let incompatibleReason: string | null = null;
      
      accounts.forEach((account: any) => {
        const brokerageName = account.institution?.name || '';
        const supportsTrading = isTradingSupported(brokerageName);
        
        if (!supportsTrading) {
          // Skip read-only accounts
          return;
        }
        
        // Check asset type compatibility
        const brokerageNormalized = brokerageName.toUpperCase();
        let isCompatible = false;
        
        if (assetType === 'stock' || assetType === 'etf') {
          // Most brokerages support stocks
          isCompatible = true;
        } else if (assetType === 'crypto') {
          // Only crypto exchanges support crypto
          const cryptoBrokerages = ['COINBASE', 'BINANCE', 'KRAKEN', 'GEMINI', 'ROBINHOOD', 'WEBULL', 'ALPACA'];
          isCompatible = cryptoBrokerages.some(cb => brokerageNormalized.includes(cb));
        } else if (assetType === 'option') {
          // Most US brokerages support options, except pure crypto exchanges
          const cryptoOnly = ['COINBASE', 'BINANCE', 'KRAKEN', 'GEMINI'];
          isCompatible = !cryptoOnly.some(cb => brokerageNormalized.includes(cb));
        }
        
        if (isCompatible) {
          compatibleAccounts.push({
            accountId: account.id,
            institution: brokerageName,
            name: account.name || account.number || null
          });
        }
      });
      
      // Generate incompatible reason if no compatible accounts
      if (compatibleAccounts.length === 0 && accounts.length > 0) {
        if (assetType === 'crypto') {
          incompatibleReason = `None of your connected accounts support cryptocurrency trading. ${assetTypeLabel} can only be traded on crypto exchanges like Coinbase.`;
        } else if (assetType === 'stock' || assetType === 'etf') {
          incompatibleReason = `None of your connected accounts support ${assetTypeLabel.toLowerCase()} trading.`;
        } else if (assetType === 'option') {
          incompatibleReason = `None of your connected accounts support options trading.`;
        } else {
          incompatibleReason = `${assetTypeLabel} is not supported by your connected accounts.`;
        }
      }
      
      return {
        symbol: result.symbol || '',
        description: result.description || result.name || null,
        exchange: result.exchange?.name || null,
        currency: result.currency?.code || 'USD',
        assetType,
        assetTypeLabel,
        isTradable: result.is_tradable !== false,
        compatibleAccounts,
        incompatibleReason,
        isCompatibleWithAnyAccount: compatibleAccounts.length > 0
      };
    });
    
    // Sort results: compatible first, then by asset type
    const sortedResults = results.sort((a, b) => {
      if (a.isCompatibleWithAnyAccount !== b.isCompatibleWithAnyAccount) {
        return a.isCompatibleWithAnyAccount ? -1 : 1;
      }
      return a.assetType.localeCompare(b.assetType);
    });
    
    res.json({
      results: sortedResults,
      totalResults: sortedResults.length
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Reference] Error in symbol search:', {
      email: req.user?.claims?.email,
      substring: req.query.substring,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Symbol search failed',
      error.response?.data?.code || 'SYMBOL_SEARCH_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * GET /api/snaptrade/reference/security-types
 * Get available security types for humanized display
 */
router.get('/security-types', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required',
          requestId: null
        }
      });
    }
    
    console.log('[SnapTrade Reference] Getting security types:', {
      userId
    });
    
    // Get security types from SnapTrade
    const { referenceDataApi } = await import('../lib/snaptrade');
    const response = await referenceDataApi.getSecurityTypes();
    const securityTypes = response.data || [];
    
    console.log('[SnapTrade Reference] Retrieved security types:', {
      count: securityTypes?.length || 0
    });
    
    // Transform to normalized DTO format for humanized display
    const types = securityTypes.map((type: any) => ({
      id: type.id || null,
      code: type.code || null,
      description: type.description || null,
      isSupported: type.is_supported !== false // default true
    }));
    
    res.json({
      securityTypes: types
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Reference] Error getting security types:', {
      email: req.user?.claims?.email,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to get security types',
      error.response?.data?.code || 'GET_SECURITY_TYPES_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * GET /api/snaptrade/reference/symbols/:ticker
 * Get detailed symbol information by ticker
 */
router.get('/symbols/:ticker', requireAuth, async (req: any, res) => {
  try {
    const { ticker } = req.params;
    const userId = req.user.claims.sub;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required',
          requestId: null
        }
      });
    }
    
    console.log('[SnapTrade Reference] Getting symbol details:', {
      userId,
      ticker
    });
    
    // Get symbol details from SnapTrade
    const { referenceDataApi } = await import('../lib/snaptrade');
    const response = await referenceDataApi.getSymbolsByTicker({
      query: ticker
    });
    const symbols = response.data || [];
    
    console.log('[SnapTrade Reference] Retrieved symbol details:', {
      ticker,
      count: symbols?.length || 0
    });
    
    // Find exact match or return first result
    const symbol = symbols.find((s: any) => 
      s.symbol?.toUpperCase() === ticker.toUpperCase()
    ) || symbols[0];
    
    if (!symbol) {
      return res.status(404).json({
        error: {
          code: 'SYMBOL_NOT_FOUND',
          message: `Symbol ${ticker} not found`,
          requestId: null
        }
      });
    }
    
    // Transform to normalized DTO format
    const symbolDetails = {
      symbol: symbol.symbol || null,
      description: symbol.description || symbol.name || null,
      currency: symbol.currency?.code || 'USD',
      exchange: symbol.exchange?.name || null,
      type: symbol.type?.description || symbol.security_type || null,
      isTradable: symbol.is_tradable !== false,
      ficgiCode: symbol.figi_code || null,
      instrumentId: symbol.id || null,
      raw: symbol // Include raw data for enriching instrument cards
    };
    
    res.json({
      symbol: symbolDetails,
      ticker
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Reference] Error getting symbol details:', {
      email: req.user?.claims?.email,
      ticker: req.params.ticker,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to get symbol details',
      error.response?.data?.code || 'GET_SYMBOL_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * GET /api/snaptrade/reference/instruments/:brokerage
 * Background index cache for all brokerage instruments
 * This is for background caching - could be resource intensive
 */
router.get('/instruments/:brokerage', requireAuth, async (req: any, res) => {
  try {
    const { brokerage } = req.params;
    const userId = req.user.claims.sub;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required',
          requestId: null
        }
      });
    }
    
    console.log('[SnapTrade Reference] Getting all brokerage instruments (background cache):', {
      userId,
      brokerage
    });
    
    // Get all brokerage instruments from SnapTrade
    const { referenceDataApi } = await import('../lib/snaptrade');
    const response = await referenceDataApi.listAllBrokerageInstruments({
      brokerage: brokerage
    });
    const instruments = response.data || [];
    
    console.log('[SnapTrade Reference] Retrieved brokerage instruments:', {
      brokerage,
      count: instruments?.length || 0
    });
    
    // Transform to normalized DTO format
    const instrumentsList = (instruments || []).map((instrument: any) => ({
      id: instrument.id || null,
      symbol: instrument.symbol || null,
      description: instrument.description || instrument.name || null,
      currency: instrument.currency?.code || 'USD',
      exchange: instrument.exchange?.name || null,
      type: instrument.type?.description || instrument.security_type || null,
      isTradable: instrument.is_tradable !== false,
      ficgiCode: instrument.figi_code || null
    }));
    
    res.json({
      instruments: instrumentsList,
      brokerage,
      count: instrumentsList.length,
      cached: true // Mark as cacheable for background indexing
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Reference] Error getting brokerage instruments:', {
      email: req.user?.claims?.email,
      brokerage: req.params.brokerage,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to get brokerage instruments',
      error.response?.data?.code || 'GET_INSTRUMENTS_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

export default router;