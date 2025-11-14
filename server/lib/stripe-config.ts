import Stripe from 'stripe';

export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

export const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

export type PricingTier = 'free' | 'basic' | 'pro';
export type BillingPeriod = 'monthly' | 'yearly';

interface PricingPlan {
  tier: PricingTier;
  name: string;
  priceId: string;
  billingPeriod: BillingPeriod;
  amount: number; // in cents
  features: string[];
}

export const STRIPE_PRICES: Record<string, PricingPlan> = {
  'basic-monthly': {
    tier: 'basic',
    name: 'Flint Basic',
    priceId: 'price_1ST8cEQP10htbkzEdwmsi5HN',
    billingPeriod: 'monthly',
    amount: 999, // $9.99
    features: [
      'Connect up to 5 accounts',
      'Real-time portfolio tracking',
      'Basic analytics',
      'Email support'
    ]
  },
};

export function getPriceByTierAndPeriod(tier: PricingTier, period: BillingPeriod): PricingPlan | null {
  const key = `${tier}-${period}`;
  return STRIPE_PRICES[key] || null;
}

export function getTierByPriceId(priceId: string): PricingTier | null {
  for (const plan of Object.values(STRIPE_PRICES)) {
    if (plan.priceId === priceId) {
      return plan.tier;
    }
  }
  return null;
}

export function getPriceIdByTierAndPeriod(tier: PricingTier, period: BillingPeriod): string | null {
  const plan = getPriceByTierAndPeriod(tier, period);
  return plan?.priceId || null;
}
