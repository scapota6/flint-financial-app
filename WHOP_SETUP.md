# Whop Integration Setup Guide

## Prerequisites
1. **Whop Account**: Create an account at [whop.com](https://whop.com)
2. **Company Created**: Set up your company profile in the Whop dashboard
3. **Products Created**: Configure all 8 subscription products (see Product Configuration below)

## Environment Variables
Add these to your Replit Secrets or `.env` file:

```env
WHOP_API_KEY=your_app_api_key_here          # From Whop Dashboard > Developer Settings
WHOP_WEBHOOK_SECRET=your_webhook_secret     # From Whop Dashboard > Webhooks
NEXT_PUBLIC_WHOP_APP_ID=app_lc6Q00VpEqd85o # Your Whop App ID
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_SjHl0bw1eX19fZ  # Your Company ID
```

## Product Configuration
Configure these 8 products in your Whop dashboard:

### Fast Track ($79.99 one-time)
- **Name**: Flint Fast Track
- **Type**: One-time payment
- **Price**: $79.99
- **Tier**: Free (bypasses waitlist)
- **Success Redirect**: `https://flint-investing.com/payment-success`

### Basic Plans
1. **Flint Basic Monthly**
   - Price: $19.99/month
   - Tier: Basic (3 connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

2. **Flint Basic Year Special**
   - Price: $199.99/year
   - Tier: Basic (3 connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

### Pro Plans
3. **Flint Pro Monthly**
   - Price: $39.99/month
   - Tier: Pro (5 connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

4. **Flint Pro Year Special**
   - Price: $399.99/year
   - Tier: Pro (5 connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

### Unlimited/Premium Plans
5. **Flint Unlimited Monthly**
   - Price: $49.99/month
   - Tier: Premium (unlimited connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

6. **Flint Unlimited 6 Month Special**
   - Price: $249.99 (6 months)
   - Tier: Premium (unlimited connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

7. **Flint Unlimited Year Special**
   - Price: $499.99/year
   - Tier: Premium (unlimited connections)
   - Success Redirect**: `https://flint-investing.com/payment-success`

## Webhook Configuration

### 1. Configure Webhook Endpoint
In Whop Dashboard > Developer Settings > Webhooks:
- **Webhook URL**: `https://flint-investing.com/api/whop/webhook`
- **Events to Subscribe**: 
  - `payment.succeeded`
  - `membership.went_valid`
  - `membership.went_invalid`
  - `membership.cancelled`

### 2. Webhook Secret
After creating the webhook, Whop will generate a webhook secret. Save this as `WHOP_WEBHOOK_SECRET` in your environment variables.

## Plan ID Mapping (Configured)

The following Whop plan IDs have been configured in `server/lib/whop-config.ts`:

```typescript
export const PLAN_ID_TO_TIER: Record<string, 'free' | 'basic' | 'pro' | 'premium'> = {
  // Fast Track - One-time payment (bypasses waitlist)
  'plan_LoIr4OqtbFsGf': 'free',
  
  // Basic/Plus Plans
  'plan_VLgIrzlR2KDI0': 'basic',  // Basic Monthly
  'plan_e3uHPGOF9BxLL': 'basic',  // Plus Year Special (Basic Yearly)
  'plan_gTe1wqkhsxMl6': 'basic',  // Plus 6 Month Special
  
  // Pro Plans
  'plan_A5pqK3NW80scw': 'pro',    // Pro Monthly
  'plan_eyVOdb1vQIUg9': 'pro',    // Pro Yearly
  
  // Premium/Unlimited Plans
  'plan_iBNFQGQBLHWAh': 'premium', // Unlimited Monthly
  'plan_a0r9AOKL1qJ6H': 'premium', // Unlimited 6 Months
};
```

## Testing Webhooks

1. **Use Whop's Webhook Testing Tool**:
   - Navigate to Whop Dashboard > Developer Settings > Webhooks
   - Click "Test Webhook" next to your configured endpoint
   - Select event type (e.g., `payment.succeeded`)
   - Send test event

2. **Monitor Logs**:
   - Check application logs for webhook receipt confirmation
   - Look for: "Whop webhook received" with event details
   - Verify email extraction from payload

3. **Check Database**:
   - Verify user account creation in the `users` table
   - Confirm `whopMembershipId`, `whopCustomerId`, and `whopPlanId` are populated
   - Check `subscriptionTier` and `subscriptionStatus` fields

## Checkout Flow

The system uses a **new tab checkout approach** (Whop blocks iframe embedding):

1. **User clicks pricing button** on landing page or subscribe page
2. **Frontend calls**: `GET /api/whop/checkout/:ctaId?email=user@example.com`
3. **Backend returns**: Whop product URL with email parameter
4. **Checkout opens**: In new browser tab (or same window if popup blocked), prefilled with user's email
5. **After payment**: User redirected to `/payment-success` (configured in Whop dashboard)
6. **Webhook fires**: `payment.succeeded` event creates user account
7. **Email sent**: Welcome email with password setup link

**Note**: Whop prevents iframe embedding with X-Frame-Options headers, so checkout must open in a new tab.

## User Account Creation Flow

When a payment is successful:

1. Webhook receives `payment.succeeded` event
2. Extract user email from webhook payload (multiple locations checked)
3. Check if user exists by email
4. If new user:
   - Create account with UUID
   - Set subscription tier based on plan ID
   - Generate password reset token (7-day expiry)
   - Send welcome email with password setup link
5. If existing user:
   - Update subscription tier and status
   - Update Whop membership IDs

## Email Handling

The webhook handler checks multiple payload locations for email:
- `data.email`
- `data.user.email`
- `data.customer.email`
- `data.metadata.email`
- `data.billing.email`

**Important Constraint**: Whop's public API does not expose email addresses for privacy reasons. For **new user creation**, the email MUST be present in the initial `payment.succeeded` webhook payload. The system cannot fetch email via SDK.

**Fallback Logic for Existing Users**: 
If email is missing from webhook payload, the system will:
1. Look up user by `whopMembershipId` in database
2. If not found, look up by `whopCustomerId`
3. Use the stored email from database

This ensures subscription updates work even when webhook payloads omit email fields.

## Troubleshooting

### Webhook Not Receiving Events
- Verify webhook URL is correct and publicly accessible
- Check webhook secret matches environment variable
- Confirm events are subscribed in Whop dashboard
- Review Whop dashboard webhook logs for delivery failures

### Email Not Found in Webhook (New User)
- Check if email is being passed from checkout URL
- Review webhook payload in application logs (first 500 chars are logged)
- Verify Whop product settings include email collection
- **For new users, this will prevent account creation**

### Email Not Found in Webhook (Existing User)
- System will attempt to look up user by membership ID or customer ID
- Check logs for "Found user by membership ID" messages
- If user is found, subscription will be updated normally

### User Not Created
- Check if email extraction is successful (review logs)
- Verify database connection is working
- Check for unique constraint violations (user already exists)
- Review password reset token generation

### Wrong Subscription Tier
- Update `PLAN_ID_TO_TIER` mapping in `server/lib/whop-config.ts`
- Verify plan IDs from webhook payload match configuration
- Default fallback tier is "basic" if plan ID not recognized

## Implementation Files

- `server/lib/whop-sdk.ts` - Whop SDK initialization
- `server/lib/whop-config.ts` - Product and plan configuration
- `server/routes/whop.ts` - Webhook handlers and checkout endpoint
- `client/src/pages/landing.tsx` - Checkout integration on frontend
- `client/src/pages/payment-success.tsx` - Post-payment success page
