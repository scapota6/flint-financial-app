import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';

interface SmoothLineChartProps {
  symbol: string;
  height?: number;
  showTimePeriodSelector?: boolean;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleResponse {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  source: string;
}

// Helper function to convert time periods to API timeframe format
const periodToTimeframe = (period: TimePeriod): string => {
  const mapping: Record<TimePeriod, string> = {
    '1D': '1D',
    '1W': '1W',
    '1M': '1M',
    '3M': '3M',
    'YTD': '1Y', // Approximate YTD with 1 year
    '1Y': '1Y',
    'ALL': '5Y'
  };
  return mapping[period];
};

export default function SmoothLineChart({ 
  symbol, 
  height = 300,
  showTimePeriodSelector = true 
}: SmoothLineChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');

  // Fetch candle data from the API
  const { data: candleData, isLoading } = useQuery<CandleResponse>({
    queryKey: [`/api/market/candles`, symbol, selectedPeriod],
    queryFn: async () => {
      const tf = periodToTimeframe(selectedPeriod);
      const response = await fetch(`/api/market/candles?symbol=${symbol}&tf=${tf}`);
      if (!response.ok) {
        throw new Error('Failed to fetch candle data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Extract close prices from candles for the line chart
  const chartData = candleData?.candles?.map(candle => candle.close) || [];

  const maxValue = chartData.length > 0 ? Math.max(...chartData) : 0;
  const minValue = chartData.length > 0 ? Math.min(...chartData) : 0;
  const range = maxValue - minValue || 1; // Prevent division by zero

  const createSVGPath = () => {
    if (chartData.length === 0) return '';

    const width = 100;
    const stepX = chartData.length > 1 ? width / (chartData.length - 1) : 0;

    const points = chartData.map((value, index) => {
      const x = index * stepX;
      const y = ((maxValue - value) / range) * 100;
      return `${x},${y}`;
    });

    const pathD = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point}`;
      }
      
      const [prevX, prevY] = points[index - 1].split(',').map(Number);
      const [currX, currY] = point.split(',').map(Number);
      
      const cpX1 = prevX + (currX - prevX) / 3;
      const cpY1 = prevY;
      const cpX2 = prevX + 2 * (currX - prevX) / 3;
      const cpY2 = currY;
      
      return `${path} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${currX},${currY}`;
    }, '');

    return pathD;
  };

  const periods: TimePeriod[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

  return (
    <div className="w-full" data-testid="smooth-line-chart">
      {isLoading ? (
        <div 
          className="w-full flex items-center justify-center bg-white/5 rounded-lg"
          style={{ height: `${height}px` }}
        >
          <div className="text-[#A7ADBA] text-sm">Loading chart data...</div>
        </div>
      ) : (
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          style={{ height: `${height}px` }}
          className="w-full"
        >
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34C759" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34C759" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {chartData.length > 0 && (
            <>
              <path
                d={`${createSVGPath()} L 100,100 L 0,100 Z`}
                fill={`url(#gradient-${symbol})`}
              />
              
              <path
                d={createSVGPath()}
                fill="none"
                stroke="#34C759"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
              
              {chartData.length > 0 && (
                <circle
                  cx={100}
                  cy={((maxValue - chartData[chartData.length - 1]) / range) * 100}
                  r="1.5"
                  fill="#34C759"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}
        </svg>
      )}

      {showTimePeriodSelector && (
        <div className="flex gap-2 mt-6 justify-center" data-testid="time-period-selector">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/30'
                  : 'text-[#A7ADBA] hover:text-[#F2F4F6] hover:bg-white/5'
              }`}
              data-testid={`period-${period}`}
            >
              {period}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
