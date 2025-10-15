/**
 * Whop SDK TypeScript declarations
 * Documentation: https://docs.whop.com/guides/checkout
 */

interface WhopCheckoutOptions {
  checkoutUrl: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

interface Whop {
  checkout(options: WhopCheckoutOptions): void;
}

declare global {
  interface Window {
    Whop: Whop;
  }
}

export {};
