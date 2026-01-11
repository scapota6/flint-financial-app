import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import SimpleConnectButtons from "@/components/dashboard/simple-connect-buttons";
import AccountDetailModal from "@/components/dashboard/account-detail-modal";
import AccountCard from "@/components/dashboard/account-card";
import SnapTradeConnectionAlert from "@/components/dashboard/snaptrade-connection-alert";
import { FinancialAPI } from "@/lib/financial-api";
import { apiGet } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RobinhoodHoldings from '@/components/portfolio/robinhood-holdings';
import RecurringSubscriptions from '@/components/subscriptions/recurring-subscriptions';
import MoneyMovement from '@/components/money/money-movement';
import FeatureRequestModal from "@/components/FeatureRequestModal";
import { MessageSquare } from "lucide-react";

// import TransactionHistory from '@/components/activity/transaction-history';

type DashboardResponse = {
  totalBalance?: number;
  bankBalance?: number;
  investmentBalance?: number;
  // make arrays optional to avoid runtime errors:
  positions?: any[];
  accounts?: any[];
  subscriptionTier?: string;
  isAdmin?: boolean;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [featureRequestModalOpen, setFeatureRequestModalOpen] = useState(false);

  // Fetch dashboard data with robust error handling
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardResponse>('/api/dashboard'),
    retry: 1,              // don't loop forever on shape issues
    staleTime: 12 * 60 * 60 * 1000, // 12 hours - data considered fresh for 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache for 24 hours
    refetchInterval: false, // Don't auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when connection restored
  });

  const totals = {
    total: data?.totalBalance ?? 0,
    bank: data?.bankBalance ?? 0,
    invest: data?.investmentBalance ?? 0,
  };

  // Render a soft empty state if arrays are missing:
  const accounts = data?.accounts ?? [];
  const positions = data?.positions ?? [];

  // Create dashboardData object for compatibility with existing components
  const dashboardData = {
    ...data,
    totalBalance: totals.total,
    bankBalance: totals.bank,
    investmentBalance: totals.invest,
    accounts,
    positions
  };

  // Log user login
  useEffect(() => {
    FinancialAPI.logLogin().catch(console.error);
  }, []);

  // Handle scrolling to hash anchor (e.g., #quick-connect-section)
  useEffect(() => {
    if (window.location.hash) {
      const element = document.querySelector(window.location.hash);
      if (element) {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [isLoading]); // Run when loading completes

  const handleAccountDetail = (account: any) => {
    setSelectedAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleAddToWatchlist = async (symbol: string, name: string) => {
    try {
      await FinancialAPI.addToWatchlist(symbol, name, 'stock');
      toast({
        title: "Added to Watchlist",
        description: `${symbol} has been added to your watchlist.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTradeSymbol = (symbol: string, name: string) => {
    // Navigate to trade page with symbol
    window.location.href = `/trading?symbol=${symbol}`;
  };

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Session Expired",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F2ED]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
          {/* Dashboard Header Skeleton */}
          <div className="mb-8" data-testid="skeleton-dashboard-header-0">
            <Skeleton className="h-8 w-64 mb-2 bg-gray-200" data-testid="skeleton-title-0" />
            <Skeleton className="h-4 w-96 bg-gray-200" data-testid="skeleton-subtitle-0" />
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" data-testid="skeleton-summary-grid-0">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flint-card" data-testid={`skeleton-summary-card-${i}`}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24 mb-2" data-testid={`skeleton-summary-label-${i}`} />
                  <Skeleton className="h-8 w-32" data-testid={`skeleton-summary-value-${i}`} />
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Portfolio Holdings Section Skeleton */}
          <div className="mt-12" data-testid="skeleton-holdings-section-0">
            <Skeleton className="h-6 w-48 mb-6" data-testid="skeleton-holdings-title-0" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="skeleton-holdings-grid-0">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="flint-card" data-testid={`skeleton-holding-card-${i}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-lg" data-testid={`skeleton-holding-logo-${i}`} />
                        <div>
                          <Skeleton className="h-5 w-32 mb-2" data-testid={`skeleton-holding-symbol-${i}`} />
                          <Skeleton className="h-4 w-24" data-testid={`skeleton-holding-name-${i}`} />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" data-testid={`skeleton-holding-badge-${i}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24 mb-2" data-testid={`skeleton-holding-shares-${i}`} />
                    <Skeleton className="h-8 w-32 mb-2" data-testid={`skeleton-holding-value-${i}`} />
                    <Skeleton className="h-4 w-full" data-testid={`skeleton-holding-footer-${i}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Subscriptions Section Skeleton */}
          <div className="mt-12" data-testid="skeleton-subscriptions-section-0">
            <Skeleton className="h-6 w-56 mb-6" data-testid="skeleton-subscriptions-title-0" />
            <Card className="flint-card" data-testid="skeleton-subscriptions-card-0">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between" data-testid={`skeleton-subscription-item-${i}`}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" data-testid={`skeleton-subscription-icon-${i}`} />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" data-testid={`skeleton-subscription-name-${i}`} />
                          <Skeleton className="h-3 w-24" data-testid={`skeleton-subscription-date-${i}`} />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16" data-testid={`skeleton-subscription-amount-${i}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Money Movement Section Skeleton */}
          <div className="mt-12" data-testid="skeleton-money-section-0">
            <Skeleton className="h-6 w-48 mb-6" data-testid="skeleton-money-title-0" />
            <Card className="flint-card" data-testid="skeleton-money-card-0">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between" data-testid={`skeleton-transaction-item-${i}`}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" data-testid={`skeleton-transaction-icon-${i}`} />
                        <div>
                          <Skeleton className="h-4 w-40 mb-1" data-testid={`skeleton-transaction-desc-${i}`} />
                          <Skeleton className="h-3 w-28" data-testid={`skeleton-transaction-date-${i}`} />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" data-testid={`skeleton-transaction-amount-${i}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connect Buttons Section Skeleton */}
          <div className="mt-12" data-testid="skeleton-connect-section-0">
            <Skeleton className="h-6 w-64 mb-6" data-testid="skeleton-connect-title-0" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-48" data-testid="skeleton-connect-button-1" />
              <Skeleton className="h-12 w-48" data-testid="skeleton-connect-button-2" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F4F2ED]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
          <div className="text-center py-12">
            <h2 className="font-serif text-2xl mb-4 text-gray-900">Error Loading Dashboard</h2>
            <p className="text-gray-600">Please try refreshing the page</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2ED]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl mb-2 text-gray-900">
            Financial Dashboard
          </h2>
          <p className="text-sm text-gray-600">Unified view of your total net worth across all accounts</p>
        </div>

        {/* Unified Dashboard - Real API Data Only */}
        <UnifiedDashboard />

        {/* Portfolio Holdings Section - Robinhood Style */}
        <div className="mt-12">
          <h3 className="apple-h3 mb-6">Portfolio Holdings</h3>
          <RobinhoodHoldings onHoldingClick={handleAddToWatchlist} />
        </div>

        {/* Recurring Subscriptions Section */}
        <div className="mt-12">
          <RecurringSubscriptions />
        </div>

        {/* Money Movement Section */}
        <div className="mt-12">
          <MoneyMovement />
        </div>

        {/* Connection Options */}
        <div id="quick-connect-section" className="mt-12">
          <SimpleConnectButtons 
            accounts={dashboardData?.accounts || []} 
            userTier={dashboardData?.subscriptionTier || "free"}
            isAdmin={dashboardData?.isAdmin || false}
          />
        </div>
      </main>

      {/* Account Detail Modal */}
      <AccountDetailModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        account={selectedAccount}
      />

      {/* Floating Feature Request Button */}
      <button
        onClick={() => setFeatureRequestModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2 group"
        data-testid="button-feature-request-floating-dashboard"
        aria-label="Request a feature"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="hidden group-hover:inline-block pr-2 font-medium">Request Feature</span>
      </button>

      <FeatureRequestModal 
        open={featureRequestModalOpen}
        onOpenChange={setFeatureRequestModalOpen}
      />
    </div>
  );
}