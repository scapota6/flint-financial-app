import { Building2 } from 'lucide-react';

export function getInstitutionName(accountName: string): string {
  if (!accountName) return '';
  
  const parts = accountName.split('-');
  return parts[0].trim();
}

export function getInstitutionLogo(accountName: string) {
  const institutionName = getInstitutionName(accountName).toLowerCase();
  const displayName = getInstitutionName(accountName);

  if (institutionName.includes('robinhood')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/robinhood.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-500'
    };
  }
  
  if (institutionName.includes('chase') || institutionName.includes('jpmorgan')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/chase.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('bank of america')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/bankofamerica.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-red-600/20',
      textClass: 'text-red-600'
    };
  }
  
  if (institutionName.includes('citi')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/citigroup.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('morgan stanley')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/morganstanley.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-indigo-600/20',
      textClass: 'text-indigo-600'
    };
  }
  
  if (institutionName.includes('capital') || institutionName.includes('capitalone')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/capitalone.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-purple-600/20',
      textClass: 'text-purple-600'
    };
  }
  
  if (institutionName.includes('wells fargo')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/wellsfargo.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-amber-600/20',
      textClass: 'text-amber-600'
    };
  }
  
  if (institutionName.includes('american express') || institutionName.includes('amex')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/americanexpress.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('td bank') || institutionName.includes('td')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/td.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('us bank')) {
    return {
      logo: <img 
        src="https://logo.brandfetch.io/usbank.com" 
        alt={displayName}
        className="h-5 w-5 object-contain"
      />,
      bgClass: 'bg-slate-600/20',
      textClass: 'text-slate-600'
    };
  }
  
  // Fallback for unknown institutions
  return {
    logo: <Building2 className="h-5 w-5" aria-label={displayName} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
