import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  ChevronRight,
  Activity,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { 
  SiChase,
  SiAmericanexpress,
  SiBankofamerica,
  SiWellsfargo,
  SiRobinhood,
  SiCoinbase
} from 'react-icons/si';
import { formatCurrency } from '@/lib/utils';
import AccountDetailsDialog from '../AccountDetailsDialog';

interface AccountCardProps {
  account: {
    id: string;
    provider: 'teller' | 'snaptrade' | 'metamask';
    accountName: string;
    accountNumber?: string;
    balance: number;
    type: 'bank' | 'investment' | 'crypto' | 'credit';
    subtype?: string | null;
    rawType?: string | null;
    institution: string;
    lastUpdated: string;
    currency?: string;
    holdings?: number;
    cash?: number;
    buyingPower?: number;
    percentOfTotal?: number;
    availableCredit?: number | null;
    amountSpent?: number | null;
    needsReconnection?: boolean;
    externalAccountId?: string;
    balanceVerified?: boolean;
  };
}

export default function AccountCard({ account }: AccountCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();

  const getBankLogo = () => {
    const institution = account.institution.toLowerCase();
    
    // MetaMask specific logo - using the fox SVG inline
    if (account.provider === 'metamask') {
      return (
        <svg viewBox="0 0 318.6 318.6" className="h-4 w-4">
          <polygon fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" points="274.1,35.5 174.6,109.4 193,65.8"/>
          <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="44.4,35.5 143.1,110.1 125.6,65.8"/>
          <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7"/>
          <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8"/>
          <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1"/>
          <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1"/>
          <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 140.6,230.9 111.4,208.1"/>
          <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="177.9,230.9 211.8,247.4 207.1,208.1"/>
          <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="211.8,247.4 177.9,230.9 180.6,253 180.3,262.3"/>
          <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 138.3,262.3 138.1,253 140.6,230.9"/>
          <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="138.8,193.5 110.6,185.2 130.5,176.1"/>
          <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="179.7,193.5 188,176.1 208,185.2"/>
          <polygon fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 111.6,206.8 80.3,207.7"/>
          <polygon fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" points="207,206.8 211.8,247.4 238.3,207.7"/>
        </svg>
      );
    }
    
    // Bank-specific logos
    if (institution.includes('capitalone') || institution.includes('capital one')) {
      return <DollarSign className="h-3 w-3 text-red-500" />;
    }
    if (institution.includes('chase')) {
      return <SiChase className="h-3 w-3 text-blue-600" />;
    }
    if (institution.includes('american express') || institution.includes('amex')) {
      return <SiAmericanexpress className="h-3 w-3 text-blue-700" />;
    }
    if (institution.includes('bank of america') || institution.includes('boa')) {
      return <SiBankofamerica className="h-3 w-3 text-red-600" />;
    }
    if (institution.includes('wells fargo')) {
      return <SiWellsfargo className="h-3 w-3 text-yellow-600" />;
    }
    if (institution.includes('citi')) {
      return <Building2 className="h-3 w-3 text-blue-600" />;
    }
    if (institution.includes('us bank')) {
      return <Building2 className="h-3 w-3 text-blue-700" />;
    }
    if (institution.includes('robinhood')) {
      return <SiRobinhood className="h-3 w-3 text-green-500" />;
    }
    if (institution.includes('coinbase')) {
      return <SiCoinbase className="h-3 w-3 text-blue-500" />;
    }
    
    // Fallback to generic icons by type
    switch (account.type) {
      case 'bank':
        return <Building2 className="h-3 w-3 text-green-500" />;
      case 'investment':
        return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'crypto':
        return <Wallet className="h-3 w-3 text-yellow-500" />;
      case 'credit':
        return <DollarSign className="h-3 w-3 text-red-500" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const getProviderBadgeColor = () => {
    return account.provider === 'teller' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-600/20 text-blue-400';
  };

  const getAccountTypeColor = () => {
    switch (account.type) {
      case 'bank':
        return 'bg-green-600/20 text-green-400';
      case 'investment':
        return 'bg-orange-600/20 text-orange-400';
      case 'crypto':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'credit':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <>
      <Card className="flint-card hover:shadow-lg transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {getBankLogo()}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {account.accountName}
                  {account.provider === 'snaptrade' && account.accountNumber && ` (****${account.accountNumber.slice(-4)})`}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {account.provider === 'snaptrade' && account.rawType ? (
                    <>
                      {account.rawType} • {account.type}
                    </>
                  ) : (
                    <>
                      {account.institution}
                      {/* Only show separator and masked number when accountNumber exists */}
                      {account.accountNumber && account.accountNumber.trim() && ` • ****${account.accountNumber.slice(-4)}`}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className={getProviderBadgeColor()}>
                {account.provider.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className={getAccountTypeColor()}>
                {account.type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Main Balance */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {account.type === 'credit' ? 'Amount Spent This Cycle' : account.type === 'investment' ? 'Total Value' : 'Available Balance'}
              </p>
              <p className={`text-2xl font-bold ${account.type === 'credit' ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(
                  account.type === 'credit' 
                    ? (account.amountSpent ?? (account.balance < 0 ? Math.abs(account.balance) : account.balance))
                    : account.type === 'investment'
                    ? ((account.cash ?? 0) + (account.holdings ?? 0))
                    : account.balance
                )}
              </p>
              
              {/* Subtitle based on account type */}
              {account.type === 'credit' && account.availableCredit !== null && account.availableCredit !== undefined ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Credit available — {formatCurrency(account.availableCredit)}
                </p>
              ) : account.type !== 'credit' && account.percentOfTotal !== undefined ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {account.percentOfTotal}% of total
                </p>
              ) : null}
            </div>

            {/* Additional Account Info */}
            {account.type === 'investment' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {account.cash !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Cash</p>
                    <p className="font-medium">{formatCurrency(account.cash)}</p>
                  </div>
                )}
                {account.holdings !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Holdings</p>
                    <p className="font-medium">{formatCurrency(account.holdings)}</p>
                  </div>
                )}
                {account.buyingPower !== undefined && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Buying Power</p>
                    <p className="font-medium text-green-400">{formatCurrency(account.buyingPower)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Last Updated */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Updated {new Date(account.lastUpdated).toLocaleTimeString()}</span>
                {account.needsReconnection && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">
                    • Reconnection needed
                  </span>
                )}
              </div>
              
              {/* View Details or Resync Button */}
              {account.needsReconnection ? (
                <Button
                  onClick={async () => {
                    // Trigger SnapTrade reconnection
                    try {
                      const response = await fetch('/api/snaptrade/register', {
                        method: 'POST',
                        credentials: 'include'
                      });
                      const data = await response.json();
                      
                      if (data.redirectUrl) {
                        // Open SnapTrade connection portal in a popup
                        const width = 800;
                        const height = 700;
                        const left = (window.innerWidth - width) / 2;
                        const top = (window.innerHeight - height) / 2;
                        
                        window.open(
                          data.redirectUrl,
                          'SnapTradeConnect',
                          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                        );
                      }
                    } catch (error) {
                      console.error('Failed to start SnapTrade connection:', error);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resync
                </Button>
              ) : (
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  size="sm"
                  className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                >
                  View Details
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Account Details Dialog */}
      <AccountDetailsDialog
        accountId={account.provider === 'teller' && account.externalAccountId ? account.externalAccountId : String(account.id)}
        open={showDetails}
        onClose={() => setShowDetails(false)}
        currentUserId={String(user?.id || '')}
        provider={account.provider}
        localAccountId={String(account.id)}
      />
    </>
  );
}