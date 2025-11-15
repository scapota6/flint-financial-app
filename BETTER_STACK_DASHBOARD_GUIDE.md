# Better Stack Dashboard Setup Guide

## Overview
This guide will help you create dashboards in Better Stack (Logtail) to track key metrics for Flint. Better Stack deprecated their Grafana integration, so we'll use their native dashboard feature instead.

## Available Metrics

Your application logs the following structured metrics:

| Metric Event | Description | When It's Logged |
|-------------|-------------|------------------|
| `metric.user_signup` | New user signup (paid) | After successful Stripe checkout |
| `metric.application_submitted` | Application form submitted | When someone submits the waitlist/application form |
| `metric.user_login` | User login event | Every time a user logs in successfully |

## Step-by-Step Dashboard Creation

### Step 1: Access Better Stack Dashboards

1. Go to [Better Stack](https://logs.betterstack.com/)
2. Select your "Flint Production" source
3. Click on **"Dashboards"** in the left sidebar
4. Click **"New Dashboard"**

### Step 2: Create Your First Dashboard

Name it: **"Flint Key Metrics"**

---

## Dashboard Panels to Create

### Panel 1: New Users Today

**Type:** Number (Single Stat)

**Query:**
```
event_name:"metric.user_signup" AND timestamp:>now-1d
```

**Aggregation:** Count

**Display:** Large number with trend indicator

---

### Panel 2: New Users This Week

**Type:** Number (Single Stat)

**Query:**
```
event_name:"metric.user_signup" AND timestamp:>now-7d
```

**Aggregation:** Count

---

### Panel 3: New Users This Month

**Type:** Number (Single Stat)

**Query:**
```
event_name:"metric.user_signup" AND timestamp:>now-30d
```

**Aggregation:** Count

---

### Panel 4: User Signups Over Time

**Type:** Time Series Chart

**Query:**
```
event_name:"metric.user_signup"
```

**Aggregation:** Count over time

**Time Range:** Last 30 days

**Grouping:** By day

---

### Panel 5: Applications Submitted Today

**Type:** Number (Single Stat)

**Query:**
```
event_name:"metric.application_submitted" AND timestamp:>now-1d
```

**Aggregation:** Count

---

### Panel 6: Applications Submitted This Week

**Type:** Number (Single Stat)

**Query:**
```
event_name:"metric.application_submitted" AND timestamp:>now-7d
```

**Aggregation:** Count

---

### Panel 7: Applications Over Time

**Type:** Time Series Chart

**Query:**
```
event_name:"metric.application_submitted"
```

**Aggregation:** Count over time

**Time Range:** Last 30 days

**Grouping:** By day

---

### Panel 8: Daily Active Users

**Type:** Time Series Chart

**Query:**
```
event_name:"metric.user_login"
```

**Aggregation:** Count unique `metadata.user_id` over time

**Time Range:** Last 7 days

**Grouping:** By day

---

### Panel 9: Feature Requests & Bug Reports

**Type:** Number (Single Stat)

**Query:**
```
message:"Feature request submitted" AND timestamp:>now-7d
```

**Aggregation:** Count

---

## Advanced Queries

### Users by Subscription Tier (This Week)

**Type:** Pie Chart

**Query:**
```
event_name:"metric.user_signup" AND timestamp:>now-7d
```

**Aggregation:** Count

**Group By:** `metadata.subscription_tier`

---

### Login Activity by Hour (Today)

**Type:** Bar Chart

**Query:**
```
event_name:"metric.user_login" AND timestamp:>now-1d
```

**Aggregation:** Count over time

**Grouping:** By hour

---

### Application Conversion Funnel

Create multiple panels showing:

1. **Applications Submitted**
   ```
   event_name:"metric.application_submitted" AND timestamp:>now-7d
   ```

2. **Users Signed Up**
   ```
   event_name:"metric.user_signup" AND timestamp:>now-7d
   ```

3. **Conversion Rate** (calculated manually or using Better Stack's formula feature)

---

## Creating Alerts

Better Stack allows you to set up alerts based on these metrics.

### Example Alert: No New Signups in 24 Hours

1. Go to **Alerts** → **New Alert**
2. **Name:** "No signups in 24 hours"
3. **Query:**
   ```
   event_name:"metric.user_signup"
   ```
4. **Condition:** Count is less than 1 in the last 24 hours
5. **Notification:** Email/Slack/PagerDuty

---

### Example Alert: High Application Volume

1. **Name:** "High application volume"
2. **Query:**
   ```
   event_name:"metric.application_submitted"
   ```
3. **Condition:** Count is greater than 50 in the last 1 hour
4. **Notification:** Slack notification to review capacity

---

## Alternative: Using Better Stack SQL Query Mode

Better Stack also supports SQL-like queries for more complex analysis:

### Total Users by Month
```sql
SELECT 
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) as user_count
FROM logs
WHERE event_name = 'metric.user_signup'
GROUP BY month
ORDER BY month DESC
```

### Daily Active Users with 7-Day Moving Average
```sql
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  COUNT(DISTINCT metadata.user_id) as dau,
  AVG(COUNT(DISTINCT metadata.user_id)) OVER (
    ORDER BY DATE_TRUNC('day', timestamp)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as moving_avg
FROM logs
WHERE event_name = 'metric.user_login'
GROUP BY day
ORDER BY day DESC
```

---

## Dashboard Layout Recommendation

Here's a suggested layout for your dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│                   FLINT KEY METRICS                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Users Today  │ Users Week   │ Users Month  │ Applications   │
│    [12]      │    [89]      │    [234]     │   Today [5]    │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                                                               │
│          User Signups Over Time (30 days)                    │
│          [Line Chart]                                         │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│          Applications Over Time (30 days)                    │
│          [Line Chart]                                         │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│          Daily Active Users (7 days)                         │
│          [Line Chart]                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Testing Your Dashboards

To verify data is flowing:

1. **Check Live Tail** in Better Stack:
   - Go to **Logs** → **Live Tail**
   - Filter by `event_name:"metric.*"`
   - You should see events streaming in real-time

2. **Trigger Test Events:**
   - Login to the app → generates `metric.user_login`
   - Submit an application form → generates `metric.application_submitted`
   - Complete a Stripe checkout → generates `metric.user_signup`

3. **Verify in Dashboard:**
   - Wait 1-2 minutes for data to aggregate
   - Refresh your dashboard
   - Numbers should update

---

## Troubleshooting

### No Data Showing

**Check:**
1. Verify events are being logged:
   ```
   event_name:"metric.*"
   ```
2. Check the time range on your panel (expand to last 7 days)
3. Verify your source is "Flint Production"

### Metrics Not Updating

**Solution:**
- Better Stack has a ~30-60 second lag
- Click the refresh button in the dashboard
- Check if events are in Live Tail but not in dashboard (cache issue)

### Query Not Working

**Common Issues:**
- Use double quotes for exact matches: `event_name:"metric.user_signup"`
- Check timestamp format: `timestamp:>now-1d` (not `>1d`)
- Verify field names match exactly (case-sensitive)

---

## Next Steps

1. **Create your first dashboard** using the panels above
2. **Set up alerts** for critical metrics (no signups, high error rates)
3. **Share dashboard** with your team (Better Stack has sharing links)
4. **Export to Grafana** (optional) - Better Stack supports Prometheus export if you prefer Grafana

---

## Additional Metrics to Consider

You can add more metrics to track:

- `metric.connection_added` - When users connect bank/brokerage accounts
- `metric.connection_removed` - When users disconnect accounts
- `metric.trade_executed` - When users execute trades
- `metric.transfer_completed` - When transfers complete
- `metric.alert_triggered` - When price alerts fire

Add these by using `logger.logMetric()` in your code:

```typescript
logger.logMetric('connection_added', {
  user_id: userId,
  connection_type: 'brokerage',
  provider: 'snaptrade',
});
```

---

## Support

If you need help building specific queries or dashboard panels, let me know the metric you want to track and I can provide the exact query!
