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
  'williams-sonoma': 'williams-sonoma.com',
  'williams sonoma': 'williams-sonoma.com',
  'pottery barn': 'potterybarn.com',
  'west elm': 'westelm.com',
  
  // Payment Services
  'paypal': 'paypal.com',
  'venmo': 'venmo.com',
  'zelle': 'zellepay.com',
  'cash app': 'cash.app',
  'square': 'squareup.com',
  'stripe': 'stripe.com',
  
  // Utilities
  'water': 'water.com',
  'electric': 'utility.com',
  'gas': 'gasutility.com',
  'pg&e': 'pge.com',
  'duke energy': 'duke-energy.com',
  'southern california edison': 'sce.com',
  'con edison': 'coned.com',
  'national grid': 'nationalgrid.com',
  
  // More Restaurants & Food Delivery
  'uber eats': 'ubereats.com',
  'doordash': 'doordash.com',
  'grubhub': 'grubhub.com',
  'postmates': 'postmates.com',
  'instacart': 'instacart.com',
  'seamless': 'seamless.com',
  'little caesars': 'littlecaesars.com',
  'jimmy johns': 'jimmyjohns.com',
  'popeyes': 'popeyes.com',
  'arbys': 'arbys.com',
  'kfc': 'kfc.com',
  'panda express': 'pandaexpress.com',
  'olive garden': 'olivegarden.com',
  'red lobster': 'redlobster.com',
  'applebees': 'applebees.com',
  'chilis': 'chilis.com',
  'buffalo wild wings': 'buffalowildwings.com',
  'outback': 'outback.com',
  'cheesecake factory': 'thecheesecakefactory.com',
  'sonic': 'sonicdrivein.com',
  'mission ceviche': 'missionceviche.com',
  'misson ceviche': 'missionceviche.com',
  
  // More Gas Stations
  'circle k': 'circlek.com',
  'wawa': 'wawa.com',
  'speedway': 'speedway.com',
  '7-eleven': '7-eleven.com',
  'marathon': 'marathon.com',
  'sunoco': 'sunoco.com',
  'valero': 'valero.com',
  
  // E-commerce & Online
  'shopify': 'shopify.com',
  'wish': 'wish.com',
  'aliexpress': 'aliexpress.com',
  'mercado': 'mercadolibre.com',
  'overstock': 'overstock.com',
  'newegg': 'newegg.com',
  'best buy': 'bestbuy.com',
  'zappos': 'zappos.com',
  
  // Transportation
  'uber': 'uber.com',
  'lyft': 'lyft.com',
  'delta': 'delta.com',
  'american airlines': 'aa.com',
  'united': 'united.com',
  'southwest': 'southwest.com',
  'jetblue': 'jetblue.com',
  'spirit': 'spirit.com',
  'amtrak': 'amtrak.com',
  'greyhound': 'greyhound.com',
  'enterprise': 'enterprise.com',
  'hertz': 'hertz.com',
  'budget': 'budget.com',
  'avis': 'avis.com',
  
  // Pharmacies & Health
  'cvs': 'cvs.com',
  'walgreens': 'walgreens.com',
  'rite aid': 'riteaid.com',
  'kaiser': 'kp.org',
  'bluecross': 'bcbs.com',
  'humana': 'humana.com',
  'united healthcare': 'uhc.com',
  'aetna': 'aetna.com',
  'cigna': 'cigna.com',
  
  // More Streaming Services
  'max': 'max.com',
  'showtime': 'showtime.com',
  'starz': 'starz.com',
  'crunchyroll': 'crunchyroll.com',
  'funimation': 'funimation.com',
  'twitch': 'twitch.tv',
  'discord': 'discord.com',
  'patreon': 'patreon.com',
  
  // Gaming
  'playstation': 'playstation.com',
  'xbox': 'xbox.com',
  'nintendo': 'nintendo.com',
  'steam': 'steampowered.com',
  'epic games': 'epicgames.com',
  'blizzard': 'blizzard.com',
  'roblox': 'roblox.com',
  'fortnite': 'epicgames.com',
  
  // Home Services
  'frontier': 'frontier.com',
  'cox': 'cox.com',
  'centurylink': 'centurylink.com',
  'directv': 'directv.com',
  'dish': 'dish.com',
  'sling': 'sling.com',
  
  // Financial Services
  'credit karma': 'creditkarma.com',
  'mint': 'mint.com',
  'turbotax': 'turbotax.com',
  'h&r block': 'hrblock.com',
  'quickbooks': 'quickbooks.com',
  'coinbase': 'coinbase.com',
  'robinhood': 'robinhood.com',
  'webull': 'webull.com',
  'acorns': 'acorns.com',
  'betterment': 'betterment.com',
  'wealthfront': 'wealthfront.com',
  
  // Education
  'udemy': 'udemy.com',
  'coursera': 'coursera.com',
  'skillshare': 'skillshare.com',
  'masterclass': 'masterclass.com',
  'linkedin learning': 'linkedin.com',
  'duolingo': 'duolingo.com',
  
  // Social & Communication
  'linkedin': 'linkedin.com',
  'twitter': 'twitter.com',
  'meta': 'meta.com',
  'facebook': 'facebook.com',
  'instagram': 'instagram.com',
  'tiktok': 'tiktok.com',
  'whatsapp': 'whatsapp.com',
  'telegram': 'telegram.org',
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
  'zelle': { bgClass: 'bg-blue-500/20', textClass: 'text-blue-500' },
  'cash app': { bgClass: 'bg-green-600/20', textClass: 'text-green-600' },
  
  // Gas stations
  'shell': { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-500' },
  
  // Transportation
  'uber': { bgClass: 'bg-black/20', textClass: 'text-white' },
  'lyft': { bgClass: 'bg-pink-500/20', textClass: 'text-pink-500' },
  
  // Food Delivery
  'doordash': { bgClass: 'bg-red-500/20', textClass: 'text-red-500' },
  'grubhub': { bgClass: 'bg-orange-500/20', textClass: 'text-orange-500' },
  'instacart': { bgClass: 'bg-green-500/20', textClass: 'text-green-500' },
  
  // Gaming
  'playstation': { bgClass: 'bg-blue-600/20', textClass: 'text-blue-600' },
  'xbox': { bgClass: 'bg-green-600/20', textClass: 'text-green-600' },
  'nintendo': { bgClass: 'bg-red-600/20', textClass: 'text-red-600' },
  
  // Default
  'default': { bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-500' },
};

export function getMerchantLogo(merchantName: string, accountProvider?: string) {
  if (!merchantName) {
    return {
      logo: <Package className="h-10 w-10 text-cyan-500" />,
      bgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-500'
    };
  }

  const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  
  // Clean and normalize merchant name
  let cleanedMerchant = merchantName.toLowerCase()
    .replace(/[*#]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Remove common prefixes that don't help with matching
  const prefixes = ['sq ', 'tst* ', 'sp * ', 'uber *', 'lyft *', 'doordash *', 'dd *'];
  for (const prefix of prefixes) {
    if (cleanedMerchant.startsWith(prefix)) {
      cleanedMerchant = cleanedMerchant.substring(prefix.length).trim();
      break;
    }
  }
  
  const lowerMerchant = cleanedMerchant;
  
  // Check if this is a generic banking transaction (deposit, check, transfer, etc.)
  const isGenericBanking = lowerMerchant.includes('deposit') ||
                          lowerMerchant.includes('check #') ||
                          lowerMerchant.includes('check#') ||
                          lowerMerchant.includes('transfer') ||
                          lowerMerchant.includes('withdrawal') ||
                          lowerMerchant.includes('atm') ||
                          lowerMerchant.includes('fee') ||
                          lowerMerchant.includes('insufficient') ||
                          lowerMerchant.includes('external atm') ||
                          lowerMerchant.includes('cash');
  
  // Find domain by checking if merchant name includes key (exact substring match)
  let domain: string | undefined;
  let matchedKey: string | undefined;
  for (const [key, value] of Object.entries(MERCHANT_TO_DOMAIN)) {
    if (lowerMerchant.includes(key)) {
      domain = value;
      matchedKey = key;
      break;
    }
  }
  
  // If no exact match, try word-based partial matching
  if (!domain) {
    const words = lowerMerchant.split(' ').filter(w => w.length > 2); // Only words longer than 2 chars
    for (const word of words) {
      for (const [key, value] of Object.entries(MERCHANT_TO_DOMAIN)) {
        // Check if the word matches the key or contains the key
        if (word === key || word.includes(key) || (key.length > 3 && key.includes(word))) {
          domain = value;
          matchedKey = key;
          break;
        }
      }
      if (domain) break;
    }
  }
  
  // If generic banking transaction and no specific merchant match, try to use bank logo
  if (isGenericBanking && !domain && accountProvider) {
    const bankDomain = getBankDomain(accountProvider);
    if (bankDomain) {
      domain = bankDomain;
      matchedKey = accountProvider.toLowerCase();
    }
  }
  
  // Find color scheme using matchedKey if available, otherwise scan
  let colors = MERCHANT_COLORS.default;
  if (matchedKey && MERCHANT_COLORS[matchedKey]) {
    colors = MERCHANT_COLORS[matchedKey];
  } else {
    for (const [key, value] of Object.entries(MERCHANT_COLORS)) {
      if (lowerMerchant.includes(key)) {
        colors = value;
        break;
      }
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

// Helper function to get bank domain from account provider name
function getBankDomain(provider: string): string | undefined {
  const lowerProvider = provider.toLowerCase();
  
  const bankDomains: Record<string, string> = {
    'chase': 'chase.com',
    'bank of america': 'bankofamerica.com',
    'wells fargo': 'wellsfargo.com',
    'citibank': 'citibank.com',
    'citi': 'citibank.com',
    'us bank': 'usbank.com',
    'pnc': 'pnc.com',
    'capital one': 'capitalone.com',
    'td bank': 'td.com',
    'truist': 'truist.com',
    'american express': 'americanexpress.com',
    'amex': 'americanexpress.com',
    'discover': 'discover.com',
  };
  
  for (const [key, value] of Object.entries(bankDomains)) {
    if (lowerProvider.includes(key)) {
      return value;
    }
  }
  
  return undefined;
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
      className="h-full w-full object-cover"
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
