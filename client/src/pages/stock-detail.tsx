import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { TradeModal } from "@/components/modals/trade-modal";
import { apiRequest } from "@/lib/queryClient";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface Holding {
  symbol: string;
  brokerageName: string;
  quantity: number;
  averageCost: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export function StockDetailPage() {
  const params = useParams();
  const symbol = params.symbol?.toUpperCase();
  const [, navigate] = useLocation();

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<"BUY" | "SELL">("BUY");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');
  const [tradingViewPrice, setTradingViewPrice] = useState<number | null>(null);

  // Map time periods to TradingView-supported intervals
  const getChartInterval = (period: TimePeriod): string => {
    const intervalMap: Record<TimePeriod, string> = {
      '1D': 'D',
      '1W': 'W',
      '1M': 'M',
      '3M': 'D',
      'YTD': 'D',
      '1Y': 'W',
      'ALL': 'M'
    };
    return intervalMap[period];
  };

  useEffect(() => {
    if (symbol) {
      loadStockData();
      loadHoldings();
    }
  }, [symbol]);

  // Update price when TradingView updates
  useEffect(() => {
    if (tradingViewPrice && tradingViewPrice > 0 && stockData) {
      const change = tradingViewPrice - stockData.price;
      const changePercent = (change / stockData.price) * 100;
      
      setStockData(prev => ({
        ...prev!,
        price: tradingViewPrice,
        change,
        changePercent
      }));
    }
  }, [tradingViewPrice]);

  const loadStockData = async () => {
    if (!symbol) return;

    setIsLoading(true);
    setError("");

    try {
      // Get quote from the unified endpoint that works for both connected and non-connected users
      const response = await fetch(`/api/quotes/${symbol}`);
      
      if (response.ok) {
        const data = await response.json();
        setStockData({
          symbol: data.symbol || symbol,
          name: data.name || `${symbol} Inc.`,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          volume: data.volume || 0
        });
      } else {
        // If the endpoint returns an error, show a message
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load stock data:', errorData);
        setError(errorData.error || 'Failed to load stock data');
      }
    } catch (err) {
      console.error('Failed to load stock data:', err);
      setError("Failed to load stock data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHoldings = async () => {
    if (!symbol) return;

    try {
      const response = await fetch('/api/portfolio-holdings');
      if (response.ok) {
        const data = await response.json();
        const stockHoldings = (data.holdings || [])
          .filter((h: any) => h.symbol?.toUpperCase() === symbol)
          .map((h: any) => ({
            symbol: h.symbol,
            brokerageName: h.brokerageName || 'Unknown',
            quantity: h.quantity || h.shares || 0,
            averageCost: h.averageCost || h.costBasisPerShare || 0,
            currentValue: h.currentValue || h.value || 0,
            profitLoss: h.profitLoss || h.gainLoss || 0,
            profitLossPercent: h.profitLossPercent || h.gainLossPercent || 0
          }));
        
        setHoldings(stockHoldings);
      }
    } catch (err) {
      console.error('Failed to load holdings:', err);
    }
  };

  const handleTradeClick = (action: "BUY" | "SELL") => {
    setTradeAction(action);
    setTradeModalOpen(true);
  };

  const handleTradeComplete = () => {
    loadStockData();
    loadHoldings();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <Alert variant="destructive" className="bg-red-900/20 border-red-900/50">
          <AlertDescription>{error || "Stock not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPositive = stockData.changePercent >= 0;
  const totalShares = holdings.reduce((sum, h) => sum + h.quantity, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const avgCost = totalShares > 0 ? holdings.reduce((sum, h) => sum + (h.averageCost * h.quantity), 0) / totalShares : 0;
  const totalReturn = totalValue - (avgCost * totalShares);
  const totalReturnPercent = (avgCost * totalShares) > 0 ? (totalReturn / (avgCost * totalShares)) * 100 : 0;
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/trading')}
            className="text-gray-400 hover:text-white mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Badge className="bg-slate-800/60 text-gray-300 border-slate-700" data-testid="badge-stock">
                STOCK
              </Badge>
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl font-bold" data-testid="text-symbol">{stockData.symbol}</h1>
                <span className="text-xl text-gray-400" data-testid="text-name">{stockData.name}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className={`text-lg font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`} data-testid="text-change">
                  {isPositive ? '+' : ''} ${Math.abs(stockData.change).toFixed(2)}
                </span>
                <span className={`text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`} data-testid="text-change-percent">
                  {isPositive ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-5xl font-bold mb-1" data-testid="text-price">
                ${stockData.price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400" data-testid="text-time">
                Price at {currentTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Chart Section */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="p-6">
            <div className="mb-4" style={{ height: '400px' }}>
              <TradingViewChart
                symbol={`NASDAQ:${stockData.symbol}`}
                height={400}
                theme="dark"
                interval={getChartInterval(selectedPeriod)}
                onPriceUpdate={setTradingViewPrice}
                data-testid="chart-tradingview"
              />
            </div>
            
            {/* Time Period Buttons */}
            <div className="flex items-center gap-2 justify-center" data-testid="section-time-periods">
              {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className={selectedPeriod === period 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'}
                  data-testid={`button-period-${period}`}
                >
                  {period}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Section */}
        {holdings.length > 0 && (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-metrics-title">Metrics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-gray-400" data-testid="text-avg-cost-label">Average cost</span>
                  <span className="text-white font-semibold" data-testid="text-avg-cost-value">
                    ${avgCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400" data-testid="text-total-return-label">Total return</span>
                  <div className="text-right">
                    <span className={`font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-total-return-value">
                      ${Math.abs(totalReturn).toFixed(2)} ({totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions Section */}
        {holdings.length > 0 && (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-positions-title">Positions</h2>
              <div className="space-y-3">
                {holdings.map((holding, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
                    data-testid={`position-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" data-testid={`indicator-${index}`}></div>
                      <span className="text-white font-medium" data-testid={`brokerage-${index}`}>
                        {holding.brokerageName}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm" data-testid={`shares-${index}`}>
                        {holding.quantity.toFixed(2)} shares
                      </div>
                      <div className="text-white font-semibold" data-testid={`value-${index}`}>
                        ${holding.currentValue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buy/Sell Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => handleTradeClick("BUY")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
            data-testid="button-buy"
          >
            Buy {stockData.symbol}
          </Button>
          <Button
            onClick={() => handleTradeClick("SELL")}
            variant="outline"
            className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-semibold py-6 text-lg"
            data-testid="button-sell"
          >
            Sell {stockData.symbol}
          </Button>
        </div>
      </div>

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        symbol={stockData.symbol}
        currentPrice={stockData.price}
        onTradeComplete={handleTradeComplete}
        presetAction={tradeAction}
      />
    </div>
  );
}

export default StockDetailPage;
