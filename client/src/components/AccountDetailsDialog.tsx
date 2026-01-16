import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { getCsrfToken } from '@/lib/csrf';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { trackAccountDisconnectedShown, trackReconnectClicked, trackReconnectSuccess, trackReconnectFailed } from '@/lib/analytics';
import { useSDK } from '@metamask/sdk-react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Calendar,
  Clock,
  X,
  Info as InfoIcon,
  AlertCircle,
  RefreshCw,
  Send,
  Loader2,
  ArrowRightLeft,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  setupEventListeners,
  getChainName,
  getBlockExplorerTxUrl,
  switchChain,
  sendETH,
  sendERC20,
  pollTransactionStatus,
  getErrorMessage,
  isUserRejection,
  type TransactionState,
  type MetaMaskProvider,
} from "@/lib/metamask";
import OrderPreviewDialog from './OrderPreviewDialog';
import OrderStatusDialog from './OrderStatusDialog';
import { getMerchantLogo } from '@/lib/merchant-logos';

// Utility function to safely extract symbol from SnapTrade symbol objects
const extractSymbol = (symbolObj: any): string => {
  if (!symbolObj) return '—';
  
  // If it's already a string, return it
  if (typeof symbolObj === 'string') return symbolObj;
  
  // If it's a SnapTrade symbol object (which can be nested)
  if (typeof symbolObj === 'object') {
    try {
      // Handle nested structure: position.symbol.symbol (SnapTrade API pattern)
      if (symbolObj.symbol) {
        if (typeof symbolObj.symbol === 'string') {
          return symbolObj.symbol;
        }
        // Handle deeper nesting if symbol.symbol is another object
        if (typeof symbolObj.symbol === 'object' && symbolObj.symbol.symbol) {
          return symbolObj.symbol.symbol;
        }
      }
      
      // Fallback to other common properties
      const extracted = symbolObj.ticker || symbolObj.raw_symbol;
      if (typeof extracted === 'string') return extracted;
      
      return '—';
    } catch (e) {
      console.warn('Error extracting symbol:', e, symbolObj);
      return '—';
    }
  }
  
  return '—';
};

// Utility function to safely extract symbol description
const extractSymbolDescription = (symbolObj: any, fallback?: string): string => {
  if (!symbolObj) return fallback || '';
  
  // If it's a SnapTrade symbol object (which can be nested)
  if (typeof symbolObj === 'object') {
    try {
      // Handle nested structure: position.symbol.description (SnapTrade API pattern)
      if (symbolObj.symbol && typeof symbolObj.symbol === 'object') {
        const description = symbolObj.symbol.description || symbolObj.symbol.name;
        if (typeof description === 'string') return description;
      }
      
      // Direct properties
      const description = symbolObj.description || symbolObj.name || fallback || '';
      return typeof description === 'string' ? description : fallback || '';
    } catch (e) {
      console.warn('Error extracting symbol description:', e, symbolObj);
      return fallback || '';
    }
  }
  
  return fallback || '';
};

type Props = {
  accountId: string; // External account ID for Teller, local ID for SnapTrade
  open: boolean;
  onClose: () => void;
  currentUserId: string; // e.g., "45137738"
  provider?: string; // 'teller' or 'snaptrade'
  localAccountId?: string; // Local database ID
};

// PayCardSection component removed - showing "Coming Soon" instead

interface AccountDetails {
  accountInformation: {
    id: string;
    name: string;
    number: string;
    brokerage: string;
    type: string;
    status: string;
    currency: string;
    balancesOverview: {
      cash: number | null;
      equity: number | null;
      buyingPower: number | null;
    };
  };
  balancesAndHoldings: {
    balances: {
      cashAvailableToTrade: number | null;
      totalEquityValue: number | null;
      buyingPowerOrMargin: number | null;
    };
    holdings: Array<{
      symbol: string;
      name: string;
      quantity: number;
      costBasis: number | null;
      marketValue: number | null;
      currentPrice: number | null;
      unrealized: number | null;
    }>;
  };
  positionsAndOrders: {
    activePositions: Array<any>;
    pendingOrders: Array<any>;
    orderHistory: Array<any>;
  };
  tradingActions: {
    canPlaceOrders: boolean;
    canCancelOrders: boolean;
    canGetConfirmations: boolean;
  };
  activityAndTransactions: Array<{
    type: string;
    symbol?: string;
    amount?: number;
    quantity?: number;
    timestamp: string | null;
    description: string;
  }>;
  metadata: {
    fetched_at: string;
    last_sync: any;
    cash_restrictions: string[];
    account_created: string;
  };
}

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'buy':
    case 'purchase':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'sell':
    case 'sale':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case 'dividend':
    case 'interest':
      return <DollarSign className="h-4 w-4 text-blue-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
};

// Helper components and utilities
function Info({ label, value, className = '' }: any) {
  return (
    <div className={`rounded-lg bg-gray-50 border border-gray-200 p-4 ${className}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-gray-900 mt-1">{value ?? '—'}</div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
      <div className="mb-3 font-semibold text-gray-900">{title}</div>
      {children}
    </div>
  );
}

function List({ items, empty, render }: any) {
  if (!items || items.length === 0) return <div className="text-gray-500 text-sm p-3 italic">{empty}</div>;
  return <div className="space-y-3">{items.map((x: any, i: number) => <div key={i} className="p-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-200">{render(x)}</div>)}</div>;
}

function Th({ children, className = '' }: any) { 
  return <th className={`text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide ${className}`}>{children}</th>; 
}

function Td({ children, className = '', ...rest }: any) { 
  return <td className={`px-4 py-3 text-gray-700 transition-colors duration-150 ${className}`} {...rest}>{children}</td>; 
}

function TdRight({ children, className = '', ...rest }: any) { 
  return <Td className={`text-right font-medium ${className}`} {...rest}>{children}</Td>; 
}

function fmtMoney(v: any) { 
  if (v == null || v === undefined || isNaN(Number(v))) return '—'; 
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; 
}

function fmtNum(v: any) { 
  if (v == null || v === undefined || isNaN(Number(v))) return '—'; 
  return Number(v).toLocaleString(); 
}

function fmtTime(v: any) { 
  if (!v) return '—'; 
  try { 
    return new Date(v).toLocaleString(); 
  } catch { 
    return String(v); 
  } 
}

function fmtSubtype(subtype: string | undefined | null) {
  if (!subtype) return '—';
  return subtype
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function AccountDetailsDialog({ accountId, open, onClose, currentUserId }: Props) {
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderStatusDialogOpen, setOrderStatusDialogOpen] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQuantity, setTradeQuantity] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // MetaMask SDK for ETH transfers
  const { sdk, connected: metamaskConnected, account: metamaskAccount, chainId } = useSDK();
  const [ethTransferAddress, setEthTransferAddress] = useState('');
  const [ethTransferAmount, setEthTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('ETH');
  const [pendingTxs, setPendingTxs] = useState<TransactionState[]>([]);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const pollCleanupRefs = useRef<Map<string, () => void>>(new Map());
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollCleanupRefs.current.forEach((cleanup) => cleanup());
      pollCleanupRefs.current.clear();
    };
  }, []);
  
  // MetaMask event listeners for account/chain changes
  useEffect(() => {
    if (!sdk || !open) return;
    
    const provider = sdk.getProvider() as MetaMaskProvider | undefined;
    if (!provider) return;
    
    const cleanup = setupEventListeners(provider, {
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          toast({
            title: "Wallet Disconnected",
            description: "MetaMask wallet was disconnected",
          });
        }
      },
      onChainChanged: (newChainId) => {
        toast({
          title: "Network Changed",
          description: `Switched to ${getChainName(newChainId)}`,
        });
      },
    });
    
    return cleanup;
  }, [sdk, open, toast]);
  
  // Token transfer handler using new MetaMask helpers
  const handleTokenTransfer = useCallback(async (tokenData?: { symbol: string; contractAddress?: string; decimals?: number }) => {
    if (!metamaskAccount || !ethTransferAddress || !ethTransferAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter a recipient address and amount",
        variant: "destructive",
      });
      return;
    }
    
    const provider = sdk?.getProvider() as MetaMaskProvider | undefined;
    if (!provider) {
      toast({
        title: "Wallet Error",
        description: "MetaMask provider not available",
        variant: "destructive",
      });
      return;
    }
    
    setIsTransferring(true);
    
    try {
      let result;
      
      if (selectedToken === 'ETH' || !tokenData?.contractAddress) {
        result = await sendETH(provider, metamaskAccount, ethTransferAddress, ethTransferAmount);
      } else {
        result = await sendERC20(
          provider,
          metamaskAccount,
          ethTransferAddress,
          tokenData.contractAddress,
          ethTransferAmount,
          tokenData.decimals || 18
        );
      }
      
      if (result.userRejected) {
        toast({
          title: "Transaction Cancelled",
          description: "You declined the transaction in MetaMask",
        });
        return;
      }
      
      if (!result.success) {
        toast({
          title: "Transfer Failed",
          description: result.error || "Transaction failed",
          variant: "destructive",
        });
        return;
      }
      
      const txHash = result.txHash!;
      toast({
        title: "Transfer Initiated",
        description: `Transaction sent! Hash: ${txHash.slice(0, 10)}...`,
      });
      
      setPendingTxs(prev => [...prev, { txHash, status: 'pending' }]);
      
      const cleanup = pollTransactionStatus(
        provider,
        txHash,
        (state) => {
          setPendingTxs(prev => 
            prev.map(tx => tx.txHash === txHash ? state : tx)
          );
          
          if (state.status === 'confirmed') {
            toast({
              title: "Transaction Confirmed",
              description: `Your ${selectedToken} transfer has been confirmed!`,
            });
            const txCleanup = pollCleanupRefs.current.get(txHash);
            if (txCleanup) txCleanup();
            pollCleanupRefs.current.delete(txHash);
          } else if (state.status === 'failed') {
            toast({
              title: "Transaction Failed",
              description: "The transaction failed on-chain",
              variant: "destructive",
            });
            const txCleanup = pollCleanupRefs.current.get(txHash);
            if (txCleanup) txCleanup();
            pollCleanupRefs.current.delete(txHash);
          }
        }
      );
      
      pollCleanupRefs.current.set(txHash, cleanup);
      
      setEthTransferAddress('');
      setEthTransferAmount('');
      
    } catch (err: any) {
      console.error('Token transfer failed:', err);
      if (!isUserRejection(err)) {
        toast({
          title: "Transfer Failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    } finally {
      setIsTransferring(false);
    }
  }, [metamaskAccount, ethTransferAddress, ethTransferAmount, selectedToken, sdk, toast]);
  
  // Chain switching handler
  const handleSwitchToMainnet = useCallback(async () => {
    const provider = sdk?.getProvider() as MetaMaskProvider | undefined;
    if (!provider) return;
    
    setIsSwitchingChain(true);
    try {
      const result = await switchChain(provider, '0x1');
      if (result.success) {
        toast({
          title: "Network Switched",
          description: "You are now on Ethereum Mainnet",
        });
      } else if (!result.userRejected) {
        toast({
          title: "Switch Failed",
          description: result.error || "Could not switch network",
          variant: "destructive",
        });
      }
    } finally {
      setIsSwitchingChain(false);
    }
  }, [sdk, toast]);

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ amount, paymentType }: { amount: number; paymentType: string }) => {
      const csrfToken = await getCsrfToken();
      const response = await apiRequest(`/api/accounts/${accountId}/pay`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ amount, paymentType })
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Initiated",
        description: `Your ${data.payment.method} payment of ${formatCurrency(data.payment.amount)} has been initiated successfully.`,
      });
    },
    onError: (error: any) => {
      const fallback = error?.fallback || "Payment failed. Please try again.";
      toast({
        title: "Payment Failed",
        description: fallback,
        variant: "destructive",
      });
    }
  });

  const handlePayment = (amount: number, paymentType: string) => {
    paymentMutation.mutate({ amount, paymentType });
  };

  const handleCustomPayment = () => {
    const amount = parseFloat(customPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }
    handlePayment(amount, 'custom');
    setShowPaymentDialog(false);
    setCustomPaymentAmount('');
  };
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Detect if this is a SnapTrade account (UUID format)
  const isSnapTradeAccount = typeof accountId === 'string' && accountId.includes('-') && accountId.length > 30;
  
  // For SnapTrade accounts, use parallel API calls to fix "—" everywhere problem
  const snapTradeQueries = {
    details: useQuery({
      queryKey: ['snaptrade-account-details', accountId],
      enabled: open && isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId,
      staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache TTL
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      queryFn: async () => {
        const resp = await fetch(`/api/snaptrade/accounts/${accountId}/details`, {
          headers: { 'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          credentials: 'include',
        });
        if (resp.status === 401) {
          throw new Error('Please sign in again');
        }
        if (resp.status === 403) {
          throw new Error('Session expired (CSRF). Refresh and try again');
        }
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: resp.statusText, status: resp.status }));
          throw errorData;
        }
        return resp.json();
      }
    }),
    
    balances: useQuery({
      queryKey: ['snaptrade-account-balances', accountId],
      enabled: open && isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId,
      staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache TTL
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      queryFn: async () => {
        const resp = await fetch(`/api/snaptrade/accounts/${accountId}/balances`, {
          headers: { 'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          credentials: 'include',
        });
        if (resp.status === 401) {
          throw new Error('Please sign in again');
        }
        if (resp.status === 403) {
          throw new Error('Session expired (CSRF). Refresh and try again');
        }
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: resp.statusText, status: resp.status }));
          throw errorData;
        }
        return resp.json();
      }
    }),
    
    positions: useQuery({
      queryKey: ['snaptrade-account-positions', accountId],
      enabled: open && isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId,
      staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache TTL
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      queryFn: async () => {
        const resp = await fetch(`/api/snaptrade/accounts/${accountId}/positions`, {
          headers: { 'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          credentials: 'include',
        });
        if (resp.status === 401) {
          throw new Error('Please sign in again');
        }
        if (resp.status === 403) {
          throw new Error('Session expired (CSRF). Refresh and try again');
        }
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: resp.statusText, status: resp.status }));
          throw errorData;
        }
        return resp.json();
      }
    }),
    
    orders: useQuery({
      queryKey: ['snaptrade-account-orders', accountId],
      enabled: open && isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId,
      staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache TTL
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      queryFn: async () => {
        const resp = await fetch(`/api/snaptrade/accounts/${accountId}/orders`, {
          headers: { 'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          credentials: 'include',
        });
        if (resp.status === 401) {
          throw new Error('Please sign in again');
        }
        if (resp.status === 403) {
          throw new Error('Session expired (CSRF). Refresh and try again');
        }
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: resp.statusText, status: resp.status }));
          throw errorData;
        }
        return resp.json();
      }
    }),
    
    activities: useQuery({
      queryKey: ['snaptrade-account-activities', accountId],
      enabled: open && isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId,
      staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache TTL
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      queryFn: async () => {
        const resp = await fetch(`/api/snaptrade/accounts/${accountId}/activities`, {
          headers: { 'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          credentials: 'include',
        });
        if (resp.status === 401) {
          throw new Error('Please sign in again');
        }
        if (resp.status === 403) {
          throw new Error('Session expired (CSRF). Refresh and try again');
        }
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: resp.statusText, status: resp.status }));
          throw errorData;
        }
        return resp.json();
      }
    })
  };
  
  // Legacy single query for Teller and other accounts
  const { data: legacyData, isLoading: legacyIsLoading, isError: legacyIsError, error: legacyError, refetch } = useQuery({
    queryKey: ['account-details', accountId],
    enabled: open && !isSnapTradeAccount && isAuthenticated && !authLoading && !!accountId && !!currentUserId,
    queryFn: async () => {
      const resp = await fetch(`/api/accounts/${accountId}/details`, {
        headers: { 'x-user-id': currentUserId },
        credentials: 'include',
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ 
          message: resp.statusText, 
          status: resp.status 
        }));
        
        // Handle 410 DISCONNECTED and 404 as disconnected states
        if (resp.status === 410 && errorData.code === 'DISCONNECTED') {
          trackAccountDisconnectedShown(accountId, 'unknown');
          throw { ...errorData, isDisconnected: true, status: 410 };
        } else if (resp.status === 404) {
          trackAccountDisconnectedShown(accountId, 'unknown');
          throw { 
            ...errorData, 
            isDisconnected: true, 
            status: 404,
            code: 'DISCONNECTED',
            message: 'Account not found or disconnected'
          };
        }
        
        throw { ...errorData, status: resp.status };
      }
      return resp.json();
    }
  });
  
  // Transform SnapTrade parallel data into unified format
  const snapTradeData = isSnapTradeAccount ? {
    provider: 'snaptrade',
    accountInformation: {
      id: snapTradeQueries.details.data?.account?.id || accountId,
      name: snapTradeQueries.details.data?.account?.name || 'Investment Account',
      number: snapTradeQueries.details.data?.account?.numberMasked || '—',
      brokerage: snapTradeQueries.details.data?.account?.brokerage || 'Unknown',
      type: snapTradeQueries.details.data?.account?.type || 'unknown',
      status: snapTradeQueries.details.data?.account?.status || 'unknown',
      currency: snapTradeQueries.details.data?.account?.currency || 'USD',
      balancesOverview: {
        cash: snapTradeQueries.balances.data?.balances?.cash?.amount || null,
        equity: snapTradeQueries.balances.data?.balances?.total?.amount || null,
        buyingPower: snapTradeQueries.balances.data?.balances?.buyingPower?.amount || null,
      }
    },
    balancesAndHoldings: {
      balances: {
        cashAvailableToTrade: snapTradeQueries.balances.data?.balances?.cash?.amount || null,
        totalEquityValue: snapTradeQueries.balances.data?.balances?.total?.amount || null,
        buyingPowerOrMargin: snapTradeQueries.balances.data?.balances?.buyingPower?.amount || null,
      },
      holdings: snapTradeQueries.positions.data?.positions?.map((position: any) => ({
        symbol: position.symbol || 'Unknown',
        name: position.description || 'Unknown Security',
        quantity: position.quantity || 0,
        costBasis: position.avgPrice?.amount || null,
        marketValue: position.marketValue?.amount || null,
        currentPrice: position.marketPrice?.amount || null,
        unrealized: position.unrealizedPnl?.amount || null,
      })) || []
    },
    positionsAndOrders: {
      activePositions: snapTradeQueries.positions.data?.positions || [],
      pendingOrders: (snapTradeQueries.orders.data?.orders || []).filter((order: any) => 
        order.status === 'open' || order.status === 'partial_filled'
      ),
      orderHistory: snapTradeQueries.orders.data?.orders || []
    },
    tradingActions: {
      canPlaceOrders: true,
      canCancelOrders: true,
      canGetConfirmations: true
    },
    activityAndTransactions: snapTradeQueries.activities.data?.activities?.map((activity: any) => ({
      type: activity.type || 'transfer',
      symbol: activity.symbol || null,
      amount: activity.amount?.amount || 0,
      quantity: null,
      timestamp: activity.date || new Date().toISOString(),
      description: activity.description || 'Transaction'
    })) || [],
    metadata: {
      fetched_at: new Date().toISOString(),
      last_sync: null,
      cash_restrictions: [],
      account_created: null
    }
  } : null;
  
  // Compute loading, error states for SnapTrade
  // Only block on the initial details query - allow other sections to load progressively
  const snapTradeIsLoading = isSnapTradeAccount && snapTradeQueries.details.isLoading;
  
  const snapTradeHasError = isSnapTradeAccount && (
    snapTradeQueries.details.isError ||
    snapTradeQueries.balances.isError ||
    snapTradeQueries.positions.isError ||
    snapTradeQueries.orders.isError ||
    snapTradeQueries.activities.isError
  );
  
  const snapTradeError = isSnapTradeAccount ? (
    snapTradeQueries.details.error ||
    snapTradeQueries.balances.error ||
    snapTradeQueries.positions.error ||
    snapTradeQueries.orders.error ||
    snapTradeQueries.activities.error
  ) : null;
  
  // Unified state for both SnapTrade and legacy
  const data = isSnapTradeAccount ? snapTradeData : legacyData;
  const isLoading = isSnapTradeAccount ? snapTradeIsLoading : legacyIsLoading;
  const isError = isSnapTradeAccount ? snapTradeHasError : legacyIsError;
  const error = isSnapTradeAccount ? snapTradeError : legacyError;
  
  // Extract error details for dev mode
  const errorDetails = error as any;
  const isDev = process.env.NODE_ENV === 'development';
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  
  // Handler for opening trade dialog with pre-filled values
  const handleOpenTrade = (symbol: string, action: 'BUY' | 'SELL', quantity?: number) => {
    setTradeSymbol(symbol);
    setTradeAction(action);
    setTradeQuantity(quantity);
    setOrderDialogOpen(true);
  };
  
  // Universal reconnection handler for both Teller and SnapTrade
  const handleReconnectAccount = async () => {
    setIsReconnecting(true);
    trackReconnectClicked(accountId, 'unknown');
    
    try {
      // For now, assume reconnection flow since provider is not available
      // This will need to be enhanced when provider information is properly passed
      const isSnapTrade = typeof accountId === 'string' && accountId.includes('-'); // SnapTrade accounts have UUID format
      if (!isSnapTrade) {
        // Teller reconnection flow
        const response = await fetch('/api/teller/init-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to initialize Teller reconnection');
        }
        
        const { applicationId, connectToken, environment } = await response.json();
        
        // Launch Teller Connect in update mode with connectToken
        const tellerConnect = (window as any).TellerConnect?.setup({
          applicationId: applicationId,
          connectToken: connectToken,
          environment: environment,
          onSuccess: async (enrollment: any) => {
            await refetch();
            setIsReconnecting(false);
            trackReconnectSuccess(accountId, 'teller');
            toast({
              title: "Account Reconnected",
              description: "Your bank account has been successfully reconnected.",
            });
          },
          onExit: () => {
            setIsReconnecting(false);
          }
        });
        
        tellerConnect?.open();
      } else {
        // SnapTrade reconnection - redirect to connect flow
        const connectUrl = '/connect?reconnect=true&account_id=' + encodeURIComponent(accountId);
        window.location.href = connectUrl;
        trackReconnectSuccess(accountId, 'snaptrade');
      }
      
    } catch (error: any) {
      console.error('Failed to reconnect account:', error);
      setIsReconnecting(false);
      trackReconnectFailed(accountId, 'unknown', error.message);
      toast({
        title: "Reconnection Failed",
        description: "Failed to initialize account reconnection. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full h-full md:max-w-6xl md:h-auto md:max-h-[95vh] md:rounded-lg bg-[#F4F2ED] border-0 md:border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>
            <p className="text-sm text-gray-600 mt-1">Real-time account information and holdings</p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-gray-900 absolute top-0 left-0"></div>
            </div>
            <span className="ml-4 text-gray-600 font-medium">
              {isSnapTradeAccount ? 'Loading account details...' : 'Loading account details...'}
            </span>
          </div>
        )}
        
        {/* SnapTrade Section-Specific Loading and Error States */}
        {isSnapTradeAccount && data && (
          <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4 md:space-y-6 bg-[#F4F2ED]">
            {/* Account Header with skeleton */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm mr-3">1</div>
                Account Information
              </h3>
              
              {snapTradeQueries.details.isLoading ? (
                <div className="animate-pulse">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              ) : snapTradeQueries.details.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Account Details Error</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {(snapTradeQueries.details.error as any)?.message || 'Failed to load account details'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Info label="Brokerage" value={data.accountInformation.brokerage} />
                  <Info label="Account Type" value={data.accountInformation.type} />
                  <Info label="Currency" value={data.accountInformation.currency} />
                  <Info label="Account Number" value={data.accountInformation.number} />
                </div>
              )}
            </section>

            {/* Balances Section with skeleton */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">2</div>
                Balances
              </h3>
              
              {snapTradeQueries.balances.isLoading ? (
                <div className="animate-pulse">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              ) : snapTradeQueries.balances.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Balance Information Error</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {(snapTradeQueries.balances.error as any)?.message || 'Failed to load balance information'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Info label="Cash Available" value={fmtMoney(data.balancesAndHoldings.balances.cashAvailableToTrade)} />
                  <Info label="Total Equity" value={fmtMoney(data.balancesAndHoldings.balances.totalEquityValue)} />
                  <Info label="Buying Power" value={fmtMoney(data.balancesAndHoldings.balances.buyingPowerOrMargin)} />
                </div>
              )}
            </section>

            {/* Holdings Section with skeleton */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center text-white font-bold text-sm mr-3">📊</div>
                Holdings & Positions
              </h3>
              
              {snapTradeQueries.positions.isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ) : snapTradeQueries.positions.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Holdings Error</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {(snapTradeQueries.positions.error as any)?.message || 'Failed to load holdings'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : data.balancesAndHoldings.holdings && data.balancesAndHoldings.holdings.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-900">Symbol</th>
                        <th className="text-left p-3 font-semibold text-gray-900">Description</th>
                        <th className="text-right p-3 font-semibold text-gray-900">Quantity</th>
                        <th className="text-right p-3 font-semibold text-gray-900">Current Price</th>
                        <th className="text-right p-3 font-semibold text-gray-900">Market Value</th>
                        <th className="text-right p-3 font-semibold text-gray-900">P&L</th>
                        {data.tradingActions?.canPlaceOrders && isSnapTradeAccount && (
                          <th className="text-center p-3 font-semibold text-gray-900">Trade</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.balancesAndHoldings.holdings.map((holding: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <td className="p-3 text-gray-900 font-medium">
                            <div className="font-semibold">{holding.symbol}</div>
                          </td>
                          <td className="p-3 text-gray-700">
                            <div className="text-sm">{holding.name}</div>
                          </td>
                          <td className="p-3 text-right text-gray-900 font-medium">
                            {fmtNum(holding.quantity)}
                          </td>
                          <td className="p-3 text-right text-gray-700">
                            {fmtMoney(holding.currentPrice)}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-green-600">
                              {fmtMoney(holding.marketValue)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-medium ${
                              (holding.unrealized || 0) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {fmtMoney(holding.unrealized)}
                            </span>
                          </td>
                          {data.tradingActions?.canPlaceOrders && isSnapTradeAccount && (
                            <td className="p-3 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                  onClick={() => handleOpenTrade(holding.symbol, 'BUY')}
                                >
                                  Buy
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                  onClick={() => handleOpenTrade(holding.symbol, 'SELL', holding.quantity)}
                                >
                                  Sell
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-600">No holdings found in this account</p>
                </div>
              )}
            </section>

            {/* Orders Section with skeleton */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold text-sm mr-3">📋</div>
                Orders
              </h3>
              
              {snapTradeQueries.orders.isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
              ) : snapTradeQueries.orders.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Orders Error</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {(snapTradeQueries.orders.error as any)?.message || 'Failed to load orders'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Card title="Order History">
                  <List items={data.positionsAndOrders?.orderHistory || []} empty="No recent orders" render={(order: any) => (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-gray-700 text-sm">
                      <span className="font-medium text-gray-900">{order.symbol || '—'}</span>
                      <span className="text-right">{(order.side || '').toUpperCase()} {fmtNum(order.quantity)}</span>
                      <span className="text-right">{fmtMoney(order.averageFillPrice?.amount)}</span>
                      <span className="text-right hidden md:block">{fmtNum(order.quantity)}</span>
                      <span className="text-right text-gray-500 hidden md:block">{fmtTime(order.placedAt)}</span>
                    </div>
                  )}/>
                </Card>
              )}
            </section>

            {/* Activities Section with skeleton */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center text-white font-bold text-sm mr-3">🏛️</div>
                Activity and Transactions
              </h3>
              
              {snapTradeQueries.activities.isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
              ) : snapTradeQueries.activities.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">Activity Error</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {(snapTradeQueries.activities.error as any)?.message || 'Failed to load activity'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Card title="Recent Activity">
                  <List items={data.activityAndTransactions || []} empty="No recent activity" render={(activity: any) => (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-gray-700 text-sm">
                      <span className="font-medium text-gray-900">{activity.type}</span>
                      <span className="font-medium text-gray-700">{activity.symbol || '—'}</span>
                      <span className="text-right font-medium">{fmtMoney(activity.amount)}</span>
                      <span className="text-right font-medium hidden md:block">{fmtNum(activity.quantity)}</span>
                      <span className="text-right text-gray-500 hidden md:block">{fmtTime(activity.timestamp)}</span>
                    </div>
                  )}/>
                </Card>
              )}
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 bg-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Updated: {fmtTime(data.metadata?.fetched_at || new Date().toISOString())}</span>
                  </div>
                  {(snapTradeQueries.details.data?.fromCache || 
                    snapTradeQueries.balances.data?.fromCache || 
                    snapTradeQueries.positions.data?.fromCache || 
                    snapTradeQueries.orders.data?.fromCache || 
                    snapTradeQueries.activities.data?.fromCache) && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200" data-testid="cache-indicator">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      <span className="text-yellow-700 font-medium">Cached data (updates every 5 min)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div className="mx-6 mb-6">
            {/* Handle authentication errors (401/403) */}
            {errorDetails?.status === 401 ? (
              <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
                <div className="mx-auto w-16 h-16 mb-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Please sign in again
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your session has expired. Please log in again to view your account details.
                </p>
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 text-base font-medium"
                  data-testid="button-login"
                >
                  Login
                </Button>
              </div>
            ) : errorDetails?.status === 403 ? (
              <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-lg">
                <div className="mx-auto w-16 h-16 mb-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Session expired (CSRF)
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your security token has expired. Please refresh the page and try again.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 text-base font-medium"
                  data-testid="button-refresh"
                >
                  Refresh and try again
                </Button>
              </div>
            ) : errorDetails?.isTransient || errorDetails?.shouldRetry || errorDetails?.status === 503 || errorDetails?.code === 'TEMPORARY_ERROR' || errorDetails?.code === 'TEMPORARY_UNAVAILABLE' ? (
              /* Transient errors - show yellow Retry button */
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h4 className="font-semibold text-yellow-900">
                      Temporarily Unavailable
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {errorDetails?.message || 'Service temporarily unavailable. Please try again in a moment.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (isSnapTradeAccount) {
                      snapTradeQueries.details.refetch();
                      snapTradeQueries.balances.refetch();
                      snapTradeQueries.positions.refetch();
                      snapTradeQueries.orders.refetch();
                      snapTradeQueries.activities.refetch();
                    } else {
                      refetch();
                    }
                  }}
                  className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white"
                  data-testid="button-retry"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : errorDetails?.isDisconnected || errorDetails?.code === 'DISCONNECTED' || errorDetails?.code === 'AUTH_EXPIRED' || errorDetails?.status === 410 ? (
              /* Permanent disconnection - show red Reconnect button */
              <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
                <div className="mx-auto w-16 h-16 mb-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Account Disconnected
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {errorDetails?.message || 'It looks like access expired or was revoked. Reconnect to view your account details and continue managing your finances.'}
                </p>
                <Button
                  onClick={handleReconnectAccount}
                  disabled={isReconnecting}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 text-base font-medium"
                  data-testid="button-reconnect"
                >
                  {isReconnecting ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Reconnecting...
                    </>
                  ) : (
                    'Reconnect account'
                  )}
                </Button>
              </div>
            ) : (
              /* Generic errors - show gray Try Again button */
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Failed to load account details
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {errorDetails?.message || 'Please check your connection and try again.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (isSnapTradeAccount) {
                      snapTradeQueries.details.refetch();
                      snapTradeQueries.balances.refetch();
                      snapTradeQueries.positions.refetch();
                      snapTradeQueries.orders.refetch();
                      snapTradeQueries.activities.refetch();
                    } else {
                      refetch();
                    }
                  }}
                  className="mt-3"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
                {isDev && (
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="text-xs text-gray-500 underline mt-2 ml-2"
                  >
                    {showErrorDetails ? 'Hide' : 'View'} error details
                  </button>
                )}
                {isDev && showErrorDetails && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700">
                    <div>Code: {errorDetails?.code || 'Unknown'}</div>
                    <div>Message: {errorDetails?.message || 'No message'}</div>
                    <div>Status: {errorDetails?.status || 'Unknown'}</div>
                    <div>isTransient: {String(errorDetails?.isTransient || false)}</div>
                    <div>shouldRetry: {String(errorDetails?.shouldRetry || false)}</div>
                    {errorDetails?.accountId && <div>Account: {errorDetails.accountId}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legacy UI for non-SnapTrade accounts (Teller, MetaMask) */}
        {data && !isSnapTradeAccount && (
          <div className="space-y-8 overflow-y-auto max-h-[75vh] p-6 bg-[#F4F2ED]">
            
            {/* CREDIT CARD LAYOUT - Teller credit cards get special treatment */}
            {data.provider === 'teller' && data.creditCardInfo ? (
              <>
                {/* 1. Credit Card Overview (FIRST for credit cards) */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm mr-3">💳</div>
                    Credit Card Overview
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Credit Limit</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {(() => {
                          // Calculate from the same values shown in Spent and Available Credit boxes
                          const spent = data.creditCardInfo?.amountSpent || data.balances?.ledger || 0;
                          const available = data.creditCardInfo?.availableCredit || data.balances?.available || 0;
                          const creditLimit = spent + available;
                          
                          return creditLimit > 0 ? fmtMoney(creditLimit) : (
                            <span className="text-gray-500" title="Not provided by issuer">N/A</span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Spent</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {data.creditCardInfo?.amountSpent ? fmtMoney(data.creditCardInfo?.amountSpent) : 
                         data.balances?.ledger ? fmtMoney(data.balances?.ledger) : (
                          <span className="text-gray-500" title="Not provided by issuer">N/A</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Available Credit</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {data.creditCardInfo?.availableCredit ? fmtMoney(data.creditCardInfo?.availableCredit) : 
                         data.balances?.available ? fmtMoney(data.balances?.available) : (
                          <span className="text-gray-500" title="Not provided by issuer">N/A</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Utilization</div>
                      <div className="text-2xl font-bold mt-1">
                        {data.creditCardInfo?.creditUtilization !== null && data.creditCardInfo?.creditUtilization !== undefined ? (
                          <span className={
                            data.creditCardInfo.creditUtilization < 30 
                              ? 'text-green-600'
                              : data.creditCardInfo.creditUtilization < 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }>
                            {data.creditCardInfo.creditUtilization.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-500" title="Not provided by issuer">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Account Information */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">ℹ️</div>
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Info label="Account ID" value={data.accountOverview?.id || data.account?.id || '—'} />
                    <Info label="Institution" value={data.accountOverview?.institution?.name || data.account?.institution?.name || '—'} />
                    <Info label="Card Type" value={fmtSubtype(data.accountOverview?.subtype || data.account?.subtype) || 'Credit Card'} />
                    <Info label="Last 4" value={data.accountOverview?.last_four || data.account?.last4 || '—'} />
                  </div>
                </section>
              </>
            ) : data.provider === 'teller' ? (
              /* BANK ACCOUNT LAYOUT - Checking/Savings accounts */
              <>
                {/* 1. Balances (FIRST for bank accounts) */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">💰</div>
                    Balances
                  </h3>
                  
                  {/* Emphasized Current & Available balances for bank accounts */}
                  <div className="mb-6 p-6 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Current Balance</div>
                        <div className="text-4xl font-bold text-green-700">
                          {data.balances?.current ? fmtMoney(data.balances?.current) : 
                           data.balances?.ledger ? fmtMoney(data.balances?.ledger) : (
                            <span className="text-gray-500" title="Not provided by bank">N/A</span>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Available Balance</div>
                        <div className="text-4xl font-bold text-green-700">
                          {data.balances?.available ? fmtMoney(data.balances?.available) : (
                            <span className="text-gray-500" title="Not provided by bank">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional balance details */}
                    {(data.balances?.ledger && data.balances?.ledger !== data.balances?.available) && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="text-center">
                          <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Ledger Balance</div>
                          <div className="text-lg font-semibold text-green-700 flex items-center justify-center gap-1">
                            {fmtMoney(data.balances?.ledger)}
                            <span className="text-xs text-gray-500 cursor-help" title="Ledger includes pending transactions; available is what you can use right now">ℹ️</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. Account Identifiers */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm mr-3">🔒</div>
                    Account Identifiers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Info label="Account Number" value={data.accountDetails?.accountNumberMask || '—'} />
                    <Info label="Status" value={data.accountOverview?.status || data.account?.status || '—'} />
                  </div>
                </section>

                {/* 3. Account Information */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm mr-3">ℹ️</div>
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Info label="Institution" value={data.accountOverview?.institution?.name || data.account?.institution?.name || '—'} />
                    <Info label="Account Subtype" value={fmtSubtype(data.accountOverview?.subtype || data.account?.subtype)} />
                  </div>
                </section>
              </>
            ) : data.provider === 'metamask' ? (
              /* CRYPTO WALLET LAYOUT - MetaMask accounts */
              <>
                {/* 1. Wallet Information */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm mr-3">🦊</div>
                    Wallet Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Info label="Wallet" value={data.account?.name || 'MetaMask'} />
                    <Info label="Address" value={data.account?.accountNumber || data.account?.walletAddress?.slice(0, 10) + '...' || '—'} />
                    <Info label="Status" value={data.account?.status || 'connected'} />
                  </div>
                </section>

                {/* 2. Portfolio Value */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">💰</div>
                    Portfolio Value
                  </h3>
                  <div className="mb-6 p-6 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-center">
                      <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-2">Total Value</div>
                      <div className="text-4xl font-bold text-orange-700">
                        {fmtMoney(data.balancesAndHoldings?.totalValue || data.account?.balance || 0)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Token Holdings */}
                {data.positions && data.positions.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm mr-3">🪙</div>
                      Token Holdings ({data.positions.length})
                    </h3>
                    <div className="space-y-3">
                      {data.positions.map((pos: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-gray-200 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-gray-900">{pos.symbol}</div>
                            <div className="text-sm text-gray-500">{pos.name}</div>
                            <div className="text-xs text-gray-400">{pos.quantity?.toFixed(6)} tokens</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{fmtMoney(pos.marketValue || pos.currentValue || 0)}</div>
                            <div className="text-sm text-gray-500">@ {fmtMoney(pos.currentPrice || 0)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. Network Info */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    Network Info
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {metamaskConnected && chainId ? (
                          <>
                            <Badge 
                              variant={chainId === '0x1' ? 'default' : 'secondary'}
                              className={chainId === '0x1' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}
                            >
                              {getChainName(chainId)}
                            </Badge>
                            {chainId !== '0x1' && (
                              <span className="text-xs text-yellow-500">Not on Mainnet</span>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge className="bg-green-600 text-white">
                              Ethereum Mainnet
                            </Badge>
                            <span className="text-xs text-gray-400">(Holdings synced from Mainnet)</span>
                          </>
                        )}
                      </div>
                      {metamaskConnected && chainId && chainId !== '0x1' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSwitchToMainnet}
                          disabled={isSwitchingChain}
                          className="text-xs"
                          data-testid="button-switch-mainnet"
                        >
                          {isSwitchingChain ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                          )}
                          Switch to Mainnet
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                {/* 5. Recent Transactions */}
                {pendingTxs.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                        <Clock className="h-4 w-4" />
                      </div>
                      Recent Transactions ({pendingTxs.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingTxs.slice(-5).reverse().map((tx) => (
                        <div 
                          key={tx.txHash} 
                          className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            {tx.status === 'pending' && (
                              <Badge className="bg-yellow-500 text-white">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Pending
                              </Badge>
                            )}
                            {tx.status === 'confirmed' && (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Confirmed
                              </Badge>
                            )}
                            {tx.status === 'failed' && (
                              <Badge className="bg-red-500 text-white">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            <span className="font-mono text-xs text-gray-400">
                              {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                            </span>
                          </div>
                          {chainId && (
                            <a
                              href={getBlockExplorerTxUrl(chainId, tx.txHash) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-yellow-600 hover:text-blue-300"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 6. Send Tokens */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm mr-3">
                      <Send className="h-4 w-4" />
                    </div>
                    Send Tokens
                  </h3>
                  <div className="p-6 rounded-lg bg-gray-50 border border-gray-200">
                    {metamaskConnected && metamaskAccount ? (
                      <div className="space-y-4">
                        {/* Token Selector */}
                        <div>
                          <Label className="text-sm font-medium text-gray-300">
                            Select Token
                          </Label>
                          <Select 
                            value={selectedToken} 
                            onValueChange={setSelectedToken}
                          >
                            <SelectTrigger className="mt-1" data-testid="select-token">
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* ETH option with balance */}
                              {(() => {
                                const ethPos = data.positions?.find((p: any) => p.symbol?.toUpperCase() === 'ETH');
                                const ethBalance = ethPos?.quantity || 0;
                                return (
                                  <SelectItem value="ETH">
                                    <span className="flex justify-between items-center w-full">
                                      <span>ETH (Ethereum)</span>
                                      <span className="text-gray-400 text-xs ml-2">{ethBalance.toFixed(6)}</span>
                                    </span>
                                  </SelectItem>
                                );
                              })()}
                              {data.positions?.filter((pos: any) => pos.symbol?.toUpperCase() !== 'ETH').map((pos: any, idx: number) => (
                                <SelectItem key={idx} value={pos.symbol || `token-${idx}`}>
                                  <span className="flex justify-between items-center w-full">
                                    <span>{pos.symbol} {pos.name ? `(${pos.name})` : ''}</span>
                                    <span className="text-gray-400 text-xs ml-2">{(pos.quantity || 0).toFixed(6)}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Show available balance for selected token */}
                          {(() => {
                            const selectedPos = selectedToken === 'ETH' 
                              ? data.positions?.find((p: any) => p.symbol?.toUpperCase() === 'ETH')
                              : data.positions?.find((p: any) => p.symbol === selectedToken);
                            const balance = selectedPos?.quantity || 0;
                            return (
                              <div className="mt-1 text-xs text-gray-400">
                                Available: <span className="text-gray-300 font-medium">{balance.toFixed(6)} {selectedToken}</span>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div>
                          <Label htmlFor="eth-recipient" className="text-sm font-medium text-gray-300">
                            Recipient Address
                          </Label>
                          <Input
                            id="eth-recipient"
                            type="text"
                            placeholder="0x..."
                            value={ethTransferAddress}
                            onChange={(e) => setEthTransferAddress(e.target.value)}
                            className="mt-1 font-mono text-sm"
                            data-testid="input-eth-recipient"
                          />
                        </div>
                        <div>
                          <Label htmlFor="eth-amount" className="text-sm font-medium text-gray-300">
                            Amount ({selectedToken})
                          </Label>
                          <Input
                            id="eth-amount"
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder="0.01"
                            value={ethTransferAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Prevent negative values - allow empty string for clearing
                              if (val === '' || parseFloat(val) >= 0) {
                                setEthTransferAmount(val);
                              } else if (parseFloat(val) < 0) {
                                setEthTransferAmount('0');
                              }
                            }}
                            onKeyDown={(e) => {
                              // Prevent minus key
                              if (e.key === '-' || e.key === 'e') {
                                e.preventDefault();
                              }
                            }}
                            className="mt-1"
                            data-testid="input-eth-amount"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            const tokenPos = data.positions?.find((p: any) => p.symbol === selectedToken);
                            handleTokenTransfer(tokenPos ? {
                              symbol: tokenPos.symbol,
                              contractAddress: tokenPos.contractAddress,
                              decimals: tokenPos.decimals
                            } : undefined);
                          }}
                          disabled={isTransferring || !ethTransferAddress || !ethTransferAmount}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                          data-testid="button-send-token"
                        >
                          {isTransferring ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send {selectedToken}
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          MetaMask will prompt you to confirm the transaction
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-600/20 flex items-center justify-center">
                          <span className="text-2xl">🦊</span>
                        </div>
                        <p className="text-gray-300 mb-4">
                          Connect your wallet to send tokens
                        </p>
                        <Button
                          onClick={async () => {
                            try {
                              await sdk?.connect();
                            } catch (err) {
                              console.error('Failed to connect:', err);
                            }
                          }}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                          data-testid="button-connect-metamask-dialog"
                        >
                          <span className="mr-2">🦊</span>
                          Connect MetaMask
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              /* BROKERAGE ACCOUNT LAYOUT - SnapTrade accounts */
              <>
                {/* 1. Account Information */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">1</div>
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Info label="Account ID" value={data.accountOverview?.number || data.accountOverview?.id?.slice(-6) || '—'} />
                    <Info label="Brokerage" value={data.accountOverview?.institution?.name || '—'} />
                    <Info label="Account Type" value={data.accountOverview?.subtype || data.accountOverview?.type || '—'} />
                    <Info label="Currency" value={data.accountOverview?.currency || 'USD'} />
                  </div>
                </section>

                {/* 2. Live Balances */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm mr-3">2</div>
                    Live Balances
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Info label="Cash" value={fmtMoney(data.balances?.cash || data.accountOverview?.balance?.cash)} />
                    <Info label="Equity" value={fmtMoney(data.balances?.equity || data.accountOverview?.balance?.equity)} />
                    <Info label="Buying Power" value={fmtMoney(data.balances?.total || data.accountOverview?.balance?.total)} />
                  </div>
                </section>
              </>
            )}

            {/* NO TRADING SECTIONS FOR TELLER ACCOUNTS - Only for brokerage accounts */}

                {/* Recent Transactions */}
                {data.transactions && data.transactions.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm mr-3">🏪</div>
                      Recent Transactions
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {data.transactions.slice(0, 10).map((txn: any, index: number) => {
                        const merchantName = txn.description || txn.merchant || '';
                        const institutionName = data.accountOverview?.institution?.name || data.institution?.name || '';
                        const logoData = getMerchantLogo(merchantName, institutionName);
                        
                        return (
                          <div key={txn.id || index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${logoData.bgClass}`}>
                              <div className="h-full w-full flex items-center justify-center [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>svg]:h-6 [&>svg]:w-6">
                                {logoData.logo}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {txn.description || txn.merchant || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className={`font-bold text-sm whitespace-nowrap ${
                              (txn.amount || 0) < 0 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {fmtMoney(Math.abs(txn.amount || 0))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}


            {/* e) Statements - Built into the credit card layout above */}

            {/* 4. Card Payments - COMING SOON */}
            {data.provider === 'teller' && data.creditCardInfo && (
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm mr-3">💳</div>
                  Card Payments
                </h3>
                <div className="p-6 bg-white rounded-lg border border-gray-200 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">COMING SOON</h4>
                  <p className="text-gray-600 text-sm">
                    Credit card payment functionality will be available in a future release.
                  </p>
                </div>
              </section>
            )}

            {/* Regular Statements - Only for non-credit cards */}
            {data.provider === 'teller' && !data.creditCardInfo && data.statements && data.statements.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">📄</div>
                  Statements
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-900">Period</th>
                        <th className="text-left p-3 font-semibold text-gray-900">Start Date</th>
                        <th className="text-left p-3 font-semibold text-gray-900">End Date</th>
                        <th className="text-left p-3 font-semibold text-gray-900">Status</th>
                        <th className="text-center p-3 font-semibold text-gray-900">Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.statements.map((stmt: any, index: number) => (
                        <tr key={stmt.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <td className="p-3 text-gray-900 font-medium">
                            {stmt.period}
                          </td>
                          <td className="p-3 text-gray-900">
                            {stmt.startDate ? new Date(stmt.startDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3 text-gray-900">
                            {stmt.endDate ? new Date(stmt.endDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              stmt.status === 'available' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {stmt.status || 'Available'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {stmt.downloadUrl ? (
                              <a
                                href={stmt.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-900 transition-colors text-xs"
                              >
                                Download PDF
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Not Available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* BROKERAGE-ONLY SECTIONS - Only show for SnapTrade accounts, NOT Teller or MetaMask accounts */}
            {data.provider !== 'teller' && data.provider !== 'metamask' && (
              <>
                {/* 3. Positions and Orders - BROKERAGE ONLY */}
                <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm mr-3">📊</div>
                Holdings & Positions
              </h3>
              
              {/* Display holdings from the API response */}
              {data.holdings && data.holdings.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-900">Symbol</th>
                          <th className="text-left p-3 font-semibold text-gray-900">Description</th>
                          <th className="text-right p-3 font-semibold text-gray-900">Quantity</th>
                          <th className="text-right p-3 font-semibold text-gray-900">Current Price</th>
                          <th className="text-right p-3 font-semibold text-gray-900">Market Value</th>
                          <th className="text-right p-3 font-semibold text-gray-900">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.holdings.map((holding: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                            <td className="p-3 text-gray-900 font-medium">
                              <div className="font-semibold">
                                {holding.symbol || '—'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {holding.type || ''}
                              </div>
                            </td>
                            <td className="p-3 text-gray-900">
                              <div className="text-sm">
                                {holding.description || '—'}
                              </div>
                            </td>
                            <td className="p-3 text-right text-gray-900 font-medium">
                              {fmtNum(holding.quantity || 0)}
                            </td>
                            <td className="p-3 text-right text-gray-900">
                              {fmtMoney(holding.currentPrice || 0)}
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-green-600">
                                {fmtMoney(holding.marketValue || 0)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-medium ${
                                (holding.unrealizedPnL || 0) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {fmtMoney(holding.unrealizedPnL || 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center mb-6">
                  <p className="text-gray-600">No holdings found in this account</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="Active Positions (Legacy)">
                  <List items={data.positionsAndOrders?.activePositions || []} empty="No active positions" render={(p: any) => (
                    <div className="flex justify-between">
                      <span>{extractSymbol(p.symbol || p.ticker || p.instrument?.symbol)}</span>
                      <span className="text-right">{fmtNum(p.quantity ?? p.qty)}</span>
                    </div>
                  )}/>
                </Card>
                <Card title="Pending Orders">
                  <List items={data.positionsAndOrders?.pendingOrders || []} empty="No pending orders" render={(o: any) => (
                    <div className="grid grid-cols-4 gap-2">
                      <span>{extractSymbol(o.symbol || o.ticker)}</span>
                      <span className="text-right">{(o.side || o.action || '').toUpperCase()}</span>
                      <span className="text-right">{fmtNum(o.quantity || o.qty)}</span>
                      <span className="text-right">{fmtMoney(o.limitPrice ?? o.price)}</span>
                    </div>
                  )}/>
                </Card>
              </div>
              
              <div className="mt-4">
                <Card title="Order History">
                  <List items={data.positionsAndOrders?.orderHistory || []} empty="No order history" render={(o: any) => (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                      <span>{extractSymbol(o.symbol || o.ticker)}</span>
                      <span className="text-right">{(o.side || o.action || '').toUpperCase()} {fmtNum(o.quantity || o.qty)}</span>
                      <span className="text-right">{fmtMoney(o.avgFillPrice ?? o.fillPrice ?? o.price)}</span>
                      <span className="text-right hidden md:block">{fmtNum(o.quantity || o.qty)}</span>
                      <span className="text-right text-gray-500 hidden md:block">{fmtTime(o.time || o.timestamp || o.date)}</span>
                    </div>
                  )}/>
                </Card>
              </div>
            </section>

            {/* 4. Trading Actions - COMING SOON for MVP */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm mr-3">4</div>
                Trading Actions
              </h3>
              <div className="p-6 bg-white rounded-lg border border-gray-200 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">COMING SOON</h4>
                <p className="text-gray-600 text-sm">
                  Trading functionality will be available in a future release. Focus on transfers and payments for now.
                </p>
              </div>
            </section>

            {/* 5. Activity and Transactions */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">5</div>
                Activity and Transactions
              </h3>
              <Card title="Recent Activity">
                <List items={data.activityAndTransactions || data.transactions || []} empty="No recent activity" render={(a: any) => (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-gray-900 text-sm">
                    <span className="font-medium text-gray-800">{a.type}</span>
                    <span className="font-medium text-gray-800">{extractSymbol(a.symbol)}</span>
                    <span className="text-right font-medium text-gray-800">{fmtMoney(a.amount)}</span>
                    <span className="text-right font-medium text-gray-800 hidden md:block">{fmtNum(a.quantity)}</span>
                    <span className="text-right text-gray-600 hidden md:block">{fmtTime(a.timestamp)}</span>
                  </div>
                )}/>
              </Card>
            </section>
              </>
            )}

            {/* Footer with metadata */}
            <div className="mt-8 pt-6 border-t border-gray-200 bg-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                    <Clock className="h-4 w-4 text-gray-700" />
                    <span className="font-medium">Updated: {fmtTime(data.metadata?.fetched_at || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Order Preview Dialog */}
      <OrderPreviewDialog
        isOpen={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        accountId={accountId}
        accountName={data?.accountInformation?.name || 'Unknown Account'}
        cashBalance={data?.balancesAndHoldings?.cash || 0}
        initialSymbol={tradeSymbol}
        initialAction={tradeAction}
        initialQuantity={tradeQuantity}
      />
      
      {/* Order Status Dialog */}
      <OrderStatusDialog
        isOpen={orderStatusDialogOpen}
        onClose={() => setOrderStatusDialogOpen(false)}
        accountId={accountId}
        accountName={data?.accountInformation?.name || 'Unknown Account'}
      />
      
      {/* Custom Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Payment Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={customPaymentAmount}
                onChange={(e) => setCustomPaymentAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCustomPayment}
                disabled={paymentMutation.isPending}
                className="flex-1"
              >
                {paymentMutation.isPending ? 'Processing...' : 'Pay Now'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}