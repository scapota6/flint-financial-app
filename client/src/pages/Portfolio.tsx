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
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg p-4 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.fill || data.color }}
          ></div>
          <p className="font-semibold text-white">{data.name}</p>
        </div>
        <p className="text-lg font-bold text-white mb-1">
          {formatCurrency(Math.abs(data.value))}
        </p>
        <p className="text-xs text-slate-400">
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


  // Prepare donut chart data
  const chartData = summary?.breakdown?.map((item: any) => ({
    name: item.bucket,
    value: Math.abs(item.value),
    percentage: (Math.abs(item.value) / summary.totals.netWorth) * 100,
    fill: item.bucket === 'Stocks' ? CHART_COLORS.stocks :
          item.bucket === 'Crypto' ? CHART_COLORS.crypto :
          item.bucket === 'Cash' ? CHART_COLORS.cash :
          CHART_COLORS.debt
  })) || [];

  // Show progressive loading - only show full page loading on initial load
  const isPageLoading = isLoading && !accountsData;
  
  // Initial loading state - only on first load
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-800/50 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-800/50 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-800/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent mb-4">
              No Portfolio Data
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-lg mx-auto">
              Connect your investment accounts to see your portfolio performance and holdings.
            </p>
            <Link href="/dashboard">
              <RainbowButton 
                className="text-base px-8 py-6 h-auto"
                data-testid="button-connect-accounts"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Connect Accounts
              </RainbowButton>
            </Link>
            {hasDisconnectedAccounts && (
              <div className="mt-8 p-4 bg-orange-900/20 border border-orange-700 rounded-xl max-w-md mx-auto">
                <AlertCircle className="h-5 w-5 text-orange-400 mx-auto mb-2" />
                <p className="text-sm text-orange-200">
                  Some previously connected accounts need to be reconnected to display your complete portfolio.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Use totals from portfolio summary for consistency
  const netWorth = summary?.totals?.netWorth || totals.totalBalance;
  const dayValue = summary?.performance?.dayValue || 0;
  const dayPct = summary?.performance?.dayPct || 0;
  const isPositive = dayValue >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="apple-h1 bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                Portfolio Overview
              </h1>
              <p className="apple-body text-slate-400 mt-2">
                Your complete financial picture across {totals.accountCount} connected accounts
              </p>
            </div>
          </div>
        </div>

        {/* Data freshness indicator */}
        {summary?.metadata?.dataDelayed && (
          <Alert className="mb-8 bg-slate-800/50 border-slate-700 backdrop-blur-sm rounded-xl">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="apple-caption text-slate-300">
              Some market data may be delayed. Last updated: {new Date(summary.metadata.lastUpdated).toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="apple-caption text-slate-400">
                Net Worth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="apple-h2 text-white">
                {formatCurrency(netWorth)}
              </div>
              <div className={`flex items-center mt-2 apple-caption ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                <span>{formatPercent(dayPct)} today</span>
              </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-slate-400">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Investable Assets
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-white">
              {formatCurrency(summary?.totals?.investable || 0)}
            </div>
            <p className="apple-caption text-slate-400 mt-2">
              Stocks & Crypto
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-slate-400">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash & Equivalents
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-white">
              {formatCurrency(summary?.totals?.cash || 0)}
            </div>
            <p className="apple-caption text-slate-400 mt-2">
              Available for investment
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-colors rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="apple-caption text-slate-400">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Debt
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="apple-h2 text-red-400">
              {formatCurrency(Math.abs(summary?.totals?.debt || 0))}
            </div>
            <p className="apple-caption text-slate-400 mt-2">
              Credit cards & loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Mix Donut Chart */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Asset Allocation</CardTitle>
            <CardDescription className="text-slate-400">
              Portfolio breakdown by asset class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="chart-container chart-glow relative overflow-hidden">
                {/* Animated background effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-emerald-500/10 rounded-lg blur-2xl animate-pulse"></div>
                <div className="floating-element absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="floating-element absolute bottom-0 right-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl" style={{animationDelay: '2s'}}></div>
                <div className="floating-element absolute top-1/3 right-1/4 w-16 h-16 bg-emerald-500/15 rounded-full blur-2xl" style={{animationDelay: '1s'}}></div>
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart>
                    <defs>
                      {/* 3D Effect Gradients */}
                      <radialGradient id="stocksGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#0A84FF" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0070DD" stopOpacity={0.9}/>
                      </radialGradient>
                      <radialGradient id="cryptoGrad3D" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#1e40af" stopOpacity={0.9}/>
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
                      {/* Glow filters */}
                      <filter id="pieGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge> 
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
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
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={3}
                          style={{
                            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3)) drop-shadow(0 0 20px rgba(10, 132, 255, 0.3))',
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
                        <span className="text-sm text-slate-300 font-medium">{value}</span>
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
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  </div>
                  <p className="text-slate-400">No portfolio data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white">Performance</CardTitle>
                <CardDescription className="text-slate-400">
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
            {history?.dataPoints ? (
              <div className="chart-container chart-glow relative overflow-hidden">
                {/* Dynamic background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 rounded-lg"></div>
                <div className="floating-element absolute top-0 left-1/4 w-16 h-16 bg-gradient-to-br from-blue-400/30 to-transparent rounded-full blur-xl"></div>
                <div className="floating-element absolute bottom-0 right-1/3 w-20 h-20 bg-gradient-to-tl from-cyan-400/25 to-transparent rounded-full blur-2xl" style={{animationDelay: '1.5s'}}></div>
                <div className="floating-element absolute top-1/2 left-1/2 w-12 h-12 bg-gradient-to-r from-cyan-400/20 to-transparent rounded-full blur-xl" style={{animationDelay: '3s'}}></div>
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={history.dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      {/* 3D Area Chart Gradients */}
                      <linearGradient id="areaGradient3D" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6}/>
                        <stop offset="25%" stopColor="#0A84FF" stopOpacity={0.4}/>
                        <stop offset="75%" stopColor="#0070DD" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#0055AA" stopOpacity={0.05}/>
                      </linearGradient>
                      {/* Enhanced glow effect */}
                      <filter id="areaGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                        <feOffset dx="0" dy="0" result="offsetBlur"/>
                        <feFlood floodColor="#0A84FF" floodOpacity="0.3"/>
                        <feComposite in2="offsetBlur" operator="in"/>
                        <feMerge> 
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      {/* Grid line effect */}
                      <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="40" height="40">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(10, 132, 255, 0.05)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="8 4" 
                      stroke="rgba(10, 132, 255, 0.15)" 
                      horizontal={true}
                      vertical={false}
                      className="recharts-cartesian-grid-horizontal"
                    />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      contentStyle={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0A84FF"
                      strokeWidth={4}
                      fill="url(#areaGradient3D)"
                      filter="url(#areaGlow)"
                      animationDuration={1500}
                      animationEasing="ease-out"
                      dot={{ fill: '#0A84FF', stroke: '#fff', strokeWidth: 2, r: 0 }}
                      activeDot={{ r: 8, fill: '#0A84FF', stroke: '#fff', strokeWidth: 3, filter: 'drop-shadow(0 0 10px rgba(10, 132, 255, 0.8))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <div className="w-2 h-8 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-slate-400">Loading performance data...</p>
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