/**
 * Babylovegrowth.ai API Routes
 * Provides endpoints for articles, backlinks, GEO audit, and webhooks
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/jwt-auth';
import { isAdmin } from '../middleware/rbac';
import { db } from '../db';
import { blogPosts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { notifySlackWebhook } from './babylovegrowth-slack';
import * as babylovegrowth from '../services/babylovegrowth';

const router = Router();

router.get('/status', async (req, res) => {
  res.json({
    configured: babylovegrowth.isConfigured(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/articles', requireAuth, isAdmin(), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const articles = await babylovegrowth.getArticles(limit, offset);
    res.json(articles);
  } catch (error: any) {
    logger.error('Failed to fetch babylovegrowth articles', { error });
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

router.get('/articles/:id', requireAuth, isAdmin(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = await babylovegrowth.getArticle(id);
    res.json(article);
  } catch (error: any) {
    logger.error('Failed to fetch babylovegrowth article', { error });
    res.status(500).json({ error: error.message || 'Failed to fetch article' });
  }
});

router.get('/backlinks', requireAuth, isAdmin(), async (req, res) => {
  try {
    const backlinks = await babylovegrowth.getBacklinks();
    res.json(backlinks);
  } catch (error: any) {
    logger.error('Failed to fetch backlinks', { error });
    res.status(500).json({ error: error.message || 'Failed to fetch backlinks' });
  }
});

router.get('/geo-audit', requireAuth, isAdmin(), async (req, res) => {
  try {
    const audit = await babylovegrowth.getGeoAuditIssues();
    res.json(audit);
  } catch (error: any) {
    logger.error('Failed to fetch GEO audit', { error });
    res.status(500).json({ error: error.message || 'Failed to fetch GEO audit' });
  }
});

router.get('/rss', async (req, res) => {
  try {
    const rss = await babylovegrowth.getRssFeed();
    res.set('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (error: any) {
    logger.error('Failed to fetch RSS feed', { error });
    res.status(500).json({ error: error.message || 'Failed to fetch RSS feed' });
  }
});

router.post('/import/:id', requireAuth, isAdmin(), async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;

    const article = await babylovegrowth.getArticle(id);

    const existingPost = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, article.slug));

    if (existingPost.length > 0) {
      return res.status(400).json({ error: 'Article with this slug already exists in blog' });
    }

    const [newPost] = await db
      .insert(blogPosts)
      .values({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt || article.meta_description,
        content: article.content_html,
        heroImage: article.hero_image_url,
        authorId: userId,
        status: 'draft',
        tags: article.keywords,
        publishedAt: null,
      })
      .returning();

    logger.info('Imported babylovegrowth article to blog', {
      metadata: { articleId: id, blogPostId: newPost.id },
    });

    res.json({
      message: 'Article imported as draft',
      blogPost: newPost,
    });
  } catch (error: any) {
    logger.error('Failed to import article', { error });
    res.status(500).json({ error: error.message || 'Failed to import article' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const webhookSecret = process.env.BABYLOVEGROWTH_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      logger.warn('Invalid webhook authentication attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body as babylovegrowth.WebhookPayload;

    logger.info('Received babylovegrowth webhook', {
      metadata: {
        articleId: payload.id,
        title: payload.title,
        publicUrl: payload.publicUrl,
      },
    });

    await notifySlackWebhook(payload);

    res.json({ status: 'received' });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
