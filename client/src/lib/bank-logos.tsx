import { SiRobinhood } from 'react-icons/si';
import { Building2, Landmark, CreditCard, TrendingUp, Wallet } from 'lucide-react';

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

  // Robinhood has an official Simple Icon
  if (institutionName.includes('robinhood')) {
    return <SiRobinhood {...iconProps} />;
  }
  
  // For other institutions, use distinctive Lucide icons based on institution type
  if (institutionName.includes('chase') || institutionName.includes('jpmorgan')) {
    return <Landmark {...iconProps} />;
  }
  
  if (institutionName.includes('bank of america')) {
    return <Landmark {...iconProps} />;
  }
  
  if (institutionName.includes('citi')) {
    return <CreditCard {...iconProps} />;
  }
  
  if (institutionName.includes('morgan stanley')) {
    return <TrendingUp {...iconProps} />;
  }
  
  if (institutionName.includes('capital') || institutionName.includes('capitalone')) {
    return <CreditCard {...iconProps} />;
  }
  
  if (institutionName.includes('wells fargo')) {
    return <Landmark {...iconProps} />;
  }
  
  if (institutionName.includes('american express') || institutionName.includes('amex')) {
    return <CreditCard {...iconProps} />;
  }
  
  if (institutionName.includes('td bank') || institutionName.includes('td')) {
    return <Landmark {...iconProps} />;
  }
  
  if (institutionName.includes('us bank')) {
    return <Landmark {...iconProps} />;
  }
  
  // Default fallback
  return <Building2 {...iconProps} />;
}
