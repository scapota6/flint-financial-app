import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  Activity, 
  DollarSign, 
  FileText, 
  Settings, 
  Shield, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Ban,
  Key,
  Trash2,
  Flag,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  UserX,
  Eye
} from 'lucide-react';
import OrphanedAccountsTab from '@/components/admin/OrphanedAccountsTab';
import UserDashboardModal from '@/components/admin/UserDashboardModal';

// Type definitions for API responses
interface OverviewData {
  totalUsers: number;
  activeUsers: number;
  totalConnections: number;
  tellerConnections: number;
  snaptradeConnections: number;
  monthlyRevenue: string;
  annualRevenue: string;
}

interface ApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
}

interface Application {
  id: number;
  firstName: string;
  email: string;
  accountCount: string;
  connectType: string;
  status: string;
  submittedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isAdmin: boolean;
  isBanned: boolean;
  lastLogin: string;
}

interface Connection {
  id: number;
  userId: string;
  email: string;
  tier: string;
  isAdmin?: boolean;
  provider: string;
  accountId: string;
  accountType: string;
  accountName: string;
  institutionName: string;
  status: string;
  balance: number;
  lastSynced: string;
  createdAt: string;
  connectionCount?: number;
  connectionLimit?: number | 'unlimited';
  isOverLimit?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Admin check hook
function useAdminCheck() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isAdmin = (user as any)?.isAdmin === true;

  useEffect(() => {
    if (user && !isAdmin) {
      setLocation('/dashboard');
    }
  }, [user, isAdmin, setLocation]);

  return { isAdmin, isLoading: !user };
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const { isAdmin, isLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Admin Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <Badge className="bg-purple-600" data-testid="badge-admin-role">Administrator</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800" data-testid="tabs-admin-navigation">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">
              <FileText className="h-4 w-4 mr-2" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="connections" data-testid="tab-connections">
              <Activity className="h-4 w-4 mr-2" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Error Logs
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <Flag className="h-4 w-4 mr-2" />
              Feature Flags
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <Shield className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="snaptrade" data-testid="tab-snaptrade">
              <TrendingUp className="h-4 w-4 mr-2" />
              SnapTrade
            </TabsTrigger>
            <TabsTrigger value="orphaned-accounts" data-testid="tab-orphaned-accounts">
              <UserX className="h-4 w-4 mr-2" />
              Orphaned Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsTab />
          </TabsContent>

          <TabsContent value="snaptrade">
            <SnapTradeTab />
          </TabsContent>

          <TabsContent value="orphaned-accounts">
            <OrphanedAccountsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="logs">
            <ErrorLogsTab />
          </TabsContent>

          <TabsContent value="features">
            <FeatureFlagsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrailTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Tab - KPI Cards
function OverviewTab() {
  const { data: overview, isLoading } = useQuery<OverviewData>({
    queryKey: ['/api/admin-panel/analytics/overview'],
  });

  const { data: appStats } = useQuery<ApplicationStats>({
    queryKey: ['/api/admin-panel/applications/stats'],
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-overview">Loading...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-testid="section-overview">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
          <Users className="h-4 w-4 text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-users">{overview?.totalUsers || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {overview?.activeUsers || 0} active
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Active Connections</CardTitle>
          <Activity className="h-4 w-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-connections">{overview?.totalConnections || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {overview?.tellerConnections || 0} Teller, {overview?.snaptradeConnections || 0} SnapTrade
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Pending Applications</CardTitle>
          <FileText className="h-4 w-4 text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-pending-apps">{appStats?.pending || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {appStats?.approved || 0} approved, {appStats?.rejected || 0} rejected
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-monthly-revenue">${overview?.monthlyRevenue || '0.00'}</div>
          <p className="text-xs text-gray-500 mt-1">
            ${overview?.annualRevenue || '0.00'} annual
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Applications Queue Tab
function ApplicationsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ applications: Application[]; pagination: Pagination }>({
    queryKey: ['/api/admin-panel/applications', { page, status: statusFilter }],
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin-panel/applications/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/applications/stats'] });
      toast({ title: 'Application approved successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to approve application', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin-panel/applications/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/applications/stats'] });
      toast({ title: 'Application rejected successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to reject application', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-applications">Loading applications...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-applications">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-gray-900 border-gray-800" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-400">
          Total: {data?.pagination?.total || 0}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.applications?.map((app: any) => (
                <TableRow key={app.id} className="border-gray-800" data-testid={`row-application-${app.id}`}>
                  <TableCell className="font-medium" data-testid={`text-name-${app.id}`}>{app.firstName}</TableCell>
                  <TableCell data-testid={`text-email-${app.id}`}>{app.email}</TableCell>
                  <TableCell data-testid={`text-accounts-${app.id}`}>{app.accountCount}</TableCell>
                  <TableCell data-testid={`text-type-${app.id}`}>{app.connectType}</TableCell>
                  <TableCell>
                    <Badge
                      data-testid={`badge-status-${app.id}`}
                      className={
                        app.status === 'approved'
                          ? 'bg-green-600'
                          : app.status === 'rejected'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-date-${app.id}`}>
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {app.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveMutation.mutate(app.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${app.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(app.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${app.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            className="border-gray-800"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-400">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            className="border-gray-800"
            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// Users Management Tab
function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<'delete' | 'reset' | 'tier' | 'ban' | 'setPassword' | null>(null);
  const [newTier, setNewTier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [dashboardUser, setDashboardUser] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ users: User[]; pagination: Pagination }>({
    queryKey: ['/api/admin-panel/users', { page, search, tier: tierFilter }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/admin-panel/users/${userId}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete user');
      }
      return { response, userId };
    },
    onSuccess: async ({ userId }) => {
      // Optimistically remove from cache
      queryClient.setQueryData(
        ['/api/admin-panel/users', { page, search, tier: tierFilter }],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.filter((u: User) => u.id !== userId),
          };
        }
      );
      
      // Then refetch to get updated data
      await refetch();
      toast({ title: 'User deleted successfully' });
      setActionDialog(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting user', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const [resetLink, setResetLink] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/admin-panel/users/${userId}/reset-password`, { method: 'POST' }),
    onSuccess: (data: any) => {
      if (data.resetLink) {
        setResetLink(data.resetLink);
        toast({ title: 'Password reset link generated' });
      } else {
        toast({ title: 'Password reset email sent' });
        setActionDialog(null);
      }
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: string }) =>
      apiRequest(`/api/admin-panel/users/${userId}/tier`, {
        method: 'PATCH',
        body: JSON.stringify({ tier }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/users'], refetchType: 'all' });
      toast({ title: 'User tier updated' });
      setActionDialog(null);
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      apiRequest(`/api/admin-panel/users/${userId}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({ banned }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/users'], refetchType: 'all' });
      toast({ title: 'User ban status updated' });
      setActionDialog(null);
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      apiRequest(`/api/admin-panel/users/${userId}/set-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      toast({ title: 'Password set successfully' });
      setActionDialog(null);
      setNewPassword('');
    },
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-users">Loading users...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-users">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-800"
            data-testid="input-search-users"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40 bg-gray-900 border-gray-800" data-testid="select-tier-filter">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users?.map((user: any) => (
                <TableRow key={user.id} className="border-gray-800" data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                  <TableCell data-testid={`text-name-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge data-testid={`badge-tier-${user.id}`} className="bg-purple-600">
                      {user.subscriptionTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      data-testid={`badge-status-${user.id}`}
                      className={user.isBanned ? 'bg-red-600' : 'bg-green-600'}
                    >
                      {user.isBanned ? 'Banned' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-login-${user.id}`}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => {
                          setDashboardUser({ 
                            id: user.id, 
                            name: `${user.firstName} ${user.lastName}` 
                          });
                          setDashboardModalOpen(true);
                        }}
                        data-testid={`button-view-dashboard-${user.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialog('setPassword');
                        }}
                        data-testid={`button-set-password-${user.id}`}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Set PW
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialog('reset');
                        }}
                        data-testid={`button-reset-${user.id}`}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewTier(user.subscriptionTier);
                          setActionDialog('tier');
                        }}
                        data-testid={`button-tier-${user.id}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialog('ban');
                        }}
                        data-testid={`button-ban-${user.id}`}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialog('delete');
                        }}
                        disabled={user.isAdmin}
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={actionDialog === 'delete'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-red-500">Permanently Delete User</DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="text-white font-semibold">
                Are you sure you want to permanently delete {selectedUser?.email}?
              </p>
              <p className="text-yellow-500">
                ⚠️ This will permanently erase all user data including:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 ml-2">
                <li>Login credentials and authentication data</li>
                <li>All connected bank and brokerage accounts</li>
                <li>Trading history, holdings, and transfers</li>
                <li>Watchlists, alerts, and preferences</li>
                <li>All activity logs and records</li>
              </ul>
              <p className="text-red-400 font-semibold mt-3">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Permanently Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'reset'} onOpenChange={() => {
        setActionDialog(null);
        setResetLink(null);
      }}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetLink ? (
                <>Password reset link for {selectedUser?.email}</>
              ) : (
                <>Send a password reset email to {selectedUser?.email}?</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {resetLink && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-gray-400">
                Email provider not configured. Share this link with the user:
              </p>
              <div className="flex items-center space-x-2">
                <Input
                  value={resetLink}
                  readOnly
                  className="bg-gray-800 border-gray-700 font-mono text-xs"
                  data-testid="input-reset-link"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(resetLink);
                    toast({ title: 'Link copied to clipboard' });
                  }}
                  data-testid="button-copy-link"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog(null);
                setResetLink(null);
              }} 
              data-testid="button-cancel-reset"
            >
              {resetLink ? 'Close' : 'Cancel'}
            </Button>
            {!resetLink && (
              <Button
                onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
                disabled={resetPasswordMutation.isPending}
                data-testid="button-confirm-reset"
              >
                Send Reset Email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'tier'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>Change Subscription Tier</DialogTitle>
            <DialogDescription>
              Update subscription tier for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-new-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} data-testid="button-cancel-tier">
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedUser && updateTierMutation.mutate({ userId: selectedUser.id, tier: newTier })
              }
              disabled={updateTierMutation.isPending}
              data-testid="button-confirm-tier"
            >
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'setPassword'} onOpenChange={() => {
        setActionDialog(null);
        setNewPassword('');
      }}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-password" className="text-sm text-gray-400 mb-2 block">New Password (min 8 characters)</Label>
            <Input
              id="new-password"
              type="text"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-gray-800 border-gray-700"
              data-testid="input-new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionDialog(null);
              setNewPassword('');
            }} data-testid="button-cancel-set-password">
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedUser && setPasswordMutation.mutate({ userId: selectedUser.id, password: newPassword })
              }
              disabled={setPasswordMutation.isPending || newPassword.length < 8}
              data-testid="button-confirm-set-password"
            >
              Set Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'ban'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>{selectedUser?.isBanned ? 'Unban' : 'Ban'} User</DialogTitle>
            <DialogDescription>
              {selectedUser?.isBanned ? 'Restore access for' : 'Revoke access for'} {selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} data-testid="button-cancel-ban">
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isBanned ? 'default' : 'destructive'}
              onClick={() =>
                selectedUser && banMutation.mutate({ userId: selectedUser.id, banned: !selectedUser.isBanned })
              }
              disabled={banMutation.isPending}
              data-testid="button-confirm-ban"
            >
              {selectedUser?.isBanned ? 'Unban' : 'Ban'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Dashboard Modal */}
      {dashboardUser && (
        <UserDashboardModal
          open={dashboardModalOpen}
          onOpenChange={setDashboardModalOpen}
          userId={dashboardUser.id}
          userName={dashboardUser.name}
        />
      )}
    </div>
  );
}

// Connections Tab
function ConnectionsTab() {
  const { toast } = useToast();
  const [connectionFilter, setConnectionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [dashboardUser, setDashboardUser] = useState<{ id: string; name: string } | null>(null);
  
  const { data, isLoading } = useQuery<{ 
    connections: Connection[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/admin-panel/connections', connectionFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (connectionFilter !== 'all') params.set('filter', connectionFilter);
      params.set('page', page.toString());
      params.set('limit', '50');
      
      const response = await fetch(`/api/admin-panel/connections?${params}`);
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async ({ connectionId, provider }: { connectionId: number; provider: string }) => {
      return apiRequest(`/api/admin-panel/connections/${connectionId}?provider=${provider}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/connections'] });
      toast({
        title: "Success",
        description: "Account disconnected successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-connections">Loading connections...</div>;
  }

  // Group connections by user
  const groupedConnections = data?.connections?.reduce((acc, conn) => {
    if (!acc[conn.userId]) {
      acc[conn.userId] = {
        userId: conn.userId,
        email: conn.email || 'Unknown',
        tier: conn.tier || 'free',
        connectionCount: conn.connectionCount || 0,
        connectionLimit: conn.connectionLimit || 2,
        isOverLimit: conn.isOverLimit || false,
        connections: []
      };
    }
    acc[conn.userId].connections.push(conn);
    return acc;
  }, {} as Record<string, { 
    userId: string; 
    email: string; 
    tier: string; 
    connectionCount: number;
    connectionLimit: number | 'unlimited';
    isOverLimit: boolean;
    connections: Connection[] 
  }>);

  const userGroups = Object.values(groupedConnections || {});

  return (
    <div className="space-y-4" data-testid="section-connections">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>User Connections</CardTitle>
          <CardDescription>View connections grouped by user. Click to expand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap" data-testid="filter-buttons">
            <Button
              variant={connectionFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setConnectionFilter('all');
                setPage(1);
              }}
              className={connectionFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={connectionFilter === 'over_limit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setConnectionFilter('over_limit');
                setPage(1);
              }}
              className={connectionFilter === 'over_limit' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              data-testid="button-filter-over-limit"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Over Limit
            </Button>
            <Button
              variant={connectionFilter === 'within_limit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setConnectionFilter('within_limit');
                setPage(1);
              }}
              className={connectionFilter === 'within_limit' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              data-testid="button-filter-within-limit"
            >
              Within Limit
            </Button>
            <Button
              variant={connectionFilter === 'zero_connections' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setConnectionFilter('zero_connections');
                setPage(1);
              }}
              className={connectionFilter === 'zero_connections' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              data-testid="button-filter-zero-connections"
            >
              0 Connections
            </Button>
          </div>
          
          <div className="space-y-2">
          {userGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="text-no-connections">
              No connected accounts found
            </div>
          ) : (
            userGroups.map((group) => {
              const isUnlimited = group.connectionLimit === 'unlimited';
              const limitDisplay = isUnlimited ? '∞' : group.connectionLimit;
              
              return (
                <Collapsible key={group.userId} className="border border-gray-800 rounded-lg" data-testid={`collapsible-user-${group.userId}`}>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors group" data-testid={`trigger-user-${group.userId}`}>
                    <div className="flex items-center gap-4">
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90 text-gray-400" />
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white" data-testid={`text-email-${group.userId}`}>{group.email}</p>
                          {isUnlimited && (
                            <Badge className="bg-purple-600 text-xs" data-testid={`badge-admin-${group.userId}`}>
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${group.isOverLimit ? 'text-red-400 font-semibold' : 'text-gray-400'}`} data-testid={`text-summary-${group.userId}`}>
                          {group.connectionCount}/{limitDisplay} connection{group.connectionCount !== 1 ? 's' : ''} · {group.tier} tier
                          {group.isOverLimit && !isUnlimited && <span className="ml-2 text-red-500">⚠ Over limit</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDashboardUser({ 
                          id: group.userId, 
                          name: group.email 
                        });
                        setDashboardModalOpen(true);
                      }}
                      data-testid={`button-view-dashboard-${group.userId}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Dashboard
                    </Button>
                  </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4" data-testid={`content-user-${group.userId}`}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead>Institution</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Connected</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.connections.map((conn) => (
                        <TableRow key={conn.id} className="border-gray-800" data-testid={`row-connection-${conn.id}`}>
                          <TableCell data-testid={`text-institution-${conn.id}`}>{conn.institutionName}</TableCell>
                          <TableCell className="capitalize" data-testid={`text-type-${conn.id}`}>{conn.accountType}</TableCell>
                          <TableCell data-testid={`text-name-${conn.id}`}>{conn.accountName}</TableCell>
                          <TableCell className="uppercase" data-testid={`badge-provider-${conn.id}`}>
                            <Badge className="bg-blue-600">{conn.provider}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-balance-${conn.id}`}>
                            {conn.balance ? `$${conn.balance.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell data-testid={`text-date-${conn.id}`}>
                            {new Date(conn.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Disconnect ${conn.institutionName} - ${conn.accountName}?`)) {
                                  disconnectMutation.mutate({ 
                                    connectionId: conn.id, 
                                    provider: conn.provider 
                                  });
                                }
                              }}
                              disabled={disconnectMutation.isPending}
                              data-testid={`button-disconnect-${conn.id}`}
                            >
                              Disconnect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
              );
            })
          )}
          </div>

          {/* Pagination Controls */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-800" data-testid="pagination-controls">
              <div className="text-sm text-gray-400" data-testid="text-pagination-info">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Dashboard Modal */}
      {dashboardUser && (
        <UserDashboardModal
          open={dashboardModalOpen}
          onOpenChange={setDashboardModalOpen}
          userId={dashboardUser.id}
          userName={dashboardUser.name}
        />
      )}
    </div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/admin-panel/analytics/connections'],
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-analytics">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6" data-testid="section-analytics">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Teller Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-2xl font-bold" data-testid="text-teller-total">{data?.teller?.total || 0}</span>
              </div>
              {data?.teller?.byStatus?.map((stat: any) => (
                <div key={stat.status} className="flex items-center justify-between">
                  <span className="text-gray-400 capitalize">{stat.status}</span>
                  <Badge className="bg-purple-600" data-testid={`badge-teller-${stat.status}`}>
                    {stat.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>SnapTrade Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-2xl font-bold" data-testid="text-snaptrade-total">{data?.snaptrade?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Active</span>
                <Badge className="bg-green-600" data-testid="badge-snaptrade-active">
                  {data?.snaptrade?.active || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Disabled</span>
                <Badge className="bg-red-600" data-testid="badge-snaptrade-disabled">
                  {data?.snaptrade?.disabled || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Connections by Brokerage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.snaptrade?.byBrokerage?.map((stat: any) => (
              <div key={stat.brokerage} className="flex items-center justify-between">
                <span className="text-gray-300" data-testid={`text-brokerage-${stat.brokerage}`}>{stat.brokerage}</span>
                <Badge className="bg-blue-600" data-testid={`badge-count-${stat.brokerage}`}>
                  {stat.count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error Logs Tab
function ErrorLogsTab() {
  const [days, setDays] = useState('7');
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/admin-panel/analytics/errors', { days }],
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-errors">Loading error logs...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-error-logs">
      <div className="flex items-center justify-between">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40 bg-gray-900 border-gray-800" data-testid="select-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400">
          Total Errors: {data?.failedEmails?.total || 0}
        </span>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Failed Email Logs</CardTitle>
          <CardDescription>{data?.period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.failedEmails?.byTemplate?.map((log: any) => (
              <div key={log.template} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span className="font-medium" data-testid={`text-template-${log.template}`}>{log.template}</span>
                </div>
                <Badge className="bg-red-600" data-testid={`badge-count-${log.template}`}>
                  {log.count} failures
                </Badge>
              </div>
            ))}
            {(!data?.failedEmails?.byTemplate || data.failedEmails.byTemplate.length === 0) && (
              <p className="text-center text-gray-500 py-4">No errors in this period</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Feature Flags Tab
function FeatureFlagsTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/admin-panel/feature-flags'],
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiRequest(`/api/admin-panel/feature-flags/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/feature-flags'] });
      toast({ title: 'Feature flag updated' });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-features">Loading feature flags...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-feature-flags">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Toggle features on or off across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.flags?.map((flag: any) => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
              data-testid={`feature-${flag.key}`}
            >
              <div className="space-y-1">
                <Label htmlFor={flag.key} className="font-medium" data-testid={`text-flag-${flag.key}`}>
                  {flag.key}
                </Label>
                {flag.description && (
                  <p className="text-sm text-gray-400" data-testid={`text-desc-${flag.key}`}>{flag.description}</p>
                )}
              </div>
              <Switch
                id={flag.key}
                checked={flag.enabled}
                onCheckedChange={(enabled) => updateFlagMutation.mutate({ key: flag.key, enabled })}
                disabled={updateFlagMutation.isPending}
                data-testid={`switch-${flag.key}`}
              />
            </div>
          ))}
          {(!data?.flags || data.flags.length === 0) && (
            <p className="text-center text-gray-500 py-4">No feature flags configured</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Audit Trail Tab
function AuditTrailTab() {
  const [actionFilter, setActionFilter] = useState('all');
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/admin-panel/audit-logs', { action: actionFilter !== 'all' ? actionFilter : undefined }],
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-audit">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-audit-trail">
      <div className="flex items-center justify-between">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-60 bg-gray-900 border-gray-800" data-testid="select-action-filter">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="approve_application">Approve Application</SelectItem>
            <SelectItem value="reject_application">Reject Application</SelectItem>
            <SelectItem value="ban_user">Ban User</SelectItem>
            <SelectItem value="unban_user">Unban User</SelectItem>
            <SelectItem value="update_user_tier">Update User Tier</SelectItem>
            <SelectItem value="send_password_reset">Send Password Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: any) => (
                <TableRow key={log.id} className="border-gray-800" data-testid={`row-audit-${log.id}`}>
                  <TableCell data-testid={`text-time-${log.id}`}>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell data-testid={`text-admin-${log.id}`}>{log.adminEmail}</TableCell>
                  <TableCell>
                    <Badge className="bg-purple-600" data-testid={`badge-action-${log.id}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-target-${log.id}`}>{log.targetUserId || '-'}</TableCell>
                  <TableCell className="max-w-md truncate" data-testid={`text-details-${log.id}`}>
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// SnapTrade Tab
function SnapTradeTab() {
  const { toast } = useToast();
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ snaptradeUserId: string; email: string } | null>(null);
  
  const { data, isLoading, refetch } = useQuery<{ connections: any[] }>({
    queryKey: ['/api/admin-panel/snaptrade/connections'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const resp = await apiRequest(`/api/admin-panel/snaptrade/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) throw new Error('Failed to delete connection');
      return resp.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection Deleted",
        description: "SnapTrade connection has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/snaptrade/connections'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete SnapTrade connection",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (snaptradeUserId: string) => {
      const resp = await apiRequest(`/api/snaptrade/admin/users/${snaptradeUserId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error?.message || 'Failed to delete SnapTrade user');
      }
      return resp.json();
    },
    onSuccess: () => {
      toast({
        title: "SnapTrade User Deleted",
        description: "User has been completely removed from SnapTrade.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/snaptrade/connections'] });
      refetch();
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete SnapTrade user",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-snaptrade">Loading SnapTrade connections...</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-snaptrade">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>SnapTrade Connections</span>
            <Badge className="bg-blue-600">{data?.connections?.length || 0} Active</Badge>
          </CardTitle>
          <CardDescription>Manage SnapTrade user registrations and brokerage connections</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead>User Email</TableHead>
                <TableHead>SnapTrade User ID</TableHead>
                <TableHead>Brokerage</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.connections?.map((conn: any) => (
                <TableRow key={conn.connectionId} className="border-gray-800" data-testid={`row-snaptrade-${conn.connectionId}`}>
                  <TableCell className="font-medium" data-testid={`text-email-${conn.connectionId}`}>
                    {conn.userEmail || 'Unknown'}
                  </TableCell>
                  <TableCell className="font-mono text-xs" data-testid={`text-snaptrade-id-${conn.connectionId}`}>
                    {conn.snaptradeUserId || '-'}
                  </TableCell>
                  <TableCell data-testid={`text-brokerage-${conn.connectionId}`}>
                    {conn.brokerageName}
                  </TableCell>
                  <TableCell data-testid={`text-connected-${conn.connectionId}`}>
                    {conn.connectedAt ? new Date(conn.connectedAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell data-testid={`text-sync-${conn.connectionId}`}>
                    {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(conn.connectionId)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-disconnect-${conn.connectionId}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                      {conn.snaptradeUserId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setUserToDelete({
                              snaptradeUserId: conn.snaptradeUserId,
                              email: conn.userEmail || 'Unknown'
                            });
                            setDeleteUserDialogOpen(true);
                          }}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-user-${conn.connectionId}`}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Delete User
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.connections || data.connections.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No SnapTrade connections found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete SnapTrade User</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will permanently delete the SnapTrade user and all associated connections. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4">
              <div className="bg-red-950/30 border border-red-900 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong>User Email:</strong> {userToDelete.email}
                </p>
                <p className="text-sm text-gray-300 font-mono">
                  <strong>SnapTrade ID:</strong> {userToDelete.snaptradeUserId}
                </p>
              </div>
              <p className="text-sm text-yellow-500">
                ⚠️ This will delete the user from SnapTrade's system and remove all local records.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={deleteUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete.snaptradeUserId);
                }
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
