import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { getMerchantLogo } from '@/lib/merchant-logos';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Play, 
  Zap, 
  Code, 
  Dumbbell,
  Building2,
  Package,
  Lock,
  Crown
} from 'lucide-react';

interface RecurringSubscription {
  id: string;
  merchantName: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: string;
  lastTransactionDate: string;
  confidence: number;
  category: string;
  accountName: string;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

interface SubscriptionData {
  subscriptions: RecurringSubscription[];
  totalMonthlySpend: number;
}

export default function RecurringSubscriptions() {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscriptions'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
  });

  // Fetch user subscription tier
  const { data: userData } = useQuery<{ subscriptionTier?: string }>({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const subscriptions = data?.subscriptions || [];
  const totalMonthlySpend = data?.totalMonthlySpend || 0;
  // Round monthly total for consistent math display
  const monthlyRounded = Math.round(totalMonthlySpend * 100) / 100;
  
  // Check if user is on Free tier
  const userTier = userData?.subscriptionTier || 'free';
  const isFreeTier = userTier === 'free';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (Math.abs(diffDays) < 7) return `${Math.abs(diffDays)} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: 'Weekly',
      monthly: 'Monthly', 
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getMonthlyEquivalent = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'Streaming': <Play className="h-4 w-4" />,
      'Utilities': <Zap className="h-4 w-4" />,
      'Software': <Code className="h-4 w-4" />,
      'Fitness': <Dumbbell className="h-4 w-4" />,
      'Financial': <Building2 className="h-4 w-4" />,
      'Other': <Package className="h-4 w-4" />
    };
    return icons[category as keyof typeof icons] || <Package className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Streaming': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Utilities': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Software': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Fitness': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Financial': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[category as keyof typeof colors] || colors.Other;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <Card className="flint-card">
        <CardHeader>
          <CardTitle>Recurring Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-700 rounded w-16 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flint-card">
        <CardHeader>
          <CardTitle>Recurring Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Unable to load subscriptions</p>
            <p className="text-sm">Connect your bank accounts to track recurring payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flint-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recurring Subscriptions</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400" data-testid="badge-active-count">
              {subscriptions.length} Active
            </Badge>
            {monthlyRounded > 0 && !isFreeTier && (
              <Badge variant="secondary" className="bg-green-600/20 text-green-400" data-testid="badge-monthly-spend">
                {formatCurrency(monthlyRounded)}/mo
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="relative">
          {/* Subscription List - Blurred for Free tier */}
          <div className={`divide-y divide-gray-800/50 ${isFreeTier ? 'blur-md pointer-events-none select-none' : ''}`}>
            {subscriptions.length > 0 ? (
              subscriptions.map((subscription) => (
                <div 
                  key={subscription.id} 
                  className="flex items-center justify-between py-4 px-2 hover:bg-white/5 transition-colors rounded-lg"
                  data-testid={`subscription-item-${subscription.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${getMerchantLogo(subscription.merchantName).bgClass}`}>
                      {getMerchantLogo(subscription.merchantName).logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-sm sm:text-base truncate">{subscription.merchantName}</div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        {getFrequencyLabel(subscription.frequency)} • {subscription.accountName.length > 20 ? subscription.accountName.substring(0, 20) + '...' : subscription.accountName}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-semibold text-white text-sm sm:text-base">
                      {formatCurrency(subscription.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {subscription.frequency !== 'monthly' 
                        ? `≈ ${formatCurrency(getMonthlyEquivalent(subscription.amount, subscription.frequency))}/mo`
                        : formatDate(subscription.nextBillingDate)
                      }
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No recurring subscriptions found</p>
                <p className="text-sm">Connect your bank accounts to automatically detect recurring payments</p>
              </div>
            )}
          </div>

          {/* Upgrade Overlay for Free Tier */}
          {isFreeTier && (
            <div className="absolute inset-0 flex items-center justify-center z-10" data-testid="upgrade-overlay">
              <div className="text-center p-6 bg-gray-900/95 rounded-lg border-2 border-blue-500/50 backdrop-blur-sm max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-blue-600/20 rounded-full">
                    <Crown className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Unlock Subscription Tracking</h3>
                <p className="text-gray-400 mb-4">
                  Upgrade to Basic, Pro, or Premium to automatically detect and track your recurring subscriptions from bank transactions, including merchant names, amounts, and billing dates.
                </p>
                <Link href="/subscribe">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-upgrade">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </Link>
                {subscriptions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    {subscriptions.length} {subscriptions.length === 1 ? 'subscription' : 'subscriptions'} detected
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Summary - Only visible for non-Free tier */}
          {subscriptions.length > 0 && !isFreeTier && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Monthly</span>
                  <span className="text-white font-semibold" data-testid="text-total-monthly">{formatCurrency(monthlyRounded)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Annual Cost</span>
                  <span className="text-white font-semibold" data-testid="text-annual-cost">{formatCurrency(monthlyRounded * 12)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data source info */}
        <div className="text-xs text-gray-500 text-center pt-4 mt-4 border-t border-gray-800">
          Analyzed from your bank & credit card transactions
        </div>
      </CardContent>
    </Card>
  );
}