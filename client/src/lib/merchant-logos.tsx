import React from 'react';
import { Package } from 'lucide-react';

// Map common merchant names to their domains for Brandfetch
const MERCHANT_TO_DOMAIN: Record<string, string> = {
  // Retail & Grocery
  'costco': 'costco.com',
  'walmart': 'walmart.com',
  'target': 'target.com',
  'whole foods': 'wholefoodsmarket.com',
  'kroger': 'kroger.com',
  'safeway': 'safeway.com',
  'trader joe': 'traderjoes.com',
  'publix': 'publix.com',
  
  // Restaurants & Food
  'starbucks': 'starbucks.com',
  'chipotle': 'chipotle.com',
  'panera': 'panerabread.com',
  'mcdonalds': 'mcdonalds.com',
  'subway': 'subway.com',
  'chick-fil-a': 'chick-fil-a.com',
  'in-n-out': 'in-n-out.com',
  'shake shack': 'shakeshack.com',
  'five guys': 'fiveguys.com',
  'dunkin': 'dunkindonuts.com',
  'taco bell': 'tacobell.com',
  'wendys': 'wendys.com',
  'burger king': 'bk.com',
  'dominos': 'dominos.com',
  'pizza hut': 'pizzahut.com',
  'papa johns': 'papajohns.com',
  
  // Gas & Auto
  'shell': 'shell.com',
  'chevron': 'chevron.com',
  'exxon': 'exxonmobil.com',
  'bp': 'bp.com',
  'mobil': 'exxonmobil.com',
  '76': '76.com',
  'arco': 'arco.com',
  
  // Streaming & Entertainment
  'netflix': 'netflix.com',
  'hulu': 'hulu.com',
  'disney': 'disneyplus.com',
  'hbo': 'hbo.com',
  'spotify': 'spotify.com',
  'apple music': 'apple.com',
  'youtube': 'youtube.com',
  'amazon prime': 'amazon.com',
  'paramount': 'paramountplus.com',
  'peacock': 'peacocktv.com',
  
  // Utilities & Services
  'att': 'att.com',
  'verizon': 'verizon.com',
  't-mobile': 't-mobile.com',
  'xfinity': 'xfinity.com',
  'comcast': 'xfinity.com',
  'spectrum': 'spectrum.com',
  
  // Fitness & Health
  'planet fitness': 'planetfitness.com',
  'la fitness': 'lafitness.com',
  '24 hour fitness': '24hourfitness.com',
  'equinox': 'equinox.com',
  'peloton': 'onepeloton.com',
  
  // Office & Supplies
  'staples': 'staples.com',
  'office depot': 'officedepot.com',
  'fedex': 'fedex.com',
  'ups': 'ups.com',
  'usps': 'usps.com',
  
  // Insurance & Financial
  'geico': 'geico.com',
  'state farm': 'statefarm.com',
  'progressive': 'progressive.com',
  'allstate': 'allstate.com',
  
  // Software & SaaS
  'adobe': 'adobe.com',
  'microsoft': 'microsoft.com',
  'google': 'google.com',
  'dropbox': 'dropbox.com',
  'zoom': 'zoom.us',
  'slack': 'slack.com',
  'notion': 'notion.so',
  
  // Shopping
  'amazon': 'amazon.com',
  'ebay': 'ebay.com',
  'etsy': 'etsy.com',
  'wayfair': 'wayfair.com',
  'ikea': 'ikea.com',
  'home depot': 'homedepot.com',
  'lowes': 'lowes.com',
  
  // Payment Services
  'paypal': 'paypal.com',
  'venmo': 'venmo.com',
  'zelle': 'zellepay.com',
  'cash app': 'cash.app',
  'square': 'squareup.com',
  
  // Utilities
  'water': 'water.com',
  'electric': 'utility.com',
  'gas': 'gasutility.com',
};

// Merchant category color schemes
const MERCHANT_COLORS: Record<string, { bgClass: string; textClass: string }> = {
  // Retail
  'costco': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  'walmart': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'target': { bgClass: 'bg-red-600/20', textClass: 'text-red-600' },
  
  // Restaurants
  'starbucks': { bgClass: 'bg-green-600/20', textClass: 'text-green-600' },
  'mcdonalds': { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-500' },
  'chipotle': { bgClass: 'bg-red-700/20', textClass: 'text-red-700' },
  
  // Streaming
  'netflix': { bgClass: 'bg-red-600/20', textClass: 'text-red-600' },
  'spotify': { bgClass: 'bg-green-500/20', textClass: 'text-green-500' },
  'hulu': { bgClass: 'bg-green-400/20', textClass: 'text-green-400' },
  'disney': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  
  // Payment Services
  'paypal': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'venmo': { bgClass: 'bg-blue-400/20', textClass: 'text-blue-400' },
  'zelle': { bgClass: 'bg-purple-500/20', textClass: 'text-purple-500' },
  'cash app': { bgClass: 'bg-green-600/20', textClass: 'text-green-600' },
  
  // Gas stations
  'shell': { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-500' },
  
  // Default
  'default': { bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-500' },
};

export function getMerchantLogo(merchantName: string) {
  if (!merchantName) {
    return {
      logo: <Package className="h-10 w-10 text-indigo-500" />,
      bgClass: 'bg-indigo-500/20',
      textClass: 'text-indigo-500'
    };
  }

  const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  const lowerMerchant = merchantName.toLowerCase();
  
  // Find domain by checking if merchant name includes key
  let domain: string | undefined;
  for (const [key, value] of Object.entries(MERCHANT_TO_DOMAIN)) {
    if (lowerMerchant.includes(key)) {
      domain = value;
      break;
    }
  }
  
  // Find color scheme
  let colors = MERCHANT_COLORS.default;
  for (const [key, value] of Object.entries(MERCHANT_COLORS)) {
    if (lowerMerchant.includes(key)) {
      colors = value;
      break;
    }
  }

  // If we have a domain mapping and Brandfetch client ID, use Brandfetch
  if (domain && BRANDFETCH_CLIENT_ID) {
    return {
      logo: (
        <MerchantLogoImage 
          domain={domain}
          merchantName={merchantName}
          colors={colors}
          brandfetchClientId={BRANDFETCH_CLIENT_ID}
        />
      ),
      ...colors
    };
  }

  // Default fallback icon
  return {
    logo: <Package className={`h-10 w-10 ${colors.textClass}`} />,
    ...colors
  };
}

// Separate component to handle image loading with state
function MerchantLogoImage({ domain, merchantName, colors, brandfetchClientId }: { domain: string; merchantName: string; colors: { textClass: string }; brandfetchClientId: string }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <svg className={`h-10 w-10 ${colors.textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
      </svg>
    );
  }

  return (
    <img 
      src={`https://cdn.brandfetch.io/${domain}?c=${brandfetchClientId}`}
      alt={merchantName}
      className="h-10 w-10 object-contain p-1"
      onError={() => setHasError(true)}
    />
  );
}

export function getMerchantColors(merchantName: string) {
  const lowerMerchant = merchantName.toLowerCase();
  
  for (const [key, value] of Object.entries(MERCHANT_COLORS)) {
    if (lowerMerchant.includes(key)) {
      return value;
    }
  }
  
  return MERCHANT_COLORS.default;
}
