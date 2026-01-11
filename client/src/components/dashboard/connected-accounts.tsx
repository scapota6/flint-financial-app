import { useState } from 'react';
import { ExternalLink, Plus, Building2, TrendingUp, Loader2, Landmark, CreditCard, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import DisconnectButton from '@/components/ui/disconnect-button';
import { AccountDetailsModal } from '@/components/ui/account-details-modal';
import SkeletonCard from '@/components/ui/skeleton-card';
import ErrorCard from '@/components/ui/error-card';
import { QuickActionsBar } from '@/components/ui/quick-actions-bar';
import { useQueryClient } from '@tanstack/react-query';

interface Account {
  id: string;
  provider: string;
  accountName: string;
  balance: string;
  lastUpdated: string;
  institutionName?: string;
  accountType?: string;
  needsReconnection?: boolean;
}

interface ConnectedAccountsProps {
  accounts: Account[];
  onConnectBank: () => void;
  onConnectBrokerage: () => void;
}

export default function ConnectedAccounts({ 
  accounts = [], 
  onConnectBank, 
  onConnectBrokerage 
}: ConnectedAccountsProps) {
  const [loadingConnect, setLoadingConnect] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleConnectBank = async () => {
    setLoadingConnect('bank');
    try {
      await onConnectBank();
    } finally {
      setLoadingConnect(null);
    }
  };

  const handleConnectBrokerage = async () => {
    setLoadingConnect('brokerage');
    try {
      await onConnectBrokerage();
    } finally {
      setLoadingConnect(null);
    }
  };

  const handleAccountDisconnected = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  };

  const handleAccountDetails = (account: Account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleRetryLoad = () => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    }, 1000);
  };

  const handleQuickBuy = () => {
    window.location.href = '/trading?action=buy';
  };

  const handleQuickSell = () => {
    window.location.href = '/trading?action=sell';
  };

  const handleTransferFunds = () => {
    window.location.href = '/transfers';
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'teller':
        return <Building2 className="h-5 w-5 text-gray-700" />;
      case 'snaptrade':
        return <TrendingUp className="h-5 w-5 text-gray-700" />;
      default:
        return <Building2 className="h-5 w-5 text-gray-500" />;
    }
  };

  const getProviderBadge = (provider: string, needsReconnection?: boolean) => {
    if (needsReconnection) {
      return <Badge variant="outline" className="border-red-400 text-red-500">Disconnected</Badge>;
    }
    switch (provider.toLowerCase()) {
      case 'teller':
        return <Badge variant="outline" className="border-gray-300 text-gray-600">Bank</Badge>;
      case 'snaptrade':
        return <Badge variant="outline" className="border-gray-300 text-gray-600">Brokerage</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-300 text-gray-600">{provider}</Badge>;
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-gray-900 font-mono">Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 mb-6">
          <Tooltip content="Connect your bank account via Teller" position="top">
            <Button 
              onClick={handleConnectBank}
              disabled={loadingConnect === 'bank'}
              className="btn-standard flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingConnect === 'bank' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Bank/Credit Card
            </Button>
          </Tooltip>
          
          <Tooltip content="Connect your brokerage account via SnapTrade" position="top">
            <Button 
              onClick={handleConnectBrokerage}
              disabled={loadingConnect === 'brokerage'}
              className="btn-standard flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingConnect === 'brokerage' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Brokerage/Crypto Wallet
            </Button>
          </Tooltip>
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {accounts.map((account) => (
              <div 
                key={account.id}
                className="relative p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                style={{ borderRadius: '16px', minWidth: '240px' }}
              >
                <div className="absolute top-3 right-3">
                  <DisconnectButton
                    accountId={account.id}
                    provider={account.provider}
                    accountName={account.accountName}
                    onDisconnected={handleAccountDisconnected}
                  />
                </div>

                <div className="flex items-center justify-between pr-12">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(account.provider)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {account.accountName === 'Default' && account.institutionName === 'Coinbase' 
                            ? 'Coinbase' 
                            : account.accountName}
                        </h3>
                        {getProviderBadge(account.provider, account.needsReconnection)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {account.institutionName || account.provider}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const balance = parseFloat(account.balance);
                      const isBalanceEmpty = !account.balance || isNaN(balance) || balance === 0;
                      if (isBalanceEmpty) {
                        return (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Syncing...</span>
                          </div>
                        );
                      }
                      return (
                        <div className="text-lg font-semibold text-gray-900">
                          ${balance.toLocaleString()}
                        </div>
                      );
                    })()}
                    {account.needsReconnection ? (
                      <Tooltip content="Reconnect account" position="top">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600 border-red-300 hover:border-red-400"
                          onClick={handleConnectBrokerage}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resync
                        </Button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="View details" position="top">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => handleAccountDetails(account)}
                        >
                          Details <Eye className="h-3 w-3 ml-1" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-gray-700">No accounts connected yet.</p>
            <p className="text-sm">Connect your bank and brokerage to get started.</p>
          </div>
        )}
      </CardContent>

      <AccountDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount ? {
          id: selectedAccount.id,
          name: selectedAccount.accountName,
          type: selectedAccount.accountType || 'bank',
          balance: parseFloat(selectedAccount.balance) || 0,
          status: selectedAccount.needsReconnection ? 'disconnected' : 'connected'
        } : null}
      />
    </Card>
  );
}
