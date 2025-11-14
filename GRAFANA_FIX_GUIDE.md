# Grafana Dashboard Fix Guide

## Problem Summary
Your Grafana dashboard at `flintap.grafana.net` was not updating with new metrics (User Count, Applications, Daily Active Users) even after refreshing.

## Root Cause
1. **Better Stack (Logtail) deprecated its hosted Grafana integration** - They shut down their built-in Grafana dashboards and migrated to native Better Stack dashboards
2. **Existing logs lacked structured event fields** - Our logs were just informational messages without the structured format needed for Grafana to aggregate metrics

## Solution Implemented
I've added **structured metrics logging** to the application that sends events in a format Grafana can query and aggregate:

### Changes Made:
1. **Added `logMetric()` method** to `shared/logger.ts` that sends structured JSON events with:
   - `event_type`: Metric category (e.g., "user_signup", "application_submitted", "user_login")
   - `event_name`: Always formatted as `metric.{event_type}` for consistent querying
   - `timestamp`: ISO-8601 timestamp for time-series aggregation
   - Metadata with automatic PII scrubbing

2. **Integrated metric logging** at key events:
   - **User signups** → logs `metric.user_signup` when someone completes Stripe checkout
   - **Applications** → logs `metric.application_submitted` when landing page form is submitted
   - **User logins** → logs `metric.user_login` on successful authentication (tracks Daily Active Users)

## How to Update Your Grafana Dashboard

You need to update your Grafana dashboard queries to use the new structured event fields.

### Step 1: Access Your Grafana Dashboard
Go to `flintap.grafana.net` and open the dashboard you showed in the screenshot.

### Step 2: Update Panel Queries

For each panel, you'll need to modify the query to filter on the new `event_name` field:

#### **User Count - New Today**
```
count(metric.user_signup) where timestamp >= today()
```
Or if using LogQL (Loki):
```logql
count_over_time({source="flint"} |= "metric.user_signup" | json | __error__="" [24h])
```

#### **User Count - New This Week**
```logql
count_over_time({source="flint"} |= "metric.user_signup" | json | __error__="" [7d])
```

#### **User Count - New This Month**
```logql
count_over_time({source="flint"} |= "metric.user_signup" | json | __error__="" [30d])
```

#### **Applications - Total**
```logql
count_over_time({source="flint"} |= "metric.application_submitted" | json | __error__="" [365d])
```

#### **Applications - Today**
```logql
count_over_time({source="flint"} |= "metric.application_submitted" | json | __error__="" [24h])
```

#### **Applications - This Week**
```logql
count_over_time({source="flint"} |= "metric.application_submitted" | json | __error__="" [7d])
```

#### **Daily Active Users Chart**
```logql
sum(rate({source="flint"} |= "metric.user_login" | json [1h])) by (timestamp)
```

### Step 3: Verify Data is Flowing

After updating the queries:
1. **Test the metrics** - Perform a test action (login, submit application) to generate events
2. **Check Logtail/Better Stack** - Verify that events with `event_name: "metric.*"` are appearing in your logs
3. **Refresh Grafana** - Wait 1-2 minutes and refresh your dashboard

### Alternative: Better Stack Native Dashboards

Since Better Stack deprecated Grafana integration, you might want to consider using **Better Stack's native dashboards**:

1. Go to Better Stack Logs → Explore
2. Use SQL-based queries to create dashboards:
   ```sql
   SELECT COUNT(*) 
   FROM logs 
   WHERE event_name = 'metric.user_signup' 
   AND timestamp >= NOW() - INTERVAL '1 day'
   ```

3. Better Stack now includes:
   - Built-in anomaly detection
   - Native alerting
   - SQL-compatible log querying
   - No separate Grafana instance needed

## Testing the Fix

To verify metrics are being logged correctly:

1. **Check application logs** - You should see entries like:
   ```json
   {
     "level": "INFO",
     "message": "Metric: user_signup",
     "event_type": "user_signup",
     "event_name": "metric.user_signup",
     "timestamp": "2025-11-14T21:38:43.123Z",
     "user_id": "[REDACTED]",
     "subscription_tier": "basic"
   }
   ```

2. **Trigger test events**:
   - Login to your app → generates `metric.user_login`
   - Submit an application → generates `metric.application_submitted`
   - Complete a Stripe checkout → generates `metric.user_signup`

3. **Search Logtail** for `event_name:"metric.*"` to confirm events are arriving

## Security Note
All metric data automatically passes through PII redaction - emails, tokens, and API keys are scrubbed before logging.

## Next Steps (Optional Enhancements)

Additional metrics you might want to add later:
- `metric.user_activity` - Track specific feature interactions
- `metric.connection_added` - Monitor bank/brokerage connections
- `metric.connection_removed` - Track disconnections
- `metric.trade_executed` - Monitor trading activity

## Need Help?

If you need assistance updating your Grafana queries or migrating to Better Stack native dashboards, let me know!
