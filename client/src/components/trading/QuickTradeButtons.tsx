import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { QuickTradeModal } from './QuickTradeModal';
import { useTradingEnabled } from '@/hooks/useTradingEnabled';

interface QuickTradeButtonsProps {
  symbol: string;
  accountId: string;
  accountName?: string;
  currentHoldings?: number;
  currentPrice?: number;
  size?: 'sm' | 'default' | 'lg';
  showLabels?: boolean;
}

export function QuickTradeButtons({
  symbol,
  accountId,
  accountName,
  currentHoldings = 0,
  currentPrice = 0,
  size = 'sm',
  showLabels = true
}: QuickTradeButtonsProps) {
  const tradingEnabled = useTradingEnabled();
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');

  if (!tradingEnabled) {
    return null;
  }

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTradeSide('BUY');
    setTradeModalOpen(true);
  };

  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTradeSide('SELL');
    setTradeModalOpen(true);
  };

  return (
    <>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={handleBuy}
          size={size}
          variant="outline"
          className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
        >
          <TrendingUp className="h-3 w-3" />
          {showLabels && <span className="ml-1">Buy</span>}
        </Button>
        
        {currentHoldings > 0 && (
          <Button
            onClick={handleSell}
            size={size}
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <TrendingDown className="h-3 w-3" />
            {showLabels && <span className="ml-1">Sell</span>}
          </Button>
        )}
      </div>

      <QuickTradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        symbol={symbol}
        accountId={accountId}
        accountName={accountName}
        side={tradeSide}
        currentHoldings={currentHoldings}
        currentPrice={currentPrice}
      />
    </>
  );
}
