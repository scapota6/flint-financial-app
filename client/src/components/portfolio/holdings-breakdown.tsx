import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Building, DollarSign, BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';

interface Holding {
  accountId: string;
  accountName: string;
  brokerageName: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
  currency: string;
  type: string;
}

interface HoldingsSummary {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  positionCount: number;
  accountCount: number;
}

export default function HoldingsBreakdown() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/holdings'],
    queryFn: async () => {
      // Get authenticated user data first for user ID
      const userResp = await apiRequest("/api/auth/user");
      if (!userResp.ok) throw new Error("Authentication required");
      const userData = await userResp.json();
      
      const response = await apiRequest("/api/holdings", {
        headers: {
          "x-user-id": userData.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch holdings');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds (holdings aggregate)
    staleTime: 2000, // Fresh for 2 seconds
  });

  const holdings: Holding[] = data?.holdings || [];
  const summary: HoldingsSummary = data?.summary || {
    totalValue: 0,
    totalCost: 0,
    totalProfitLoss: 0,
    totalProfitLossPercent: 0,
    positionCount: 0,
    accountCount: 0,
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <BarChart3 className="h-5 w-5" />
            Holdings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 bg-gray-200" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || data?.needsConnection) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <BarChart3 className="h-5 w-5" />
            Holdings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            {data?.message || 'Connect your brokerage accounts to view holdings'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <BarChart3 className="h-5 w-5" />
            Holdings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No holdings found. Connect a brokerage account to see your positions.</p>
        </CardContent>
      </Card>
    );
  }

  // Group holdings by account
  const holdingsByAccount = holdings.reduce((acc, holding) => {
    if (!acc[holding.accountId]) {
      acc[holding.accountId] = {
        accountName: holding.accountName,
        brokerageName: holding.brokerageName,
        holdings: [],
        totalValue: 0,
        totalProfitLoss: 0,
      };
    }
    acc[holding.accountId].holdings.push(holding);
    acc[holding.accountId].totalValue += holding.currentValue;
    acc[holding.accountId].totalProfitLoss += holding.profitLoss;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Summary
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-600">
              {summary.positionCount} Positions • {summary.accountCount} Accounts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl text-gray-900">${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total P/L</p>
              <p className={`text-xl font-semibold flex items-center gap-1 ${summary.totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.totalProfitLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                ${Math.abs(summary.totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Return</p>
              <p className={`text-xl font-semibold ${summary.totalProfitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.totalProfitLossPercent >= 0 ? '+' : ''}{summary.totalProfitLossPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings by Account */}
      {Object.entries(holdingsByAccount).map(([accountId, accountData]) => (
        <Card key={accountId} className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{accountData.accountName}</h3>
                  <p className="text-sm text-gray-500">{accountData.brokerageName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Account Value</p>
                <p className="font-semibold text-gray-900">${accountData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accountData.holdings.map((holding: Holding) => (
                <div key={`${accountId}-${holding.symbol}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{holding.symbol}</h4>
                      <p className="text-sm text-gray-500">{holding.name}</p>
                    </div>
                    <Badge variant={holding.type === 'crypto' ? 'secondary' : 'default'} className="text-xs">
                      {holding.type}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-900">{holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Cost</p>
                      <p className="font-medium text-gray-900">${holding.averageCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current Price</p>
                      <p className="font-medium text-gray-900">${holding.currentPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Market Value</p>
                      <p className="font-medium text-gray-900">${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">P/L</p>
                      <div className={`font-medium ${holding.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <p className="flex items-center gap-1">
                          {holding.profitLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          ${Math.abs(holding.profitLoss).toFixed(2)}
                        </p>
                        <p className="text-xs">
                          ({holding.profitLossPercent >= 0 ? '+' : ''}{holding.profitLossPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}