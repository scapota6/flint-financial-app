import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Account {
  id: string;
  provider: 'teller' | 'snaptrade';
  accountName: string;
  accountNumber?: string;
  balance: number;
  type: 'bank' | 'investment' | 'crypto' | 'credit';
  institution: string;
  lastUpdated: string;
  currency?: string;
  status?: 'connected' | 'disconnected' | 'expired';
  lastCheckedAt?: string;
  // Extended fields for UI
  holdings?: number;
  cash?: number;
  buyingPower?: number;
  percentOfTotal?: number;
  availableCredit?: number | null;
  amountSpent?: number | null;
}

export interface AccountsResponse {
  accounts: Account[];
  disconnected?: Array<{
    id: string;
    name: string;
    institutionName: string;
    status: string;
    lastCheckedAt: string;
  }>;
  // Backend-calculated totals (correct net worth accounting)
  totalBalance?: number;
  bankBalance?: number;
  investmentBalance?: number;
  cryptoBalance?: number;
}

/**
 * Single source of truth for all account data
 * Fetches from separate bank and brokerage endpoints for now
 * TODO: Switch to unified endpoint once all components are updated
 */
export function useAccounts() {
  return useQuery<AccountsResponse>({
    queryKey: ['/api/dashboard'],  // Use dashboard as key
    queryFn: async () => {
      // Use standard fetch for GET requests
      const dashboardResponse = await fetch('/api/dashboard', {
        credentials: 'include'
      });

      if (!dashboardResponse.ok) {
        const errorData = await dashboardResponse.json().catch(() => null);
        const error: any = new Error(errorData?.message || 'Failed to fetch accounts');
        error.status = dashboardResponse.status;
        error.responseBody = errorData;
        throw error;
      }

      const dashboardData = await dashboardResponse.json();

      // Extract all accounts and filter out disconnected ones
      const allAccounts = (dashboardData.accounts || [])
        .map((account: any) => ({
          id: account.id,
          provider: account.provider,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          balance: account.balance,
          type: account.type,
          institution: account.institution || account.provider,
          lastUpdated: account.lastUpdated,
          currency: account.currency || 'USD',
          status: account.needsReconnection ? 'disconnected' : 'connected',
          // Extended fields for UI
          holdings: account.holdings,
          cash: account.cash,
          buyingPower: account.buyingPower,
          percentOfTotal: account.percentOfTotal,
          availableCredit: account.availableCredit,
          amountSpent: account.amountSpent,
          needsReconnection: account.needsReconnection || false
        }))
        // Filter out disconnected accounts (they show as $0 and clutter the UI)
        .filter((account: any) => !account.needsReconnection);

      return {
        accounts: allAccounts,
        disconnected: undefined, // Dashboard only returns working accounts
        // Extract backend-calculated totals (correctly handles debt)
        totalBalance: dashboardData.totalBalance,
        bankBalance: dashboardData.bankBalance,
        investmentBalance: dashboardData.investmentBalance || dashboardData.investmentValue,
        cryptoBalance: dashboardData.cryptoBalance || dashboardData.cryptoValue,
      };
    },
    staleTime: 12 * 60 * 60 * 1000, // 12 hours - same as dashboard
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2
  });
}

/**
 * Hook for account health status
 */
export function useAccountHealth() {
  return useQuery({
    queryKey: ['/api/accounts/health'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes
  });
}

/**
 * Computed portfolio totals from connected accounts only
 * Uses backend-calculated totals (which correctly handle debt) + calculates debtBalance separately
 */
export function usePortfolioTotals() {
  const { data: accountsData } = useAccounts();

  if (!accountsData?.accounts) {
    return {
      totalBalance: 0,
      bankBalance: 0,
      debtBalance: 0,
      investmentValue: 0,
      cryptoValue: 0,
      accountCount: 0
    };
  }

  const connected = accountsData.accounts; // Only connected accounts are returned

  // Calculate debt balance from credit accounts (ensure positive for chart display)
  const debtBalance = connected
    .filter(account => account.type === 'credit')
    .reduce((sum, account) => sum + Math.abs(account.balance || 0), 0);

  return {
    // Use backend-calculated totals (correctly accounts for debt as negative)
    totalBalance: accountsData.totalBalance || 0,
    bankBalance: accountsData.bankBalance || 0,
    investmentValue: accountsData.investmentBalance || 0,
    cryptoValue: accountsData.cryptoBalance || 0,
    // Frontend-calculated debt for chart display
    debtBalance,
    accountCount: connected.length
  };
}