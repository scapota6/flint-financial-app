import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  CreditCard,
  AlertCircle,
  Unlink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getInstitutionLogo } from "@/lib/bank-logos";

interface BrokerageAccount {
  id: string;
  name: string;
  institutionName: string;
  accountNumber: string;
  type: string;
  status: string;
  syncStatus: {
    holdingsCompleted: boolean;
    holdingsLastSync?: string;
    transactionsCompleted: boolean;
    transactionsLastSync?: string;
  };
}

interface BankAccount {
  id: number;
  name: string;
  type: 'checking' | 'savings' | 'card' | 'credit';
  institutionName?: string;
}

export default function Accounts() {
  const { isAuthenticated } = useAuth();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Fetch user data to check subscription tier
  const { data: userData } = useQuery<{ subscriptionTier?: string }>({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated,
    retry: false
  });

  // Check if user has premium tier (can disconnect accounts)
  // Free, basic, and pro tiers cannot disconnect to prevent account rotation
  const canDisconnect = userData?.subscriptionTier === 'premium';

  // Fetch brokerage accounts - only when authenticated
  const { data: brokerageData, isLoading: brokeragesLoading } = useQuery({
    queryKey: ['/api/snaptrade/accounts'],
    enabled: isAuthenticated,
    select: (data: any) => {
      return data?.accounts?.map((account: any) => ({
        id: account.id,
        name: account.name,
        institutionName: account.institutionName,
        accountNumber: account.numberMasked || 'N/A',
        type: account.accountType || 'Investment',
        status: account.status || 'open',
        syncStatus: {
          holdingsCompleted: account.sync_status?.holdings?.initial_sync_completed || false,
          holdingsLastSync: account.sync_status?.holdings?.last_successful_sync,
          transactionsCompleted: account.sync_status?.transactions?.initial_sync_completed || false,
          transactionsLastSync: account.sync_status?.transactions?.last_successful_sync
        }
      })) || [];
    },
    retry: false
  });

  // Fetch bank accounts - only when authenticated
  const { data: bankData, isLoading: banksLoading } = useQuery<{ accounts: BankAccount[] }>({
    queryKey: ['/api/banks'],
    enabled: isAuthenticated,
    retry: false
  });

  const handleDisconnectAccount = async (accountId: string, type: 'brokerage' | 'bank') => {
    if (!confirm(`Are you sure you want to disconnect this ${type} account?`)) {
      return;
    }
    
    setDisconnecting(accountId);
    try {
      const endpoint = type === 'brokerage' ? `/api/accounts/disconnect` : `/api/banks/disconnect`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountId })
      });
      
      if (response.ok) {
        // Reload the page to refresh accounts
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to disconnect account: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account. Please try again.');
    } finally {
      setDisconnecting(null);
    }
  };

  const isLoading = brokeragesLoading || banksLoading;
  const brokerageAccounts: BrokerageAccount[] = brokerageData || [];
  const bankAccounts: BankAccount[] = bankData?.accounts || [];
  const hasNoAccounts = !isLoading && brokerageAccounts.length === 0 && bankAccounts.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        <div className="mb-8">
          <h1 className="h1 bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Manage Accounts
          </h1>
          <p className="text-slate-400 mt-2">
            Disconnect accounts you no longer want connected
          </p>
        </div>

        {hasNoAccounts ? (
          <Card className="border-dashed bg-slate-800/30 border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="section-title mb-2 text-white">No Accounts Connected</h3>
              <p className="text-slate-400 text-center">
                Go to the Portfolio page to view connected accounts
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="brokerages" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-700">
              <TabsTrigger 
                value="brokerages"
                className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500/50 text-slate-300"
              >
                Brokerages ({brokerageAccounts.length})
              </TabsTrigger>
              <TabsTrigger 
                value="banks"
                className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500/50 text-slate-300"
              >
                Banks & Cards ({bankAccounts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="brokerages" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : brokerageAccounts.length === 0 ? (
                <Card className="border-dashed bg-slate-800/30 border-slate-700">
                  <CardContent className="text-center py-8">
                    <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No brokerage accounts connected</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {brokerageAccounts.map((account) => {
                    const { logo, bgClass, textClass } = getInstitutionLogo(account.name);
                    
                    return (
                      <Card key={account.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center overflow-hidden hover:border-blue-500/50 transition-all duration-300">
                                {logo}
                              </div>
                              <div>
                                <CardTitle className="text-lg text-white">
                                  {account.institutionName}
                                </CardTitle>
                                <p className="text-sm text-slate-400">
                                  {account.accountNumber} • {account.type}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={account.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                                    {account.status || 'open'}
                                  </Badge>
                                  {account.syncStatus.holdingsCompleted && (
                                    <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                                      ✓ Synced
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {canDisconnect && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDisconnectAccount(account.id, 'brokerage')}
                                disabled={disconnecting === account.id}
                                className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                                data-testid={`button-disconnect-${account.id}`}
                              >
                                <Unlink className="h-4 w-4 mr-2" />
                                Disconnect
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="banks" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : bankAccounts.length === 0 ? (
                <Card className="border-dashed bg-slate-800/30 border-slate-700">
                  <CardContent className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No bank or card accounts connected</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bankAccounts.map((account) => {
                    const { logo, bgClass, textClass } = getInstitutionLogo(account.name);
                    
                    return (
                      <Card key={account.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center overflow-hidden hover:border-blue-500/50 transition-all duration-300">
                                {logo}
                              </div>
                              <div>
                                <CardTitle className="text-lg text-white">{account.name}</CardTitle>
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                                </Badge>
                              </div>
                            </div>
                            {canDisconnect && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDisconnectAccount(account.id.toString(), 'bank')}
                                disabled={disconnecting === account.id.toString()}
                                className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                                data-testid={`button-disconnect-${account.id}`}
                              >
                                <Unlink className="h-4 w-4 mr-2" />
                                Disconnect
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
