import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SmoothLineChart from '@/components/charts/smooth-line-chart';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockDetailViewProps {
  symbol: string;
}

interface Position {
  brokerage: string;
  shares: number;
  value: number;
}

export default function StockDetailView({ symbol }: StockDetailViewProps) {
  const { data: quote } = useQuery({
    queryKey: [`/api/quotes/${symbol}`],
    refetchInterval: 5000,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio-holdings'],
  });

  const price = (quote as any)?.price || 0;
  const change = (quote as any)?.change || 0;
  const changePercent = (quote as any)?.changePercent || 0;
  const isPositive = change >= 0;

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const holdings = (portfolioData as any)?.holdings || [];
  const symbolHoldings = holdings.filter((h: any) => 
    h.symbol?.toUpperCase() === symbol.toUpperCase()
  );

  // Aggregate metrics across all holdings for this symbol
  const totalShares = symbolHoldings.reduce((sum: number, h: any) => sum + (h.quantity || 0), 0);
  const totalCost = symbolHoldings.reduce((sum: number, h: any) => 
    sum + ((h.averagePurchasePrice || 0) * (h.quantity || 0)), 0
  );
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const currentValue = totalShares * price;
  const totalReturn = currentValue - totalCost;
  const totalReturnPercent = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;

  // Create positions array from all holdings
  const positions: Position[] = symbolHoldings.map((h: any) => ({
    brokerage: h.accountName || h.provider || 'Investment Account',
    shares: h.quantity || 0,
    value: (h.quantity || 0) * price
  }));

  return (
    <div 
      className="w-full bg-[#0B0D11] text-[#F2F4F6] p-8 rounded-2xl"
      style={{
        background: 'rgba(24, 27, 31, 0.55)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      data-testid="stock-detail-view"
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className="border-[#A7ADBA]/30 text-[#A7ADBA] text-xs px-3 py-1"
            data-testid="stock-badge"
          >
            STOCK
          </Badge>
          <div>
            <h2 className="text-3xl font-bold text-[#F2F4F6]" data-testid="stock-symbol">
              {symbol.toUpperCase()}
            </h2>
            <p className="text-[#A7ADBA] text-sm mt-1" data-testid="company-name">
              {symbol} Inc
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-3 mb-2">
            <span 
              className={`flex items-center gap-1 text-sm font-medium ${
                isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'
              }`}
              data-testid="price-change"
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? '+' : ''}${Math.abs(change).toFixed(2)}
            </span>
            <span 
              className={`text-sm font-medium ${
                isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'
              }`}
              data-testid="price-change-percent"
            >
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-4xl font-bold text-[#F2F4F6]" data-testid="current-price">
            ${price.toFixed(2)}
          </div>
          <p className="text-[#A7ADBA] text-sm mt-1" data-testid="price-timestamp">
            Price at {currentTime}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-8">
        <SmoothLineChart symbol={symbol} height={300} />
      </div>

      <Separator className="bg-white/10 mb-8" />

      {/* Metrics Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-[#F2F4F6] mb-4" data-testid="metrics-title">
          Metrics
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#A7ADBA]">Average cost</span>
            <span className="text-[#F2F4F6] font-medium" data-testid="average-cost">
              ${avgCost.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A7ADBA]">Total return</span>
            <span 
              className={`font-medium ${totalReturn >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}
              data-testid="total-return"
            >
              ${totalReturn.toFixed(2)} ({totalReturnPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10 mb-8" />

      {/* Positions Section */}
      <div>
        <h3 className="text-xl font-semibold text-[#F2F4F6] mb-4" data-testid="positions-title">
          Positions
        </h3>
        <div className="space-y-3">
          {positions.length > 0 ? (
            positions.map((position, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3"
                data-testid={`position-${index}`}
              >
                <div className="w-3 h-3 rounded-full bg-[#34C759]" />
                <span className="text-[#F2F4F6] font-medium">{position.brokerage}</span>
                <span className="text-[#A7ADBA]">•</span>
                <span className="text-[#A7ADBA]">{position.shares} shares</span>
                <span className="text-[#A7ADBA]">•</span>
                <span className="text-[#F2F4F6] font-medium">${position.value.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3" data-testid="position-0">
              <div className="w-3 h-3 rounded-full bg-[#34C759]" />
              <span className="text-[#F2F4F6] font-medium">Robinhood</span>
              <span className="text-[#A7ADBA]">•</span>
              <span className="text-[#A7ADBA]">2.87 shares</span>
              <span className="text-[#A7ADBA]">•</span>
              <span className="text-[#F2F4F6] font-medium">${(price * 2.87).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
