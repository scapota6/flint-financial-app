/**
 * Account Details Modal with comprehensive SnapTrade data
 * Shows account information, balances, holdings, orders, and activities
 */

import React, { useState, useEffect } from 'react';
import { useQueries, useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Activity, CreditCard, Building2, DollarSign, Search, AlertCircle, CheckCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { 
  AccountDetails, 
  AccountBalances, 
  Position, 
  Order, 
  Activity as ActivityType 
} from '../../schemas/snaptrade';

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName?: string;
}

export function AccountDetailsModal({ isOpen, onClose, accountId, accountName }: AccountDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('information');
  const { toast } = useToast();

  // Trade tab state
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<'DAY' | 'GTC'>('DAY');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Parallel API calls when Details modal opens (per specification)
  const accountQueries = useQueries({
    queries: [
      {
        queryKey: [`/api/snaptrade/accounts/${accountId}/details`],
        enabled: isOpen && !!accountId,
        retry: 2
      },
      {
        queryKey: [`/api/snaptrade/accounts/${accountId}/balances`],
        enabled: isOpen && !!accountId,
        retry: 2
      },
      {
        queryKey: [`/api/snaptrade/accounts/${accountId}/positions`],
        enabled: isOpen && !!accountId,
        retry: 2
      },
      {
        queryKey: [`/api/snaptrade/accounts/${accountId}/orders`],
        enabled: isOpen && !!accountId,
        retry: 2
      },
      {
        queryKey: [`/api/snaptrade/accounts/${accountId}/activities`],
        enabled: isOpen && !!accountId,
        retry: 2
      }
    ]
  });

  // Extract data from parallel queries
  const [
    { data: accountDetails, isLoading: loadingDetails, error: detailsError },
    { data: balancesData, isLoading: loadingBalances, error: balancesError },
    { data: positionsData, isLoading: loadingPositions, error: positionsError },
    { data: ordersData, isLoading: loadingOrders, error: ordersError },
    { data: activitiesData, isLoading: loadingActivities, error: activitiesError }
  ] = accountQueries;

  const account = (accountDetails as any)?.account;
  const balances = (balancesData as any)?.balances;
  const positions = (positionsData as any)?.positions || [];
  const orders = (ordersData as any)?.orders || [];
  const activities = (activitiesData as any)?.activities || [];

  // Separate equity and options positions
  const equityPositions = positions.filter((p: any) => !isOptionSymbol(p.symbol));
  const optionPositions = positions.filter((p: any) => isOptionSymbol(p.symbol));

  function isOptionSymbol(symbol: string): boolean {
    // Basic option symbol detection (can be enhanced)
    return symbol.includes('CALL') || symbol.includes('PUT') || /\d{6}[CP]\d+/.test(symbol);
  }

  function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  function formatPercent(percent: number | null | undefined): string {
    if (percent === null || percent === undefined) return 'N/A';
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'OPEN': 'default',
      'FILLED': 'secondary',
      'CANCELLED': 'outline',
      'REJECTED': 'destructive',
      'PARTIAL': 'default'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'TRADE': return <Activity className="h-4 w-4" />;
      case 'DIVIDEND': return <DollarSign className="h-4 w-4" />;
      case 'DEPOSIT': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'WITHDRAWAL': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  }

  // Live quote fetching for selected symbol
  const { data: quoteData, isLoading: quoteLoading } = useQuery({
    queryKey: [`/api/trade/quotes`, accountId, selectedSymbol],
    queryFn: async () => {
      if (!selectedSymbol) return null;
      const response = await fetch(`/api/trade/quotes?accountId=${accountId}&symbols=${selectedSymbol}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch quote');
      return response.json();
    },
    enabled: isOpen && !!selectedSymbol && activeTab === 'trade',
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 1
  });

  // Symbol search handler
  const handleSymbolSearch = async () => {
    if (symbolSearch.length < 1) return;

    try {
      const response = await fetch(`/api/snaptrade/symbols/${symbolSearch.toUpperCase()}?accountId=${accountId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.results && result.results.length > 0) {
          setSearchResults(result.results);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
          toast({
            title: 'No results',
            description: `No symbols found for "${symbolSearch}"`,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Symbol search failed:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to search symbols. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSymbolSearch('');
    setShowSearchResults(false);
    setValidationErrors({});
  };

  // Form validation
  const validateOrderForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedSymbol) {
      errors.symbol = 'Please select a symbol';
    }
    
    if (!orderQuantity || Number(orderQuantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    
    if (orderType === 'LIMIT' && (!limitPrice || Number(limitPrice) <= 0)) {
      errors.limitPrice = 'Limit price must be greater than 0';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Order preview mutation
  const previewMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/trade/preview', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreviewModal(true);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to preview order';
      toast({
        title: 'Preview failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  // Order placement mutation
  const placeMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/trade/place', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    },
    onSuccess: (data: any) => {
      setShowPreviewModal(false);
      toast({
        title: 'Order placed successfully!',
        description: `Order ID: ${data.order?.brokerage_order_id || data.order?.id || 'N/A'}`,
        variant: 'default'
      });
      
      // Comprehensive cache invalidation for instant live data updates
      queryClient.invalidateQueries({ queryKey: [`/api/snaptrade/accounts/${accountId}/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/snaptrade/accounts/${accountId}/positions`] });
      queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.positions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.balances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts.orders'] });
      
      // Switch to Orders tab
      setActiveTab('orders');
      
      // Reset form
      resetTradeForm();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to place order';
      toast({
        title: 'Order failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  // Handle preview order
  const handlePreviewOrder = () => {
    if (!validateOrderForm()) return;

    const orderData = {
      accountId,
      symbol: selectedSymbol,
      side: orderSide,
      quantity: Number(orderQuantity),
      type: orderType,
      limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : undefined,
      timeInForce
    };

    previewMutation.mutate(orderData);
  };

  // Handle confirm order
  const handleConfirmOrder = () => {
    const orderData = {
      accountId,
      symbol: selectedSymbol,
      side: orderSide,
      quantity: Number(orderQuantity),
      type: orderType,
      limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : undefined,
      timeInForce,
      tradeId: previewData?.tradeId
    };

    placeMutation.mutate(orderData);
  };

  // Reset trade form
  const resetTradeForm = () => {
    setSelectedSymbol('');
    setSymbolSearch('');
    setOrderQuantity('');
    setLimitPrice('');
    setOrderSide('BUY');
    setOrderType('MARKET');
    setTimeInForce('DAY');
    setSearchResults([]);
    setShowSearchResults(false);
    setValidationErrors({});
    setPreviewData(null);
  };

  // Get current quote price
  const currentPrice = quoteData?.quotes?.[selectedSymbol]?.price || quoteData?.quotes?.[selectedSymbol]?.last || null;
  const priceChange = quoteData?.quotes?.[selectedSymbol]?.change || null;
  const priceChangePercent = quoteData?.quotes?.[selectedSymbol]?.changePercent || null;
  const bidPrice = quoteData?.quotes?.[selectedSymbol]?.bid || null;
  const askPrice = quoteData?.quotes?.[selectedSymbol]?.ask || null;

  function ErrorAlert({ error, title }: { error: any; title: string }) {
    if (!error) return null;
    
    const errorData = error?.response?.data?.error;
    const code = errorData?.code;
    const message = errorData?.message || error.message;

    return (
      <Alert className="mb-4">
        <AlertDescription>
          <strong>{title} Error:</strong> {message}
          {code === 'SNAPTRADE_NOT_REGISTERED' && (
            <div className="mt-2">
              <Button variant="outline" size="sm">Finish Registration</Button>
            </div>
          )}
          {code === 'SNAPTRADE_USER_MISMATCH' && (
            <div className="mt-2">
              <Button variant="outline" size="sm">Reset SnapTrade User</Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-account-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {accountName || account?.name || 'Account Details'}
            {account?.institution && (
              <span className="text-sm font-normal text-muted-foreground">
                · {account.institution}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="information" data-testid="tab-information">Information</TabsTrigger>
            <TabsTrigger value="balances" data-testid="tab-balances">Balances</TabsTrigger>
            <TabsTrigger value="holdings" data-testid="tab-holdings">Holdings</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
            <TabsTrigger value="trade" data-testid="tab-trade">Trade</TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="space-y-4">
            <ErrorAlert error={detailsError} title="Account Information" />
            
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : account ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Account ID</div>
                  <div className="font-mono text-sm" data-testid="text-account-id">{account.id}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Brokerage</div>
                  <div data-testid="text-brokerage">{account.institution}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Account Type</div>
                  <div data-testid="text-account-type">{account.type || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Currency</div>
                  <div data-testid="text-currency">{account.currency}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={account.status === 'open' ? 'default' : 'secondary'} data-testid="badge-status">
                    {account.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Account Number</div>
                  <div className="font-mono" data-testid="text-account-number">{account.numberMasked || 'N/A'}</div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="balances" className="space-y-4">
            <ErrorAlert error={balancesError} title="Live Balances" />
            
            {loadingBalances ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : balances ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Cash Available</div>
                  <div className="text-2xl font-bold" data-testid="text-cash-balance">
                    {balances.cash ? formatCurrency(balances.cash.amount, balances.cash.currency) : 'N/A'}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Equity</div>
                  <div className="text-2xl font-bold" data-testid="text-total-balance">
                    {balances.total ? formatCurrency(balances.total.amount, balances.total.currency) : 'N/A'}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Buying Power</div>
                  <div className="text-xl font-semibold" data-testid="text-buying-power">
                    {balances.buyingPower ? formatCurrency(balances.buyingPower.amount, balances.buyingPower.currency) : 'N/A'}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Maintenance Excess</div>
                  <div className="text-xl font-semibold" data-testid="text-maintenance-excess">
                    {balances.maintenanceExcess ? formatCurrency(balances.maintenanceExcess.amount, balances.maintenanceExcess.currency) : 'N/A'}
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="holdings" className="space-y-4">
            <ErrorAlert error={positionsError} title="Holdings & Positions" />
            
            {loadingPositions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Tabs defaultValue="equity" className="w-full">
                <TabsList>
                  <TabsTrigger value="equity" data-testid="tab-equity">
                    Equity/ETF ({equityPositions.length})
                  </TabsTrigger>
                  <TabsTrigger value="options" data-testid="tab-options">
                    Options ({optionPositions.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="equity">
                  {equityPositions.length > 0 ? (
                    <div className="space-y-2">
                      {equityPositions.map((position: any, index: number) => (
                        <div key={`${position.symbol}-${index}`} className="p-4 border rounded-lg" data-testid={`position-${position.symbol}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">{position.symbol}</div>
                              <div className="text-sm text-muted-foreground">{position.description}</div>
                              <div className="text-sm">
                                {position.quantity} shares @ {formatCurrency(position.avgPrice?.amount, position.currency)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(position.marketValue?.amount, position.currency)}
                              </div>
                              {position.unrealizedPnL && (
                                <div className={`text-sm ${position.unrealizedPnL.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(position.unrealizedPnL.amount, position.currency)}
                                  {position.unrealizedPnLPercent && ` (${formatPercent(position.unrealizedPnLPercent)})`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No equity positions found
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="options">
                  {optionPositions.length > 0 ? (
                    <div className="space-y-2">
                      {optionPositions.map((position: any, index: number) => (
                        <div key={`${position.symbol}-${index}`} className="p-4 border rounded-lg" data-testid={`option-${position.symbol}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold font-mono">{position.symbol}</div>
                              <div className="text-sm text-muted-foreground">{position.description}</div>
                              <div className="text-sm">
                                {position.quantity} contracts @ {formatCurrency(position.avgPrice?.amount, position.currency)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(position.marketValue?.amount, position.currency)}
                              </div>
                              {position.unrealizedPnL && (
                                <div className={`text-sm ${position.unrealizedPnL.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(position.unrealizedPnL.amount, position.currency)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No options positions found
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <ErrorAlert error={ordersError} title="Orders" />
            
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-2">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-4 border rounded-lg" data-testid={`order-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{order.symbol}</span>
                          <Badge variant={order.side === 'BUY' ? 'default' : 'secondary'}>
                            {order.side}
                          </Badge>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.type} · {order.quantity} shares
                          {order.price && ` @ ${formatCurrency(order.price)}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(order.placedAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div className="text-right">
                        {order.avgFillPrice && (
                          <div className="font-semibold">
                            Filled @ {formatCurrency(order.avgFillPrice)}
                          </div>
                        )}
                        {order.filledQuantity && (
                          <div className="text-sm text-muted-foreground">
                            {order.filledQuantity} / {order.quantity} filled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent orders found
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ErrorAlert error={activitiesError} title="Activity" />
            
            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                    <div className="flex items-start gap-3">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{activity.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(activity.date), 'MMM d, yyyy h:mm a')}
                              {activity.symbol && (
                                <Badge variant="outline" className="ml-2">
                                  {activity.symbol}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className={`font-semibold ${activity.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {activity.amount >= 0 ? '+' : ''}{formatCurrency(activity.amount, activity.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity found
              </div>
            )}
          </TabsContent>

          <TabsContent value="trade" className="space-y-6">
            {/* Symbol Search Section */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-purple-400" />
                  Symbol Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 relative">
                  <Input
                    placeholder="Search stocks, ETFs..."
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleSymbolSearch()}
                    className="bg-slate-900/50 border-slate-600 text-white"
                    data-testid="input-symbol-search"
                  />
                  <Button 
                    onClick={handleSymbolSearch}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-search-symbol"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {validationErrors.symbol && (
                  <p className="text-sm text-red-500">{validationErrors.symbol}</p>
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    {searchResults.slice(0, 10).map((result, idx) => (
                      <div
                        key={idx}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 transition-colors"
                        onClick={() => handleSymbolSelect(result.symbol)}
                        data-testid={`search-result-${result.symbol}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white">{result.symbol}</span>
                            {result.exchange && (
                              <span className="text-xs ml-2 text-slate-400">{result.exchange}</span>
                            )}
                          </div>
                          {result.securityType && (
                            <Badge variant="outline" className="text-xs">
                              {result.securityType}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">{result.description}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Symbol Display */}
                {selectedSymbol && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-2xl font-bold text-white" data-testid="text-selected-symbol">
                          {selectedSymbol}
                        </div>
                        {quoteLoading && (
                          <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading quote...
                          </div>
                        )}
                      </div>
                      {currentPrice !== null && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white" data-testid="text-current-price">
                            ${currentPrice.toFixed(2)}
                          </div>
                          {priceChange !== null && (
                            <div className={`text-sm flex items-center gap-1 justify-end ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
                              {priceChangePercent !== null && ` (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`}
                            </div>
                          )}
                          {bidPrice !== null && askPrice !== null && (
                            <div className="text-xs text-slate-400 mt-1">
                              Bid: ${bidPrice.toFixed(2)} | Ask: ${askPrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Entry Form */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Order Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Buy/Sell Toggle */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Side</Label>
                  <ToggleGroup 
                    type="single" 
                    value={orderSide} 
                    onValueChange={(value) => value && setOrderSide(value as 'BUY' | 'SELL')}
                    className="justify-start gap-2"
                  >
                    <ToggleGroupItem 
                      value="BUY" 
                      className="flex-1 data-[state=on]:bg-green-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-buy"
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      BUY
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="SELL" 
                      className="flex-1 data-[state=on]:bg-red-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-sell"
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      SELL
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-slate-300">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    min="1"
                    step="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                    data-testid="input-quantity"
                  />
                  {validationErrors.quantity && (
                    <p className="text-sm text-red-500">{validationErrors.quantity}</p>
                  )}
                </div>

                {/* Order Type Toggle */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Order Type</Label>
                  <ToggleGroup 
                    type="single" 
                    value={orderType} 
                    onValueChange={(value) => value && setOrderType(value as 'MARKET' | 'LIMIT')}
                    className="justify-start gap-2"
                    data-testid="select-order-type"
                  >
                    <ToggleGroupItem 
                      value="MARKET" 
                      className="flex-1 data-[state=on]:bg-purple-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-market"
                    >
                      MARKET
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="LIMIT" 
                      className="flex-1 data-[state=on]:bg-purple-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-limit"
                    >
                      LIMIT
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Limit Price Input (shown only for LIMIT orders) */}
                {orderType === 'LIMIT' && (
                  <div className="space-y-2">
                    <Label htmlFor="limitPrice" className="text-slate-300">Limit Price</Label>
                    <Input
                      id="limitPrice"
                      type="number"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white"
                      data-testid="input-limit-price"
                    />
                    {validationErrors.limitPrice && (
                      <p className="text-sm text-red-500">{validationErrors.limitPrice}</p>
                    )}
                  </div>
                )}

                {/* Time in Force Toggle */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Time in Force</Label>
                  <ToggleGroup 
                    type="single" 
                    value={timeInForce} 
                    onValueChange={(value) => value && setTimeInForce(value as 'DAY' | 'GTC')}
                    className="justify-start gap-2"
                    data-testid="select-time-in-force"
                  >
                    <ToggleGroupItem 
                      value="DAY" 
                      className="flex-1 data-[state=on]:bg-purple-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-day"
                    >
                      DAY
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="GTC" 
                      className="flex-1 data-[state=on]:bg-purple-600 data-[state=on]:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      data-testid="button-gtc"
                    >
                      GTC
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Preview Order Button */}
                <Button
                  onClick={handlePreviewOrder}
                  disabled={!selectedSymbol || !orderQuantity || previewMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
                  data-testid="button-preview-order"
                >
                  {previewMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Previewing...
                    </>
                  ) : (
                    'Preview Order'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white" data-testid="modal-order-preview">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-400" />
                Order Preview
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Review your order details before confirming
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Order Summary */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Symbol</span>
                  <span className="font-semibold text-white">{selectedSymbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Side</span>
                  <Badge variant={orderSide === 'BUY' ? 'default' : 'secondary'} className={orderSide === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
                    {orderSide}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-semibold text-white">{orderQuantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Order Type</span>
                  <span className="font-semibold text-white">{orderType}</span>
                </div>
                {orderType === 'LIMIT' && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Limit Price</span>
                    <span className="font-semibold text-white">${limitPrice}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Time in Force</span>
                  <span className="font-semibold text-white">{timeInForce}</span>
                </div>
              </div>

              {/* Cost Breakdown */}
              {previewData?.impact && (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-3">
                  <div className="font-semibold text-white mb-2">Cost Breakdown</div>
                  {previewData.impact.lines?.map((line: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{line.label}</span>
                      <span className="text-white">{line.value}</span>
                    </div>
                  ))}
                  {previewData.impact.estCost && (
                    <div className="pt-3 mt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">
                          {orderSide === 'BUY' ? 'Total Cost' : 'Total Proceeds'}
                        </span>
                        <span className="font-bold text-white text-lg">
                          ${previewData.impact.estCost.amount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {!previewData?.impact?.accepted && previewData?.impact?.reason && (
                <Alert className="bg-red-900/20 border-red-700">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-300">
                    {previewData.impact.reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                data-testid="button-cancel-order"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmOrder}
                disabled={placeMutation.isPending || !previewData?.impact?.accepted}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-confirm-order"
              >
                {placeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Placing...
                  </>
                ) : (
                  'Confirm Order'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}