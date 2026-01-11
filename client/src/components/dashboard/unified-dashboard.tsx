import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import { useAccounts, usePortfolioTotals } from '@/hooks/useAccounts';
import { Building2, TrendingUp, DollarSign, Wallet, Eye, PlusCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSDK } from '@metamask/sdk-react';
import AccountDetailsDialog from '../AccountDetailsDialog';
import { getInstitutionLogo } from '@/lib/bank-logos';

interface AccountBalance {
  id: string;
  provider: string;
  accountName: string;
  balance: number;
  type: 'bank' | 'investment' | 'crypto' | 'credit';
  institution?: string;
  percentOfTotal?: number;
  availableCredit?: number | null;
  needsReconnection?: boolean;
}

interface DashboardData {
  totalBalance: number;
  bankBalance: number;
  investmentValue: number;
  cryptoValue: number;
  accounts: AccountBalance[];
  subscriptionTier: string;
  needsConnection?: boolean;
  connectionStatus?: {
    hasAccounts: boolean;
    snapTradeError: string | null;
    message: string | null;
  };
}


const COLORS = {
  bank: '#10b981', // green
  investment: '#0A84FF', // blue
  crypto: '#f59e0b', // orange
  debt: '#ef4444', // red
};


export default function UnifiedDashboard() {
  const [selectedView, setSelectedView] = useState<'overview' | 'accounts'>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { user } = useAuth();
  
  // MetaMask SDK connection state
  const { connected: metamaskConnected } = useSDK();

  // Use new unified accounts hook as single source of truth
  const { data: accountsData, isLoading, error } = useAccounts();
  const totals = usePortfolioTotals();
  
  // Only connected accounts are returned from the hook
  // Filter out MetaMask accounts when SDK is not connected
  const allAccounts = accountsData?.accounts || [];
  const connectedAccounts = useMemo(() => {
    return allAccounts.filter((account: any) => {
      // Hide MetaMask accounts when SDK is not connected
      if (account.provider === 'metamask' && !metamaskConnected) {
        return false;
      }
      return true;
    });
  }, [allAccounts, metamaskConnected]);
  
  // Adjust totals to exclude crypto when MetaMask is disconnected
  const adjustedTotals = useMemo(() => {
    if (metamaskConnected) {
      return totals;
    }
    // When MetaMask is disconnected, zero out crypto and adjust total
    return {
      ...totals,
      cryptoValue: 0,
      totalBalance: totals.totalBalance - totals.cryptoValue,
      accountCount: connectedAccounts.length
    };
  }, [totals, metamaskConnected, connectedAccounts.length]);
  
  const hasDisconnectedAccounts = accountsData?.disconnected && accountsData.disconnected.length > 0;
  const isEmptyState = connectedAccounts.length === 0 && !isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading state for net worth header */}
        <Card className="flint-card">
          <CardHeader>
            <CardTitle className="text-center">
              <div className="animate-pulse">
                <div className="text-lg text-gray-500 mb-2">Total Net Worth</div>
                <div className="h-12 bg-gray-200 rounded mx-auto w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mx-auto w-64"></div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        
        {/* Loading skeleton for cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="flint-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 mt-2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flint-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <div className="text-red-500 mb-2">Failed to load account data</div>
          <div className="text-gray-500 text-sm">Please check your connection and try again</div>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state when no accounts are connected
  if (isEmptyState) {
    const scrollToQuickConnect = () => {
      const element = document.getElementById('quick-connect-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 flex items-center justify-center">
          <Wallet className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No accounts connected
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Connect your bank accounts and brokerages to see your complete financial picture.
        </p>
        <RainbowButton 
          onClick={scrollToQuickConnect}
          data-testid="button-connect-accounts-empty-state"
        >
          Connect Accounts
        </RainbowButton>
        {hasDisconnectedAccounts && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg max-w-md mx-auto">
            <AlertCircle className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-orange-700 text-sm">
              Some previously connected accounts need to be reconnected.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Prepare data for charts - only use connected accounts with adjusted totals
  const typeBreakdown = [
    { name: 'Banking', value: adjustedTotals.bankBalance, color: COLORS.bank },
    { name: 'Debt', value: adjustedTotals.debtBalance, color: COLORS.debt },
    { name: 'Investments', value: adjustedTotals.investmentValue, color: COLORS.investment },
    { name: 'Crypto', value: adjustedTotals.cryptoValue, color: COLORS.crypto },
  ].filter(item => item.value > 0);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="h-5 w-5" />;
      case 'investment': return <TrendingUp className="h-5 w-5" />;
      case 'crypto': return <Wallet className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Total Net Worth */}
      <div className="text-center py-4">
        <div className="text-sm text-gray-500">Total Net Worth</div>
        <div className="text-3xl sm:text-4xl font-bold text-gray-900">
          {formatCurrency(adjustedTotals.totalBalance)}
        </div>
        <div className="text-xs text-gray-500">
          {`${adjustedTotals.accountCount} account${adjustedTotals.accountCount !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 justify-center">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'accounts', label: 'Accounts' }
        ].map(view => (
          <button
            key={view.key}
            onClick={() => setSelectedView(view.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === view.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview - Pie Chart */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation</h3>
            {typeBreakdown.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <defs>
                      <linearGradient id="bankingGradientModern" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="investmentGradientModern" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="cryptoGradientModern" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="debtGradientModern" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <Pie
                      data={typeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      startAngle={90}
                      endAngle={450}
                      cornerRadius={4}
                      minAngle={15}
                    >
                      {typeBreakdown.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.name === 'Banking' ? 'url(#bankingGradientModern)' :
                            entry.name === 'Debt' ? 'url(#debtGradientModern)' :
                            entry.name === 'Investments' ? 'url(#investmentGradientModern)' :
                            'url(#cryptoGradientModern)'
                          }
                          stroke="transparent"
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        color: '#111827'
                      }}
                      labelStyle={{ color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {typeBreakdown.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-gray-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">No account data available</p>
                  <p className="text-sm text-gray-500">Connect accounts to see your allocation</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Types</h3>
            <div className="space-y-4">
              {typeBreakdown.length > 0 ? (
                typeBreakdown.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type.color }}
                      ></div>
                      <span className="text-gray-900">{type.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 font-semibold">
                        {formatCurrency(type.value)}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {adjustedTotals.totalBalance > 0 ? ((type.value / adjustedTotals.totalBalance) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">No account data available</p>
                    <p className="text-sm text-gray-500">Connect accounts to see breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accounts View */}
      {selectedView === 'accounts' && (
        <div className="space-y-2">
          {connectedAccounts.map((account: any) => {
            const logoLookupName = account.provider === 'metamask' ? 'MetaMask' : 
              (account.institutionName || account.accountName);
            const { logo, bgClass, textClass } = getInstitutionLogo(logoLookupName);
            return (
              <div 
                key={account.id} 
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedAccountId(account.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-11 h-11 rounded-lg ${bgClass} ${textClass} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                    {logo}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium text-base leading-tight">
                      {account.accountName === 'Default' && account.institutionName === 'Coinbase' 
                        ? 'Coinbase' 
                        : account.accountName}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {account.type === 'credit' ? 
                        account.availableCredit ? `Avail: ${formatCurrency(account.availableCredit)}` : 'Credit' :
                        account.percentOfTotal ? `${account.percentOfTotal}%` : ''
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`text-lg font-bold text-right ${
                    account.type === 'credit' ? 'text-red-500' : 'text-green-600'
                  }`}>
                    {formatCurrency(account.balance)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })}
          
          {connectedAccounts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="text-gray-600 mb-2">No accounts connected</div>
              <div className="text-gray-500 text-sm">Connect your bank and brokerage accounts to see your portfolio</div>
            </div>
          )}
        </div>
      )}


      {/* Enhanced Account Details Dialog */}
      <AccountDetailsDialog
        accountId={selectedAccountId || ''}
        open={!!selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
        currentUserId={String(user?.id || '')}
        provider={connectedAccounts.find(acc => acc.id === selectedAccountId)?.provider || ''}
      />
    </div>
  );
}