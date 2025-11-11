import { apiRequest } from "./queryClient";

export interface SubscriptionTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '4 account connections',
      'Money in/out flow tracking',
      'Dashboard & transaction history',
      'Email support',
    ],
  },
  {
    id: 'basic',
    name: 'FlintBasic',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    features: [
      'Unlimited account connections',
      'Recurring subscription tracking',
      'Credit card management',
      'Portfolio tracking',
      'Stock charts (coming soon)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 39.99,
    annualPrice: 399.99,
    features: [
      'Everything in FlintBasic',
      'Transfer funds (coming soon)',
      'Trading & brokerage access (coming soon)',
      'Advanced analytics',
      'Real-time alerts',
      'Priority support',
    ],
  },
];

export class StripeAPI {
  static async createSubscription(tier: string, billingFrequency: 'monthly' | 'annual' = 'monthly') {
    const response = await apiRequest("/api/create-subscription", {
      method: "POST",
      body: { tier, billingFrequency }
    });
    return response;
  }
}
