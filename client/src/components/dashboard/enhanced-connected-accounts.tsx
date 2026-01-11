import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountDetailsModal } from "@/components/ui/account-details-modal";
import { Building2, CreditCard, Plus, Eye } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'brokerage' | 'crypto';
  balance: number;
  accountNumber?: string;
  status: 'active' | 'connecting' | 'error';
}

interface EnhancedConnectedAccountsProps {
  accounts: Account[];
  onConnectBank: () => void;
  onConnectBrokerage: () => void;
}

export function EnhancedConnectedAccounts({ accounts, onConnectBank, onConnectBrokerage }: EnhancedConnectedAccountsProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAccountDetails = (account: Account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const mockAccounts: Account[] = [
    {
      id: '1',
      name: 'Chase Checking',
      type: 'bank',
      balance: 15420.50,
      accountNumber: '****1234',
      status: 'active'
    },
    {
      id: '2', 
      name: 'Schwab Brokerage',
      type: 'brokerage',
      balance: 45780.25,
      accountNumber: '****5678',
      status: 'active'
    },
    {
      id: '3',
      name: 'Coinbase Wallet',
      type: 'crypto',
      balance: 8920.75,
      accountNumber: '****9012',
      status: 'active'
    }
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={onConnectBank}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl font-medium
              shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5 mr-2" />
            + Connect Bank/Credit Card
          </Button>
          <Button
            onClick={onConnectBrokerage}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl font-medium
              shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5 mr-2" />
            + Connect Brokerage/Crypto Wallet
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAccounts.map((account) => (
            <Card
              key={account.id}
              className="group relative bg-white border border-gray-200 hover:border-gray-300 
                rounded-xl transition-all duration-300 transform hover:scale-[1.02]
                shadow-sm hover:shadow-md
                min-w-[240px] max-w-[300px]"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                      {account.type === 'bank' ? (
                        <Building2 className="h-5 w-5 text-gray-700" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-gray-700" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{account.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={account.status === 'active' ? 'default' : 'secondary'} 
                    className={`text-xs ${account.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                  >
                    {account.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-lg font-bold text-gray-900">${account.balance.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-mono">{account.accountNumber}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAccountDetails(account)}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AccountDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount}
      />
    </>
  );
}
