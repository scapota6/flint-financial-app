import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderTicketPanelProps {
  symbol: string;
  currentPrice: number;
  selectedAccountId: string;
  onAccountChange?: (accountId: string) => void;
  onOrderPlaced?: () => void;
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

export default function OrderTicketPanel({
  symbol,
  currentPrice,
  selectedAccountId,
  onAccountChange,
  onOrderPlaced
}: OrderTicketPanelProps) {
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const { data: accounts } = useQuery({
    queryKey: ['/api/snaptrade/accounts'],
  });

  const selectedAccount = (accounts as any)?.accounts?.find(
    (acc: any) => acc.id === selectedAccountId
  );

  const estimatedTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = orderType === 'limit' ? parseFloat(limitPrice) || currentPrice : currentPrice;
    return qty * price;
  };

  const handlePlaceOrder = () => {
    console.log('Placing order:', {
      symbol,
      side: orderSide,
      type: orderType,
      quantity,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      accountId: selectedAccountId
    });
    
    if (onOrderPlaced) {
      onOrderPlaced();
    }
  };

  return (
    <Card 
      className="bg-[#0B0D11] border-white/10"
      style={{
        background: 'rgba(24, 27, 31, 0.55)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      data-testid="order-ticket-panel"
    >
      <CardHeader>
        <CardTitle className="text-[#F2F4F6] text-lg">Order Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trading Account Selector */}
        <div className="space-y-2">
          <Label className="text-[#A7ADBA] text-sm">Trading Account</Label>
          <Select value={selectedAccountId} onValueChange={onAccountChange} disabled={!onAccountChange}>
            <SelectTrigger 
              className="p-4 rounded-xl bg-white/5 border-white/10 text-[#F2F4F6] hover:bg-white/10"
              data-testid="select-trading-account"
            >
              <SelectValue>
                <div>
                  <div className="font-medium">
                    {selectedAccount?.name || 'Select Account'}
                  </div>
                  {selectedAccount && (
                    <div className="text-[#A7ADBA] text-sm">
                      Balance: ${selectedAccount?.balance?.total?.amount?.toLocaleString() || '0'}
                    </div>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d23] border-white/10">
              {(accounts as any)?.accounts?.map((account: any) => (
                <SelectItem 
                  key={account.id} 
                  value={account.id}
                  className="text-[#F2F4F6] hover:bg-white/10"
                  data-testid={`account-option-${account.id}`}
                >
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-[#A7ADBA] text-sm">
                      {account.institution_name} • ${account.balance?.total?.amount?.toLocaleString() || '0'}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="space-y-2">
          <Label className="text-[#A7ADBA] text-sm">Action</Label>
          <div className="grid grid-cols-2 gap-3" data-testid="order-side-toggle">
            <button
              onClick={() => setOrderSide('buy')}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${
                orderSide === 'buy'
                  ? 'bg-[#34C759] text-white shadow-lg shadow-[#34C759]/30'
                  : 'bg-white/5 text-[#A7ADBA] hover:bg-white/10'
              }`}
              data-testid="button-buy"
            >
              Buy
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${
                orderSide === 'sell'
                  ? 'bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/30'
                  : 'bg-white/5 text-[#A7ADBA] hover:bg-white/10'
              }`}
              data-testid="button-sell"
            >
              Sell
            </button>
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="space-y-2">
          <Label className="text-[#A7ADBA] text-sm">Order Type</Label>
          <div className="grid grid-cols-2 gap-3" data-testid="order-type-toggle">
            <button
              onClick={() => setOrderType('market')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                orderType === 'market'
                  ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/30'
                  : 'bg-white/5 text-[#A7ADBA] hover:bg-white/10'
              }`}
              data-testid="button-market"
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                orderType === 'limit'
                  ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/30'
                  : 'bg-white/5 text-[#A7ADBA] hover:bg-white/10'
              }`}
              data-testid="button-limit"
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label className="text-[#A7ADBA] text-sm">Quantity</Label>
          <Input
            type="number"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-white/5 border-white/10 text-[#F2F4F6] placeholder:text-[#A7ADBA]/50 h-12 rounded-xl"
            data-testid="input-quantity"
            min="0"
            step="1"
          />
        </div>

        {/* Limit Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label className="text-[#A7ADBA] text-sm">Limit Price</Label>
            <Input
              type="number"
              placeholder={currentPrice.toFixed(2)}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="bg-white/5 border-white/10 text-[#F2F4F6] placeholder:text-[#A7ADBA]/50 h-12 rounded-xl"
              data-testid="input-limit-price"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {/* Estimated Total */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-[#A7ADBA]">Estimated Total</span>
            <span className="text-[#F2F4F6] font-bold text-xl" data-testid="estimated-total">
              ${estimatedTotal().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={!quantity || parseFloat(quantity) <= 0}
          className={`w-full h-14 rounded-xl font-semibold text-base ${
            orderSide === 'buy'
              ? 'bg-[#34C759] hover:bg-[#34C759]/90 shadow-lg shadow-[#34C759]/30'
              : 'bg-[#FF3B30] hover:bg-[#FF3B30]/90 shadow-lg shadow-[#FF3B30]/30'
          }`}
          data-testid="button-place-order"
        >
          {orderSide === 'buy' ? 'Buy' : 'Sell'} {symbol}
        </Button>
      </CardContent>
    </Card>
  );
}
