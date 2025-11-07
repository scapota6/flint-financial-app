import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import SmoothLineChart from '@/components/charts/smooth-line-chart';
import OrderTicketPanel from './order-ticket-panel';
import { useQuery } from '@tanstack/react-query';

interface TradingLayoutProps {
  initialSymbol?: string;
}

export default function TradingLayout({ initialSymbol = 'AAPL' }: TradingLayoutProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const { data: quote, refetch } = useQuery({
    queryKey: [`/api/quotes/${symbol}`],
    refetchInterval: 5000,
  });

  const { data: accounts } = useQuery({
    queryKey: ['/api/snaptrade/accounts'],
  });

  const price = (quote as any)?.price || 0;
  const lastUpdate = new Date().toLocaleTimeString();

  if (accounts && (accounts as any)?.accounts?.length > 0 && !selectedAccountId) {
    setSelectedAccountId((accounts as any).accounts[0].id);
  }

  const handleSearch = () => {
    if (searchInput.trim()) {
      setSymbol(searchInput.toUpperCase());
      setSearchInput('');
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#0B0D11] p-6"
      data-testid="trading-layout"
    >
      {/* Symbol Search Bar */}
      <div className="mb-6">
        <div 
          className="flex gap-3 p-4 rounded-2xl"
          style={{
            background: 'rgba(24, 27, 31, 0.55)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search symbol..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-white/5 border-white/10 text-[#F2F4F6] placeholder:text-[#A7ADBA]/50 h-12 rounded-xl pl-4 pr-4"
              data-testid="input-symbol-search"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 h-12 px-6 rounded-xl shadow-lg shadow-[#0A84FF]/30"
            data-testid="button-search"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Chart (60% / 3 columns) */}
        <div className="lg:col-span-3">
          <div 
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(24, 27, 31, 0.55)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            data-testid="chart-panel"
          >
            {/* Price Display with Update Indicator */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-[#F2F4F6]" data-testid="chart-price">
                  ${price.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <RefreshCw className="w-4 h-4 text-[#A7ADBA] animate-spin" />
                  <span className="text-[#A7ADBA] text-sm" data-testid="update-indicator">
                    Updates every 5 seconds • Last update: {lastUpdate}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#F2F4F6]">{symbol}</div>
              </div>
            </div>

            {/* Chart */}
            <SmoothLineChart symbol={symbol} height={400} />
          </div>
        </div>

        {/* Right Panel - Trading Controls (40% / 2 columns) */}
        <div className="lg:col-span-2">
          <OrderTicketPanel
            symbol={symbol}
            currentPrice={price}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
          />
        </div>
      </div>
    </div>
  );
}
