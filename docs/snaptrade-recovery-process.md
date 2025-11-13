# SnapTrade User Recovery Process

## Incident Summary
Date: November 13, 2025

Two SnapTrade user registrations were accidentally deleted from SnapTrade's system during a cleanup operation:

1. **User ID**: `435bab88-4a15-4898-adae-775b76d25254` (seba.rod136@gmail.com - Sebastian Rodriguez)
2. **User ID**: `45137738` (Unknown/Test user)

**Status**: 
- ✅ Flint accounts remain intact in production database
- ❌ SnapTrade registrations deleted (marked as `_deleted` in SnapTrade's system)
- ❌ All brokerage connections lost

## What This Means

The affected users:
- Can still log into Flint normally
- Will see empty portfolios/accounts
- Need to reconnect their brokerage accounts
- Will be automatically re-registered when they attempt to connect

## Manual Recovery Process

When affected users next log in and try to view their accounts:

### Step 1: Automatic Re-Registration
The system will automatically re-register them with SnapTrade when they:
- Navigate to the Connect/Accounts page
- Click "Add Brokerage" or "Connect Account"
- The frontend calls `POST /api/snaptrade/users/register` which creates a new SnapTrade registration

### Step 2: Reconnect Brokerage Accounts
Users must manually reconnect all their brokerage accounts:
1. Go to Settings → Connected Accounts
2. Click "Add Brokerage"
3. Select their brokerage (Robinhood, Coinbase, etc.)
4. Complete OAuth authorization
5. Wait for account data to sync

### Step 3: Verify Data
After reconnecting:
- Portfolio balances should appear within 30 seconds
- Holdings/positions sync automatically
- Historical data may need 1-2 minutes to populate

## User Notification Template

```
Subject: Reconnect Your Brokerage Accounts

Hi [Name],

We encountered a technical issue that requires you to reconnect your brokerage accounts to Flint.

What happened:
Your Flint account is safe, but we need you to reconnect your external brokerage accounts (Robinhood, Coinbase, etc.) to restore your portfolio data.

What you need to do:
1. Log into Flint
2. Go to Settings → Connected Accounts
3. Click "Add Brokerage" for each account you previously connected
4. Complete the authorization flow
5. Your portfolio data will sync automatically

This is a one-time reconnection. Once complete, everything will work normally.

We apologize for the inconvenience. If you have any questions or need assistance, please contact support.

Best regards,
The Flint Team
```

## Technical Details

### Database State
Production `snaptrade_users` table still contains:
- User records with old `snaptradeUserId` and `userSecret`
- These credentials are now invalid (users deleted from SnapTrade)

When users reconnect:
- New SnapTrade registration creates fresh `snaptradeUserId` and `userSecret`
- Database record is updated via `ensureSnapTradeUser()` function
- Old connections/accounts records remain but are orphaned
- New connections are created on reconnection

### Cleanup (Optional)
You may want to clean up orphaned connection records:

```sql
-- Mark orphaned connections as disabled
UPDATE snaptrade_connections 
SET disabled = true, updated_at = NOW()
WHERE flint_user_id IN (
  '435bab88-4a15-4898-adae-775b76d25254',
  '45137738'
);

-- Delete orphaned account records
DELETE FROM snaptrade_accounts 
WHERE flint_user_id IN (
  '435bab88-4a15-4898-adae-775b76d25254', 
  '45137738'
);

-- Delete orphaned balances/positions
DELETE FROM snaptrade_balances 
WHERE flint_user_id IN (
  '435bab88-4a15-4898-adae-775b76d25254',
  '45137738'
);

DELETE FROM snaptrade_positions 
WHERE flint_user_id IN (
  '435bab88-4a15-4898-adae-775b76d25254',
  '45137738'
);
```

## Prevention

To prevent this from happening again:

1. **Environment Checks**: Cleanup scripts now require explicit environment confirmation
2. **Dry-Run Mode**: Scripts show what will be deleted before executing
3. **Database Verification**: Scripts compare against the correct database (production vs development)

See: `scripts/delete-orphaned-snaptrade-users.ts` for updated safeguards

## Support

If affected users experience issues after reconnecting:
- Check Betterstack logs for SnapTrade API errors
- Verify `snaptrade_users` table has updated credentials
- Test connection via SnapTrade dashboard
- Contact SnapTrade support if credentials appear invalid
