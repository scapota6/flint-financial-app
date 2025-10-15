/**
 * Whop Configuration
 * Maps Whop product URLs to subscription tiers
 */

export interface WhopProductConfig {
  url: string;
  name: string;
  tier: 'free' | 'basic' | 'pro' | 'premium';
  price: string;
  ctaId: string;
  isOneTime?: boolean;
  planId?: string; // Whop plan ID (to be filled from webhook)
}

// Whop App Configuration
export const WHOP_CONFIG = {
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'app_lc6Q00VpEqd85o',
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_SjHl0bw1eX19fZ',
  agentUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_aD8lrpjVu92mY',
};

// Whop product mapping - Using direct Whop product URLs
export const WHOP_PRODUCTS: Record<string, WhopProductConfig> = {
  // Fast Track - One-time payment (unlocks free tier, bypasses waitlist)
  'fast-track': {
    url: 'https://whop.com/flint-2289/flint-fast-track/',
    name: 'Fast Track Pass',
    tier: 'free',
    price: '$79.99',
    ctaId: 'fast-track',
    isOneTime: true,
  },
  
  // Basic Monthly
  'basic-monthly': {
    url: 'https://whop.com/flint-2289/flint-basic-7f/',
    name: 'Flint Basic Monthly',
    tier: 'basic',
    price: '$19.99',
    ctaId: 'basic-monthly',
  },
  
  // Basic Yearly (renamed from "plus")
  'basic-yearly': {
    url: 'https://whop.com/flint-2289/flint-basic-copy/',
    name: 'Flint Basic Year Special',
    tier: 'basic',
    price: '$199.99',
    ctaId: 'basic-yearly',
  },
  
  // Pro Monthly
  'pro-monthly': {
    url: 'https://whop.com/flint-2289/flint-pro-monthly/',
    name: 'Flint Pro Monthly',
    tier: 'pro',
    price: '$39.99',
    ctaId: 'pro-monthly',
  },
  
  // Pro Yearly
  'pro-yearly': {
    url: 'https://whop.com/flint-2289/flint-pro-monthly-copy/',
    name: 'Flint Pro Year Special',
    tier: 'pro',
    price: '$399.99',
    ctaId: 'pro-yearly',
  },
  
  // Unlimited Monthly
  'unlimited-monthly': {
    url: 'https://whop.com/flint-2289/flint-unlimited-monthly/',
    name: 'Flint Unlimited Monthly',
    tier: 'premium',
    price: '$49.99',
    ctaId: 'unlimited-monthly',
  },
  
  // Unlimited 6 Months Special
  'unlimited-6mo': {
    url: 'https://whop.com/flint-2289/flint-unlimited-year-copy/',
    name: 'Flint Unlimited 6 Month Special',
    tier: 'premium',
    price: '$249.99',
    ctaId: 'unlimited-6mo',
  },
  
  // Unlimited Yearly
  'unlimited-yearly': {
    url: 'https://whop.com/flint-2289/flint-unlimited-monthly-copy/',
    name: 'Flint Unlimited Year Special',
    tier: 'premium',
    price: '$499.99',
    ctaId: 'unlimited-yearly',
  },
};

// Alias mappings for frontend compatibility
export const CTA_ALIASES: Record<string, string> = {
  'plus-monthly': 'basic-monthly',
  'plus-yearly': 'basic-yearly',
};

// Helper function to get product config by CTA ID
export function getProductByCTA(ctaId: string): WhopProductConfig | null {
  // Check for alias first
  const resolvedCTA = CTA_ALIASES[ctaId] || ctaId;
  return WHOP_PRODUCTS[resolvedCTA] || null;
}

// Plan ID to Tier mapping - to be populated from webhook data
// Update this map after receiving your first webhook to map Whop plan IDs to subscription tiers
export const PLAN_ID_TO_TIER: Record<string, 'free' | 'basic' | 'pro' | 'premium'> = {
  // Fast Track - One-time (these might use product IDs instead of plan IDs)
  // 'prod_xxxxx': 'free',
  
  // Basic Plans
  // 'plan_xxxxx': 'basic', // Basic Monthly
  // 'plan_xxxxx': 'basic', // Basic Yearly
  
  // Pro Plans
  // 'plan_xxxxx': 'pro', // Pro Monthly
  // 'plan_xxxxx': 'pro', // Pro Yearly
  
  // Premium Plans
  // 'plan_xxxxx': 'premium', // Unlimited Monthly
  // 'plan_xxxxx': 'premium', // Unlimited 6 Months
  // 'plan_xxxxx': 'premium', // Unlimited Yearly
};

// Helper function to get tier by plan ID (from webhook)
export function getTierByPlanId(planId: string): 'free' | 'basic' | 'pro' | 'premium' | null {
  return PLAN_ID_TO_TIER[planId] || null;
}

// Helper function to get tier by product ID (for one-time purchases)
export function getTierByProductId(productId: string): 'free' | 'basic' | 'pro' | 'premium' | null {
  // For one-time purchases like Fast Track, we might get a product ID instead of plan ID
  // Map product IDs to tiers here
  return null;
}
