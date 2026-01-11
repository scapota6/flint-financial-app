import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Activity,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  X
} from "lucide-react";

interface BrokerageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
}

interface AccountDetails {
  id: string;
  name: string;
  number: string;
  brokerage: string;
  type: string;
  status: string;
  currency: string;
}

interface AccountBalances {
  cash: number;
  equity: number;
  buyingPower: number;
}

interface Position {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPL: number;
  isOption?: boolean;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  orderType: string;
  price?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  filledQuantity?: number;
}

interface Activity {
  id: string;
  type: string;
  symbol?: string;
  amount?: number;
  quantity?: number;
  description: string;
  timestamp: string;
}

export function BrokerageAccountModal({
  isOpen,
  onClose,
  accountId,
  accountName,
}: BrokerageAccountModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch account details
  const { data: accountDetails, isLoading: detailsLoading } = useQuery<AccountDetails>({
    queryKey: ['/api/snaptrade/accounts', accountId, 'details'],
    enabled: isOpen && !!accountId,
  });

  // Fetch account balances  
  const { data: balances, isLoading: balancesLoading } = useQuery<AccountBalances>({
    queryKey: ['/api/snaptrade/accounts', accountId, 'balances'],
    enabled: isOpen && !!accountId,
  });

  // Fetch positions
  const { data: positions, isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/snaptrade/accounts', accountId, 'positions'],
    enabled: isOpen && !!accountId,
  });

  // Fetch orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/snaptrade/accounts', accountId, 'orders'],
    enabled: isOpen && !!accountId,
  });

  // Fetch activities
  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/snaptrade/accounts', accountId, 'activities'],
    enabled: isOpen && !!accountId,
  });

  const formatCurrency = (amount: number | undefined, currency = 'USD') => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHeader = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {accountDetails?.brokerage?.charAt(0).toUpperCase() || 'B'}
          </span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{accountDetails?.brokerage || 'Brokerage'}</h3>
          <p className="text-gray-600">
            {accountDetails?.number ? `****${accountDetails.number.slice(-4)}` : 'N/A'} • {accountDetails?.type || 'Investment'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Account Name:</span>
          <p className="font-medium text-gray-900">{accountDetails?.name || accountName}</p>
        </div>
        <div>
          <span className="text-gray-600">Status:</span>
          <Badge variant={accountDetails?.status === 'open' ? 'default' : 'secondary'}>
            {accountDetails?.status || 'open'}
          </Badge>
        </div>
        <div>
          <span className="text-gray-600">Base Currency:</span>
          <p className="font-medium text-gray-900">{accountDetails?.currency || 'USD'}</p>
        </div>
      </div>
    </div>
  );

  const renderBalances = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Account Balances</h3>
      </div>
      
      {balancesLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-600 text-sm">Cash Available</span>
            <p className="font-bold text-xl text-green-600">
              {formatCurrency(balances?.cash, accountDetails?.currency)}
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Equity Value</span>
            <p className="font-bold text-xl text-blue-600">
              {formatCurrency(balances?.equity, accountDetails?.currency)}
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Buying Power</span>
            <p className="font-bold text-xl text-blue-600">
              {formatCurrency(balances?.buyingPower, accountDetails?.currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderHoldings = () => {
    const regularPositions = (positions || []).filter((p: Position) => !p.isOption);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Holdings</h3>
        </div>
        
        {positionsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : regularPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No holdings in this account</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-gray-600">Symbol</TableHead>
                  <TableHead className="text-gray-600">Quantity</TableHead>
                  <TableHead className="text-gray-600">Avg Price</TableHead>
                  <TableHead className="text-gray-600">Market Price</TableHead>
                  <TableHead className="text-gray-600">Market Value</TableHead>
                  <TableHead className="text-gray-600">Unrealized P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularPositions.map((position: Position, index: number) => (
                  <TableRow key={index} className="border-gray-200">
                    <TableCell className="font-medium text-gray-900">
                      {position.symbol}
                      {position.name && (
                        <div className="text-xs text-gray-600">{position.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-900">{position.quantity}</TableCell>
                    <TableCell className="text-gray-900">
                      {formatCurrency(position.averagePrice, accountDetails?.currency)}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {formatCurrency(position.marketPrice, accountDetails?.currency)}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {formatCurrency(position.marketValue, accountDetails?.currency)}
                    </TableCell>
                    <TableCell className={position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {position.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPL, accountDetails?.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const renderOrders = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
      </div>
      
      {ordersLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No orders found for this account</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-gray-600">Symbol</TableHead>
                <TableHead className="text-gray-600">Side</TableHead>
                <TableHead className="text-gray-600">Quantity</TableHead>
                <TableHead className="text-gray-600">Type</TableHead>
                <TableHead className="text-gray-600">Price</TableHead>
                <TableHead className="text-gray-600">Status</TableHead>
                <TableHead className="text-gray-600">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: Order) => (
                <TableRow key={order.id} className="border-gray-200">
                  <TableCell className="font-medium text-gray-900">{order.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={order.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {order.side.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {order.filledQuantity ? `${order.filledQuantity}/${order.quantity}` : order.quantity}
                  </TableCell>
                  <TableCell className="text-gray-900">{order.orderType}</TableCell>
                  <TableCell className="text-gray-900">
                    {order.price ? formatCurrency(order.price, accountDetails?.currency) : 'Market'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-xs">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
      </div>
      
      {activitiesLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity for this account</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-gray-600">Type</TableHead>
                <TableHead className="text-gray-600">Description</TableHead>
                <TableHead className="text-gray-600">Symbol</TableHead>
                <TableHead className="text-gray-600">Amount</TableHead>
                <TableHead className="text-gray-600">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity: Activity) => (
                <TableRow key={activity.id} className="border-gray-200">
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-900 max-w-48 truncate">
                    {activity.description}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {activity.symbol || '-'}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {activity.amount ? formatCurrency(activity.amount, accountDetails?.currency) : '-'}
                  </TableCell>
                  <TableCell className="text-gray-600 text-xs">
                    {formatDate(activity.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const renderOptions = () => {
    const optionPositions = (positions || []).filter((p: Position) => p.isOption);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <MoreHorizontal className="h-5 w-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-gray-900">Options Positions</h3>
        </div>
        
        {positionsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : optionPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <MoreHorizontal className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No options positions in this account</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-gray-600">Symbol</TableHead>
                  <TableHead className="text-gray-600">Quantity</TableHead>
                  <TableHead className="text-gray-600">Avg Price</TableHead>
                  <TableHead className="text-gray-600">Market Value</TableHead>
                  <TableHead className="text-gray-600">Unrealized P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optionPositions.map((position: Position, index: number) => (
                  <TableRow key={index} className="border-gray-200">
                    <TableCell className="font-medium text-gray-900">
                      {position.symbol}
                    </TableCell>
                    <TableCell className="text-gray-900">{position.quantity}</TableCell>
                    <TableCell className="text-gray-900">
                      {formatCurrency(position.averagePrice, accountDetails?.currency)}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {formatCurrency(position.marketValue, accountDetails?.currency)}
                    </TableCell>
                    <TableCell className={position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {position.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPL, accountDetails?.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] bg-[#F4F2ED] border-gray-200 text-gray-900 overflow-hidden">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Account Details</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header Section */}
            {detailsLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
            ) : (
              renderHeader()
            )}
            
            <Separator className="bg-gray-200" />
            
            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-white">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gray-100">Overview</TabsTrigger>
                <TabsTrigger value="holdings" className="data-[state=active]:bg-gray-100">Holdings</TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-gray-100">Orders</TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-gray-100">Activity</TabsTrigger>
                <TabsTrigger value="options" className="data-[state=active]:bg-gray-100">Options</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                {renderBalances()}
              </TabsContent>
              
              <TabsContent value="holdings" className="mt-6">
                {renderHoldings()}
              </TabsContent>
              
              <TabsContent value="orders" className="mt-6">
                {renderOrders()}
              </TabsContent>
              
              <TabsContent value="activity" className="mt-6">
                {renderActivity()}
              </TabsContent>
              
              <TabsContent value="options" className="mt-6">
                {renderOptions()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
