import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import SymbolSearchAutocomplete from './symbol-search-autocomplete';
import type { SymbolSearchResult } from '@shared/types';

const tradeSchema = z.object({
  accountId: z.string().min(1, 'Please select an account'),
  orderType: z.enum(['market', 'limit']),
  quantity: z.string().min(1, 'Quantity is required').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Quantity must be a positive number'
  ),
  limitPrice: z.string().optional(),
  timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
}).refine(
  (data) => {
    if (data.orderType === 'limit') {
      return data.limitPrice && !isNaN(Number(data.limitPrice)) && Number(data.limitPrice) > 0;
    }
    return true;
  },
  {
    message: 'Limit price is required for limit orders',
    path: ['limitPrice'],
  }
);

type TradeFormData = z.infer<typeof tradeSchema>;

interface EnhancedTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string; // Made optional - can be selected via autocomplete
  action?: 'buy' | 'sell'; // Made optional - can be set later
  currentPrice?: number;
}

export default function EnhancedTradeModal({
  isOpen,
  onClose,
  symbol: initialSymbol = '',
  action: initialAction = 'buy',
  currentPrice = 0,
}: EnhancedTradeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [selectedSymbolInfo, setSelectedSymbolInfo] = useState<SymbolSearchResult | null>(null);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [action, setAction] = useState(initialAction);

  // Update symbol when modal opens with initialSymbol
  useEffect(() => {
    if (isOpen && initialSymbol) {
      setSymbol(initialSymbol);
      setSelectedSymbolInfo(null); // Reset compatibility info
    }
  }, [isOpen, initialSymbol]);

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      accountId: '',
      orderType: 'market',
      quantity: '',
      limitPrice: '',
      timeInForce: 'day',
    },
  });

  // Fetch user's brokerage accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts/brokerage'],
    enabled: isOpen,
  });

  // Fetch real-time quote
  const { data: quote } = useQuery({
    queryKey: [`/api/quotes/${symbol}`],
    enabled: isOpen && !!symbol,
    refetchInterval: 1000, // Live data: Update every second
  });

  const executeTrade = useMutation({
    mutationFn: async (data: TradeFormData) => {
      // First get preview with tradeId workflow
      const previewData = {
        accountId: data.accountId,
        symbol,
        side: action,
        quantity: parseFloat(data.quantity),
        type: data.orderType.toUpperCase(),
        limitPrice: data.orderType === 'limit' ? parseFloat(data.limitPrice || '0') : undefined,
        timeInForce: data.timeInForce.toUpperCase()
      };

      const previewResponse = await apiRequest('/api/trade/preview', {
        method: 'POST',
        body: previewData
      });
      
      if (!previewResponse.ok) {
        const error = await previewResponse.json();
        throw new Error(error.message || 'Preview failed');
      }
      
      const previewResult = await previewResponse.json();

      // Place order using tradeId if available
      const orderData = previewResult.tradeId ? 
        { 
          accountId: data.accountId, 
          tradeId: previewResult.tradeId 
        } : 
        {
          accountId: data.accountId,
          symbol,
          side: action,
          quantity: parseFloat(data.quantity),
          type: data.orderType.toUpperCase(),
          limitPrice: data.orderType === 'limit' ? parseFloat(data.limitPrice || '0') : undefined,
          timeInForce: data.timeInForce.toUpperCase()
        };

      const placeResponse = await apiRequest('/api/trade/place', {
        method: 'POST',
        body: orderData
      });
      
      if (!placeResponse.ok) {
        const error = await placeResponse.json();
        throw new Error(error.message || 'Place failed');
      }
      
      return placeResponse.json();
    },
    onSuccess: () => {
      toast({
        title: 'Order Placed Successfully',
        description: `Your ${action} order for ${symbol} has been submitted.`,
      });
      
      // Comprehensive cache invalidation for instant live data updates
      queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.positions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.balances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.orders'] });
      
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: TradeFormData) => {
    executeTrade.mutate(data);
  };

  const estimatedTotal = () => {
    const quantity = parseFloat(form.watch('quantity') || '0');
    const price = orderType === 'limit' 
      ? parseFloat(form.watch('limitPrice') || '0')
      : (quote as any)?.price || currentPrice;
    return quantity * price;
  };

  // Handle symbol selection from autocomplete
  const handleSymbolSelect = (result: SymbolSearchResult) => {
    setSymbol(result.symbol);
    setSelectedSymbolInfo(result);
    
    // If only one compatible account, auto-select it
    if (result.compatibleAccounts.length === 1) {
      form.setValue('accountId', result.compatibleAccounts[0].accountId);
    } else {
      // Clear account selection to force user to choose
      form.setValue('accountId', '');
    }
  };

  // Check if selected account supports trading
  const selectedAccountId = form.watch('accountId');
  const selectedAccount = (accounts as any)?.brokerageAccounts?.find(
    (acc: any) => acc.id === selectedAccountId
  );
  const canTrade = selectedAccount?.tradingEnabled ?? false;
  
  // Check if selected account is compatible with selected symbol
  const isAccountCompatibleWithSymbol = selectedSymbolInfo
    ? selectedSymbolInfo.compatibleAccounts.some(acc => acc.accountId === selectedAccountId)
    : true; // If no symbol info, assume compatible

  // Filter and sort accounts based on compatibility
  const sortedAccounts = (accounts as any)?.brokerageAccounts?.slice().sort((a: any, b: any) => {
    if (!selectedSymbolInfo) return 0;
    
    const aCompatible = selectedSymbolInfo.compatibleAccounts.some(acc => acc.accountId === a.id);
    const bCompatible = selectedSymbolInfo.compatibleAccounts.some(acc => acc.accountId === b.id);
    
    if (aCompatible && !bCompatible) return -1;
    if (!aCompatible && bCompatible) return 1;
    return 0;
  }) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'buy' ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-500" />
                Buy {symbol || 'Stock'}
              </>
            ) : (
              <>
                <TrendingDown className="h-5 w-5 text-red-500" />
                Sell {symbol || 'Stock'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {symbol ? `Place a ${action} order for ${symbol}` : 'Search for a symbol to trade'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Symbol Search - Only show if no initial symbol or allow changing */}
          {!initialSymbol && (
            <div>
              <label className="text-sm font-medium mb-2 block">Symbol</label>
              <SymbolSearchAutocomplete
                onSelect={handleSymbolSelect}
                initialValue={symbol}
                placeholder="Search stocks, crypto, ETFs..."
              />
              {selectedSymbolInfo && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline">{selectedSymbolInfo.assetTypeLabel}</Badge>
                  <span>{selectedSymbolInfo.description}</span>
                </div>
              )}
            </div>
          )}

          {/* No compatible accounts warning */}
          {selectedSymbolInfo && !selectedSymbolInfo.isCompatibleWithAnyAccount && (
            <Alert variant="destructive" data-testid="alert-no-compatible-accounts">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedSymbolInfo.incompatibleReason || 'No compatible accounts found for this symbol.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Account/Symbol mismatch warning */}
          {selectedAccount && selectedSymbolInfo && !isAccountCompatibleWithSymbol && (
            <Alert variant="destructive" data-testid="alert-incompatible-selection">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedAccount.institutionName} does not support {selectedSymbolInfo.assetTypeLabel.toLowerCase()} trading. 
                {selectedSymbolInfo.compatibleAccounts.length > 0 && (
                  <span className="block mt-1">
                    Try: {selectedSymbolInfo.compatibleAccounts.map(acc => acc.institution).join(', ')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Read-only account warning */}
          {selectedAccount && !canTrade && (
            <Alert variant="destructive" data-testid="alert-trading-disabled">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Trading is not supported on {selectedAccount.institutionName || 'this'} accounts. 
                Please select a different brokerage account that supports trading.
              </AlertDescription>
            </Alert>
          )}
          {/* Real-time Quote Card */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((quote as any)?.price || currentPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Daily Change</p>
                <p className={`text-lg font-semibold ${
                  ((quote as any)?.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(quote as any)?.changePercent ? `${(quote as any).changePercent.toFixed(2)}%` : '0.00%'}
                </p>
              </div>
            </div>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Account Selection */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brokerage Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account">
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountsLoading ? (
                          <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                        ) : sortedAccounts?.length > 0 ? (
                          sortedAccounts.map((account: any) => {
                            const isCompatible = !selectedSymbolInfo || 
                              selectedSymbolInfo.compatibleAccounts.some(acc => acc.accountId === account.id);
                            const isReadOnly = account.tradingEnabled === false;
                            
                            return (
                              <SelectItem 
                                key={account.id} 
                                value={account.id}
                                disabled={isReadOnly || (selectedSymbolInfo && !isCompatible)}
                                data-testid={`account-option-${account.id}`}
                              >
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className={!isCompatible ? 'text-muted-foreground' : ''}>
                                    {account.institutionName} - {account.accountNumber}
                                  </span>
                                  <div className="flex gap-1">
                                    {isReadOnly && (
                                      <Badge variant="secondary" className="text-xs">Read Only</Badge>
                                    )}
                                    {!isReadOnly && selectedSymbolInfo && !isCompatible && (
                                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                        {selectedSymbolInfo.assetType === 'crypto' ? 'No Crypto' : 'Incompatible'}
                                      </Badge>
                                    )}
                                    {!isReadOnly && selectedSymbolInfo && isCompatible && (
                                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                        Compatible
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="none" disabled>No accounts connected</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedSymbolInfo && selectedSymbolInfo.compatibleAccounts.length > 0 && (
                      <FormDescription className="text-xs">
                        Compatible accounts shown first
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Order Type Tabs */}
              <Tabs value={orderType} onValueChange={(value) => {
                setOrderType(value as 'market' | 'limit');
                form.setValue('orderType', value as 'market' | 'limit');
              }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="market">Market Order</TabsTrigger>
                  <TabsTrigger value="limit">Limit Order</TabsTrigger>
                </TabsList>

                <TabsContent value="market" className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Buy at the current market price
                  </div>
                </TabsContent>

                <TabsContent value="limit" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="limitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter limit price"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Order will execute at this price or better
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Enter quantity"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time in Force */}
              <FormField
                control={form.control}
                name="timeInForce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time in Force</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="gtc">Good Till Canceled</SelectItem>
                        <SelectItem value="ioc">Immediate or Cancel</SelectItem>
                        <SelectItem value="fok">Fill or Kill</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How long the order remains active
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Total */}
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Total</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(estimatedTotal())}
                  </span>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !symbol ||
                    !canTrade || 
                    executeTrade.isPending ||
                    (selectedSymbolInfo && !selectedSymbolInfo.isCompatibleWithAnyAccount) ||
                    (selectedSymbolInfo && selectedAccountId && !isAccountCompatibleWithSymbol)
                  }
                  className={`flex-1 ${
                    action === 'buy' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  data-testid="button-place-order"
                >
                  {executeTrade.isPending 
                    ? 'Placing Order...' 
                    : !symbol
                    ? 'Select Symbol'
                    : (selectedSymbolInfo && !selectedSymbolInfo.isCompatibleWithAnyAccount)
                    ? 'No Compatible Accounts'
                    : (selectedSymbolInfo && selectedAccountId && !isAccountCompatibleWithSymbol)
                    ? 'Account Incompatible'
                    : `${action === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}