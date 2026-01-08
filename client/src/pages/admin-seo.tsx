/**
 * Admin SEO Dashboard - Babylovegrowth.ai Integration
 * Route: /admin/seo
 * Shows articles, backlinks, and GEO audit data
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  FileText, 
  Link2, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface Article {
  id: number;
  title: string;
  slug: string;
  hero_image_url: string | null;
  languageCode: string;
  meta_description: string | null;
  excerpt: string | null;
  orgWebsite: string;
  created_at: string;
  seedKeyword: string | null;
  keywords: string[] | null;
}

interface BacklinkItem {
  url: string;
  isBacklinkPresent: boolean;
  article: {
    publishedUrl: string;
    publishedAt: string;
  };
  targetOrgWebsite?: { url: string };
  sourceOrgWebsite?: { url: string };
}

interface BacklinksResponse {
  given: BacklinkItem[];
  received: BacklinkItem[];
}

interface GeoAuditIssue {
  id: number;
  issueType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: string;
  page: { id: number; url: string };
  createdAt: string;
  markedAsResolvedAt: string | null;
}

interface GeoAuditResponse {
  auditDate: string;
  issues: GeoAuditIssue[];
}

interface ApiStatus {
  configured: boolean;
  timestamp: string;
}

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

export default function AdminSeo() {
  const { isAdmin, isLoading } = useAdminCheck();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('articles');

  const { data: status } = useQuery<ApiStatus>({
    queryKey: ['/api/babylovegrowth/status'],
  });

  const { data: articles, isLoading: articlesLoading, refetch: refetchArticles } = useQuery<Article[]>({
    queryKey: ['/api/babylovegrowth/articles'],
    enabled: status?.configured,
  });

  const { data: backlinks, isLoading: backlinksLoading, refetch: refetchBacklinks } = useQuery<BacklinksResponse>({
    queryKey: ['/api/babylovegrowth/backlinks'],
    enabled: status?.configured && activeTab === 'backlinks',
  });

  const { data: audit, isLoading: auditLoading, refetch: refetchAudit } = useQuery<GeoAuditResponse>({
    queryKey: ['/api/babylovegrowth/geo-audit'],
    enabled: status?.configured && activeTab === 'audit',
  });

  const importMutation = useMutation({
    mutationFn: async (articleId: number) => {
      return apiRequest(`/api/babylovegrowth/import/${articleId}`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: 'Article imported', description: 'Article imported to blog as draft' });
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/posts'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Import failed', 
        description: error.message || 'Failed to import article',
        variant: 'destructive'
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">SEO Dashboard</h1>
          </div>
          <Badge variant={status?.configured ? "default" : "destructive"}>
            {status?.configured ? "API Connected" : "API Not Configured"}
          </Badge>
        </div>

        {!status?.configured ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Babylovegrowth.ai Not Configured</h2>
              <p className="text-gray-400 mb-4">
                Add your BABYLOVEGROWTH_API_KEY to environment variables to enable SEO features.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-800 mb-6">
              <TabsTrigger value="articles" className="data-[state=active]:bg-blue-600">
                <FileText className="h-4 w-4 mr-2" />
                Articles ({articles?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="backlinks" className="data-[state=active]:bg-blue-600">
                <Link2 className="h-4 w-4 mr-2" />
                Backlinks
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-blue-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                GEO Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="articles">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>SEO Articles</CardTitle>
                    <CardDescription>Content from babylovegrowth.ai</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchArticles()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {articlesLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : articles && articles.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Keywords</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {articles.map((article) => (
                          <TableRow key={article.id} data-testid={`article-row-${article.id}`}>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="font-medium truncate">{article.title}</p>
                                <p className="text-sm text-gray-400 truncate">
                                  {article.meta_description || article.excerpt || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {article.keywords?.slice(0, 3).map((kw) => (
                                  <Badge key={kw} variant="secondary" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(article.created_at), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => importMutation.mutate(article.id)}
                                  disabled={importMutation.isPending}
                                  data-testid={`import-article-${article.id}`}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Import
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-gray-400 py-8">No articles found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backlinks">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-green-400">Given</span>
                        <Badge>{backlinks?.given?.length || 0}</Badge>
                      </CardTitle>
                      <CardDescription>Backlinks you've given to others</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetchBacklinks()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {backlinksLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    ) : backlinks?.given && backlinks.given.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {backlinks.given.map((link, i) => (
                          <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline truncate flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                {new URL(link.url).hostname}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {link.isBacklinkPresent ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Target: {link.targetOrgWebsite?.url || '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 py-8">No given backlinks</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-blue-400">Received</span>
                      <Badge>{backlinks?.received?.length || 0}</Badge>
                    </CardTitle>
                    <CardDescription>Backlinks you've received from others</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {backlinksLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    ) : backlinks?.received && backlinks.received.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {backlinks.received.map((link, i) => (
                          <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline truncate flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                {new URL(link.url).hostname}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {link.isBacklinkPresent ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Source: {link.sourceOrgWebsite?.url || '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 py-8">No received backlinks</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="audit">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>GEO Audit Issues</CardTitle>
                    <CardDescription>
                      {audit?.auditDate && (
                        <>Last audit: {format(new Date(audit.auditDate), 'MMM d, yyyy h:mm a')}</>
                      )}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchAudit()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : audit?.issues && audit.issues.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Page</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.issues.map((issue) => (
                          <TableRow key={issue.id} data-testid={`audit-issue-${issue.id}`}>
                            <TableCell>
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {issue.issueType}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {issue.description}
                            </TableCell>
                            <TableCell>
                              <a 
                                href={issue.page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-gray-400">
                              {issue.action}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No SEO issues found!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
