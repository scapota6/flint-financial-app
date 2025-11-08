/**
 * SnapTrade Symbol Classifier
 * 
 * Maps SnapTrade security types and exchanges to canonical asset types
 * for compatibility checking and UI organization.
 */

export type AssetType = 'stock' | 'crypto' | 'etf' | 'option' | 'mutual_fund' | 'bond' | 'unknown';

/**
 * Known crypto exchanges from SnapTrade
 */
const CRYPTO_EXCHANGES = new Set([
  'COINBASE',
  'BINANCE',
  'BINANCEUS',
  'KRAKEN',
  'GEMINI',
  'BITFINEX',
  'BITSTAMP',
  'CRYPTOCOM',
  'FTX',
  'FTXUS',
]);

/**
 * Classify a SnapTrade symbol into a canonical asset type
 * 
 * @param snaptradeSymbol - The symbol object from SnapTrade API
 * @returns The canonical asset type
 */
export function classifySymbol(snaptradeSymbol: any): AssetType {
  if (!snaptradeSymbol) return 'unknown';

  // Extract relevant fields
  const securityType = snaptradeSymbol.type?.description || snaptradeSymbol.security_type || '';
  const exchange = snaptradeSymbol.exchange?.name || snaptradeSymbol.exchange || '';
  const symbol = snaptradeSymbol.symbol || '';
  
  // Check if it's crypto via exchange
  const exchangeUpper = exchange.toUpperCase().replace(/[^A-Z]/g, '');
  if (CRYPTO_EXCHANGES.has(exchangeUpper)) {
    return 'crypto';
  }

  // Check if it's crypto via security type description
  const typeDescUpper = securityType.toUpperCase();
  if (
    typeDescUpper.includes('CRYPTO') ||
    typeDescUpper.includes('CRYPTOCURRENCY') ||
    typeDescUpper.includes('DIGITAL ASSET') ||
    typeDescUpper.includes('BITCOIN') ||
    typeDescUpper.includes('ETHEREUM')
  ) {
    return 'crypto';
  }

  // Check for crypto via common crypto symbols
  const cryptoSymbols = new Set([
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE',
    'DOT', 'MATIC', 'SHIB', 'AVAX', 'LINK', 'UNI', 'LTC', 'BCH',
    'ATOM', 'ETC', 'XLM', 'ALGO', 'VET', 'FIL', 'TRX', 'AAVE'
  ]);
  
  const baseSymbol = symbol.split('-')[0].split(':')[0].toUpperCase();
  if (cryptoSymbols.has(baseSymbol)) {
    return 'crypto';
  }

  // Check for options via symbol format (OCC format)
  // OCC format: "AAPL  240920C00200000" (21 characters with spaces)
  if (symbol.length >= 15 && /\d{6}[CP]\d{8}/.test(symbol)) {
    return 'option';
  }

  // Check for options via security type
  if (
    typeDescUpper.includes('OPTION') ||
    typeDescUpper.includes('CALL') ||
    typeDescUpper.includes('PUT')
  ) {
    return 'option';
  }

  // Check for ETF
  if (
    typeDescUpper.includes('ETF') ||
    typeDescUpper.includes('EXCHANGE TRADED FUND') ||
    typeDescUpper.includes('EXCHANGE-TRADED FUND')
  ) {
    return 'etf';
  }

  // Check for mutual funds
  if (
    typeDescUpper.includes('MUTUAL FUND') ||
    typeDescUpper.includes('MUTUALFUND')
  ) {
    return 'mutual_fund';
  }

  // Check for bonds
  if (
    typeDescUpper.includes('BOND') ||
    typeDescUpper.includes('TREASURY') ||
    typeDescUpper.includes('DEBT')
  ) {
    return 'bond';
  }

  // Check for equities/stocks
  if (
    typeDescUpper.includes('EQUITY') ||
    typeDescUpper.includes('STOCK') ||
    typeDescUpper.includes('COMMON STOCK') ||
    typeDescUpper.includes('CS') ||
    typeDescUpper === 'EQUITY' ||
    typeDescUpper === 'STOCK'
  ) {
    return 'stock';
  }

  // Default to stock if it looks like a typical stock symbol
  // (1-5 uppercase letters, no special formatting)
  if (/^[A-Z]{1,5}$/.test(symbol)) {
    return 'stock';
  }

  return 'unknown';
}

/**
 * Get a human-readable description of the asset type
 */
export function getAssetTypeLabel(assetType: AssetType): string {
  const labels: Record<AssetType, string> = {
    stock: 'Stock',
    crypto: 'Cryptocurrency',
    etf: 'ETF',
    option: 'Option',
    mutual_fund: 'Mutual Fund',
    bond: 'Bond',
    unknown: 'Unknown',
  };
  
  return labels[assetType] || 'Unknown';
}

/**
 * Check if an asset type is supported for trading
 */
export function isTradableAssetType(assetType: AssetType): boolean {
  return assetType === 'stock' || assetType === 'crypto' || assetType === 'etf' || assetType === 'option';
}
