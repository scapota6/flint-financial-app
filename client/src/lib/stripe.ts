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
    id: 'plus',
    name: 'Plus',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    features: [
      '1-4 accounts',
      'Portfolio tracking',
      'Email support',
      'Mobile app access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 39.99,
    annualPrice: 399.99,
    features: [
      'Up to 10 accounts',
      'Advanced analytics',
      'Real-time alerts',
      'Priority support',
      'API access',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    monthlyPrice: 49.99,
    annualPrice: 499.99,
    features: [
      'Unlimited accounts',
      'Advanced trading tools',
      'Custom alerts',
      'Phone support',
      'Early access to features',
      'Tax optimization tools',
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
