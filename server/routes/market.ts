/**
 * Market Data Routes
 * Provides real-time quotes and historical candles for charting
 */

import { Router } from "express";
import { requireAuth } from "../middleware/jwt-auth";
import { marketDataService } from "../services/market-data";
import { snaptradeClient } from '../lib/snaptrade';
import { logger } from "@shared/logger";

const router = Router();



// Supported timeframes
const TIMEFRAMES = {
  '1D': { interval: 'DAY', days: 1 },
  '1W': { interval: 'WEEK', days: 7 },
  '1M': { interval: 'MONTH', days: 30 },
  '3M': { interval: 'MONTH', days: 90 },
  '6M': { interval: 'MONTH', days: 180 },
  '1Y': { interval: 'YEAR', days: 365 },
  '5Y': { interval: 'YEAR', days: 1825 }
};

/**
 * GET /api/market/quote
 * Returns real-time quote data for a symbol
 */
router.get("/quote", requireAuth, async (req: any, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required" });
    }

    // Get user credentials for SnapTrade
    const userId = req.user.claims.sub;
    const snaptradeUser = await (await import("../storage")).storage.getSnapTradeUser(userId);
    
    // Try to get real-time quote from market data service with user credentials
    const quote = await marketDataService.getMarketData(
      symbol as string,
      snaptradeUser?.snaptradeUserId || snaptradeUser?.flintUserId,
      snaptradeUser?.userSecret
    );
    
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }
    
    // Format response
    const response = {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      high: quote.dayHigh,
      low: quote.dayLow,
      open: quote.open,
      previousClose: quote.previousClose,
      volume: quote.volume,
      marketCap: quote.marketCap,
      peRatio: quote.peRatio,
      weekHigh52: quote.week52High,
      weekLow52: quote.week52Low,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error("Error fetching quote", { error });
    res.status(500).json({ 
      message: "Failed to fetch quote",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/market/candles
 * Returns historical candle data for charting
 */
router.get("/candles", requireAuth, async (req: any, res) => {
  try {
    const { symbol, tf = '1D', limit = '500' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required" });
    }
    
    const timeframe = TIMEFRAMES[tf as keyof typeof TIMEFRAMES] || TIMEFRAMES['1D'];
    
    // Determine candle count based on timeframe
    let candleCount: number;
    switch (tf as string) {
      case '1D': candleCount = 78; break;    // intraday 5-min intervals
      case '1W': candleCount = 35; break;    // hourly for week
      case '1M': candleCount = 30; break;    // daily for month
      case '3M': candleCount = 90; break;    // daily for 3 months
      case '6M': candleCount = 180; break;   // daily for 6 months
      case '1Y': candleCount = 365; break;   // daily for year
      case '5Y': candleCount = 1250; break;  // daily for 5 years
      default: candleCount = 90;
    }
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - timeframe.days);
    
    // Get user credentials for SnapTrade
    const userId = req.user.claims.sub;
    const snaptradeUser = await (await import("../storage")).storage.getSnapTradeUser(userId);
    
    // Note: SnapTrade does not provide historical candle/time series data
    // We generate synthetic candles working backwards from the current real-time price
    // This provides a reasonable chart visualization while using live pricing data
    
    // Fetch the current real-time quote to use as the ending price
    let currentRealPrice: number;
    try {
      const quote = await marketDataService.getMarketData(
        symbol as string,
        snaptradeUser?.snaptradeUserId || undefined,
        snaptradeUser?.userSecret || undefined
      );
      currentRealPrice = quote?.price || 150; // Fallback to 150 if quote unavailable
      logger.info("Fetched real-time quote for candles", { symbol, price: currentRealPrice });
    } catch (quoteError) {
      logger.warn("Failed to fetch real quote, using fallback price", { quoteError });
      currentRealPrice = 150; // Default fallback price
    }
    
    // Generate historical candle data working BACKWARDS from the current real price
    const candles = [];
    let currentPrice = currentRealPrice;
    
    // Determine time interval based on timeframe
    const getTimeInterval = (tfKey: string): number => {
      switch (tfKey) {
        case '1D': return 5 * 60 * 1000; // 5 minutes in milliseconds
        case '1W': return 60 * 60 * 1000; // 1 hour in milliseconds
        default: return 24 * 60 * 60 * 1000; // 1 day in milliseconds
      }
    };
    
    const timeInterval = getTimeInterval(tf as string);
    
    // Generate candles from NEWEST to OLDEST
    for (let i = 0; i < candleCount; i++) {
      const date = new Date(Date.now() - (i * timeInterval));
      
      // For the most recent candle (i=0), set close to exact real quote
      if (i === 0) {
        const open = currentRealPrice * (1 - 0.001); // Very small spread
        const close = currentRealPrice; // Exact real price
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        
        candles.unshift({
          time: Math.floor(date.getTime() / 1000),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(1000000 + Math.random() * 9000000)
        });
        continue;
      }
      
      // For historical candles, drift backwards from current price
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      
      // Calculate the historical price BEFORE building this candle
      const historicalPrice = currentPrice / (1 + change);
      const open = historicalPrice * (1 - Math.random() * 0.005); // Small spread from historical price
      const close = historicalPrice; // Close at the historical price for this timestamp
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      
      // Update cursor for next iteration (going further back in time)
      currentPrice = historicalPrice;
      
      candles.unshift({
        time: Math.floor(date.getTime() / 1000),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(1000000 + Math.random() * 9000000)
      });
    }
    
    res.json({
      symbol,
      timeframe: tf,
      candles,
      source: 'synthetic' // Indicate this is sample data
    });
    
  } catch (error) {
    logger.error("Error fetching candles", { error });
    res.status(500).json({ 
      message: "Failed to fetch candle data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/market/search
 * Search for symbols
 */
router.get("/search", requireAuth, async (req: any, res) => {
  try {
    const { query } = req.query;
    
    if (!query || (query as string).length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }
    
    // For now, return common symbols that match the query
    // In production, this would search a proper symbol database
    const commonSymbols = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
      { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock' },
      { symbol: 'V', name: 'Visa Inc.', type: 'stock' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf' },
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto' }
    ];
    
    const searchTerm = (query as string).toUpperCase();
    const results = commonSymbols.filter(s => 
      s.symbol.includes(searchTerm) || 
      s.name.toUpperCase().includes(searchTerm)
    );
    
    res.json(results);
    
  } catch (error) {
    logger.error("Error searching symbols", { error });
    res.status(500).json({ 
      message: "Failed to search symbols",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;