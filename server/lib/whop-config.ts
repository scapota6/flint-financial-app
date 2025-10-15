/**
 * Whop Configuration
 * Maps Whop plan IDs to subscription tiers and pricing
 */

export interface WhopPlanConfig {
  planId: string;
  name: string;
  tier: 'free' | 'basic' | 'pro' | 'premium';
  price: string;
  ctaId: string;
}

// Whop App Configuration
export const WHOP_CONFIG = {
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'app_lc6Q00VpEqd85o',
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_SjHl0bw1eX19fZ',
  agentUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_aD8lrpjVu92mY',
};

// Whop plan mapping - Update these with your actual Whop plan IDs
export const WHOP_PLANS: Record<string, WhopPlanConfig> = {
  // Fast Track - One-time payment (unlocks free tier)
  'plan_fast_track': {
    planId: 'plan_fast_track',
    name: 'Fast Track Pass',
    tier: 'free',
    price: '$79.99',
    ctaId: 'fast-track',
  },
  
  // Plus Monthly
  'plan_plus_monthly': {
    planId: 'plan_plus_monthly',
    name: 'Flint Plus Monthly',
    tier: 'basic',
    price: '$19.99',
    ctaId: 'plus-monthly',
  },
  
  // Plus Yearly
  'plan_plus_yearly': {
    planId: 'plan_plus_yearly',
    name: 'Flint Plus Yearly',
    tier: 'basic',
    price: '$199.99',
    ctaId: 'plus-yearly',
  },
  
  // Pro Monthly
  'plan_pro_monthly': {
    planId: 'plan_pro_monthly',
    name: 'Flint Pro Monthly',
    tier: 'pro',
    price: '$39.99',
    ctaId: 'pro-monthly',
  },
  
  // Pro Yearly
  'plan_pro_yearly': {
    planId: 'plan_pro_yearly',
    name: 'Flint Pro Yearly',
    tier: 'pro',
    price: '$399.99',
    ctaId: 'pro-yearly',
  },
  
  // Unlimited Monthly
  'plan_unlimited_monthly': {
    planId: 'plan_unlimited_monthly',
    name: 'Flint Unlimited Monthly',
    tier: 'premium',
    price: '$49.99',
    ctaId: 'unlimited-monthly',
  },
  
  // Unlimited 6 Months
  'plan_unlimited_6mo': {
    planId: 'plan_unlimited_6mo',
    name: 'Flint Unlimited 6 Months',
    tier: 'premium',
    price: '$249.99',
    ctaId: 'unlimited-6mo',
  },
  
  // Unlimited Yearly
  'plan_unlimited_yearly': {
    planId: 'plan_unlimited_yearly',
    name: 'Flint Unlimited Yearly',
    tier: 'premium',
    price: '$499.99',
    ctaId: 'unlimited-yearly',
  },
};

// Reverse mapping: CTA ID to plan ID
export const CTA_TO_PLAN: Record<string, string> = {
  'fast-track': 'plan_fast_track',
  'plus-monthly': 'plan_plus_monthly',
  'plus-yearly': 'plan_plus_yearly',
  'plus-annual': 'plan_plus_yearly', // Alias
  'pro-monthly': 'plan_pro_monthly',
  'pro-yearly': 'plan_pro_yearly',
  'unlimited-monthly': 'plan_unlimited_monthly',
  'unlimited-6mo': 'plan_unlimited_6mo',
  'unlimited-yearly': 'plan_unlimited_yearly',
  'annual-unlimited': 'plan_unlimited_yearly', // Alias
};

// Helper function to get plan config by CTA ID
export function getPlanByCTA(ctaId: string): WhopPlanConfig | null {
  const planId = CTA_TO_PLAN[ctaId];
  if (!planId) return null;
  return WHOP_PLANS[planId] || null;
}

// Helper function to get plan config by plan ID
export function getPlanById(planId: string): WhopPlanConfig | null {
  return WHOP_PLANS[planId] || null;
}
