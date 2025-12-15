import { Building2 } from 'lucide-react';

export function getInstitutionName(accountName: string): string {
  if (!accountName) return '';
  
  const parts = accountName.split('-');
  return parts[0].trim();
}

function createLogoImg(domain: string, displayName: string) {
  return (
    <img 
      src={`https://logo.clearbit.com/${domain}`}
      alt={displayName}
      className="h-full w-full object-cover scale-105"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}

export function getInstitutionLogo(accountName: string) {
  const institutionName = getInstitutionName(accountName).toLowerCase();
  const displayName = getInstitutionName(accountName);

  if (institutionName.includes('robinhood')) {
    return {
      logo: createLogoImg('robinhood.com', displayName),
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-500'
    };
  }
  
  if (institutionName.includes('chase') || institutionName.includes('jpmorgan')) {
    return {
      logo: createLogoImg('chase.com', displayName),
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('bank of america')) {
    return {
      logo: createLogoImg('bankofamerica.com', displayName),
      bgClass: 'bg-red-600/20',
      textClass: 'text-red-600'
    };
  }
  
  if (institutionName.includes('citi')) {
    return {
      logo: createLogoImg('citi.com', displayName),
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('morgan stanley')) {
    return {
      logo: createLogoImg('morganstanley.com', displayName),
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('capital') || institutionName.includes('capitalone')) {
    return {
      logo: createLogoImg('capitalone.com', displayName),
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('pnc')) {
    return {
      logo: createLogoImg('pnc.com', displayName),
      bgClass: 'bg-orange-600/20',
      textClass: 'text-orange-600'
    };
  }
  
  if (institutionName.includes('wells fargo')) {
    return {
      logo: createLogoImg('wellsfargo.com', displayName),
      bgClass: 'bg-amber-600/20',
      textClass: 'text-amber-600'
    };
  }
  
  if (institutionName.includes('american express') || institutionName.includes('amex')) {
    return {
      logo: createLogoImg('americanexpress.com', displayName),
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('td bank') || institutionName.includes('td')) {
    return {
      logo: createLogoImg('td.com', displayName),
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('us bank')) {
    return {
      logo: createLogoImg('usbank.com', displayName),
      bgClass: 'bg-slate-600/20',
      textClass: 'text-slate-600'
    };
  }
  
  if (institutionName.includes('usaa')) {
    return {
      logo: createLogoImg('usaa.com', displayName),
      bgClass: 'bg-blue-900/20',
      textClass: 'text-blue-900'
    };
  }
  
  if (institutionName.includes('fidelity')) {
    return {
      logo: createLogoImg('fidelity.com', displayName),
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('schwab') || institutionName.includes('charles schwab')) {
    return {
      logo: createLogoImg('schwab.com', displayName),
      bgClass: 'bg-blue-700/20',
      textClass: 'text-blue-700'
    };
  }
  
  if (institutionName.includes('etrade') || institutionName.includes('e*trade') || institutionName.includes('e-trade')) {
    return {
      logo: createLogoImg('etrade.com', displayName),
      bgClass: 'bg-blue-700/20',
      textClass: 'text-blue-700'
    };
  }
  
  if (institutionName.includes('td ameritrade') || institutionName.includes('thinkorswim')) {
    return {
      logo: createLogoImg('tdameritrade.com', displayName),
      bgClass: 'bg-green-700/20',
      textClass: 'text-green-700'
    };
  }
  
  if (institutionName.includes('interactive brokers') || institutionName.includes('ibkr')) {
    return {
      logo: createLogoImg('interactivebrokers.com', displayName),
      bgClass: 'bg-red-700/20',
      textClass: 'text-red-700'
    };
  }
  
  if (institutionName.includes('webull')) {
    return {
      logo: createLogoImg('webull.com', displayName),
      bgClass: 'bg-yellow-600/20',
      textClass: 'text-yellow-600'
    };
  }
  
  if (institutionName.includes('vanguard')) {
    return {
      logo: createLogoImg('vanguard.com', displayName),
      bgClass: 'bg-red-800/20',
      textClass: 'text-red-800'
    };
  }
  
  if (institutionName.includes('merrill') || institutionName.includes('merrill lynch')) {
    return {
      logo: createLogoImg('ml.com', displayName),
      bgClass: 'bg-blue-800/20',
      textClass: 'text-blue-800'
    };
  }
  
  if (institutionName.includes('coinbase')) {
    return {
      logo: createLogoImg('coinbase.com', displayName),
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('alpaca')) {
    return {
      logo: createLogoImg('alpaca.markets', displayName),
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500'
    };
  }
  
  if (institutionName.includes('tradestation')) {
    return {
      logo: createLogoImg('tradestation.com', displayName),
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('tastytrade') || institutionName.includes('tastyworks')) {
    return {
      logo: createLogoImg('tastytrade.com', displayName),
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-500'
    };
  }
  
  if (institutionName.includes('public.com') || institutionName.includes('public')) {
    return {
      logo: createLogoImg('public.com', displayName),
      bgClass: 'bg-green-400/20',
      textClass: 'text-green-400'
    };
  }
  
  if (institutionName.includes('ally invest') || institutionName.includes('ally')) {
    return {
      logo: createLogoImg('ally.com', displayName),
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('moomoo')) {
    return {
      logo: createLogoImg('moomoo.com', displayName),
      bgClass: 'bg-yellow-400/20',
      textClass: 'text-yellow-400'
    };
  }
  
  if (institutionName.includes('sofi')) {
    return {
      logo: createLogoImg('sofi.com', displayName),
      bgClass: 'bg-teal-500/20',
      textClass: 'text-teal-500'
    };
  }
  
  if (institutionName.includes('acorns')) {
    return {
      logo: createLogoImg('acorns.com', displayName),
      bgClass: 'bg-emerald-400/20',
      textClass: 'text-emerald-400'
    };
  }
  
  if (institutionName.includes('stash')) {
    return {
      logo: createLogoImg('stash.com', displayName),
      bgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-500'
    };
  }
  
  if (institutionName.includes('betterment')) {
    return {
      logo: createLogoImg('betterment.com', displayName),
      bgClass: 'bg-blue-400/20',
      textClass: 'text-blue-400'
    };
  }
  
  if (institutionName.includes('wealthfront')) {
    return {
      logo: createLogoImg('wealthfront.com', displayName),
      bgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-500'
    };
  }
  
  if (institutionName.includes('m1 finance') || institutionName.includes('m1')) {
    return {
      logo: createLogoImg('m1finance.com', displayName),
      bgClass: 'bg-red-400/20',
      textClass: 'text-red-400'
    };
  }
  
  if (institutionName.includes('metamask')) {
    return {
      logo: createLogoImg('metamask.io', displayName),
      bgClass: 'bg-orange-500/20',
      textClass: 'text-orange-500'
    };
  }
  
  if (institutionName.includes('kraken')) {
    return {
      logo: createLogoImg('kraken.com', displayName),
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('gemini')) {
    return {
      logo: createLogoImg('gemini.com', displayName),
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('binance')) {
    return {
      logo: createLogoImg('binance.com', displayName),
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500'
    };
  }
  
  const cleanName = institutionName
    .replace(/\s+(bank|paper|trading|invest|financial|securities|corporation|inc|llc|corp)/gi, '')
    .trim()
    .replace(/\s+/g, '');
  
  if (cleanName && cleanName.length > 2) {
    const potentialDomain = `${cleanName}.com`;
    
    return {
      logo: createLogoImg(potentialDomain, displayName),
      bgClass: 'bg-gray-500/20',
      textClass: 'text-gray-500'
    };
  }
  
  return {
    logo: <Building2 className="h-8 w-8" aria-label={displayName} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
