import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  accountId: string;
  accountName?: string;
  side: 'BUY' | 'SELL';
  currentHoldings?: number;
  currentPrice?: number;
}

interface ImpactResponse {
  impactId: string;
  accepted: boolean;
  reason?: string | null;
  estCost: {
    amount: number;
    currency: string;
  };
  lines: Array<{ label: string; value: string }>;
}

export function QuickTradeModal({
  isOpen,
  onClose,
  symbol,
  accountId,
  accountName,
  side,
  currentHoldings = 0,
  currentPrice = 0
}: QuickTradeModalProps) {
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [step, setStep] = useState<'form' | 'preview' | 'success' | 'error'>('form');
  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setQuantity('');
      setOrderType('MARKET');
      setLimitPrice('');
      setImpactData(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const { data: quoteData } = useQuery<{ lastPrice?: number }>({
    queryKey: ['/api/snaptrade/quote', symbol, accountId],
    enabled: isOpen && !!symbol && !!accountId,
  });

  const livePrice = quoteData?.lastPrice || currentPrice;

  const impactMutation = useMutation<ImpactResponse, Error, void>({
    mutationFn: async (): Promise<ImpactResponse> => {
      const body: any = {
        accountId,
        symbol,
        side,
        quantity: parseFloat(quantity),
        type: orderType.toLowerCase(),
        timeInForce: 'day'
      };
      
      if (orderType === 'LIMIT' && limitPrice) {
        body.limitPrice = parseFloat(limitPrice);
      }
      
      const response = await apiRequest('/api/snaptrade/trades/impact', {
        method: 'POST',
        body
      });
      return response.json();
    },
    onSuccess: (data: ImpactResponse) => {
      setImpactData(data);
      setStep('preview');
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || 'Failed to calculate order impact');
      setStep('error');
    }
  });

  const placeMutation = useMutation({
    mutationFn: async () => {
      if (!impactData?.impactId) throw new Error('No impact ID');
      
      return await apiRequest('/api/snaptrade/trades/place', {
        method: 'POST',
        body: { impactId: impactData.impactId }
      });
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/snaptrade/accounts'] });
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || 'Failed to place order');
      setStep('error');
    }
  });

  const handlePreview = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      setErrorMessage('Please enter a valid quantity');
      return;
    }
    
    if (side === 'SELL' && parseFloat(quantity) > currentHoldings) {
      setErrorMessage(`You can only sell up to ${currentHoldings} shares`);
      return;
    }
    
    setErrorMessage('');
    impactMutation.mutate();
  };

  const handlePlace = () => {
    placeMutation.mutate();
  };

  const estimatedTotal = parseFloat(quantity || '0') * (orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : livePrice);

  const renderFormStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
          {accountName && (
            <p className="text-sm text-gray-500">{accountName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(livePrice)}
          </p>
          {side === 'SELL' && currentHoldings > 0 && (
            <p className="text-sm text-gray-500">
              You own {currentHoldings} shares
            </p>
          )}
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="Enter number of shares"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0"
            step="1"
          />
          {side === 'SELL' && currentHoldings > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setQuantity(String(currentHoldings))}
            >
              Sell all ({currentHoldings} shares)
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Select value={orderType} onValueChange={(v: 'MARKET' | 'LIMIT') => setOrderType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MARKET">Market Order</SelectItem>
              <SelectItem value="LIMIT">Limit Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {orderType === 'LIMIT' && (
          <div className="space-y-2">
            <Label htmlFor="limitPrice">Limit Price</Label>
            <Input
              id="limitPrice"
              type="number"
              placeholder="Enter limit price"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        )}

        {quantity && parseFloat(quantity) > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated {side === 'BUY' ? 'Cost' : 'Proceeds'}</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handlePreview}
          disabled={!quantity || parseFloat(quantity) <= 0 || impactMutation.isPending}
          className={`flex-1 ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {impactMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Preview {side === 'BUY' ? 'Buy' : 'Sell'}
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Badge 
          variant="outline" 
          className={`text-lg px-4 py-2 ${side === 'BUY' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}
        >
          {side === 'BUY' ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
          {side} {quantity} {symbol}
        </Badge>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        {impactData?.lines?.map((line, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-500">{line.label}</span>
            <span className="font-medium text-gray-900">{line.value}</span>
          </div>
        ))}
        
        <Separator />
        
        <div className="flex justify-between font-semibold">
          <span>Estimated {side === 'BUY' ? 'Total' : 'Proceeds'}</span>
          <span className={side === 'BUY' ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(impactData?.estCost?.amount || 0)}
          </span>
        </div>
      </div>

      {!impactData?.accepted && impactData?.reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{impactData.reason}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handlePlace}
          disabled={!impactData?.accepted || placeMutation.isPending}
          className={`flex-1 ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {placeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Confirm {side === 'BUY' ? 'Buy' : 'Sell'}
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Order Submitted</h3>
        <p className="text-gray-500 mt-2">
          Your {side.toLowerCase()} order for {quantity} shares of {symbol} has been submitted.
        </p>
      </div>

      <Button onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Order Failed</h3>
        <p className="text-gray-500 mt-2">{errorMessage}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
        <Button onClick={() => setStep('form')} className="flex-1">
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {side === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {side === 'BUY' ? 'Buy' : 'Sell'} {symbol}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && renderFormStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}
      </DialogContent>
    </Dialog>
  );
}
