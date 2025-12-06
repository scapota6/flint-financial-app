import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { getUserEmailOptional } from '@/lib/userEmail';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { getCryptoLogo } from '@/lib/crypto-logos';
import { getStockLogo, isStockSymbol } from '@/lib/stock-logos';

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

interface RealTimeHoldingsProps {
  maxItems?: number;
  showAccountProvider?: boolean;
  onHoldingClick?: (symbol: string, name: string) => void;
}

const RealTimeHoldings = memo(function RealTimeHoldings({ 
  maxItems = 20, 
  showAccountProvider = true,
  onHoldingClick 
}: RealTimeHoldingsProps) {
  const [sortBy, setSortBy] = useState<'value' | 'gainloss' | 'symbol'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  // Check SnapTrade connection status - use same queryKey as dashboard page
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const resp = await apiRequest("/api/dashboard");
      if (!resp.ok) throw new Error("Failed to load dashboard");
      return resp.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if user has any investment/crypto accounts
  const hasSnapTradeAccounts = dashboardData?.accounts?.some((acc: any) => acc.provider === 'snaptrade') || false;
  const hasMetaMaskAccounts = dashboardData?.accounts?.some((acc: any) => acc.provider === 'metamask') || false;
  const isSnapTradeConnected = hasSnapTradeAccounts && dashboardData?.investmentBalance > 0;
  const hasAnyInvestmentAccounts = isSnapTradeConnected || hasMetaMaskAccounts;

  // Clear holdings cache when all investment accounts disconnect
  useEffect(() => {
    if (dashboardData && !hasAnyInvestmentAccounts) {
      queryClient.removeQueries({ queryKey: ['/api/portfolio-holdings'] });
    }
  }, [hasAnyInvestmentAccounts, dashboardData, queryClient]);

  // Fetch user's holdings with real-time data - when SnapTrade or MetaMask is connected
  const { data: holdingsData = [], isLoading, error } = useQuery<Holding[]>({
    queryKey: ['/api/portfolio-holdings'],
    queryFn: async () => {
      const resp = await fetch("/api/portfolio-holdings", {
        credentials: "include",
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || "Failed to load holdings");
      }
      const data = await resp.json();
      // Handle both direct array and object with holdings property
      return Array.isArray(data) ? data : (data.holdings || []);
    },
    enabled: hasAnyInvestmentAccounts, // Fetch when SnapTrade OR MetaMask is connected
    refetchInterval: hasAnyInvestmentAccounts ? 5000 : false, // Refresh every 5 seconds
    staleTime: 2000, // Fresh for 2 seconds
    retry: 2, // Only retry twice on failure
    retryDelay: 3000, // Wait 3 seconds between retries
  });

  const holdings = Array.isArray(holdingsData) ? holdingsData : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getHoldingLogo = (symbol: string, name: string, type: string) => {
    // Clean symbol for crypto (remove -USD suffix)
    const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '');
    
    // Determine if it's crypto or stock
    const isCrypto = type?.toLowerCase().includes('crypto') || 
                     symbol.includes('-USD') || 
                     symbol.includes('-USDT') ||
                     ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'MATIC', 'XLM'].includes(cleanSymbol.toUpperCase());
    
    if (isCrypto) {
      return getCryptoLogo(cleanSymbol, name);
    } else {
      return getStockLogo(symbol, name);
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'value':
        aValue = a.currentValue;
        bValue = b.currentValue;
        break;
      case 'gainloss':
        aValue = a.profitLossPercent;
        bValue = b.profitLossPercent;
        break;
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      default:
        aValue = a.currentValue;
        bValue = b.currentValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, holding) => sum + holding.profitLoss, 0);
  const totalGainLossPct = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="flint-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Portfolio Holdings</span>
            <Badge variant="secondary">Real-Time</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-700 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-700 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-16"></div>
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
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-400">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Failed to load holdings</p>
            <p className="text-sm">Check your brokerage connections</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flint-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Portfolio Holdings</span>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-600/20 text-green-400">
              Live Prices
            </Badge>
            <Badge variant="outline" className="text-gray-400">
              {holdings.length} positions
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Portfolio Summary */}
        {holdings.length > 0 && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Total Value</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(totalValue)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Gain/Loss</div>
              <div className={`text-xl font-bold flex items-center ${
                totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalGainLoss >= 0 ? 
                  <TrendingUp className="h-5 w-5 mr-1" /> : 
                  <TrendingDown className="h-5 w-5 mr-1" />
                }
                {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPct)})
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        {holdings.length > 0 && (
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="value">Sort by Value</option>
              <option value="gainloss">Sort by Gain/Loss</option>
              <option value="symbol">Sort by Symbol</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:bg-gray-700"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        {/* Holdings List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedHoldings.slice(0, maxItems).map((holding) => (
            <div 
              key={`${holding.accountId}-${holding.symbol}`} 
              className="group flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => onHoldingClick?.(holding.symbol, holding.name)}
            >
              <div className="flex items-center space-x-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${getHoldingLogo(holding.symbol, holding.name, holding.type).bgClass}`}>
                  {getHoldingLogo(holding.symbol, holding.name, holding.type).logo}
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center space-x-2">
                    <span>{holding.symbol}</span>
                    {showAccountProvider && holding.brokerageName && (
                      <Badge variant="secondary" className="text-xs">
                        {holding.brokerageName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {holding.quantity.toFixed(4)} shares @ {formatCurrency(holding.averageCost)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-white">
                  {formatCurrency(holding.currentValue)}
                </div>
                <div className="text-sm text-gray-400">
                  {formatCurrency(holding.currentPrice)} current
                </div>
                <div className={`text-sm flex items-center justify-end ${
                  holding.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {holding.profitLoss >= 0 ? 
                    <TrendingUp className="h-3 w-3 mr-1" /> : 
                    <TrendingDown className="h-3 w-3 mr-1" />
                  }
                  {formatCurrency(holding.profitLoss)} ({formatPercent(holding.profitLossPercent)})
                </div>
              </div>
            </div>
          ))}
          
          {holdings.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No holdings found</p>
              <p className="text-sm">Connect your brokerage accounts to view your portfolio</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default RealTimeHoldings;