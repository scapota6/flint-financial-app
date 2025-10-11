/**
 * Lemon Squeezy Configuration
 * Maps variant IDs to subscription tiers and pricing
 */

export interface VariantConfig {
  variantId: string;
  name: string;
  tier: 'free' | 'basic' | 'pro' | 'premium';
  interval: 'one-time' | 'monthly' | 'yearly' | '6-months';
  price: string;
  ctaId: string;
}

// Lemon Squeezy variant mapping based on user-provided SKUs
export const LEMONSQUEEZY_VARIANTS: Record<string, VariantConfig> = {
  // Fast Track - One-time payment (unlocks free tier)
  '1034015': {
    variantId: '1034015',
    name: 'Fast Track Pass',
    tier: 'free',
    interval: 'one-time',
    price: '$79.99',
    ctaId: 'fast-track',
  },
  
  // Plus Monthly
  '1033913': {
    variantId: '1033913',
    name: 'Flint Plus Monthly',
    tier: 'basic',
    interval: 'monthly',
    price: '$19.99',
    ctaId: 'plus-monthly',
  },
  
  // Plus Yearly
  '1034014': {
    variantId: '1034014',
    name: 'Flint Plus Yearly',
    tier: 'basic',
    interval: 'yearly',
    price: '$199.99',
    ctaId: 'plus-yearly',
  },
  
  // Pro Monthly
  '1033914': {
    variantId: '1033914',
    name: 'Flint Pro Monthly',
    tier: 'pro',
    interval: 'monthly',
    price: '$39.99',
    ctaId: 'pro-monthly',
  },
  
  // Pro Yearly
  '1034022': {
    variantId: '1034022',
    name: 'Flint Pro Yearly',
    tier: 'pro',
    interval: 'yearly',
    price: '$399.99',
    ctaId: 'pro-yearly',
  },
  
  // Unlimited Monthly
  '1033916': {
    variantId: '1033916',
    name: 'Flint Unlimited Monthly',
    tier: 'premium',
    interval: 'monthly',
    price: '$49.99',
    ctaId: 'unlimited-monthly',
  },
  
  // Unlimited 6 Months
  '1034012': {
    variantId: '1034012',
    name: 'Flint Unlimited 6 Months',
    tier: 'premium',
    interval: '6-months',
    price: '$249.99',
    ctaId: 'unlimited-6mo',
  },
  
  // Unlimited Yearly
  '658476': {
    variantId: '658476',
    name: 'Flint Unlimited Yearly',
    tier: 'premium',
    interval: 'yearly',
    price: '$499.99',
    ctaId: 'unlimited-yearly',
  },
};

// Reverse mapping: CTA ID to variant ID
export const CTA_TO_VARIANT: Record<string, string> = {
  'fast-track': '1034015',
  'plus-monthly': '1033913',
  'plus-yearly': '1034014',
  'plus-annual': '1034014', // Alias for plus-yearly
  'pro-monthly': '1033914',
  'pro-yearly': '1034022',
  'unlimited-monthly': '1033916',
  'unlimited-6mo': '1034012',
  'unlimited-yearly': '658476',
  'annual-unlimited': '658476', // Alias for unlimited-yearly
};

// Helper function to get variant config by CTA ID
export function getVariantByCTA(ctaId: string): VariantConfig | null {
  const variantId = CTA_TO_VARIANT[ctaId];
  if (!variantId) return null;
  return LEMONSQUEEZY_VARIANTS[variantId] || null;
}

// Helper function to get checkout URL
export function getLemonSqueezyCheckoutUrl(variantId: string, email?: string): string {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error('LEMONSQUEEZY_STORE_ID not configured');
  }
  
  // Construct checkout URL with variant ID
  const baseUrl = `https://flint-investing.lemonsqueezy.com/checkout/buy/${variantId}`;
  
  // Add optional parameters
  const params = new URLSearchParams();
  if (email) {
    params.set('checkout[email]', email);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
