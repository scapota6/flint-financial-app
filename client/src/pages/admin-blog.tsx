/**
 * Admin Blog Management Page
 * Route: /admin/blog
 * Only accessible to admin users
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  FileText,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  heroImage: string | null;
  authorId: string;
  status: 'draft' | 'published';
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function AdminBlog() {
  const { isAdmin, isLoading } = useAdminCheck();
  const { toast } = useToast();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    heroImage: '',
    status: 'draft' as 'draft' | 'published',
    tags: '',
  });

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/admin/posts'],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/blog/admin/posts', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/posts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Post created', description: 'Your blog post has been created.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create post', 
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest(`/api/blog/admin/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...data,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/posts'] });
      setIsDialogOpen(false);
      setEditingPost(null);
      resetForm();
      toast({ title: 'Post updated', description: 'Your blog post has been updated.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update post', 
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/blog/admin/posts/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/admin/posts'] });
      setDeleteConfirmId(null);
      toast({ title: 'Post deleted', description: 'Your blog post has been deleted.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete post', 
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      heroImage: '',
      status: 'draft',
      tags: '',
    });
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      heroImage: post.heroImage || '',
      status: post.status,
      tags: post.tags?.join(', ') || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
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
      <div className="border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-xl sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <FileText className="h-6 w-6 text-blue-400" />
              <h1 className="text-2xl font-bold">Blog Management</h1>
            </div>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-post">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-900/40 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : posts && posts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Slug</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Updated</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                      <TableCell className="font-medium text-white">{post.title}</TableCell>
                      <TableCell className="text-gray-400">{post.slug}</TableCell>
                      <TableCell>
                        <Badge 
                          className={post.status === 'published' 
                            ? 'bg-green-600/20 text-green-400 border-green-500/50' 
                            : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/50'
                          }
                        >
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {format(new Date(post.updatedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {post.status === 'published' && (
                            <Link href={`/blog/${post.slug}`}>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`button-view-${post.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openEditDialog(post)}
                            className="text-gray-400 hover:text-white"
                            data-testid={`button-edit-${post.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeleteConfirmId(post.id)}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No blog posts yet. Create your first post!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingPost ? 'Update your blog post details.' : 'Fill in the details for your new blog post.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title" className="text-gray-300">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!editingPost) {
                      setFormData(prev => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }));
                    }
                  }}
                  className="bg-slate-800 border-slate-600"
                  placeholder="My Blog Post Title"
                  data-testid="input-title"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="text-gray-300">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                  placeholder="my-blog-post-title"
                  data-testid="input-slug"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /blog/{formData.slug || 'your-slug'}</p>
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-gray-300">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="bg-slate-800 border-slate-600 h-20"
                  placeholder="A brief summary of your post..."
                  data-testid="input-excerpt"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-gray-300">Content * (Markdown supported)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="bg-slate-800 border-slate-600 h-64 font-mono text-sm"
                  placeholder="Write your blog post content here. You can use Markdown for formatting:

# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- Bullet point
1. Numbered list

[Link text](https://example.com)"
                  data-testid="input-content"
                />
              </div>

              <div>
                <Label htmlFor="heroImage" className="text-gray-300">Hero Image URL</Label>
                <Input
                  id="heroImage"
                  value={formData.heroImage}
                  onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-hero-image"
                />
              </div>

              <div>
                <Label htmlFor="tags" className="text-gray-300">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                  placeholder="investing, finance, tips"
                  data-testid="input-tags"
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-gray-300">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.title || !formData.slug || !formData.content || createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-post"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingPost ? 'Update Post' : 'Create Post')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this blog post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
