import React from 'react';
import { Coins } from 'lucide-react';

// Map common crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'USDC': 'usd-coin',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'TRX': 'tron',
  'TON': 'the-open-network',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'DOT': 'polkadot',
  'DAI': 'dai',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XLM': 'stellar',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'XMR': 'monero',
  'ETC': 'ethereum-classic',
  'FIL': 'filecoin',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'NEAR': 'near',
  'VET': 'vechain',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'GRT': 'the-graph',
  'AAVE': 'aave',
  'MKR': 'maker',
  'SNX': 'havven',
  'CRV': 'curve-dao-token',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'FTM': 'fantom',
  'THETA': 'theta-token',
  'EOS': 'eos',
  'XTZ': 'tezos',
  'HBAR': 'hedera-hashgraph',
  'QNT': 'quant-network',
  'FLOW': 'flow',
  'CHZ': 'chiliz',
  'EGLD': 'elrond-erd-2',
  'RUNE': 'thorchain',
  'KLAY': 'klay-token',
  'ZEC': 'zcash',
  'DASH': 'dash',
  'COMP': 'compound-governance-token',
  'CRO': 'crypto-com-chain',
  'NEO': 'neo',
  'YFI': 'yearn-finance',
  'ENJ': 'enjincoin',
  'BAT': 'basic-attention-token',
  'ZIL': 'zilliqa',
  'WAVES': 'waves',
  '1INCH': '1inch',
  'LRC': 'loopring',
  'CRT': 'carrot', // Assuming CRT is Carrot
  'AMP': 'amp-token',
};

// Color mapping for different crypto types
const CRYPTO_COLORS: Record<string, { bgClass: string; textClass: string }> = {
  'BTC': { bgClass: 'bg-orange-500/20', textClass: 'text-orange-500' },
  'ETH': { bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-500' },
  'USDT': { bgClass: 'bg-green-500/20', textClass: 'text-green-500' },
  'USDC': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'BNB': { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-500' },
  'SOL': { bgClass: 'bg-purple-500/20', textClass: 'text-purple-500' },
  'XRP': { bgClass: 'bg-blue-400/20', textClass: 'text-blue-400' },
  'ADA': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  'DOGE': { bgClass: 'bg-yellow-400/20', textClass: 'text-yellow-400' },
  'MATIC': { bgClass: 'bg-purple-600/20', textClass: 'text-purple-600' },
  'DOT': { bgClass: 'bg-pink-500/20', textClass: 'text-pink-500' },
  'AVAX': { bgClass: 'bg-red-500/20', textClass: 'text-red-500' },
  'LINK': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'UNI': { bgClass: 'bg-pink-400/20', textClass: 'text-pink-400' },
  'XLM': { bgClass: 'bg-slate-400/20', textClass: 'text-slate-400' },
  'default': { bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-500' },
};

export function getCryptoLogo(symbol: string, name?: string) {
  if (!symbol) {
    return {
      logo: <Coins className="h-10 w-10 text-cyan-500" />,
      bgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-500'
    };
  }

  const upperSymbol = symbol.toUpperCase();
  const cryptoId = CRYPTO_ID_MAP[upperSymbol];
  const colors = CRYPTO_COLORS[upperSymbol] || CRYPTO_COLORS.default;

  // If we have a CoinGecko ID, use their CDN for the logo
  if (cryptoId) {
    return {
      logo: (
        <CryptoLogoImage 
          cryptoId={cryptoId}
          symbol={symbol}
          name={name}
          colors={colors}
        />
      ),
      ...colors
    };
  }

  // Default fallback icon
  return {
    logo: <Coins className={`h-10 w-10 ${colors.textClass}`} />,
    ...colors
  };
}

// Separate component to handle image loading with state
function CryptoLogoImage({ cryptoId, symbol, name, colors }: { cryptoId: string; symbol: string; name?: string; colors: { textClass: string } }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg className={`h-10 w-10 ${colors.textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="2"/>
        <path d="M12 6v6l4 2" strokeWidth="2"/>
      </svg>
    );
  }

  return (
    <img 
      src={`https://coin-images.coingecko.com/coins/images/${getCoinGeckoImageId(cryptoId)}/large/${cryptoId}.png`}
      alt={name || symbol}
      className="h-10 w-10 object-contain p-1"
      onError={() => setHasError(true)}
    />
  );
}

// Helper to get CoinGecko image ID (most cryptos have sequential IDs)
function getCoinGeckoImageId(cryptoId: string): number {
  const idMap: Record<string, number> = {
    'bitcoin': 1,
    'ethereum': 279,
    'tether': 325,
    'binancecoin': 825,
    'solana': 4128,
    'ripple': 44,
    'usd-coin': 6319,
    'cardano': 975,
    'dogecoin': 5,
    'matic-network': 4713,
    'polkadot': 12171,
    'stellar': 100,
    'chainlink': 877,
    'litecoin': 2,
    'bitcoin-cash': 780,
    'avalanche-2': 12559,
    'uniswap': 12504,
    'cosmos': 6783,
    'monero': 69,
    'ethereum-classic': 453,
    'internet-computer': 14495,
    'the-graph': 13397,
    'aave': 12645,
    'maker': 1364,
    'curve-dao-token': 12124,
    'the-sandbox': 12129,
    'decentraland': 878,
    'axie-infinity': 17980,
    'fantom': 4001,
    'theta-token': 2416,
    'eos': 1765,
    'tezos': 3406,
    'hedera-hashgraph': 3688,
    'quant-network': 3155,
    'flow': 13446,
    'chiliz': 8834,
    'elrond-erd-2': 12335,
    'thorchain': 6595,
    'klay-token': 9672,
    'zcash': 486,
    'dash': 19,
    'compound-governance-token': 10775,
    'crypto-com-chain': 3635,
    'neo': 480,
    'yearn-finance': 11849,
    'enjincoin': 1102,
    'basic-attention-token': 677,
    'zilliqa': 2469,
    'waves': 307,
    '1inch': 13469,
    'loopring': 913,
    'amp-token': 12409,
  };

  return idMap[cryptoId] || 1; // Default to bitcoin's ID if not found
}

export function getCryptoColors(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  return CRYPTO_COLORS[upperSymbol] || CRYPTO_COLORS.default;
}
