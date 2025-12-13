import { Router } from 'express';
import { listAccounts, getPositions } from '../lib/snaptrade';
import { getSnapUser } from '../store/snapUsers';
import { requireAuth } from '../middleware/jwt-auth';
import { db } from '../db';
import { connectedAccounts, holdings as holdingsTable } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Cache for 24-hour price changes to avoid excessive API calls
const priceChangeCache: Record<string, { change24hPercent: number; timestamp: number }> = {};
const CACHE_DURATION = 300000; // 5 minute cache to avoid rate limits

// CoinGecko IDs for crypto symbols
const coinGeckoIds: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XLM': 'stellar',
  'HEX': 'hex',
  'SHIB': 'shiba-inu',
  'LTC': 'litecoin',
  'AAVE': 'aave',
  'MKR': 'maker',
  'CRV': 'curve-dao-token',
  'COMP': 'compound-governance-token',
  'SNX': 'havven',
  'SUSHI': 'sushi',
  'YFI': 'yearn-finance',
  '1INCH': '1inch',
  'BAL': 'balancer',
  'PEPE': 'pepe',
};

// Check if a symbol is crypto
function isCryptoSymbol(symbol: string): boolean {
  const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '').toUpperCase();
  return !!coinGeckoIds[cleanSymbol] || symbol.includes('-USD') || symbol.includes('-USDT');
}

// Batch fetch 24-hour price changes for multiple crypto symbols
async function getCrypto24hPriceChanges(symbols: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const now = Date.now();
  
  // Filter symbols that need fetching
  const symbolsToFetch: string[] = [];
  for (const symbol of symbols) {
    const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '').toUpperCase();
    if (priceChangeCache[cleanSymbol] && (now - priceChangeCache[cleanSymbol].timestamp) < CACHE_DURATION) {
      result[symbol] = priceChangeCache[cleanSymbol].change24hPercent;
    } else if (coinGeckoIds[cleanSymbol]) {
      symbolsToFetch.push(symbol);
    }
  }
  
  if (symbolsToFetch.length === 0) return result;
  
  try {
    // Build batch request for CoinGecko
    const coinIds = symbolsToFetch
      .map(s => coinGeckoIds[s.replace('-USD', '').replace('-USDT', '').toUpperCase()])
      .filter(Boolean)
      .join(',');
    
    if (!coinIds) return result;
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) {
      console.error('[Holdings] CoinGecko API error:', response.status);
      return result;
    }
    
    const data = await response.json();
    
    // Map results back to symbols
    for (const symbol of symbolsToFetch) {
      const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '').toUpperCase();
      const coinId = coinGeckoIds[cleanSymbol];
      if (coinId && data[coinId]?.usd_24h_change !== undefined) {
        const change24h = data[coinId].usd_24h_change;
        priceChangeCache[cleanSymbol] = { change24hPercent: change24h, timestamp: now };
        result[symbol] = change24h;
      }
    }
  } catch (error) {
    console.error('[Holdings] Failed to batch fetch crypto 24h changes:', error);
  }
  
  return result;
}

// Fetch 24-hour price change for a single symbol (crypto or stock)
async function get24hPriceChange(symbol: string): Promise<number | undefined> {
  const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '').toUpperCase();
  const now = Date.now();
  
  // Return cached value if fresh
  if (priceChangeCache[cleanSymbol] && (now - priceChangeCache[cleanSymbol].timestamp) < CACHE_DURATION) {
    return priceChangeCache[cleanSymbol].change24hPercent;
  }
  
  // For crypto, use CoinGecko
  const coinId = coinGeckoIds[cleanSymbol];
  if (coinId) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (response.ok) {
        const data = await response.json();
        const change24h = data[coinId]?.usd_24h_change;
        
        if (typeof change24h === 'number') {
          priceChangeCache[cleanSymbol] = { change24hPercent: change24h, timestamp: now };
          return change24h;
        }
      }
    } catch (error) {
      console.error(`[Holdings] Failed to fetch crypto 24h change for ${symbol}:`, error);
    }
  }
  
  // For stocks, use Alpha Vantage quote API (has daily change)
  if (!isCryptoSymbol(symbol) && process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cleanSymbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const quote = data['Global Quote'];
        if (quote && quote['10. change percent']) {
          // Alpha Vantage returns change percent as string like "1.25%"
          const changeStr = quote['10. change percent'].replace('%', '');
          const change24h = parseFloat(changeStr);
          if (!isNaN(change24h)) {
            priceChangeCache[cleanSymbol] = { change24hPercent: change24h, timestamp: now };
            return change24h;
          }
        }
      }
    } catch (error) {
      console.error(`[Holdings] Failed to fetch stock 24h change for ${symbol}:`, error);
    }
  }
  
  return undefined;
}

router.get('/portfolio-holdings', requireAuth, async (req: any, res) => {
  try {
    // Get user ID from authenticated session (use sub, not email)
    const userId = req.user?.claims?.sub;
    console.log('[Holdings API] User ID from claims.sub:', userId);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const rec = await getSnapUser(userId);
    console.log('[Holdings API] SnapTrade user found:', rec ? 'yes' : 'no', 'userId:', rec?.userId);
    
    // Fetch MetaMask/crypto holdings from database first
    const cryptoHoldings: any[] = [];
    try {
      // Get MetaMask accounts for this user
      const metamaskAccounts = await db.select()
        .from(connectedAccounts)
        .where(and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.provider, 'metamask'),
          eq(connectedAccounts.status, 'connected')
        ));
      
      // Get holdings for each MetaMask account
      for (const account of metamaskAccounts) {
        const accountHoldings = await db.select()
          .from(holdingsTable)
          .where(eq(holdingsTable.accountId, account.id));
        
        for (const holding of accountHoldings) {
          const quantity = parseFloat(holding.quantity?.toString() || '0');
          const currentPrice = parseFloat(holding.currentPrice?.toString() || '0');
          const avgPrice = parseFloat(holding.averagePrice?.toString() || '0');
          const marketValue = parseFloat(holding.marketValue?.toString() || '0');
          const profitLoss = parseFloat(holding.gainLoss?.toString() || '0');
          const profitLossPct = parseFloat(holding.gainLossPercentage?.toString() || '0');
          
          // Fetch 24-hour price change for this crypto
          const change24hPercent = await get24hPriceChange(holding.symbol);
          
          cryptoHoldings.push({
            accountId: account.id.toString(),
            accountName: account.accountName,
            brokerageName: 'MetaMask',
            symbol: holding.symbol,
            name: holding.name,
            quantity,
            averageCost: avgPrice,
            currentPrice,
            currentValue: marketValue,
            totalCost: avgPrice * quantity,
            profitLoss,
            profitLossPercent: profitLossPct,
            currency: 'USD',
            type: 'crypto',
            value: marketValue,
            shares: quantity,
            gainLoss: profitLoss,
            gainLossPercent: profitLossPct,
            change24hPercent, // Include 24-hour price change
          });
        }
      }
      console.log(`[Holdings API] Found ${cryptoHoldings.length} MetaMask holdings`);
    } catch (cryptoError) {
      console.error('[Holdings API] Error fetching crypto holdings:', cryptoError);
    }

    if (!rec?.userSecret) {
      console.log('SnapTrade not connected — returning crypto-only holdings');
      // Still return crypto holdings even if SnapTrade not connected
      const summary = {
        totalValue: cryptoHoldings.reduce((sum, h) => sum + h.currentValue, 0),
        totalCost: cryptoHoldings.reduce((sum, h) => sum + h.totalCost, 0),
        totalProfitLoss: cryptoHoldings.reduce((sum, h) => sum + h.profitLoss, 0),
        totalProfitLossPercent: 0,
        positionCount: cryptoHoldings.length,
        accountCount: cryptoHoldings.length > 0 ? 1 : 0,
      };
      return res.status(200).json({ holdings: cryptoHoldings, summary, accounts: [] });
    }

    try {
      const accounts = await listAccounts(rec.userId, rec.userSecret);
      console.log(`DEBUG: getAllUserHoldings response length: ${accounts.length}`);
      
      const positionsArrays = await Promise.all(
        accounts.map(async (a:any) => {
          const accountData = await getPositions(rec.userId, rec.userSecret, a.id);
          console.log(`DEBUG: Found account data for account: ${a.id} count: ${accountData.length}`);
          
          if (!accountData || accountData.length === 0) return [];
          
          // Extract positions from the account data structure
          const positions = accountData[0]?.positions || [];
          console.log(`DEBUG: Extracted positions for account ${a.id}:`, positions.length);
          console.log(`DEBUG: Raw position data sample:`, JSON.stringify(positions[0], null, 2));
          
          return positions.map((pos: any) => {
            // Extract symbol from deeply nested structure  
            let symbol = 'N/A';
            if (pos.symbol?.symbol?.symbol) {
              symbol = pos.symbol.symbol.symbol;
            } else if (typeof pos.symbol === 'string') {
              symbol = pos.symbol;
            } else if (pos.universal_symbol?.symbol) {
              symbol = pos.universal_symbol.symbol;
            }
            
            console.log(`DEBUG: Symbol extraction - pos.symbol type:`, typeof pos.symbol, 'symbol value:', symbol);
            const units = parseFloat(pos.units || pos.quantity) || 0;
            const avgPrice = parseFloat(pos.average_purchase_price || pos.average_cost || pos.avg_cost) || 0;
            const currentPrice = parseFloat(pos.price || pos.current_price || pos.market_value) || 0;
            
            console.log(`DEBUG: Processing position - Symbol: ${symbol}, Units: ${units}, AvgPrice: ${avgPrice}, CurrentPrice: ${currentPrice}`);
            
            // Map common brokerage names
            let brokerageName = a.institution_name || 'Unknown';
            if (brokerageName === 'Default' && a.name?.toLowerCase().includes('coinbase')) {
              brokerageName = 'Coinbase';
            } else if (brokerageName === 'Default') {
              brokerageName = a.name || 'Default';
            }
            
            const calculatedValue = currentPrice * units;
            const calculatedProfitLoss = (currentPrice - avgPrice) * units;
            const calculatedProfitLossPercent = avgPrice ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            
            return {
              accountId: a.id,
              accountName: a.name || 'Unknown Account',
              brokerageName: brokerageName,
              symbol: symbol,
              name: pos.symbol?.symbol?.description || pos.universal_symbol?.description || pos.instrument?.name || symbol,
              quantity: units,
              averageCost: avgPrice,
              currentPrice: currentPrice,
              currentValue: calculatedValue,
              totalCost: avgPrice * units,
              profitLoss: calculatedProfitLoss,
              profitLossPercent: calculatedProfitLossPercent,
              currency: pos.symbol?.symbol?.currency?.code || pos.universal_symbol?.currency?.code || pos.currency?.code || 'USD',
              type: pos.symbol?.symbol?.type?.description || pos.universal_symbol?.type || pos.type || 'stock',
              // Mobile app field aliases (for iOS/React Native compatibility)
              value: calculatedValue,
              shares: units,
              gainLoss: calculatedProfitLoss,
              gainLossPercent: calculatedProfitLossPercent,
              // Ensure all nullable fields are explicitly null instead of undefined
              costBasisPerShare: avgPrice || null,
              lastUpdated: pos.last_updated || null,
              exchange: pos.exchange || null,
              sector: pos.sector || null,
              marketCap: pos.market_cap || null
            };
          });
        })
      );
      
      // Flatten all positions into a single array and filter out empty positions
      const snaptradeHoldings = positionsArrays.flat().filter(h => h.quantity > 0 && h.symbol !== 'N/A');
      
      // Fetch 24-hour price changes for all holdings in parallel
      const allSymbols = [...snaptradeHoldings, ...cryptoHoldings].map(h => h.symbol);
      const cryptoSymbols = allSymbols.filter(s => isCryptoSymbol(s));
      const stockSymbols = allSymbols.filter(s => !isCryptoSymbol(s));
      
      // Batch fetch crypto changes
      const cryptoChanges = await getCrypto24hPriceChanges(cryptoSymbols);
      
      // Fetch stock changes (limited to avoid API rate limits)
      const stockChanges: Record<string, number> = {};
      for (const symbol of stockSymbols.slice(0, 5)) { // Limit to 5 stocks per request
        const change = await get24hPriceChange(symbol);
        if (change !== undefined) {
          stockChanges[symbol] = change;
        }
      }
      
      // Add change24hPercent to SnapTrade holdings
      const snaptradeHoldingsWithChange = snaptradeHoldings.map(h => ({
        ...h,
        change24hPercent: cryptoChanges[h.symbol] ?? stockChanges[h.symbol] ?? undefined,
      }));
      
      // Combine SnapTrade holdings with crypto holdings (which already have change24hPercent)
      const allHoldings = [...snaptradeHoldingsWithChange, ...cryptoHoldings];
      
      console.log(`DEBUG: Final holdings count - SnapTrade: ${snaptradeHoldings.length}, Crypto: ${cryptoHoldings.length}, Total: ${allHoldings.length}`);
      
      // Calculate summary
      const summary = {
        totalValue: allHoldings.reduce((sum, h) => sum + h.currentValue, 0),
        totalCost: allHoldings.reduce((sum, h) => sum + h.totalCost, 0),
        totalProfitLoss: allHoldings.reduce((sum, h) => sum + h.profitLoss, 0),
        totalProfitLossPercent: 0,
        positionCount: allHoldings.length,
        accountCount: accounts.length + (cryptoHoldings.length > 0 ? 1 : 0),
      };
      
      if (summary.totalCost > 0) {
        summary.totalProfitLossPercent = (summary.totalProfitLoss / summary.totalCost) * 100;
      }
      
      return res.json({ holdings: allHoldings, summary, accounts });
    } catch (e:any) {
      const body = e?.responseBody || {};
      // If SnapTrade fails with invalid credentials, still return MetaMask holdings
      if (e?.status===401 && String(body?.code)==='1083') {
        console.log('[Holdings API] SnapTrade credentials invalid, returning crypto-only holdings');
        const summary = {
          totalValue: cryptoHoldings.reduce((sum, h) => sum + h.currentValue, 0),
          totalCost: cryptoHoldings.reduce((sum, h) => sum + h.totalCost, 0),
          totalProfitLoss: cryptoHoldings.reduce((sum, h) => sum + h.profitLoss, 0),
          totalProfitLossPercent: 0,
          positionCount: cryptoHoldings.length,
          accountCount: cryptoHoldings.length > 0 ? 1 : 0,
        };
        return res.status(200).json({ holdings: cryptoHoldings, summary, accounts: [], snaptradeError: true });
      }
      throw e;
    }
  } catch (e: any) {
    const requestId = e.response?.headers?.['x-request-id'] || `req-${Date.now()}`;
    
    console.error('Holdings error:', {
      path: req.originalUrl,
      responseData: e.response?.data,
      responseHeaders: e.response?.headers,
      status: e.response?.status,
      message: e.message,
      snaptradeRequestId: requestId
    });
    
    const status = e.response?.status || 500;
    return res.status(status).json({
      error: {
        message: e.message || 'Failed to fetch holdings',
        code: e.response?.data?.code || 'HOLDINGS_FETCH_ERROR',
        requestId: requestId
      }
    });
  }
});

export default router;