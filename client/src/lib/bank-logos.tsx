import { Building2 } from 'lucide-react';

export function getInstitutionName(accountName: string): string {
  if (!accountName) return '';
  
  const parts = accountName.split('-');
  return parts[0].trim();
}

export function getInstitutionLogo(accountName: string) {
  const institutionName = getInstitutionName(accountName).toLowerCase();
  const displayName = getInstitutionName(accountName);

  const BRANDFETCH_CLIENT_ID = '1idS50sRJ-OzQR6Z0cX';
  
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
  
  // Fallback for unknown institutions
  return {
    logo: <Building2 className="h-10 w-10 p-1" aria-label={displayName} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
