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
    planId: 'plan_LoIr4OqtbFsGf',
  },
  
  // Basic Monthly
  'basic-monthly': {
    url: 'https://whop.com/flint-2289/flint-basic-7f/',
    name: 'Flint Basic Monthly',
    tier: 'basic',
    price: '$19.99',
    ctaId: 'basic-monthly',
    planId: 'plan_VLgIrzlR2KDI0',
  },
  
  // Basic Yearly (Plus Year Special)
  'basic-yearly': {
    url: 'https://whop.com/flint-2289/flint-basic-copy/',
    name: 'Flint Basic Year Special',
    tier: 'basic',
    price: '$199.99',
    ctaId: 'basic-yearly',
    planId: 'plan_e3uHPGOF9BxLL',
  },
  
  // Basic 6-Month Special (Plus 6 Month Special)
  'basic-6mo': {
    url: 'https://whop.com/flint-2289/flint-basic-6month/',
    name: 'Flint Basic 6 Month Special',
    tier: 'basic',
    price: '$99.99',
    ctaId: 'basic-6mo',
    planId: 'plan_gTe1wqkhsxMl6',
  },
  
  // Pro Monthly
  'pro-monthly': {
    url: 'https://whop.com/flint-2289/flint-pro-monthly/',
    name: 'Flint Pro Monthly',
    tier: 'pro',
    price: '$39.99',
    ctaId: 'pro-monthly',
    planId: 'plan_A5pqK3NW80scw',
  },
  
  // Pro Yearly
  'pro-yearly': {
    url: 'https://whop.com/flint-2289/flint-pro-monthly-copy/',
    name: 'Flint Pro Year Special',
    tier: 'pro',
    price: '$399.99',
    ctaId: 'pro-yearly',
    planId: 'plan_eyVOdb1vQIUg9',
  },
  
  // Unlimited Monthly
  'unlimited-monthly': {
    url: 'https://whop.com/flint-2289/flint-unlimited-monthly/',
    name: 'Flint Unlimited Monthly',
    tier: 'premium',
    price: '$49.99',
    ctaId: 'unlimited-monthly',
    planId: 'plan_iBNFQGQBLHWAh',
  },
  
  // Unlimited 6 Months Special
  'unlimited-6mo': {
    url: 'https://whop.com/flint-2289/flint-unlimited-year-copy/',
    name: 'Flint Unlimited 6 Month Special',
    tier: 'premium',
    price: '$249.99',
    ctaId: 'unlimited-6mo',
    planId: 'plan_a0r9AOKL1qJ6H',
  },
  
  // Unlimited Yearly
  'unlimited-yearly': {
    url: 'https://whop.com/flint-2289/flint-unlimited-yearly/',
    name: 'Flint Unlimited Yearly',
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

// Plan ID to Tier mapping - Actual Whop plan IDs from dashboard
export const PLAN_ID_TO_TIER: Record<string, 'free' | 'basic' | 'pro' | 'premium'> = {
  // Fast Track - One-time payment (bypasses waitlist)
  'plan_LoIr4OqtbFsGf': 'free',
  
  // Basic/Plus Plans
  'plan_VLgIrzlR2KDI0': 'basic', // Basic Monthly
  'plan_e3uHPGOF9BxLL': 'basic', // Plus Year Special (Basic Yearly)
  'plan_gTe1wqkhsxMl6': 'basic', // Plus 6 Month Special
  
  // Pro Plans
  'plan_A5pqK3NW80scw': 'pro', // Pro Monthly
  'plan_eyVOdb1vQIUg9': 'pro',    // Pro Yearly
  
  // Premium/Unlimited Plans
  'plan_iBNFQGQBLHWAh': 'premium', // Unlimited Monthly
  'plan_a0r9AOKL1qJ6H': 'premium', // Unlimited 6 Months
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
