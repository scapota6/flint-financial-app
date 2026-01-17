import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getSnapUser } from '../store/snapUsers.js';
import { 
  getOrderImpact, 
  searchSymbols, 
  placeOrder,
  searchCryptoPairs,
  previewCryptoOrder,
  placeCryptoOrder,
  getCryptoPairQuote,
  isCryptoExchange,
  listAccounts
} from '../lib/snaptrade.js';
import { requireAuth } from '../middleware/jwt-auth';

const router = Router();

// Validation schemas - Updated to support both equity and crypto
const OrderPreviewSchema = z.object({
  accountId: z.string(),
  symbol: z.string(),
  action: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['Market', 'Limit']),
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  timeInForce: z.enum(['Day', 'GTC']).optional().default('GTC'), // Crypto uses GTC by default
  institutionName: z.string().optional(), // To detect crypto exchanges
});

const ConfirmOrderSchema = z.object({
  accountId: z.string(),
  symbol: z.string(),
  action: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['Market', 'Limit']),
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  timeInForce: z.enum(['Day', 'GTC', 'IOC', 'FOK', 'GTD']).optional().default('GTC'), // Includes crypto time_in_force options
  universalSymbolId: z.string().optional(), // Optional for crypto
  cryptoPairSymbol: z.string().optional(), // For crypto orders (e.g., "XLM-USD")
  isCrypto: z.boolean().optional(),
  previewData: z.object({
    estimatedCost: z.number(),
    estimatedFees: z.number(),
    estimatedTotal: z.number(),
    impactPrice: z.number().optional(),
    previewId: z.string().optional(),
  }),
});

/**
 * POST /api/order-preview
 * Preview an order before placement - Step 1 of SnapTrade's two-step process
 * Supports both equity (stocks/ETFs) and crypto (Coinbase, Kraken, Binance) orders
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const data = OrderPreviewSchema.parse(req.body);

    // Access user ID from JWT claims structure (claims.sub)
    const userId = (user as any).claims?.sub || (user as any).id || (user as any).sub;
    const userEmail = (user as any).email || (user as any).claims?.email || userId;
    console.log('Order preview request for user:', userEmail, 'userId:', userId);
    console.log('Preview details:', data);

    // Get user's SnapTrade credentials (use user ID, not email)
    const snapUser = await getSnapUser(userId);
    if (!snapUser?.userSecret) {
      console.log('SnapTrade user not found for userId:', userId);
      return res.status(400).json({ 
        message: 'SnapTrade account not connected. Please connect your brokerage account first.' 
      });
    }

    // Detect if this is a crypto exchange based on institution name
    // If institutionName is empty, look up the account to get the brokerage name
    let institutionName = data.institutionName || '';
    
    if (!institutionName) {
      console.log('[Order Preview] institutionName empty, looking up account...');
      try {
        const accounts = await listAccounts(
          snapUser.userId || userId, 
          snapUser.userSecret,
          userId
        );
        const account = accounts?.find((a: any) => a.id === data.accountId);
        if (account) {
          institutionName = account.institution_name || account.brokerage?.name || '';
          console.log('[Order Preview] Found account institution:', institutionName);
        }
      } catch (lookupError: any) {
        console.log('[Order Preview] Account lookup failed:', lookupError.message);
      }
    }
    
    const isCrypto = institutionName ? isCryptoExchange(institutionName) : false;
    console.log('Order type detection:', { institutionName, isCrypto });

    if (isCrypto) {
      // ============================================
      // CRYPTO ORDER PREVIEW (Coinbase, Kraken, Binance)
      // Uses different endpoints per SnapTrade docs
      // ============================================
      console.log('[Crypto Order] Using crypto trading endpoints');

      // Step 1: Search for the crypto pair (e.g., XLM -> XLM-USD)
      const cryptoPairs = await searchCryptoPairs(
        snapUser.userId || userId,
        snapUser.userSecret,
        data.accountId,
        data.symbol,  // base (e.g., "XLM")
        'USD'         // quote (default to USD)
      );

      if (!cryptoPairs.items || cryptoPairs.items.length === 0) {
        return res.status(404).json({ 
          message: `Crypto pair ${data.symbol}-USD not found or not tradable on this exchange` 
        });
      }

      const cryptoPair = cryptoPairs.items[0];
      const pairSymbol = cryptoPair.symbol; // e.g., "XLM-USD"
      console.log('[Crypto Order] Found tradable pair:', pairSymbol);

      // Step 2: Get a quote for the pair to determine current price
      let currentPrice = 0;
      try {
        const quote = await getCryptoPairQuote(
          snapUser.userId || userId,
          snapUser.userSecret,
          data.accountId,
          pairSymbol
        );
        currentPrice = parseFloat(quote?.bid || quote?.ask || quote?.last || '0');
      } catch (quoteError) {
        console.log('[Crypto Order] Quote fetch failed, will estimate price');
      }

      // Step 3: Preview the crypto order
      const cryptoOrderType = data.orderType === 'Market' ? 'MARKET' : 'LIMIT';
      // Per SnapTrade docs: Coinbase market orders require IOC (Immediate Or Cancel)
      // For limit orders, use GTC (Good Till Cancelled)
      const cryptoTimeInForce = cryptoOrderType === 'MARKET' ? 'IOC' : 'GTC';
      
      let previewResult: any = null;
      let estimatedFees = 0;
      
      try {
        previewResult = await previewCryptoOrder(
          snapUser.userId || userId,
          snapUser.userSecret,
          data.accountId,
          {
            symbol: pairSymbol,   // Pair symbol like "XLM-USD" per SnapTrade docs
            side: data.action,    // BUY or SELL (uppercase per SnapTrade docs)
            type: cryptoOrderType,
            amount: data.quantity.toString(),
            time_in_force: cryptoTimeInForce as 'GTC' | 'FOK' | 'IOC' | 'GTD',
            limit_price: data.limitPrice?.toString(),
          }
        );
        
        // Extract fee from preview
        if (previewResult?.estimated_fee) {
          estimatedFees = parseFloat(previewResult.estimated_fee.amount || '0');
        }
      } catch (previewError: any) {
        console.log('[Crypto Order] Preview endpoint not available, generating estimate');
        // If preview endpoint fails, we'll estimate the order impact
      }

      // Calculate estimated costs
      const executionPrice = data.orderType === 'Limit' && data.limitPrice ? data.limitPrice : currentPrice;
      const estimatedCost = executionPrice * data.quantity;
      const estimatedTotal = data.action === 'BUY' 
        ? estimatedCost + estimatedFees 
        : estimatedCost - estimatedFees;

      // Prepare crypto preview response
      const preview = {
        success: true,
        isCrypto: true,
        preview: {
          symbol: data.symbol,
          symbolName: `${cryptoPair.base}/${cryptoPair.quote}`,
          action: data.action,
          orderType: data.orderType,
          quantity: data.quantity,
          limitPrice: data.limitPrice,
          timeInForce: cryptoTimeInForce,
          
          currentPrice,
          executionPrice,
          
          estimatedCost,
          estimatedFees,
          estimatedTotal,
          currency: cryptoPair.quote || 'USD',
          
          // Crypto-specific confirmation data
          cryptoPairSymbol: pairSymbol,
          increment: cryptoPair.increment,
          previewId: `crypto_preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          
          rawPreviewData: previewResult,
        },
        
        warnings: [] as string[],
        canProceed: true,
      };

      if (estimatedTotal < 1) {
        preview.warnings.push('Order value is very small and may not execute');
      }

      console.log('[Crypto Order] Preview generated:', {
        pair: pairSymbol,
        estimatedTotal,
        fees: estimatedFees,
      });

      return res.json(preview);
    }

    // ============================================
    // EQUITY ORDER PREVIEW (Stocks, ETFs)
    // Uses standard SnapTrade trading endpoints
    // ============================================
    console.log('[Equity Order] Using standard trading endpoints');

    // Search for the symbol to get universal symbol ID
    const symbols = await searchSymbols(snapUser.userId || userEmail, snapUser.userSecret, data.accountId, data.symbol);
    if (!symbols || symbols.length === 0) {
      return res.status(404).json({ 
        message: `Symbol ${data.symbol} not found or not tradable in this account` 
      });
    }

    const symbolInfo = symbols[0];
    const universalSymbolId = symbolInfo?.id;
    
    // Validate symbol has required id field (per SnapTrade docs)
    if (!universalSymbolId) {
      console.error('[Equity Order] Symbol found but missing id field:', {
        symbol: data.symbol,
        symbolInfo: JSON.stringify(symbolInfo).slice(0, 500)
      });
      return res.status(400).json({ 
        message: `Symbol ${data.symbol} is not available for trading on this account. This may be a crypto-only exchange.`
      });
    }

    // Get order impact from SnapTrade
    const orderImpact = await getOrderImpact(
      snapUser.userId || userEmail,
      snapUser.userSecret,
      data.accountId,
      {
        action: data.action,
        universal_symbol_id: universalSymbolId,
        order_type: data.orderType,
        time_in_force: data.timeInForce,
        units: data.quantity,
        price: data.limitPrice,
      }
    );

    // Calculate estimated costs
    const currentPrice = orderImpact.price || orderImpact.ask_price || orderImpact.bid_price || 0;
    const executionPrice = data.orderType === 'Limit' && data.limitPrice ? data.limitPrice : currentPrice;
    const estimatedCost = executionPrice * data.quantity;
    const estimatedFees = orderImpact.commission || orderImpact.fees || 0;
    const estimatedTotal = data.action === 'BUY' 
      ? estimatedCost + estimatedFees 
      : estimatedCost - estimatedFees;

    // Prepare preview response
    const preview = {
      success: true,
      isCrypto: false,
      preview: {
        symbol: data.symbol,
        symbolName: symbolInfo.description || symbolInfo.symbol,
        action: data.action,
        orderType: data.orderType,
        quantity: data.quantity,
        limitPrice: data.limitPrice,
        timeInForce: data.timeInForce,
        
        currentPrice,
        executionPrice,
        impactPrice: orderImpact.price,
        bidPrice: orderImpact.bid_price,
        askPrice: orderImpact.ask_price,
        
        estimatedCost,
        estimatedFees,
        estimatedTotal,
        currency: orderImpact.currency || 'USD',
        
        buyingPowerRequired: orderImpact.buying_power_required,
        buyingPowerAfter: orderImpact.buying_power_after,
        accountValue: orderImpact.account_value,
        
        universalSymbolId,
        previewId: `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        
        rawImpactData: orderImpact,
      },
      
      warnings: [] as string[],
      canProceed: true,
    };

    // Add warnings based on order analysis
    if (data.action === 'BUY' && orderImpact.buying_power_required > (orderImpact.buying_power_after || 0)) {
      preview.warnings.push('This order may exceed your buying power');
      preview.canProceed = false;
    }

    if (data.orderType === 'Limit' && data.limitPrice) {
      const priceDifference = Math.abs(data.limitPrice - currentPrice) / currentPrice;
      if (priceDifference > 0.05) {
        preview.warnings.push(`Limit price is ${(priceDifference * 100).toFixed(1)}% away from current market price`);
      }
    }

    if (estimatedTotal < 1) {
      preview.warnings.push('Order value is very small and may not execute');
    }

    console.log('[Equity Order] Preview generated:', {
      symbol: data.symbol,
      estimatedTotal,
      fees: estimatedFees,
      warnings: preview.warnings.length,
    });

    res.json(preview);

  } catch (error: any) {
    console.error('Error generating order preview:', error);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      console.error('SnapTrade preview error details:', errorData);
      
      return res.status(error.response.status || 400).json({
        message: errorData.detail || errorData.message || 'Failed to generate order preview',
        error: errorData,
      });
    }

    res.status(500).json({ 
      message: 'Failed to generate order preview',
      error: error.message,
    });
  }
});

/**
 * POST /api/order-preview/confirm
 * Confirm and place order - Step 2 of SnapTrade's two-step process
 * Supports both equity and crypto orders
 */
router.post('/confirm', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = req.user!;
    const data = ConfirmOrderSchema.parse(req.body);

    // Access user ID from JWT claims structure (claims.sub)
    const userId = (user as any).claims?.sub || (user as any).id || (user as any).sub;
    const userEmail = (user as any).email || (user as any).claims?.email || userId;
    console.log('Order confirmation request for user:', userEmail, 'userId:', userId);
    console.log('Confirmation details:', { 
      symbol: data.symbol, 
      action: data.action, 
      quantity: data.quantity,
      isCrypto: data.isCrypto 
    });

    // Get user's SnapTrade credentials (use user ID, not email)
    const snapUser = await getSnapUser(userId);
    if (!snapUser?.userSecret) {
      return res.status(400).json({ 
        message: 'SnapTrade account not connected' 
      });
    }

    let order: any;

    if (data.isCrypto && data.cryptoPairSymbol) {
      // ============================================
      // CRYPTO ORDER PLACEMENT
      // ============================================
      console.log('[Crypto Order] Placing crypto order:', data.cryptoPairSymbol);

      const cryptoTimeInForce = data.timeInForce === 'Day' ? 'GTC' : data.timeInForce;
      const cryptoOrderType = data.orderType === 'Market' ? 'MARKET' : 'LIMIT';

      order = await placeCryptoOrder(
        snapUser.userId || userId,
        snapUser.userSecret,
        data.accountId,
        {
          symbol: data.cryptoPairSymbol,
          side: data.action,
          type: cryptoOrderType,
          amount: data.quantity.toString(),
          time_in_force: cryptoTimeInForce as 'GTC' | 'FOK' | 'IOC' | 'GTD',
          limit_price: data.limitPrice?.toString(),
        }
      );

      console.log('[Crypto Order] Order placed successfully:', {
        orderId: order.brokerage_order_id || order.order?.brokerage_order_id,
        symbol: data.cryptoPairSymbol,
        status: order.order?.status,
      });

      res.json({
        success: true,
        isCrypto: true,
        orderId: order.brokerage_order_id || order.order?.brokerage_order_id,
        status: order.order?.status || 'PENDING',
        symbol: data.symbol,
        cryptoPairSymbol: data.cryptoPairSymbol,
        action: data.action,
        quantity: data.quantity,
        orderType: data.orderType,
        limitPrice: data.limitPrice,
        estimatedCost: data.previewData.estimatedCost,
        estimatedFees: data.previewData.estimatedFees,
        estimatedTotal: data.previewData.estimatedTotal,
        placedAt: new Date().toISOString(),
        message: `${data.action} order for ${data.quantity} ${data.symbol} placed successfully`,
        rawOrderData: order,
      });
    } else {
      // ============================================
      // EQUITY ORDER PLACEMENT
      // ============================================
      console.log('[Equity Order] Placing equity order');

      // Generate idempotency key for safe retries (industry best practice)
      const idempotencyKey = randomUUID();
      console.log('Placing order with idempotency key:', idempotencyKey);

      // For equity orders, only Day/GTC are valid (IOC/FOK are rare, GTD not supported)
      const equityTimeInForce = (data.timeInForce === 'GTD' ? 'GTC' : data.timeInForce) as 'Day' | 'GTC' | 'IOC' | 'FOK';
      
      order = await placeOrder(
        snapUser.userId || userEmail,
        snapUser.userSecret,
        data.accountId,
        {
          action: data.action,
          universal_symbol_id: data.universalSymbolId!,
          order_type: data.orderType,
          time_in_force: equityTimeInForce,
          units: data.quantity,
          price: data.limitPrice,
          idempotencyKey,
        }
      );

      console.log('[Equity Order] Order placed successfully:', {
        orderId: order.brokerage_order_id || order.id,
        symbol: data.symbol,
        status: order.status,
      });

      res.json({
        success: true,
        isCrypto: false,
        orderId: order.brokerage_order_id || order.id,
        status: order.status,
        symbol: data.symbol,
        action: data.action,
        quantity: data.quantity,
        orderType: data.orderType,
        limitPrice: data.limitPrice,
        estimatedCost: data.previewData.estimatedCost,
        estimatedFees: data.previewData.estimatedFees,
        estimatedTotal: data.previewData.estimatedTotal,
        placedAt: new Date().toISOString(),
        idempotencyKey,
        message: `${data.action} order for ${data.quantity} shares of ${data.symbol} placed successfully`,
        rawOrderData: order,
      });
    }

  } catch (error: any) {
    console.error('Error confirming order:', error);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      console.error('SnapTrade confirm error details:', errorData);
      
      return res.status(error.response.status || 400).json({
        message: errorData.detail || errorData.message || 'Failed to place order',
        error: errorData,
      });
    }

    res.status(500).json({ 
      message: 'Failed to place order',
      error: error.message,
    });
  }
});

export default router;