import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useState } from 'react';
import { apiGet } from '@/lib/queryClient';
import { getMerchantLogo } from '@/lib/merchant-logos';

interface MoneySource {
  name: string;
  amount: number;
}

interface MoneyMovementData {
  month: string;
  moneyIn: number;
  moneyOut: number;
  topSources: MoneySource[];
  topSpend: MoneySource[];
  threeMonthAverage: {
    moneyIn: number;
    moneyOut: number;
  };
}

export default function MoneyMovement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data, isLoading } = useQuery<MoneyMovementData>({
    queryKey: ['/api/teller/money-movement', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () => apiGet(`/api/teller/money-movement?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Money movement</h3>
          <div className="h-10 bg-gray-800 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flint-card">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-24 mb-4"></div>
                <div className="h-10 bg-gray-700 rounded w-40 mb-6"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flint-card">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-24 mb-4"></div>
                <div className="h-10 bg-gray-700 rounded w-40 mb-6"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="money-movement-section">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Money movement</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="text-gray-400 hover:text-white"
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-white font-medium min-w-[100px] text-center" data-testid="text-current-month">
            {monthName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="text-gray-400 hover:text-white"
            data-testid="button-next-month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Money In Card */}
        <Card className="flint-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm text-gray-400">Money in</h4>
            </div>
            <div className="text-2xl font-bold text-green-400 mb-6" data-testid="text-money-in">
              {formatCurrency(data?.moneyIn || 0)}
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Top sources</p>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {data?.topSources && data.topSources.length > 0 ? (
                  data.topSources.map((source, index) => {
                    const { logo, bgClass } = getMerchantLogo(source.name);
                    return (
                      <div key={index} className="flex items-center justify-between" data-testid={`source-${index}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center`}>
                            {logo}
                          </div>
                          <span className="text-white">{source.name}</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(source.amount)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No sources for this month</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Last 3 months average</p>
              <p className="text-lg font-semibold text-white" data-testid="text-avg-money-in">
                {formatShortCurrency(data?.threeMonthAverage?.moneyIn || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Money Out Card */}
        <Card className="flint-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm text-gray-400">Money out</h4>
              <Info className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-red-400 mb-6" data-testid="text-money-out">
              −{formatCurrency(data?.moneyOut || 0)}
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Top spend</p>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {data?.topSpend && data.topSpend.length > 0 ? (
                  data.topSpend.map((spend, index) => {
                    const { logo, bgClass } = getMerchantLogo(spend.name);
                    return (
                      <div key={index} className="flex items-center justify-between" data-testid={`spend-${index}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center`}>
                            {logo}
                          </div>
                          <span className="text-white">{spend.name}</span>
                        </div>
                        <span className="text-white font-medium">−{formatCurrency(spend.amount)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No spending for this month</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Last 3 months average</p>
              <p className="text-lg font-semibold text-white" data-testid="text-avg-money-out">
                −{formatShortCurrency(data?.threeMonthAverage?.moneyOut || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
