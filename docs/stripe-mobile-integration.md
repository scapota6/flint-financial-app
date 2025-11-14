# Stripe Mobile Integration for iOS (React Native)

## Overview
This document provides instructions for integrating Stripe payments into the Flint iOS mobile app built with React Native and Expo TypeScript.

## Prerequisites
- Expo SDK 51+ project with TypeScript
- `@stripe/stripe-react-native` package installed
- Stripe publishable key (test or live)

## Installation

```bash
npx expo install @stripe/stripe-react-native
```

## Setup

### 1. Environment Configuration

Add Stripe publishable key to your environment configuration:

```typescript
// app.config.ts or app.json
export default {
  extra: {
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};
```

### 2. Initialize Stripe Provider

Wrap your app with the `StripeProvider`:

```typescript
// App.tsx
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

export default function App() {
  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey;

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      {/* Your app components */}
    </StripeProvider>
  );
}
```

## Integration Approaches

### Option 1: Stripe Checkout (Recommended for Web-based Flow)

Use a WebView to redirect users to Stripe Checkout. This is the simplest approach and matches the web implementation.

```typescript
import { WebView } from 'react-native-webview';

async function handleSubscribe(tier: 'basic' | 'pro', billingPeriod: 'monthly' | 'yearly') {
  // Get CSRF token from your auth context
  const csrfToken = await getCSRFToken();
  
  // Create checkout session
  const response = await fetch('https://your-api.com/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, // From your auth context
      'X-Mobile-App': 'true', // Skip CSRF for mobile
    },
    body: JSON.stringify({ tier, billingPeriod }),
  });

  const { url } = await response.json();

  // Open Stripe Checkout in WebView
  return (
    <WebView
      source={{ uri: url }}
      onNavigationStateChange={(navState) => {
        // Handle success/cancel redirects
        if (navState.url.includes('/subscribe?success=true')) {
          // Payment successful
          handlePaymentSuccess();
        } else if (navState.url.includes('/subscribe?canceled=true')) {
          // Payment canceled
          handlePaymentCanceled();
        }
      }}
    />
  );
}
```

### Option 2: Native Stripe Payment Sheet (Advanced)

For a fully native experience, use Stripe's Payment Sheet component.

```typescript
import { useStripe } from '@stripe/stripe-react-native';

export function SubscriptionScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  async function handleSubscribe(tier: 'basic' | 'pro', billingPeriod: 'monthly' | 'yearly') {
    // 1. Create checkout session on your backend
    const response = await fetch('https://your-api.com/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Mobile-App': 'true',
      },
      body: JSON.stringify({ tier, billingPeriod }),
    });

    const { sessionId, url } = await response.json();

    // 2. Initialize payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Flint',
      customerId: userData.stripeCustomerId,
      customerEphemeralKeySecret: ephemeralKey, // Get from backend
      paymentIntentClientSecret: clientSecret, // Get from backend
      allowsDelayedPaymentMethods: true,
    });

    if (initError) {
      console.error('Init error:', initError);
      return;
    }

    // 3. Present payment sheet
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      console.error('Payment failed:', presentError);
    } else {
      console.log('Payment successful!');
      // Navigate to success screen
    }
  }

  return (
    <Button onPress={() => handleSubscribe('basic', 'monthly')}>
      Subscribe
    </Button>
  );
}
```

## Customer Portal Integration

For subscription management (cancel, update payment method, view invoices), redirect users to the Stripe Customer Portal:

```typescript
import { WebView } from 'react-native-webview';

async function openCustomerPortal() {
  const response = await fetch('https://your-api.com/api/stripe/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Mobile-App': 'true',
    },
  });

  const { url } = await response.json();

  // Open in WebView or external browser
  return (
    <WebView
      source={{ uri: url }}
      onNavigationStateChange={(navState) => {
        // Handle return to app
        if (navState.url.includes('/settings')) {
          // User returned to settings
          closeWebView();
        }
      }}
    />
  );
}
```

## Authentication Headers

The Flint backend supports dual authentication modes:

### Web (Cookie-based):
```typescript
fetch(url, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

### Mobile (Bearer token):
```typescript
fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'X-Mobile-App': 'true', // Bypasses CSRF
  },
});
```

## Webhook Handling

Webhooks are handled server-side at `/api/stripe/webhook`. No mobile-specific setup required.

When a subscription event occurs:
1. Stripe sends webhook to your backend
2. Backend updates user subscription status in database
3. Mobile app fetches updated user data on next app open

## Testing

### Test Mode
Use Stripe test keys and test card numbers:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Webhook Testing
Use Stripe CLI to forward webhooks to your local dev server:

```bash
stripe listen --forward-to https://your-dev-url.replit.app/api/stripe/webhook
```

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Add webhook secret to environment variables
- [ ] Test full subscription flow (subscribe → webhook → database update)
- [ ] Test subscription cancellation flow
- [ ] Test payment failure handling
- [ ] Verify Customer Portal functionality

## Security Best Practices

1. **Never store Stripe keys in code** - Use environment variables
2. **Always validate webhooks** - Use webhook signature verification
3. **Use HTTPS only** - Stripe requires secure connections
4. **Implement proper error handling** - Don't expose sensitive error details to users
5. **Log all transactions** - Keep audit trail for debugging

## Additional Resources

- [Stripe React Native SDK Docs](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Stripe Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Webhook Integration](https://stripe.com/docs/webhooks)
