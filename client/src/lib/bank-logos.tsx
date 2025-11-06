import { Building2 } from 'lucide-react';

export function getInstitutionName(accountName: string): string {
  if (!accountName) return '';
  
  const parts = accountName.split('-');
  return parts[0].trim();
}

export function getInstitutionLogo(accountName: string) {
  const institutionName = getInstitutionName(accountName).toLowerCase();
  const displayName = getInstitutionName(accountName);

  const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID || '';
  
  if (institutionName.includes('robinhood')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/robinhood.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-500'
    };
  }
  
  if (institutionName.includes('chase') || institutionName.includes('jpmorgan')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/chase.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('bank of america')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/bankofamerica.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-red-600/20',
      textClass: 'text-red-600'
    };
  }
  
  if (institutionName.includes('citi')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/citi.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('morgan stanley')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/morganstanley.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-indigo-600/20',
      textClass: 'text-indigo-600'
    };
  }
  
  if (institutionName.includes('capital') || institutionName.includes('capitalone')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/capitalone.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-purple-600/20',
      textClass: 'text-purple-600'
    };
  }
  
  if (institutionName.includes('pnc')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/pnc.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-orange-600/20',
      textClass: 'text-orange-600'
    };
  }
  
  if (institutionName.includes('wells fargo')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/wellsfargo.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-amber-600/20',
      textClass: 'text-amber-600'
    };
  }
  
  if (institutionName.includes('american express') || institutionName.includes('amex')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/americanexpress.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('td bank') || institutionName.includes('td')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/td.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('us bank')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/usbank.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-slate-600/20',
      textClass: 'text-slate-600'
    };
  }
  
  if (institutionName.includes('usaa')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/usaa.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-900/20',
      textClass: 'text-blue-900'
    };
  }
  
  // Brokerage institutions
  if (institutionName.includes('fidelity')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/fidelity.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('schwab') || institutionName.includes('charles schwab')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/schwab.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-700/20',
      textClass: 'text-blue-700'
    };
  }
  
  if (institutionName.includes('etrade') || institutionName.includes('e*trade') || institutionName.includes('e-trade')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/etrade.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-purple-700/20',
      textClass: 'text-purple-700'
    };
  }
  
  if (institutionName.includes('td ameritrade') || institutionName.includes('thinkorswim')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/tdameritrade.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-green-700/20',
      textClass: 'text-green-700'
    };
  }
  
  if (institutionName.includes('interactive brokers') || institutionName.includes('ibkr')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/interactivebrokers.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-red-700/20',
      textClass: 'text-red-700'
    };
  }
  
  if (institutionName.includes('webull')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/webull.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-yellow-600/20',
      textClass: 'text-yellow-600'
    };
  }
  
  if (institutionName.includes('vanguard')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/vanguard.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-red-800/20',
      textClass: 'text-red-800'
    };
  }
  
  if (institutionName.includes('merrill') || institutionName.includes('merrill lynch')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/ml.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-800/20',
      textClass: 'text-blue-800'
    };
  }
  
  if (institutionName.includes('coinbase')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/coinbase.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  // Additional Brokerages
  if (institutionName.includes('alpaca')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/alpaca.markets?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500'
    };
  }
  
  if (institutionName.includes('tradestation')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/tradestation.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('tastytrade') || institutionName.includes('tastyworks')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/tastytrade.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-500'
    };
  }
  
  if (institutionName.includes('public.com') || institutionName.includes('public')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/public.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-green-400/20',
      textClass: 'text-green-400'
    };
  }
  
  if (institutionName.includes('ally invest') || institutionName.includes('ally')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/ally.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-purple-500/20',
      textClass: 'text-purple-500'
    };
  }
  
  if (institutionName.includes('moomoo')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/moomoo.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-yellow-400/20',
      textClass: 'text-yellow-400'
    };
  }
  
  if (institutionName.includes('sofi')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/sofi.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-teal-500/20',
      textClass: 'text-teal-500'
    };
  }
  
  if (institutionName.includes('acorns')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/acorns.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-emerald-400/20',
      textClass: 'text-emerald-400'
    };
  }
  
  if (institutionName.includes('stash')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/stash.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-indigo-500/20',
      textClass: 'text-indigo-500'
    };
  }
  
  if (institutionName.includes('betterment')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/betterment.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-blue-400/20',
      textClass: 'text-blue-400'
    };
  }
  
  if (institutionName.includes('wealthfront')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/wealthfront.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-500'
    };
  }
  
  if (institutionName.includes('m1 finance') || institutionName.includes('m1')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/m1finance.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-red-400/20',
      textClass: 'text-red-400'
    };
  }
  
  // Crypto Exchanges
  if (institutionName.includes('kraken')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/kraken.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-purple-600/20',
      textClass: 'text-purple-600'
    };
  }
  
  if (institutionName.includes('gemini')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/gemini.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('binance')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/binance.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
      />,
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500'
    };
  }
  
  // Dynamic fallback - try to fetch logo from Brandfetch using institution name
  // Convert institution name to potential domain (e.g., "Alpaca Paper" -> "alpaca.markets")
  const cleanName = institutionName
    .replace(/\s+(bank|paper|trading|invest|financial|securities|corporation|inc|llc|corp)/gi, '')
    .trim()
    .replace(/\s+/g, '');
  
  if (cleanName && cleanName.length > 2) {
    // Try common domain patterns
    const potentialDomain = `${cleanName}.com`;
    
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/${potentialDomain}?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain"
        onError={(e) => {
          // If Brandfetch fails, fall back to building icon
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2 h-10 w-10 p-1"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';
          }
        }}
      />,
      bgClass: 'bg-gray-500/20',
      textClass: 'text-gray-500'
    };
  }
  
  // Final fallback for unknown institutions
  return {
    logo: <Building2 className="h-8 w-8" aria-label={displayName} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
