import { Router } from 'express';
import { db } from '../db';
import { blogPosts, insertBlogPostSchema, users } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/jwt-auth';
import { isAdmin } from '../middleware/rbac';
import { z } from 'zod';

const updateBlogPostSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only').optional(),
  title: z.string().min(1).max(255).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1).optional(),
  heroImage: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const router = Router();

// PUBLIC ROUTES - Anyone can read published blog posts

// Get all published blog posts (for public listing)
router.get('/posts', async (req, res) => {
  try {
    const posts = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        heroImage: blogPosts.heroImage,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
        authorName: users.firstName,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedAt));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single published blog post by slug (for public viewing)
router.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [post] = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        heroImage: blogPosts.heroImage,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        authorName: users.firstName,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')));

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// ADMIN ROUTES - Only admin users can manage blog posts

// Get all blog posts (including drafts) - Admin only
router.get('/admin/posts', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.updatedAt));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching admin blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post by ID - Admin only (can see drafts)
router.get('/admin/posts/:id', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Create new blog post - Admin only
router.post('/admin/posts', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    console.log('[Blog Create] Received body:', JSON.stringify(req.body, null, 2));
    console.log('[Blog Create] Status from body:', req.body.status);
    
    const validatedData = insertBlogPostSchema.parse({
      ...req.body,
      authorId: userId,
      publishedAt: req.body.status === 'published' ? new Date() : null,
    });
    
    console.log('[Blog Create] Validated data status:', validatedData.status);

    const [newPost] = await db
      .insert(blogPosts)
      .values(validatedData)
      .returning();
    
    console.log('[Blog Create] Created post with status:', newPost.status);

    res.status(201).json(newPost);
  } catch (error: any) {
    console.error('Error creating blog post:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid blog post data', details: error.errors });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update blog post - Admin only
router.patch('/admin/posts/:id', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    
    console.log('[Blog Update] Received body:', JSON.stringify(req.body, null, 2));
    console.log('[Blog Update] Status from body:', req.body.status);
    
    // Validate input
    const validatedInput = updateBlogPostSchema.parse(req.body);
    
    console.log('[Blog Update] Validated status:', validatedInput.status);
    
    // Get existing post
    const [existingPost] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));

    if (!existingPost) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    console.log('[Blog Update] Existing post status:', existingPost.status);

    // Build update data with only validated fields
    const updateData: any = {
      ...validatedInput,
      updatedAt: new Date(),
    };

    // Set publishedAt when publishing for the first time
    if (validatedInput.status === 'published' && existingPost.status === 'draft') {
      updateData.publishedAt = new Date();
    }
    
    console.log('[Blog Update] Final update data status:', updateData.status);

    const [updatedPost] = await db
      .update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id))
      .returning();

    res.json(updatedPost);
  } catch (error: any) {
    console.error('Error updating blog post:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid blog post data', details: error.errors });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete blog post - Admin only
router.delete('/admin/posts/:id', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);

    const [deletedPost] = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!deletedPost) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

export default router;
