import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect, memo, useMemo } from 'react';
import { getCryptoLogo } from '@/lib/crypto-logos';
import { getStockLogo } from '@/lib/stock-logos';
import { ChevronRight, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
  change24hPercent?: number;
}

interface RobinhoodHoldingsProps {
  onHoldingClick?: (symbol: string, name: string) => void;
}

const generateSparklineData = (isPositive: boolean, symbol: string, volatility: number = 0.3) => {
  const points = 20;
  const data = [];
  
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };
  
  let value = 50;
  for (let i = 0; i < points; i++) {
    const trend = isPositive ? 0.5 : -0.5;
    const change = (seededRandom(i) - 0.5 + trend * 0.3) * volatility * 10;
    value = Math.max(10, Math.min(90, value + change));
    data.push({ value });
  }
  
  if (isPositive) {
    data[points - 1].value = Math.max(data[0].value + 5, data[points - 1].value);
  } else {
    data[points - 1].value = Math.min(data[0].value - 5, data[points - 1].value);
  }
  
  return data;
};

const MiniSparkline = memo(function MiniSparkline({ 
  isPositive, 
  symbol 
}: { 
  isPositive: boolean; 
  symbol: string;
}) {
  const data = useMemo(() => generateSparklineData(isPositive, symbol), [isPositive, symbol]);
  const color = isPositive ? '#22c55e' : '#ef4444';
  
  return (
    <div className="w-16 h-8 sm:w-20 sm:h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#gradient-${symbol})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const PricePill = memo(function PricePill({ 
  price, 
  isPositive 
}: { 
  price: number; 
  isPositive: boolean;
}) {
  const formatPrice = (amount: number) => {
    if (amount >= 1000) {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (amount >= 1) {
      return `$${amount.toFixed(2)}`;
    } else {
      return `$${amount.toFixed(6)}`;
    }
  };

  return (
    <div 
      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base font-semibold ${
        isPositive 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}
      data-testid={`price-pill-${isPositive ? 'positive' : 'negative'}`}
    >
      {formatPrice(price)}
    </div>
  );
});

const HoldingRow = memo(function HoldingRow({ 
  holding, 
  onClick 
}: { 
  holding: Holding; 
  onClick?: () => void;
}) {
  const cleanSymbol = holding.symbol.replace('-USD', '').replace('-USDT', '');
  const isCrypto = holding.type?.toLowerCase().includes('crypto') || 
                   holding.symbol.includes('-USD') || 
                   holding.symbol.includes('-USDT') ||
                   ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'MATIC', 'XLM', 'ADA', 'AVAX', 'DOT'].includes(cleanSymbol.toUpperCase());
  
  // Use 24-hour price change if available, otherwise fall back to profit/loss
  const isPositive = holding.change24hPercent !== undefined 
    ? holding.change24hPercent >= 0 
    : holding.profitLoss >= 0;
  
  const formatQuantity = (qty: number) => {
    if (qty >= 1) {
      return `${qty.toFixed(2)} shares`;
    } else {
      return qty.toFixed(8);
    }
  };

  return (
    <div 
      className="flex items-center justify-between py-4 px-2 hover:bg-white/5 transition-colors cursor-pointer rounded-lg"
      onClick={onClick}
      data-testid={`holding-row-${holding.symbol}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-base sm:text-lg">
          {cleanSymbol}
        </div>
        <div className="text-xs sm:text-sm text-gray-400 truncate">
          {formatQuantity(holding.quantity)}
        </div>
      </div>
      
      <div className="flex-shrink-0 mx-2 sm:mx-4">
        <MiniSparkline isPositive={isPositive} symbol={holding.symbol} />
      </div>
      
      <div className="flex-shrink-0">
        <PricePill price={holding.currentPrice} isPositive={isPositive} />
      </div>
    </div>
  );
});

const SectionHeader = memo(function SectionHeader({ 
  title, 
  subtitle,
  onClick 
}: { 
  title: string; 
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className="flex items-center justify-between py-4 cursor-pointer group"
      onClick={onClick}
      data-testid={`section-header-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:translate-x-1 transition-transform" />
      </div>
      {subtitle && (
        <div className="flex items-center gap-1 text-gray-400 text-sm">
          <span>{subtitle}</span>
          <Info className="h-4 w-4" />
        </div>
      )}
    </div>
  );
});

const RobinhoodHoldings = memo(function RobinhoodHoldings({ 
  onHoldingClick 
}: RobinhoodHoldingsProps) {
  const queryClient = useQueryClient();

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const resp = await apiRequest("/api/dashboard");
      if (!resp.ok) throw new Error("Failed to load dashboard");
      return resp.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasSnapTradeAccounts = dashboardData?.accounts?.some((acc: any) => acc.provider === 'snaptrade') || false;
  const hasMetaMaskAccounts = dashboardData?.accounts?.some((acc: any) => acc.provider === 'metamask') || false;
  const isSnapTradeConnected = hasSnapTradeAccounts && dashboardData?.investmentBalance > 0;
  const hasAnyInvestmentAccount = isSnapTradeConnected || hasMetaMaskAccounts;

  useEffect(() => {
    if (dashboardData && !hasAnyInvestmentAccount) {
      queryClient.removeQueries({ queryKey: ['/api/portfolio-holdings'] });
    }
  }, [hasAnyInvestmentAccount, dashboardData, queryClient]);

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
      return Array.isArray(data) ? data : (data.holdings || []);
    },
    enabled: hasAnyInvestmentAccount,
    refetchInterval: hasAnyInvestmentAccount ? 5000 : false,
    staleTime: 2000,
    retry: 2,
    retryDelay: 3000,
  });

  const holdings = Array.isArray(holdingsData) ? holdingsData : [];

  const { cryptoHoldings, stockHoldings } = useMemo(() => {
    const crypto: Holding[] = [];
    const stocks: Holding[] = [];
    
    holdings.forEach(holding => {
      const cleanSymbol = holding.symbol.replace('-USD', '').replace('-USDT', '');
      const isCrypto = holding.type?.toLowerCase().includes('crypto') || 
                       holding.symbol.includes('-USD') || 
                       holding.symbol.includes('-USDT') ||
                       ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'MATIC', 'XLM', 'ADA', 'AVAX', 'DOT', 'LINK', 'UNI', 'ATOM'].includes(cleanSymbol.toUpperCase());
      
      if (isCrypto) {
        crypto.push(holding);
      } else {
        stocks.push(holding);
      }
    });
    
    crypto.sort((a, b) => b.currentValue - a.currentValue);
    stocks.sort((a, b) => b.currentValue - a.currentValue);
    
    return { cryptoHoldings: crypto, stockHoldings: stocks };
  }, [holdings]);

  if (isLoading) {
    return (
      <div className="bg-black min-h-[400px] rounded-xl p-4 sm:p-6" data-testid="holdings-loading">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex items-center justify-between py-4">
              <div className="flex-1">
                <div className="h-5 bg-gray-800 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-24"></div>
              </div>
              <div className="w-20 h-10 bg-gray-800 rounded mx-4"></div>
              <div className="w-24 h-10 bg-gray-800 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-[200px] rounded-xl p-6 flex items-center justify-center" data-testid="holdings-error">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">Unable to load holdings</p>
          <p className="text-sm">Please check your brokerage connections</p>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-black min-h-[200px] rounded-xl p-6 flex items-center justify-center" data-testid="holdings-empty">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">No holdings yet</p>
          <p className="text-sm">Connect your brokerage accounts to view your portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-xl p-4 sm:p-6" data-testid="robinhood-holdings">
      {cryptoHoldings.length > 0 && (
        <div className="mb-6">
          <SectionHeader 
            title="Crypto" 
            subtitle="Offered by Robinhood Crypto"
          />
          <div className="divide-y divide-gray-800/50">
            {cryptoHoldings.map((holding, index) => (
              <HoldingRow
                key={`crypto-${holding.brokerageName}-${holding.accountId}-${holding.symbol}-${index}`}
                holding={holding}
                onClick={() => onHoldingClick?.(holding.symbol, holding.name)}
              />
            ))}
          </div>
        </div>
      )}
      
      {stockHoldings.length > 0 && (
        <div>
          <SectionHeader title="Stocks & ETFs" />
          <div className="divide-y divide-gray-800/50">
            {stockHoldings.map((holding, index) => (
              <HoldingRow
                key={`stock-${holding.brokerageName}-${holding.accountId}-${holding.symbol}-${index}`}
                holding={holding}
                onClick={() => onHoldingClick?.(holding.symbol, holding.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default RobinhoodHoldings;
