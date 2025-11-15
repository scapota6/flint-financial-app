# Flint VC Analytics Dashboards - Complete Setup Guide

This guide provides ready-to-use Better Stack dashboard configurations optimized for VC reporting and fundraising. All queries are designed to track the metrics investors care about most.

---

## 📊 Dashboard 1: Growth Metrics

Track user acquisition, growth rates, and conversion funnels.

### New Users Today
```
event_name:"metric.user_signup" AND timestamp:>now-1d
```
**Visualization:** Number  
**What it shows:** Total signups in the last 24 hours

### New Users This Week
```
event_name:"metric.user_signup" AND timestamp:>now-7d
```
**Visualization:** Line chart (by day)  
**What it shows:** Daily signup trend over the past 7 days

### New Users This Month
```
event_name:"metric.user_signup" AND timestamp:>now-30d
```
**Visualization:** Line chart (by day)  
**What it shows:** Daily signups over the past 30 days

### MoM Growth Rate
Use two number widgets side by side:
```
# This Month
event_name:"metric.user_signup" AND timestamp:>now-30d

# Last Month  
event_name:"metric.user_signup" AND timestamp:>now-60d AND timestamp:<now-30d
```
**Manual calculation:** (This Month - Last Month) / Last Month × 100%

### Total Users (All Time)
```
event_name:"metric.user_signup"
```
**Visualization:** Number  
**What it shows:** Cumulative user signups since launch

### Signup Funnel
Track conversion from signup to activated users:
```
# Step 1: Signups
event_name:"metric.user_signup" AND timestamp:>now-30d

# Step 2: First Account Linked
event_name:"metric.account_linked" AND is_first_account:true AND timestamp:>now-30d

# Step 3: Paid Subscriptions
event_name:"metric.subscription_started" AND timestamp:>now-30d
```

### Users by Cohort Week
```
event_name:"metric.user_signup" AND timestamp:>now-90d
```
**Visualization:** Table grouped by `cohort_week`  
**What it shows:** Signups grouped by weekly cohorts

---

## 📈 Dashboard 2: Engagement Metrics

Measure user activity, feature adoption, and platform stickiness.

### Daily Active Users (DAU)
```
event_name:"metric.user_login" AND timestamp:>now-1d
```
**Visualization:** Number (count unique `user_id`)  
**What it shows:** Unique users who logged in today

### Weekly Active Users (WAU)
```
event_name:"metric.user_login" AND timestamp:>now-7d
```
**Visualization:** Number (count unique `user_id`)

### Monthly Active Users (MAU)
```
event_name:"metric.user_login" AND timestamp:>now-30d
```
**Visualization:** Number (count unique `user_id`)

### DAU/MAU Ratio (Stickiness)
Use the two queries above, then manually calculate:  
**Stickiness = DAU ÷ MAU × 100%**

Target: >20% is good, >40% is exceptional

### DAU Trend (Last 30 Days)
```
event_name:"metric.user_login" AND timestamp:>now-30d
```
**Visualization:** Line chart (unique users by day)  
**What it shows:** Daily active user trend

### Accounts Linked (Last 30 Days)
```
event_name:"metric.account_linked" AND timestamp:>now-30d
```
**Visualization:** Line chart  
**What it shows:** How many accounts users are connecting

### Bank vs Brokerage Accounts
```
event_name:"metric.account_linked" AND timestamp:>now-30d
```
**Visualization:** Pie chart (group by `account_type`)  
**What it shows:** Distribution of connected account types

### First-Time Account Connections
```
event_name:"metric.account_linked" AND is_first_account:true AND timestamp:>now-30d
```
**Visualization:** Line chart  
**What it shows:** User activation rate (first account = activated user)

---

## 💰 Dashboard 3: Monetization Metrics

Track revenue, subscriptions, and conversion to paid.

### Monthly Recurring Revenue (MRR)
```
event_name:"metric.subscription_started" AND timestamp:>now-30d
```
**Visualization:** Sum of `mrr` field  
**Note:** For accurate MRR, also subtract `mrr_lost` from cancellations

### New MRR This Month
```
event_name:"metric.subscription_started" AND timestamp:>now-30d
```
**Visualization:** Number (sum `mrr`)  
**What it shows:** New MRR added this month

### Churned MRR This Month
```
event_name:"metric.subscription_canceled" AND timestamp:>now-30d
```
**Visualization:** Number (sum `mrr_lost`)  
**What it shows:** MRR lost to cancellations

### Net New MRR
Combine the two queries above:  
**Net New MRR = New MRR - Churned MRR**

### Active Subscriptions by Tier
```
event_name:"metric.subscription_started" AND timestamp:>now-365d
```
**Visualization:** Pie chart (group by `plan_tier`)  
**What it shows:** Distribution of subscription tiers

### Subscription Starts (Last 30 Days)
```
event_name:"metric.subscription_started" AND timestamp:>now-30d
```
**Visualization:** Line chart  
**What it shows:** New paid subscriptions over time

### Subscription Upgrades
```
event_name:"metric.subscription_upgraded" AND timestamp:>now-30d
```
**Visualization:** Table showing `from_tier` → `to_tier`  
**What it shows:** Users moving to higher tiers

### Subscription Downgrades
```
event_name:"metric.subscription_downgraded" AND timestamp:>now-30d
```
**Visualization:** Table showing `from_tier` → `to_tier`

### Subscription Cancellations
```
event_name:"metric.subscription_canceled" AND timestamp:>now-30d
```
**Visualization:** Line chart  
**What it shows:** Churn trend

### Free-to-Paid Conversion Rate
```
# Paid Subscriptions
event_name:"metric.subscription_started" AND timestamp:>now-30d

# Total Signups
event_name:"metric.user_signup" AND timestamp:>now-30d
```
**Manual Calculation:** Paid Subs ÷ Total Signups × 100%

### Payment Success Rate
```
# Successful Payments
event_name:"metric.payment_succeeded" AND timestamp:>now-30d

# Failed Payments
event_name:"metric.payment_failed" AND timestamp:>now-30d
```
**Success Rate:** Succeeded ÷ (Succeeded + Failed) × 100%

### Payment Failures
```
event_name:"metric.payment_failed" AND timestamp:>now-7d
```
**Visualization:** Table showing `failure_reason`, `user_id`, `amount`  
**What it shows:** Recent payment issues requiring attention

---

## 🎯 Dashboard 4: Product Usage & Applications

Track application funnel, approval rates, and core product metrics.

### Applications Submitted (Last 30 Days)
```
event_name:"metric.application_submitted" AND timestamp:>now-30d
```
**Visualization:** Line chart  
**What it shows:** Application submission trend

### Applications by Account Count
```
event_name:"metric.application_submitted" AND timestamp:>now-30d
```
**Visualization:** Pie chart (group by `account_count`)  
**What it shows:** Distribution of applicants by # of accounts

### Applications by Connection Type
```
event_name:"metric.application_submitted" AND timestamp:>now-30d
```
**Visualization:** Pie chart (group by `connect_type`)  
**What it shows:** Bank vs Brokerage vs Both

### Total Applications (All Time)
```
event_name:"metric.application_submitted"
```
**Visualization:** Number  
**What it shows:** Cumulative applications received

---

## 🔄 Dashboard 5: Retention & Cohort Analysis

Track user retention, churn, and long-term engagement.

### Retention Cohort Table (Monthly)
```
event_name:"metric.user_login" AND timestamp:>now-90d
```
**Visualization:** Table  
**Group by:** `cohort_week` (rows) × Week Since Signup (columns)  
**What it shows:** Weekly cohort retention matrix

### User Login Frequency
```
event_name:"metric.user_login" AND timestamp:>now-30d
```
**Visualization:** Histogram (group by unique `user_id`, count logins per user)  
**What it shows:** How often users return

### Returning Users vs New Users
```
# Logins from users who signed up >7 days ago
event_name:"metric.user_login" AND timestamp:>now-7d

# Filter to returning users manually or use cohort analysis
```

---

## 🚨 Dashboard 6: Health & Alerts

Monitor system health, errors, and operational metrics.

### Payment Failures (Last 7 Days)
```
event_name:"metric.payment_failed" AND timestamp:>now-7d
```
**Visualization:** Table with `user_id`, `failure_reason`, `amount`  
**Alert threshold:** >5 failures per day

### Zero Signups Alert
```
event_name:"metric.user_signup" AND timestamp:>now-1d
```
**Alert:** If count = 0, investigate marketing/product issues

### Subscription Cancellations (Spike Detection)
```
event_name:"metric.subscription_canceled" AND timestamp:>now-7d
```
**Alert:** >10% increase week-over-week

---

## 📊 Key VC Metrics Summary

Create a single "Executive Summary" dashboard with these key numbers:

### North Star Metrics
1. **Total Users:** `event_name:"metric.user_signup"`
2. **MAU:** `event_name:"metric.user_login" AND timestamp:>now-30d` (unique users)
3. **MRR:** Sum of active subscriptions
4. **DAU/MAU Ratio:** Stickiness percentage

### Growth Indicators
5. **MoM User Growth:** % change in signups
6. **MoM Revenue Growth:** % change in MRR
7. **Free-to-Paid Conversion:** Paid subs ÷ Total users

### Product Health
8. **Accounts Linked per User:** Avg # of connected accounts
9. **Application Approval Rate:** Approved ÷ Total applications
10. **Payment Success Rate:** Succeeded ÷ (Succeeded + Failed)

---

## 🎨 Dashboard Best Practices

### Visualization Recommendations
- **Numbers:** Total users, MRR, DAU/MAU
- **Line Charts:** Trends over time (signups, logins, revenue)
- **Pie Charts:** Distributions (tiers, account types)
- **Tables:** Detailed breakdowns (cohorts, failures)

### Time Ranges for VC Pitches
- **Daily:** Last 30 days for trends
- **Weekly:** Last 12 weeks for patterns
- **Monthly:** Last 12 months for seasonal analysis
- **All-time:** Cumulative growth story

### Alert Setup
Set up alerts in Better Stack for:
1. Zero signups in 24 hours
2. Payment failure rate >10%
3. Subscription churn spike (>2x normal)
4. DAU drop >30% week-over-week

---

## 🚀 Quick Start Checklist

1. ✅ Confirm metrics are flowing to Better Stack (check Live Tail)
2. ✅ Create "Growth Dashboard" with signup & user metrics
3. ✅ Create "Monetization Dashboard" with MRR & subscription metrics
4. ✅ Create "Engagement Dashboard" with DAU/WAU/MAU
5. ✅ Create "Executive Summary" dashboard for investor meetings
6. ✅ Set up alerts for critical metrics (zero signups, payment failures)
7. ✅ Test queries with real data to verify accuracy
8. ✅ Schedule weekly review of key metrics

---

## 📈 Advanced Queries

### Activation Rate (Signup → First Account Linked)
```
# New Users (30 days)
event_name:"metric.user_signup" AND timestamp:>now-30d

# Users who linked first account (30 days)  
event_name:"metric.account_linked" AND is_first_account:true AND timestamp:>now-30d
```
**Activation Rate:** First Accounts ÷ New Users × 100%

### Revenue per User (ARPU)
```
# Total MRR
event_name:"metric.subscription_started" AND timestamp:>now-365d

# Total Active Users
event_name:"metric.user_signup"
```
**ARPU:** Total MRR ÷ Total Users

### Churn Rate (Monthly)
```
# Cancellations this month
event_name:"metric.subscription_canceled" AND timestamp:>now-30d

# Active subscribers at start of month
event_name:"metric.subscription_started" AND timestamp:<now-30d
```
**Churn Rate:** Cancellations ÷ Active Subs × 100%

---

## 💡 Tips for VC Presentations

**Highlight These Numbers:**
1. **Growth Rate:** "We're growing 25% MoM in new users"
2. **Engagement:** "40% DAU/MAU ratio shows strong product-market fit"
3. **Revenue:** "MRR increased 3x in the last quarter"
4. **Conversion:** "15% of free users convert to paid within 30 days"
5. **Retention:** "85% of users return weekly after first account connection"

**Create Investor-Ready Charts:**
- Use 12-month trend lines to show momentum
- Compare MoM growth rates (users, revenue, engagement)
- Show cohort retention heatmaps
- Display customer acquisition funnel

**Dashboard Exports:**
Better Stack allows you to export dashboards as:
- **Screenshots** for pitch decks
- **CSV data** for deeper analysis in Excel
- **Public links** for investor data rooms

---

## 🎯 Success Metrics by Stage

### Pre-Seed / Seed
- Focus on: User growth, engagement (DAU/MAU), activation rate
- Key metric: "We have X MAU growing Y% MoM"

### Series A
- Focus on: Revenue growth, unit economics, retention cohorts
- Key metric: "We're at $X MRR with Y% growth and Z% gross margin"

### Series B+
- Focus on: Efficiency metrics, LTV/CAC, market penetration
- Key metric: "We're profitable with $X ARR and expanding to new segments"

---

For questions or issues, refer to `METRICS_TRACKING.md` for the complete event taxonomy.
