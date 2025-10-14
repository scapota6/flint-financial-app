import React from 'react';
import { TrendingUp } from 'lucide-react';

// Map stock tickers to their company domains for Brandfetch
const TICKER_TO_DOMAIN: Record<string, string> = {
  // Tech Giants
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'GOOG': 'google.com',
  'AMZN': 'amazon.com',
  'META': 'meta.com',
  'TSLA': 'tesla.com',
  'NVDA': 'nvidia.com',
  'NFLX': 'netflix.com',
  'AMD': 'amd.com',
  'INTC': 'intel.com',
  'CRM': 'salesforce.com',
  'ORCL': 'oracle.com',
  'ADBE': 'adobe.com',
  'CSCO': 'cisco.com',
  'AVGO': 'broadcom.com',
  'QCOM': 'qualcomm.com',
  'TXN': 'ti.com',
  'IBM': 'ibm.com',
  'NOW': 'servicenow.com',
  
  // Finance
  'JPM': 'jpmorganchase.com',
  'BAC': 'bankofamerica.com',
  'WFC': 'wellsfargo.com',
  'GS': 'goldmansachs.com',
  'MS': 'morganstanley.com',
  'BLK': 'blackrock.com',
  'C': 'citigroup.com',
  'SCHW': 'schwab.com',
  'AXP': 'americanexpress.com',
  'CB': 'chubb.com',
  'PGR': 'progressive.com',
  'V': 'visa.com',
  'MA': 'mastercard.com',
  'PYPL': 'paypal.com',
  'COIN': 'coinbase.com',
  
  // Retail & Consumer
  'WMT': 'walmart.com',
  'HD': 'homedepot.com',
  'COST': 'costco.com',
  'TGT': 'target.com',
  'LOW': 'lowes.com',
  'NKE': 'nike.com',
  'SBUX': 'starbucks.com',
  'MCD': 'mcdonalds.com',
  'DIS': 'disney.com',
  'CMCSA': 'comcast.com',
  'VZ': 'verizon.com',
  'T': 'att.com',
  'TMUS': 't-mobile.com',
  
  // Healthcare & Pharma
  'JNJ': 'jnj.com',
  'UNH': 'unitedhealthgroup.com',
  'PFE': 'pfizer.com',
  'ABBV': 'abbvie.com',
  'TMO': 'thermofisher.com',
  'ABT': 'abbott.com',
  'DHR': 'danaher.com',
  'BMY': 'bms.com',
  'LLY': 'lilly.com',
  'AMGN': 'amgen.com',
  'GILD': 'gilead.com',
  'CVS': 'cvs.com',
  
  // Energy & Industrial
  'XOM': 'exxonmobil.com',
  'CVX': 'chevron.com',
  'COP': 'conocophillips.com',
  'SLB': 'slb.com',
  'NEE': 'nexteraenergy.com',
  'BA': 'boeing.com',
  'CAT': 'caterpillar.com',
  'GE': 'ge.com',
  'HON': 'honeywell.com',
  'RTX': 'rtx.com',
  'LMT': 'lockheedmartin.com',
  'UPS': 'ups.com',
  'FDX': 'fedex.com',
  
  // Other Major Stocks
  'BRK.B': 'berkshirehathaway.com',
  'BRK.A': 'berkshirehathaway.com',
  'PG': 'pg.com',
  'KO': 'coca-cola.com',
  'PEP': 'pepsico.com',
  'MDLZ': 'mondelezinternational.com',
  'PM': 'pmi.com',
  'MO': 'altria.com',
  'UBER': 'uber.com',
  'LYFT': 'lyft.com',
  'ABNB': 'airbnb.com',
  'SHOP': 'shopify.com',
  'SNAP': 'snap.com',
  'PINS': 'pinterest.com',
  'SPOT': 'spotify.com',
  'ZM': 'zoom.us',
  'DOCU': 'docusign.com',
  'TWLO': 'twilio.com',
  'SQ': 'block.xyz',
  'ROKU': 'roku.com',
  'DKNG': 'draftkings.com',
};

// Stock sector color schemes
const STOCK_COLORS: Record<string, { bgClass: string; textClass: string }> = {
  // Tech stocks - Blue/Purple tones
  'AAPL': { bgClass: 'bg-slate-500/20', textClass: 'text-slate-400' },
  'MSFT': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'GOOGL': { bgClass: 'bg-red-500/20', textClass: 'text-red-500' },
  'AMZN': { bgClass: 'bg-orange-500/20', textClass: 'text-orange-500' },
  'META': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  'TSLA': { bgClass: 'bg-red-600/20', textClass: 'text-red-600' },
  'NVDA': { bgClass: 'bg-green-500/20', textClass: 'text-green-500' },
  'NFLX': { bgClass: 'bg-red-500/20', textClass: 'text-red-500' },
  
  // Finance - Green tones
  'JPM': { bgClass: 'bg-blue-700/20', textClass: 'text-blue-700' },
  'BAC': { bgClass: 'bg-red-600/20', textClass: 'text-red-600' },
  'WFC': { bgClass: 'bg-amber-600/20', textClass: 'text-amber-600' },
  'GS': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  
  // Default
  'default': { bgClass: 'bg-purple-500/20', textClass: 'text-purple-500' },
};

export function getStockLogo(symbol: string, name?: string) {
  if (!symbol) {
    return {
      logo: <TrendingUp className="h-10 w-10 text-purple-500" />,
      bgClass: 'bg-purple-500/20',
      textClass: 'text-purple-500'
    };
  }

  const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  const upperSymbol = symbol.toUpperCase();
  const domain = TICKER_TO_DOMAIN[upperSymbol];
  const colors = STOCK_COLORS[upperSymbol] || STOCK_COLORS.default;

  // If we have a domain mapping, use Brandfetch
  if (domain && BRANDFETCH_CLIENT_ID) {
    return {
      logo: (
        <StockLogoImage 
          domain={domain}
          symbol={symbol}
          name={name}
          colors={colors}
          brandfetchClientId={BRANDFETCH_CLIENT_ID}
        />
      ),
      ...colors
    };
  }

  // Default fallback icon
  return {
    logo: <TrendingUp className={`h-10 w-10 ${colors.textClass}`} />,
    ...colors
  };
}

// Separate component to handle image loading with state
function StockLogoImage({ domain, symbol, name, colors, brandfetchClientId }: { domain: string; symbol: string; name?: string; colors: { textClass: string }; brandfetchClientId: string }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg className={`h-10 w-10 ${colors.textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
      </svg>
    );
  }

  return (
    <img 
      src={`https://cdn.brandfetch.io/${domain}?c=${brandfetchClientId}`}
      alt={name || symbol}
      className="h-10 w-10 object-contain p-1"
      onError={() => setHasError(true)}
    />
  );
}

export function getStockColors(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  return STOCK_COLORS[upperSymbol] || STOCK_COLORS.default;
}

// Helper to determine if a symbol is likely a stock vs crypto
export function isStockSymbol(symbol: string, type?: string): boolean {
  // If we have an explicit type, use it
  if (type) {
    return type.toLowerCase().includes('stock') || 
           type.toLowerCase().includes('equity') || 
           type.toLowerCase().includes('etf');
  }
  
  // Otherwise, check if it's in our known stock list
  const upperSymbol = symbol.toUpperCase();
  return upperSymbol in TICKER_TO_DOMAIN;
}
