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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
      />,
      bgClass: 'bg-slate-600/20',
      textClass: 'text-slate-600'
    };
  }
  
  // Brokerage institutions
  if (institutionName.includes('fidelity')) {
    return {
      logo: <img 
        src={`https://cdn.brandfetch.io/fidelity.com?c=${BRANDFETCH_CLIENT_ID}`}
        alt={displayName}
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
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
        className="h-10 w-10 object-contain p-1"
      />,
      bgClass: 'bg-blue-800/20',
      textClass: 'text-blue-800'
    };
  }
  
  // Fallback for unknown institutions
  return {
    logo: <Building2 className="h-10 w-10 p-1" aria-label={displayName} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
