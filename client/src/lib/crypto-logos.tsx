import React from 'react';
import { Coins } from 'lucide-react';

// Map crypto symbols to their official domains for Brandfetch
const CRYPTO_TO_DOMAIN: Record<string, string> = {
  'BTC': 'bitcoin.org',
  'ETH': 'ethereum.org',
  'USDT': 'tether.to',
  'BNB': 'bnbchain.org',
  'SOL': 'solana.com',
  'XRP': 'ripple.com',
  'USDC': 'circle.com',
  'ADA': 'cardano.org',
  'DOGE': 'dogecoin.com',
  'TRX': 'tron.network',
  'TON': 'ton.org',
  'LINK': 'chain.link',
  'MATIC': 'polygon.technology',
  'DOT': 'polkadot.network',
  'DAI': 'makerdao.com',
  'AVAX': 'avax.network',
  'UNI': 'uniswap.org',
  'ATOM': 'cosmos.network',
  'XLM': 'stellar.org',
  'LTC': 'litecoin.org',
  'BCH': 'bitcoincash.org',
  'XMR': 'getmonero.org',
  'ETC': 'ethereumclassic.org',
  'FIL': 'filecoin.io',
  'APT': 'aptoslabs.com',
  'ARB': 'arbitrum.io',
  'OP': 'optimism.io',
  'NEAR': 'near.org',
  'VET': 'vechain.org',
  'ALGO': 'algorand.com',
  'ICP': 'dfinity.org',
  'GRT': 'thegraph.com',
  'AAVE': 'aave.com',
  'MKR': 'makerdao.com',
  'SNX': 'synthetix.io',
  'CRV': 'curve.fi',
  'SAND': 'sandbox.game',
  'MANA': 'decentraland.org',
  'AXS': 'axieinfinity.com',
  'FTM': 'fantom.foundation',
  'THETA': 'thetatoken.org',
  'EOS': 'eos.io',
  'XTZ': 'tezos.com',
  'HBAR': 'hedera.com',
  'QNT': 'quant.network',
  'FLOW': 'flow.com',
  'CHZ': 'chiliz.com',
  'EGLD': 'multiversx.com',
  'RUNE': 'thorchain.org',
  'ZEC': 'z.cash',
  'DASH': 'dash.org',
  'COMP': 'compound.finance',
  'CRO': 'crypto.com',
  'NEO': 'neo.org',
  'YFI': 'yearn.finance',
  'ENJ': 'enjin.io',
  'BAT': 'basicattentiontoken.org',
  'ZIL': 'zilliqa.com',
  'WAVES': 'waves.tech',
  '1INCH': '1inch.io',
  'LRC': 'loopring.org',
  'AMP': 'amptoken.org',
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

  const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  const upperSymbol = symbol.toUpperCase();
  const domain = CRYPTO_TO_DOMAIN[upperSymbol];
  const colors = CRYPTO_COLORS[upperSymbol] || CRYPTO_COLORS.default;

  // If we have a domain mapping, use Brandfetch
  if (domain && BRANDFETCH_CLIENT_ID) {
    return {
      logo: (
        <CryptoLogoImage 
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
    logo: <Coins className={`h-10 w-10 ${colors.textClass}`} />,
    ...colors
  };
}

// Separate component to handle image loading with state
function CryptoLogoImage({ domain, symbol, name, colors, brandfetchClientId }: { domain: string; symbol: string; name?: string; colors: { textClass: string }; brandfetchClientId: string }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return <Coins className={`h-10 w-10 ${colors.textClass}`} />;
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

export function getCryptoColors(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  return CRYPTO_COLORS[upperSymbol] || CRYPTO_COLORS.default;
}
