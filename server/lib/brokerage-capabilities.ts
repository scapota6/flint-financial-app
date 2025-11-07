/**
 * Brokerage Trading Capabilities
 * 
 * This module tracks which brokerages support trading via SnapTrade API
 * based on official SnapTrade documentation and brokerage integrations.
 */

/**
 * List of brokerages that support trading via SnapTrade API
 * 
 * Trading-enabled brokerages allow:
 * - Place orders (market, limit, stop, etc.)
 * - Cancel orders
 * - View order history
 * - Execute trades
 * 
 * This list is maintained based on SnapTrade's official documentation
 * and should be updated as new brokerages add trading support.
 */
export const TRADING_ENABLED_BROKERAGES = new Set([
  // US Brokerages
  'ALPACA',
  'COINBASE',
  'ETRADE',
  'ROBINHOOD',
  'SCHWAB',
  'TRADESTATION',
  'TRADIER',
  'WEBULL',
  'INTERACTIVE BROKERS',
  'TD AMERITRADE',
  'TASTYTRADE',
  
  // International Brokerages (if applicable)
  // Add more as SnapTrade expands support
]);

/**
 * List of brokerages that only support read-only access
 * 
 * Read-only brokerages allow:
 * - View accounts
 * - View holdings/positions
 * - View balances
 * - View transactions
 * 
 * But do NOT support trading operations.
 */
export const READ_ONLY_BROKERAGES = new Set([
  'CHASE',
  'FIDELITY',
  'VANGUARD',
  'EMPOWER',
  'BETTERMENT',
  'WEALTHFRONT',
  'MERRILL EDGE',
  'WELLS FARGO',
  // Add more as needed
]);

/**
 * Normalizes brokerage names for consistent comparison
 * 
 * SnapTrade returns brokerage names in various formats:
 * - "Robinhood"
 * - "ROBINHOOD"
 * - "robinhood"
 * - "E*TRADE"
 * - "eTrade"
 * 
 * This function normalizes them to uppercase and removes special characters
 * for reliable matching.
 */
export function normalizeBrokerageName(name: string): string {
  if (!name) return '';
  
  return name
    .toUpperCase()
    .replace(/[*\-_\s]/g, '') // Remove *, -, _, spaces
    .trim();
}

/**
 * Checks if a brokerage supports trading operations
 * 
 * @param brokerageName - The name of the brokerage (from SnapTrade API)
 * @returns true if trading is supported, false if read-only
 * 
 * @example
 * isTradingSupported('Robinhood') // true
 * isTradingSupported('Chase') // false
 * isTradingSupported('E*TRADE') // true
 */
export function isTradingSupported(brokerageName: string | null | undefined): boolean {
  if (!brokerageName) return false;
  
  const normalized = normalizeBrokerageName(brokerageName);
  
  // Check if it's in the trading-enabled list
  if (TRADING_ENABLED_BROKERAGES.has(normalized)) {
    return true;
  }
  
  // Check for partial matches (e.g., "ETRADE" should match "E*TRADE")
  for (const enabledBrokerage of TRADING_ENABLED_BROKERAGES) {
    const normalizedEnabled = normalizeBrokerageName(enabledBrokerage);
    if (normalized.includes(normalizedEnabled) || normalizedEnabled.includes(normalized)) {
      return true;
    }
  }
  
  // If explicitly in read-only list, return false
  if (READ_ONLY_BROKERAGES.has(normalized)) {
    return false;
  }
  
  // Default to false for unknown brokerages (conservative approach)
  return false;
}

/**
 * Gets the capability status of a brokerage
 * 
 * @returns An object describing the brokerage's capabilities
 */
export function getBrokerageCapabilities(brokerageName: string | null | undefined) {
  const tradingEnabled = isTradingSupported(brokerageName);
  
  return {
    tradingEnabled,
    readOnly: !tradingEnabled,
    capabilities: {
      viewAccounts: true,
      viewHoldings: true,
      viewTransactions: true,
      placeOrders: tradingEnabled,
      cancelOrders: tradingEnabled,
      viewOrderHistory: tradingEnabled,
    }
  };
}
