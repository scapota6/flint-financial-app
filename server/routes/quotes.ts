import { Router } from "express";
import { requireAuth } from "../middleware/jwt-auth";
import { db } from "../db";
import { snaptradeUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authApi, accountsApi, tradingApi } from "../lib/snaptrade";
import { validate, createApiError, extractSnapTradeRequestId } from '../lib/validation';

const router = Router();

// Helper function to get user's SnapTrade credentials (returns null if not connected)
async function getSnapTradeCredentials(email: string): Promise<{ userId: string; userSecret: string } | null> {
  try {
    // Find the Flint user by email
    const flintUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    
    if (!flintUser) {
      return null;
    }
    
    // Get SnapTrade credentials
    const [credentials] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUser.id))
      .limit(1);
    
    if (!credentials) {
      return null;
    }
    
    return {
      userId: credentials.flintUserId,
      userSecret: credentials.userSecret
    };
  } catch (error) {
    console.log('Error getting SnapTrade credentials:', error);
    return null;
  }
}

// Get real-time quote for a symbol
router.get("/:symbol", requireAuth, async (req: any, res) => {
  try {
    const email = req.user.claims.email?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "User email required" });
    }

    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    console.log(`Getting quote for ${symbol.toUpperCase()}`);

    // Try to get user credentials (null if not connected)
    const credentials = await getSnapTradeCredentials(email);

    // Strategy 1: User has connected brokerage - get live trading quotes
    if (credentials) {
      try {
        // Get user's accounts
        const { data: userAccounts } = await accountsApi.listUserAccounts({
          userId: credentials.userId,
          userSecret: credentials.userSecret
        });

        if (userAccounts && userAccounts.length > 0) {
          // Use the first account for quotes
          const accountId = userAccounts[0].id;

          // Get the latest quote from SnapTrade
          const { data: quotes } = await tradingApi.getUserAccountQuotes({
            userId: credentials.userId,
            userSecret: credentials.userSecret,
            symbols: symbol.toUpperCase(),
            accountId: accountId,
            useTicker: true
          });

          if (quotes && quotes.length > 0) {
            const quote = quotes[0];
            console.log(`Live quote received for ${symbol}:`, {
              symbol: quote.symbol,
              price: quote.last_trade_price,
              bid: quote.bid_price,
              ask: quote.ask_price
            });

            // Transform to our expected format
            const transformedQuote = {
              symbol: (quote.symbol as any)?.raw_symbol || (quote.symbol as any)?.symbol || symbol.toUpperCase(),
              name: (quote.symbol as any)?.description || `${symbol.toUpperCase()} Inc.`,
              price: quote.last_trade_price || quote.ask_price || quote.bid_price || 0,
              change: null,
              changePercent: null,
              volume: (quote.bid_size || 0) + (quote.ask_size || 0),
              open: quote.last_trade_price || null,
              high: quote.last_trade_price || null,
              low: quote.last_trade_price || null,
              marketCap: null,
              previousClose: null,
              lastUpdate: new Date().toISOString(),
              bid: quote.bid_price || null,
              ask: quote.ask_price || null,
              bidSize: quote.bid_size || null,
              askSize: quote.ask_size || null
            };

            return res.json(transformedQuote);
          }
        }
      } catch (connectedError: any) {
        console.log(`Live quote failed for connected user, falling back to symbol search:`, connectedError.message);
      }
    }

    // Strategy 2: User not connected OR live quotes failed - use symbol search
    console.log(`Using symbol search fallback for ${symbol}`);
    const { referenceDataApi } = await import('../lib/snaptrade');
    
    try {
      const response = await referenceDataApi.getSymbolsByTicker({
        query: symbol.toUpperCase()
      });

      const searchResults = response.data || [];
      
      if (searchResults.length > 0) {
        const symbolData = searchResults[0];
        console.log(`Symbol data found via search for ${symbol}:`, symbolData);

        // Transform symbol search data to quote format
        const fallbackQuote = {
          symbol: (symbolData as any).symbol || symbol.toUpperCase(),
          name: (symbolData as any).description || `${symbol.toUpperCase()} Inc.`,
          price: 0, // Symbol search doesn't provide live price
          change: null,
          changePercent: null,
          volume: null,
          open: null,
          high: null,
          low: null,
          marketCap: null,
          previousClose: null,
          lastUpdate: new Date().toISOString(),
          bid: null,
          ask: null,
          bidSize: null,
          askSize: null,
          note: 'Connect a brokerage account to see live prices and trade'
        };

        return res.json(fallbackQuote);
      }
    } catch (searchError: any) {
      console.log(`Symbol search also failed:`, searchError.message);
    }

    // No data available from any source
    return res.status(404).json({ 
      error: `Symbol ${symbol} not found. Please verify the ticker symbol.` 
    });

  } catch (err: any) {
    const requestId = extractSnapTradeRequestId(err.response);
    
    console.error('Quote fetch error:', {
      path: req.originalUrl,
      symbol: req.params.symbol,
      responseData: err.response?.data,
      responseHeaders: err.response?.headers,
      status: err.response?.status,
      message: err.message,
      snaptradeRequestId: requestId
    });
    
    const status = err.response?.status || 500;
    const apiError = createApiError(
      err.message || "Quote fetch failed",
      err.response?.data?.code || 'QUOTE_FETCH_ERROR',
      status,
      requestId
    );
    
    return res.status(status).json({
      error: {
        message: apiError.message,
        code: apiError.code,
        requestId: apiError.requestId || null
      }
    });
  }
});

export default router;