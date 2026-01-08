/**
 * Babylovegrowth.ai API Client
 * Integrates with babylovegrowth.ai for SEO content, backlinks, and audits
 */

import { logger } from '@shared/logger';

const BASE_URL = 'https://api.babylovegrowth.ai';

interface BabylovegrowthArticle {
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

interface BabylovegrowthArticleDetail extends BabylovegrowthArticle {
  content_markdown: string;
  content_html: string;
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

interface WebhookPayload {
  id: number;
  title: string;
  metaDescription: string;
  content_html: string;
  content_markdown: string;
  languageCode: string;
  publicUrl: string;
  createdAt: string;
}

function getApiKey(): string | null {
  return process.env.BABYLOVEGROWTH_API_KEY || null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('BABYLOVEGROWTH_API_KEY not configured');
  }

  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Babylovegrowth API error', {
      error: new Error(`HTTP ${response.status}: ${errorText}`),
      metadata: { endpoint, status: response.status },
    });
    throw new Error(`Babylovegrowth API error: ${response.status}`);
  }

  return response.json();
}

export async function getArticles(limit: number = 100, offset: number = 0): Promise<BabylovegrowthArticle[]> {
  return apiRequest<BabylovegrowthArticle[]>(
    `/api/integrations/v1/articles?limit=${limit}&offset=${offset}`
  );
}

export async function getArticle(id: number): Promise<BabylovegrowthArticleDetail> {
  return apiRequest<BabylovegrowthArticleDetail>(`/api/integrations/v1/articles/${id}`);
}

export async function getBacklinks(): Promise<BacklinksResponse> {
  return apiRequest<BacklinksResponse>('/api/integrations/v1/backlinks');
}

export async function getGeoAuditIssues(): Promise<GeoAuditResponse> {
  return apiRequest<GeoAuditResponse>('/api/integrations/v1/geo-audit/issues');
}

export async function getRssFeed(): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('BABYLOVEGROWTH_API_KEY not configured');
  }

  const response = await fetch(`${BASE_URL}/api/integrations/v1/rss`, {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status}`);
  }

  return response.text();
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

export type {
  BabylovegrowthArticle,
  BabylovegrowthArticleDetail,
  BacklinkItem,
  BacklinksResponse,
  GeoAuditIssue,
  GeoAuditResponse,
  WebhookPayload,
};
