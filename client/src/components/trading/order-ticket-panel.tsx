import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

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

  // Check if selected account supports trading
  const canTrade = selectedAccount?.tradingEnabled ?? false;

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
      className="bg-white border border-gray-200 shadow-sm"
      data-testid="order-ticket-panel"
    >
      <CardHeader>
        <CardTitle className="text-gray-900 text-lg">Order Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Read-only account warning */}
        {selectedAccount && !canTrade && (
          <Alert 
            variant="destructive" 
            className="bg-red-900/20 border-red-800"
            data-testid="alert-trading-disabled"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              Trading is not supported on {selectedAccount.institution_name || 'this'} accounts. 
              Please select a different brokerage account that supports trading.
            </AlertDescription>
          </Alert>
        )}

        {/* Trading Account Selector */}
        <div className="space-y-2">
          <Label className="text-gray-500 text-sm">Trading Account</Label>
          <Select value={selectedAccountId} onValueChange={onAccountChange} disabled={!onAccountChange}>
            <SelectTrigger 
              className="p-4 rounded-xl bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
              data-testid="select-trading-account"
            >
              <SelectValue>
                <div>
                  <div className="font-medium">
                    {selectedAccount?.name || 'Select Account'}
                  </div>
                  {selectedAccount && (
                    <div className="text-gray-500 text-sm">
                      Balance: ${selectedAccount?.balance?.total?.amount?.toLocaleString() || '0'}
                    </div>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {(accounts as any)?.accounts?.map((account: any) => (
                <SelectItem 
                  key={account.id} 
                  value={account.id}
                  className="text-gray-900 hover:bg-gray-50"
                  data-testid={`account-option-${account.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-gray-500 text-sm">
                        {account.institution_name} • ${account.balance?.total?.amount?.toLocaleString() || '0'}
                      </div>
                    </div>
                    {account.tradingEnabled === false && (
                      <Badge variant="secondary" className="ml-2">Read Only</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="space-y-2">
          <Label className="text-gray-500 text-sm">Action</Label>
          <div className="grid grid-cols-2 gap-3" data-testid="order-side-toggle">
            <button
              onClick={() => setOrderSide('buy')}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${
                orderSide === 'buy'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              data-testid="button-buy"
            >
              Buy
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${
                orderSide === 'sell'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              data-testid="button-sell"
            >
              Sell
            </button>
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="space-y-2">
          <Label className="text-gray-500 text-sm">Order Type</Label>
          <div className="grid grid-cols-2 gap-3" data-testid="order-type-toggle">
            <button
              onClick={() => setOrderType('market')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                orderType === 'market'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              data-testid="button-market"
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                orderType === 'limit'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              data-testid="button-limit"
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label className="text-gray-500 text-sm">Quantity</Label>
          <Input
            type="number"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl"
            data-testid="input-quantity"
            min="0"
            step="1"
          />
        </div>

        {/* Limit Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label className="text-gray-500 text-sm">Limit Price</Label>
            <Input
              type="number"
              placeholder={currentPrice.toFixed(2)}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl"
              data-testid="input-limit-price"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {/* Estimated Total */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Estimated Total</span>
            <span className="text-gray-900 font-bold text-xl" data-testid="estimated-total">
              ${estimatedTotal().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={!canTrade || !quantity || parseFloat(quantity) <= 0}
          className={`w-full h-14 rounded-xl font-semibold text-base ${
            orderSide === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
          }`}
          data-testid="button-place-order"
        >
          {orderSide === 'buy' ? 'Buy' : 'Sell'} {symbol}
        </Button>
      </CardContent>
    </Card>
  );
}
