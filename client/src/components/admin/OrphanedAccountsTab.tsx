import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Download, Mail, CheckCircle, Copy, AlertCircle } from 'lucide-react';

interface OrphanedAccount {
  id: number;
  userEmail: string;
  userName: string;
  orphanedSnaptradeId: string;
  newSnaptradeId: string | null;
  errorMessage: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface OrphanedAccountsData {
  accounts: OrphanedAccount[];
  stats: {
    total: number;
    unresolved: number;
    resolved: number;
  };
}

export default function OrphanedAccountsTab() {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<OrphanedAccountsData>({
    queryKey: ['/api/admin-panel/snaptrade/orphaned-accounts'],
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin-panel/snaptrade/orphaned-accounts/${id}/resolve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-panel/snaptrade/orphaned-accounts'] });
      toast({ title: 'Account marked as resolved' });
    },
    onError: () => {
      toast({ title: 'Failed to mark account as resolved', variant: 'destructive' });
    },
  });

  const filteredAccounts = data?.accounts?.filter((account) => {
    if (filter === 'unresolved') return !account.isResolved;
    if (filter === 'resolved') return account.isResolved;
    return true;
  }) || [];

  const handleExportCSV = () => {
    if (!data?.accounts || data.accounts.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['ID', 'User Email', 'Name', 'Orphaned SnapTrade ID', 'New SnapTrade ID', 'Error Message', 'Status', 'Created At'];
    const rows = data.accounts.map(account => [
      account.id.toString(),
      account.userEmail,
      account.userName,
      account.orphanedSnaptradeId,
      account.newSnaptradeId || '',
      account.errorMessage ? `"${account.errorMessage.replace(/"/g, '""')}"` : '',
      account.isResolved ? 'Resolved' : 'Unresolved',
      new Date(account.createdAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `orphaned-snaptrade-accounts-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV exported successfully' });
  };

  const generateSupportEmail = () => {
    if (!data?.accounts || data.accounts.length === 0) {
      toast({ title: 'No orphaned accounts to report', variant: 'destructive' });
      return;
    }

    const unresolvedAccounts = data.accounts.filter(acc => !acc.isResolved);
    
    const accountListTable = unresolvedAccounts.map((account, index) => 
      `${index + 1}. User: ${account.userEmail} (${account.userName})
   Orphaned ID: ${account.orphanedSnaptradeId}
   ${account.newSnaptradeId ? `New ID: ${account.newSnaptradeId}` : 'No new ID assigned'}
   ${account.errorMessage ? `Error: ${account.errorMessage}` : ''}
   Created: ${new Date(account.createdAt).toLocaleDateString()}`
    ).join('\n\n');

    const subject = 'Request to Remove Orphaned SnapTrade Accounts - Flint';
    const body = `Dear SnapTrade Support Team,

We are reaching out to request the removal of orphaned SnapTrade account IDs from our system. These accounts were created during connection attempts that failed or were incomplete, and they are no longer needed.

ORPHANED ACCOUNT DETAILS:
Total Orphaned Accounts: ${unresolvedAccounts.length}

${accountListTable}

REQUEST:
Please delete the orphaned SnapTrade IDs listed above from your system. These accounts are no longer associated with active users and should be purged to maintain data integrity.

CONTACT INFORMATION:
Company: Flint
Contact: Admin Team
Email: scapota@flint-investing.com

Thank you for your assistance in resolving this matter.

Best regards,
Flint Admin Team`;

    setEmailContent(body);
    setEmailDialogOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      toast({ title: 'Email content copied to clipboard' });
    } catch (error) {
      toast({ title: 'Failed to copy to clipboard', variant: 'destructive' });
    }
  };

  const openMailClient = () => {
    const subject = encodeURIComponent('Request to Remove Orphaned SnapTrade Accounts - Flint');
    const body = encodeURIComponent(emailContent);
    const mailtoLink = `mailto:support@snaptrade.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-orphaned-accounts">Loading orphaned accounts...</div>;
  }

  return (
    <div className="space-y-6" data-testid="section-orphaned-accounts">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Orphaned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orphaned">
              {data?.stats?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-unresolved">
              {data?.stats?.unresolved || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-resolved">
              {data?.stats?.resolved || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-40 bg-gray-900 border-gray-800" data-testid="select-filter">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="border-gray-700"
            onClick={handleExportCSV}
            disabled={!data?.accounts || data.accounts.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="border-gray-700"
            onClick={generateSupportEmail}
            disabled={!data?.accounts || data.accounts.filter(acc => !acc.isResolved).length === 0}
            data-testid="button-generate-email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Generate Support Email
          </Button>
        </div>
      </div>

      {/* Orphaned Accounts Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead>ID</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Orphaned ID</TableHead>
                <TableHead>New ID</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8" data-testid="text-no-accounts">
                    No orphaned accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id} className="border-gray-800" data-testid={`row-orphaned-${account.id}`}>
                    <TableCell className="font-medium" data-testid={`text-id-${account.id}`}>
                      {account.id}
                    </TableCell>
                    <TableCell data-testid={`text-email-${account.id}`}>
                      {account.userEmail}
                    </TableCell>
                    <TableCell data-testid={`text-name-${account.id}`}>
                      {account.userName}
                    </TableCell>
                    <TableCell data-testid={`text-orphaned-id-${account.id}`}>
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded">
                        {account.orphanedSnaptradeId}
                      </code>
                    </TableCell>
                    <TableCell data-testid={`text-new-id-${account.id}`}>
                      {account.newSnaptradeId ? (
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded">
                          {account.newSnaptradeId}
                        </code>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-error-${account.id}`}>
                      {account.errorMessage ? (
                        <div className="max-w-xs truncate text-xs text-gray-400" title={account.errorMessage}>
                          {account.errorMessage}
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        data-testid={`badge-status-${account.id}`}
                        className={account.isResolved ? 'bg-green-600' : 'bg-yellow-600'}
                      >
                        {account.isResolved ? 'Resolved' : 'Unresolved'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-created-${account.id}`}>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!account.isResolved && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => resolveMutation.mutate(account.id)}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-${account.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Resolved
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>SnapTrade Support Email</span>
            </DialogTitle>
            <DialogDescription>
              Pre-formatted email for SnapTrade support to request removal of orphaned accounts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400">Subject:</label>
              <p className="text-sm mt-1">Request to Remove Orphaned SnapTrade Accounts - Flint</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Body:</label>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-700 min-h-[400px] font-mono text-xs"
                data-testid="textarea-email-body"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-400">
                Review and edit the email before sending
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="border-gray-700"
                onClick={copyToClipboard}
                data-testid="button-copy-email"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={openMailClient}
                data-testid="button-open-mail-client"
              >
                <Mail className="h-4 w-4 mr-2" />
                Open in Email Client
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
