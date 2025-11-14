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
    priceId: 'price_1RUGqMKgl6E3u5QE9OtHKCOS',
    billingPeriod: 'monthly',
    amount: 1999, // $19.99/month
    features: [
      'Connect up to 5 accounts',
      'Real-time portfolio tracking',
      'Basic analytics',
      'Email support'
    ]
  },
  'basic-yearly': {
    tier: 'basic',
    name: 'Flint Basic',
    priceId: 'price_1ST8THKgl6E3u5QEbFXJR1Qi',
    billingPeriod: 'yearly',
    amount: 19999, // $199.99/year ($16.67/month)
    features: [
      'Connect up to 5 accounts',
      'Real-time portfolio tracking',
      'Basic analytics',
      'Email support',
      '2 months free with annual billing'
    ]
  },
  'pro-monthly': {
    tier: 'pro',
    name: 'Flint Pro',
    priceId: 'price_1ST7B1Kgl6E3u5QElvyoQnY7',
    billingPeriod: 'monthly',
    amount: 3999, // $39.99/month
    features: [
      'Unlimited account connections',
      'Advanced portfolio analytics',
      'Real-time trading execution',
      'Price alerts & notifications',
      'Priority support',
      'Tax reporting tools'
    ]
  },
  'pro-yearly': {
    tier: 'pro',
    name: 'Flint Pro',
    priceId: 'price_1ST7CuKgl6E3u5QEzXDsvsxx',
    billingPeriod: 'yearly',
    amount: 39999, // $399.99/year ($33.33/month)
    features: [
      'Unlimited account connections',
      'Advanced portfolio analytics',
      'Real-time trading execution',
      'Price alerts & notifications',
      'Priority support',
      'Tax reporting tools',
      '2 months free with annual billing'
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
