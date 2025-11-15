# Flint Metrics Tracking System

## Overview
This document defines the comprehensive metrics taxonomy for Flint, structured for VC reporting and business intelligence. All metrics are sent to Better Stack (Logtail) as structured events.

## Event Structure
```typescript
{
  event_type: string,        // Category: user_signup, trade_executed, etc.
  event_name: string,        // Auto-generated: metric.{event_type}
  timestamp: ISO8601,        // Auto-generated
  ...metadata                // Event-specific fields
}
```

---

## 1️⃣ GROWTH METRICS

### user_signup
**When**: New user completes registration
```typescript
{
  event_type: "user_signup",
  user_id: string,
  subscription_tier: "free" | "basic" | "premium" | "enterprise",
  subscription_status: "active" | "trial" | "canceled",
  acquisition_channel?: "organic" | "referral" | "paid" | "partner",
  referral_code?: string,
  country?: string,
  cohort_week: "YYYY-WW"  // e.g., "2025-W46"
}
```

### user_activated
**When**: User completes first meaningful action (links first account or makes first deposit)
```typescript
{
  event_type: "user_activated",
  user_id: string,
  days_since_signup: number,
  activation_action: "account_linked" | "first_deposit" | "first_trade",
  subscription_tier: string
}
```

### waitlist_signup
**When**: User joins waitlist
```typescript
{
  event_type: "waitlist_signup",
  email_hash: string,  // Hashed for privacy
  acquisition_channel?: string
}
```

### waitlist_conversion
**When**: Waitlist user converts to full signup
```typescript
{
  event_type: "waitlist_conversion",
  user_id: string,
  days_on_waitlist: number
}
```

---

## 2️⃣ ENGAGEMENT METRICS

### user_login
**When**: User successfully logs in
```typescript
{
  event_type: "user_login",
  user_id: string,
  login_method: "password" | "oauth" | "magic_link",
  session_id: string,
  is_first_login_today: boolean,
  days_since_last_login?: number
}
```

### account_linked
**When**: User links a bank or brokerage account
```typescript
{
  event_type: "account_linked",
  user_id: string,
  account_type: "bank" | "brokerage" | "crypto",
  provider: string,  // "teller", "snaptrade", etc.
  is_first_account: boolean,
  total_accounts: number
}
```

### portfolio_synced
**When**: Portfolio data successfully syncs
```typescript
{
  event_type: "portfolio_synced",
  user_id: string,
  account_id: string,
  sync_duration_ms: number,
  positions_count: number,
  aum_delta?: number  // Change in assets under management
}
```

### trade_executed
**When**: User executes a trade through the platform
```typescript
{
  event_type: "trade_executed",
  user_id: string,
  trade_id: string,
  asset_class: "stock" | "option" | "crypto" | "etf",
  trade_type: "buy" | "sell",
  amount_usd: number,
  provider: string
}
```

### alert_created
**When**: User creates a price alert or notification
```typescript
{
  event_type: "alert_created",
  user_id: string,
  alert_type: "price" | "portfolio_value" | "news" | "custom",
  asset?: string
}
```

### feature_used
**When**: User uses a specific feature
```typescript
{
  event_type: "feature_used",
  user_id: string,
  feature_name: string,  // "portfolio_analysis", "tax_report", "transfer", etc.
  session_id: string
}
```

---

## 3️⃣ RETENTION & CHURN METRICS

### user_churned
**When**: User meets churn criteria (no login + no activity for 30+ days)
```typescript
{
  event_type: "user_churned",
  user_id: string,
  churn_reason?: "inactive" | "closed_account" | "subscription_canceled" | "competitor",
  last_login_date: ISO8601,
  days_inactive: number,
  subscription_tier: string,
  had_paid_subscription: boolean
}
```

### user_reactivated
**When**: Previously churned user returns
```typescript
{
  event_type: "user_reactivated",
  user_id: string,
  days_churned: number,
  reactivation_channel?: string
}
```

---

## 4️⃣ MONETIZATION METRICS

### subscription_started
**When**: User starts a paid subscription
```typescript
{
  event_type: "subscription_started",
  user_id: string,
  subscription_id: string,
  plan_tier: "basic" | "premium" | "enterprise",
  billing_period: "monthly" | "annual",
  mrr: number,  // Monthly recurring revenue
  trial_used: boolean,
  days_since_signup: number
}
```

### subscription_upgraded
**When**: User upgrades to higher tier
```typescript
{
  event_type: "subscription_upgraded",
  user_id: string,
  subscription_id: string,
  from_tier: string,
  to_tier: string,
  mrr_delta: number
}
```

### subscription_downgraded
**When**: User downgrades to lower tier
```typescript
{
  event_type: "subscription_downgraded",
  user_id: string,
  subscription_id: string,
  from_tier: string,
  to_tier: string,
  mrr_delta: number,
  downgrade_reason?: string
}
```

### subscription_canceled
**When**: User cancels subscription
```typescript
{
  event_type: "subscription_canceled",
  user_id: string,
  subscription_id: string,
  plan_tier: string,
  mrr_lost: number,
  cancellation_reason?: string,
  lifetime_value: number,
  months_subscribed: number
}
```

### payment_succeeded
**When**: Recurring payment succeeds
```typescript
{
  event_type: "payment_succeeded",
  user_id: string,
  subscription_id: string,
  amount: number,
  plan_tier: string,
  billing_period: string
}
```

### payment_failed
**When**: Recurring payment fails
```typescript
{
  event_type: "payment_failed",
  user_id: string,
  subscription_id: string,
  amount: number,
  failure_reason: string,
  retry_count: number
}
```

---

## 5️⃣ PRODUCT USAGE METRICS

### application_submitted
**When**: User submits application
```typescript
{
  event_type: "application_submitted",
  user_id: string,
  application_id: string,
  account_count: string,  // "1-2", "3-5", "6-10", "11+"
  connect_type: "bank" | "brokerage" | "both"
}
```

### application_approved
**When**: Application is approved
```typescript
{
  event_type: "application_approved",
  user_id: string,
  application_id: string,
  time_to_approval_hours: number,
  auto_approved: boolean
}
```

### application_rejected
**When**: Application is rejected
```typescript
{
  event_type: "application_rejected",
  user_id: string,
  application_id: string,
  rejection_reason: string
}
```

### kyc_completed
**When**: User completes KYC verification
```typescript
{
  event_type: "kyc_completed",
  user_id: string,
  verification_method: string,
  time_to_complete_minutes: number
}
```

### transfer_initiated
**When**: User initiates money transfer
```typescript
{
  event_type: "transfer_initiated",
  user_id: string,
  transfer_id: string,
  transfer_type: "deposit" | "withdrawal" | "internal",
  amount_usd: number,
  from_provider?: string,
  to_provider?: string
}
```

### transfer_completed
**When**: Transfer successfully completes
```typescript
{
  event_type: "transfer_completed",
  user_id: string,
  transfer_id: string,
  duration_hours: number,
  amount_usd: number
}
```

---

## 6️⃣ RELIABILITY & RISK METRICS

### api_error
**When**: External API call fails
```typescript
{
  event_type: "api_error",
  provider: "teller" | "snaptrade" | "stripe",
  endpoint: string,
  error_code: string,
  error_message: string,
  retry_count: number,
  user_id?: string
}
```

### sync_failed
**When**: Account sync fails
```typescript
{
  event_type: "sync_failed",
  user_id: string,
  account_id: string,
  provider: string,
  error_reason: string,
  consecutive_failures: number
}
```

### connection_broken
**When**: User's account connection breaks
```typescript
{
  event_type: "connection_broken",
  user_id: string,
  account_id: string,
  provider: string,
  days_since_last_sync: number,
  requires_reauth: boolean
}
```

---

## Usage in Code

### Example: Track user signup
```typescript
import { logger } from '@/shared/logger';

// After successful user registration
logger.logMetric('user_signup', {
  user_id: user.id,
  subscription_tier: user.subscriptionTier,
  subscription_status: user.subscriptionStatus,
  acquisition_channel: req.query.utm_source || 'organic',
  cohort_week: getCohortWeek(new Date())
});
```

### Example: Track user login (DAU)
```typescript
// After successful authentication
logger.logMetric('user_login', {
  user_id: user.id,
  login_method: 'password',
  session_id: session.id,
  is_first_login_today: !wasUserActiveToday(user.id)
});
```

### Example: Track trade execution
```typescript
// After trade confirmed
logger.logMetric('trade_executed', {
  user_id: user.id,
  trade_id: trade.id,
  asset_class: trade.assetClass,
  trade_type: trade.type,
  amount_usd: trade.amountUsd,
  provider: 'snaptrade'
});
```

---

## Helper Functions

```typescript
// Get cohort week in format "YYYY-WW"
function getCohortWeek(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
```
