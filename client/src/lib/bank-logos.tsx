import { SiRobinhood } from 'react-icons/si';
import { Building2, Landmark, CreditCard, BadgeDollarSign, TrendingUp, Wallet, Coins, DollarSign, Building, HelpCircle } from 'lucide-react';

export function getInstitutionName(accountName: string): string {
  if (!accountName) return '';
  
  const parts = accountName.split('-');
  return parts[0].trim();
}

export function getInstitutionLogo(accountName: string) {
  const institutionName = getInstitutionName(accountName).toLowerCase();
  
  const iconProps = {
    className: 'h-5 w-5',
    'aria-label': getInstitutionName(accountName),
  };

  if (institutionName.includes('robinhood')) {
    return {
      icon: <SiRobinhood {...iconProps} />,
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-500'
    };
  }
  
  if (institutionName.includes('chase') || institutionName.includes('jpmorgan')) {
    return {
      icon: <Building2 {...iconProps} />,
      bgClass: 'bg-blue-600/20',
      textClass: 'text-blue-600'
    };
  }
  
  if (institutionName.includes('bank of america')) {
    return {
      icon: <Landmark {...iconProps} />,
      bgClass: 'bg-red-600/20',
      textClass: 'text-red-600'
    };
  }
  
  if (institutionName.includes('citi')) {
    return {
      icon: <CreditCard {...iconProps} />,
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500'
    };
  }
  
  if (institutionName.includes('morgan stanley')) {
    return {
      icon: <TrendingUp {...iconProps} />,
      bgClass: 'bg-indigo-600/20',
      textClass: 'text-indigo-600'
    };
  }
  
  if (institutionName.includes('capital') || institutionName.includes('capitalone')) {
    return {
      icon: <Wallet {...iconProps} />,
      bgClass: 'bg-purple-600/20',
      textClass: 'text-purple-600'
    };
  }
  
  if (institutionName.includes('wells fargo')) {
    return {
      icon: <Coins {...iconProps} />,
      bgClass: 'bg-amber-600/20',
      textClass: 'text-amber-600'
    };
  }
  
  if (institutionName.includes('american express') || institutionName.includes('amex')) {
    return {
      icon: <BadgeDollarSign {...iconProps} />,
      bgClass: 'bg-cyan-600/20',
      textClass: 'text-cyan-600'
    };
  }
  
  if (institutionName.includes('td bank') || institutionName.includes('td')) {
    return {
      icon: <DollarSign {...iconProps} />,
      bgClass: 'bg-emerald-600/20',
      textClass: 'text-emerald-600'
    };
  }
  
  if (institutionName.includes('us bank')) {
    return {
      icon: <Building {...iconProps} />,
      bgClass: 'bg-slate-600/20',
      textClass: 'text-slate-600'
    };
  }
  
  return {
    icon: <HelpCircle {...iconProps} />,
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-500'
  };
}
