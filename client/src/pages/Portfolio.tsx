import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useAccounts, usePortfolioTotals } from '@/hooks/useAccounts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Wallet,
  CreditCard,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { queryClient } from "@/lib/queryClient";

// Type definitions
interface PortfolioSummary {
  totals: {
    netWorth: number;
    investable: number;
    cash: number;
    debt: number;
  };
  breakdown: Array<{
    bucket: string;
    value: number;
  }>;
  performance: {
    dayPct: number;
    dayValue: number;
    ytdPct: number;
    ytdValue: number;
  };
  metadata: {
    accountCount: number;
    lastUpdated: string;
    currency: string;
    dataDelayed: boolean;
  };
}

interface PortfolioHistory {
  period: string;
  dataPoints: Array<{
    timestamp: string;
    value: number;
  }>;
  currency: string;
}

// Color palette for charts
const CHART_COLORS = {
  stocks: "#0A84FF",  // Apple Blue
  crypto: "#f59e0b",  // Amber
  cash: "#10b981",    // Emerald
  debt: "#ef4444"     // Red
};

// Format currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage
const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Enhanced custom tooltip for donut chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.fill || data.color }}
          ></div>
          <p className="font-semibold text-gray-900">{data.name}</p>
        </div>
        <p className="text-lg font-bold text-gray-900 mb-1">
          {formatCurrency(Math.abs(data.value))}
        </p>
        <p className="text-xs text-gray-600">
          {data.payload.percentage.toFixed(1)}% of total portfolio
        </p>
      </div>
    );
  }
  return null;
};

export default function Portfolio() {
  const [selectedPeriod, setSelectedPeriod] = useState('1D');

  // Use unified accounts and portfolio totals
  const { data: accountsData, isLoading, error } = useAccounts();
  const totals = usePortfolioTotals();
  
  // Connected accounts only
  const connectedAccounts = accountsData?.accounts || [];
  const hasDisconnectedAccounts = accountsData?.disconnected && accountsData.disconnected.length > 0;
  const isEmptyState = connectedAccounts.length === 0 && !isLoading;
  
  // Fetch portfolio summary for additional data - load in parallel, don't wait for accounts
  const { data: summary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ['/api/portfolio/summary'],
    refetchInterval: 2000, // Refresh every 2 seconds for live data
    staleTime: 1000 // Fresh for 1 second
  });

  // Fetch portfolio history for chart - load in parallel
  const { data: history, isLoading: historyLoading } = useQuery<PortfolioHistory>({
    queryKey: ['/api/portfolio/history', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/history?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio history');
      }
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live chart updates
    staleTime: 3000 // Fresh for 3 seconds
  });



  // Show progressive loading - only show full page loading on initial load
  const isPageLoading = isLoading && !accountsData;
  
  // Initial loading state - only on first load
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#F4F2ED]">
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 bg-[#F4F2ED]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load portfolio data. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Empty state when no accounts are connected
  if (isEmptyState) {
    return (
      <div className="min-h-screen bg-[#F4F2ED] flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-gray-700" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              No Portfolio Data
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
              Connect your investment accounts to see your portfolio performance and holdings.
            </p>
            <Link href="/dashboard#quick-connect-section">
              <RainbowButton 
                className="text-base px-8 py-6 h-auto"
                data-testid="button-connect-accounts"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Connect Accounts
              </RainbowButton>
            </Link>
            {hasDisconnectedAccounts && (
              <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg max-w-md mx-auto">
                <AlertCircle className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-orange-700">
                  Some previously connected accounts need to be reconnected to display your complete portfolio.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Use dashboard-derived totals (from usePortfolioTotals) as primary source
  // Portfolio summary API can be unreliable, so prioritize the reliable dashboard data
  const netWorth = totals.totalBalance || summary?.totals?.netWorth || 0;
  const bankBalance = totals.bankBalance || 0;
  const investmentValue = totals.investmentValue || summary?.totals?.investable || 0;
  const cryptoValue = totals.cryptoValue || 0;
  const debtBalance = totals.debtBalance || Math.abs(summary?.totals?.debt || 0);
  
  // Performance data from summary (when available)
  const dayValue = summary?.performance?.dayValue || 0;
  const dayPct = summary?.performance?.dayPct || 0;
  const isPositive = dayValue >= 0;

  // Prepare donut chart data - use dashboard-derived totals for reliability
  // For pie chart percentages, use sum of all category magnitudes (not net worth)
  const totalMagnitude = bankBalance + investmentValue + cryptoValue + debtBalance || 1;
  
  const chartDataFromDashboard: Array<{name: string; value: number; percentage: number; fill: string}> = [];
  
  if (investmentValue > 0) {
    chartDataFromDashboard.push({
      name: 'Stocks',
      value: investmentValue,
      percentage: (investmentValue / totalMagnitude) * 100,
      fill: CHART_COLORS.stocks
    });
  }
  if (cryptoValue > 0) {
    chartDataFromDashboard.push({
      name: 'Crypto',
      value: cryptoValue,
      percentage: (cryptoValue / totalMagnitude) * 100,
      fill: CHART_COLORS.crypto
    });
  }
  if (bankBalance > 0) {
    chartDataFromDashboard.push({
      name: 'Cash',
      value: bankBalance,
      percentage: (bankBalance / totalMagnitude) * 100,
      fill: CHART_COLORS.cash
    });
  }
  if (debtBalance > 0) {
    chartDataFromDashboard.push({
      name: 'Debt',
      value: debtBalance,
      percentage: (debtBalance / totalMagnitude) * 100,
      fill: CHART_COLORS.debt
    });
  }
  
  // Use dashboard data as primary, fallback to summary API if dashboard empty
  const chartData = chartDataFromDashboard.length > 0 
    ? chartDataFromDashboard 
    : (summary?.breakdown?.map((item: any) => ({
        name: item.bucket,
        value: Math.abs(item.value),
        percentage: (Math.abs(item.value) / (summary.totals.netWorth || 1)) * 100,
        fill: item.bucket === 'Stocks' ? CHART_COLORS.stocks :
              item.bucket === 'Crypto' ? CHART_COLORS.crypto :
              item.bucket === 'Cash' ? CHART_COLORS.cash :
              CHART_COLORS.debt
      })) || []);

  return (
    <div className="min-h-screen bg-[#F4F2ED]">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="apple-h1 text-gray-900">
                Portfolio Overview
              </h1>
              <p className="apple-body text-gray-600 mt-2">
                Your complete financial picture across {totals.accountCount} connected accounts
              </p>
            </div>
          </div>
        </div>

        {/* Data freshness indicator */}
        {summary?.metadata?.dataDelayed && (
          <Alert className="mb-8 bg-white border-gray-200 rounded-lg shadow-sm">
            <Info className="h-4 w-4 text-gray-700" />
            <AlertDescription className="apple-caption text-gray-600">
              Some market data may be delayed. Last updated: {new Date(summary.metadata.lastUpdated).toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow transition-shadow rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="apple-caption text-gray-600">
                Net Worth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="apple-h2 text-gray-900">
                {formatCurrency(netWorth)}
              </div>
              <div className={`flex items-center mt-2 apple-caption ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                <span>{formatPercent(dayPct)} today</span>
              </div>
            </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow transition-shadow rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-gray-600">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Investable Assets
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-gray-900">
              {formatCurrency(investmentValue + cryptoValue)}
            </div>
            <p className="apple-caption text-gray-600 mt-2">
              Stocks & Crypto
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow transition-shadow rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-gray-600">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash & Bank
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-gray-900">
              {formatCurrency(bankBalance)}
            </div>
            <p className="apple-caption text-gray-600 mt-2">
              Checking & Savings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow transition-shadow rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-gray-600">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Debt
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-red-600">
              {formatCurrency(debtBalance)}
            </div>
            <p className="apple-caption text-gray-600 mt-2">
              Credit cards & loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Mix Donut Chart */}
        <Card className="bg-white border-gray-200 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">Asset Allocation</CardTitle>
            <CardDescription className="text-gray-600">
              Portfolio breakdown by asset class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="relative overflow-hidden">
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart>
                    <defs>
                      <radialGradient id="stocksGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#0A84FF" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0070DD" stopOpacity={0.9}/>
                      </radialGradient>
                      <radialGradient id="cryptoGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.9}/>
                      </radialGradient>
                      <radialGradient id="cashGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.9}/>
                      </radialGradient>
                      <radialGradient id="debtGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.9}/>
                      </radialGradient>
                    </defs>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="47%"
                      innerRadius={70}
                      outerRadius={140}
                      paddingAngle={6}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      startAngle={90}
                      endAngle={450}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Stocks' ? 'url(#stocksGrad3D)' :
                                entry.name === 'Crypto' ? 'url(#cryptoGrad3D)' :
                                entry.name === 'Cash' ? 'url(#cashGrad3D)' :
                                'url(#debtGrad3D)'}
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth={2}
                          style={{
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      iconType="circle"
                      formatter={(value: string) => (
                        <span className="text-sm text-gray-600 font-medium">{value}</span>
                      )}
                      wrapperStyle={{
                        paddingTop: '20px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                  </div>
                  <p className="text-gray-600">No portfolio data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="bg-white border-gray-200 shadow-sm rounded-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-gray-900">Performance</CardTitle>
                <CardDescription className="text-gray-600">
                  Portfolio value over time
                </CardDescription>
              </div>
              <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <TabsList className="grid grid-cols-5 w-[200px]">
                  <TabsTrigger value="1D">1D</TabsTrigger>
                  <TabsTrigger value="1W">1W</TabsTrigger>
                  <TabsTrigger value="1M">1M</TabsTrigger>
                  <TabsTrigger value="3M">3M</TabsTrigger>
                  <TabsTrigger value="1Y">1Y</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {history?.dataPoints && history.dataPoints.length >= 2 ? (
              <div className="relative overflow-hidden">
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={history.dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="areaGradient3D" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.3}/>
                        <stop offset="50%" stopColor="#0A84FF" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e5e7eb" 
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0A84FF"
                      strokeWidth={2}
                      fill="url(#areaGradient3D)"
                      animationDuration={1500}
                      animationEasing="ease-out"
                      dot={{ fill: '#0A84FF', stroke: '#fff', strokeWidth: 2, r: 0 }}
                      activeDot={{ r: 6, fill: '#0A84FF', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : historyLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="w-2 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-gray-600">Loading performance data...</p>
                </div>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Not enough data for chart</p>
                  <p className="text-gray-500 text-sm mt-1">Performance history will appear as your portfolio updates</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
