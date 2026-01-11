import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BankAccountModal } from "@/components/banking/bank-account-modal";
import { ErrorRetryCard } from "@/components/ui/error-retry-card";
import { 
  Building, 
  CreditCard, 
  Eye, 
  Plus, 
  Wallet,
  TrendingUp,
  Activity
} from "lucide-react";

export function BankAccountsSection() {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: bankAccounts = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['/api/banking/accounts'],
    retry: false
  });

  const handleViewDetails = (account: any) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
  };

  const totalBankBalance = bankAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0);

  if (error) {
    return (
      <ErrorRetryCard 
        title="Failed to load bank accounts"
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm group hover:border-gray-300 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-gray-900 font-mono flex items-center gap-2">
            <Building className="h-5 w-5 text-gray-700 group-hover:scale-110 transition-transform duration-200" />
            Connected Bank Accounts
            <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
              {bankAccounts.length} {bankAccounts.length === 1 ? 'account' : 'accounts'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              Total Balance: <span className="text-gray-900 font-medium">${totalBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((account: any, index: number) => (
                <div 
                  key={account.id || index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 
                    hover:bg-gray-100 transition-all duration-200 group/item border border-gray-100
                    hover:border-gray-200"
                >
                  <div className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                    <Building className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-medium">{account.name || 'Bank Account'}</p>
                      <Badge variant="outline" className="text-xs py-0 px-1 border-gray-300 text-gray-600">
                        {account.type || 'checking'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{account.institution?.name || 'Bank'}</span>
                      <span>****{account.mask || '0000'}</span>
                      <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                        Connected
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-semibold">
                      ${(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(account)}
                      className="mt-1 h-7 text-xs border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2 text-gray-700">No bank accounts connected</p>
              <p className="text-sm mb-4">Connect your bank accounts to see balances and transactions</p>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Plus className="h-4 w-4 mr-2" />
                Connect Bank Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BankAccountModal
        account={selectedAccount}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
