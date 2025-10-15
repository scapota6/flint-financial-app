import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, TrendingUp, User, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
  tellerConnections: Array<{
    id: number;
    institutionName: string;
    enrollmentId: string;
    status: string;
    lastFourDigits: string | null;
    accountType: string;
    balance: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  snaptradeConnections: Array<{
    id: number;
    brokerageAuthorizationId: string;
    brokerageName: string;
    disabled: boolean;
    lastSyncAt: string | null;
    updatedAt: string;
  }>;
  snaptradeUser: {
    snaptradeUserId: string;
    registeredAt: string;
  } | null;
  stats: {
    totalConnections: number;
    tellerCount: number;
    snaptradeCount: number;
  };
}

export default function UserDashboardModal({ 
  open, 
  onOpenChange, 
  userId, 
  userName 
}: UserDashboardModalProps) {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/admin-panel/users', userId, 'dashboard-view'],
    enabled: open && !!userId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh]" data-testid="modal-user-dashboard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-user-dashboard">
            <User className="h-5 w-5" />
            Dashboard View: {userName}
          </DialogTitle>
          <DialogDescription data-testid="description-user-dashboard">
            Complete view of user connections and subscription details
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12" data-testid="loading-dashboard">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-400" data-testid="error-dashboard">
            Failed to load dashboard data
          </div>
        )}

        {data && (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6" data-testid="content-dashboard">
              {/* User Info Card */}
              <Card className="bg-gray-800 border-gray-700" data-testid="card-user-info">
                <CardHeader>
                  <CardTitle className="text-sm" data-testid="title-user-info">User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="font-medium" data-testid="text-user-name">{data.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="font-medium" data-testid="text-user-email">{data.user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Subscription Tier</p>
                      <Badge className="bg-purple-600 mt-1" data-testid="badge-subscription-tier">
                        {data.user.subscriptionTier}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Subscription Status</p>
                      <Badge 
                        className={`mt-1 ${
                          data.user.subscriptionStatus === 'active' ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        data-testid="badge-subscription-status"
                      >
                        {data.user.subscriptionStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Stats */}
              <div className="grid grid-cols-3 gap-4" data-testid="section-connection-stats">
                <Card className="bg-gray-800 border-gray-700" data-testid="card-total-connections">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Total Connections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-total-connections">
                      {data.stats.totalConnections}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700" data-testid="card-teller-count">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400">Teller Accounts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-teller-count">
                      {data.stats.tellerCount}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700" data-testid="card-snaptrade-count">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      SnapTrade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-snaptrade-count">
                      {data.stats.snaptradeCount}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Teller Connections */}
              {data.tellerConnections.length > 0 && (
                <Card className="bg-gray-800 border-gray-700" data-testid="card-teller-connections">
                  <CardHeader>
                    <CardTitle className="text-sm" data-testid="title-teller-connections">
                      Teller Connections ({data.tellerConnections.length})
                    </CardTitle>
                    <CardDescription>Banking and card accounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead>Institution</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.tellerConnections.map((conn) => (
                          <TableRow 
                            key={conn.id} 
                            className="border-gray-700" 
                            data-testid={`row-teller-${conn.id}`}
                          >
                            <TableCell data-testid={`text-teller-institution-${conn.id}`}>
                              {conn.institutionName}
                            </TableCell>
                            <TableCell className="capitalize" data-testid={`text-teller-type-${conn.id}`}>
                              {conn.accountType}
                            </TableCell>
                            <TableCell data-testid={`text-teller-balance-${conn.id}`}>
                              {conn.balance !== null ? `$${conn.balance.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={conn.status === 'connected' ? 'bg-green-600' : 'bg-gray-600'}
                                data-testid={`badge-teller-status-${conn.id}`}
                              >
                                {conn.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* SnapTrade Connections */}
              {data.snaptradeConnections.length > 0 && (
                <Card className="bg-gray-800 border-gray-700" data-testid="card-snaptrade-connections">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2" data-testid="title-snaptrade-connections">
                      <TrendingUp className="h-4 w-4" />
                      SnapTrade Connections ({data.snaptradeConnections.length})
                    </CardTitle>
                    <CardDescription>Brokerage accounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead>Brokerage</TableHead>
                          <TableHead>Authorization ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Sync</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.snaptradeConnections.map((conn) => (
                          <TableRow 
                            key={conn.id} 
                            className="border-gray-700" 
                            data-testid={`row-snaptrade-${conn.id}`}
                          >
                            <TableCell data-testid={`text-snaptrade-brokerage-${conn.id}`}>
                              {conn.brokerageName}
                            </TableCell>
                            <TableCell 
                              className="font-mono text-xs" 
                              data-testid={`text-snaptrade-auth-${conn.id}`}
                            >
                              {conn.brokerageAuthorizationId}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={conn.disabled ? 'bg-red-600' : 'bg-green-600'}
                                data-testid={`badge-snaptrade-status-${conn.id}`}
                              >
                                {conn.disabled ? 'Disabled' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-snaptrade-sync-${conn.id}`}>
                              {conn.lastSyncAt 
                                ? new Date(conn.lastSyncAt).toLocaleString()
                                : 'Never'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* SnapTrade User Info */}
              {data.snaptradeUser && (
                <Card className="bg-gray-800 border-gray-700" data-testid="card-snaptrade-user">
                  <CardHeader>
                    <CardTitle className="text-sm" data-testid="title-snaptrade-user">
                      SnapTrade Registration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">User ID</p>
                      <p className="font-mono text-sm" data-testid="text-snaptrade-user-id">
                        {data.snaptradeUser.snaptradeUserId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Registered At</p>
                      <p className="text-sm" data-testid="text-snaptrade-registered-at">
                        {new Date(data.snaptradeUser.registeredAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Connections Message */}
              {data.stats.totalConnections === 0 && (
                <div className="text-center py-8 text-gray-400" data-testid="text-no-connections">
                  This user has no connected accounts
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
