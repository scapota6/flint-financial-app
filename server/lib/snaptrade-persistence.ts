/**
 * SnapTrade data persistence layer
 * Handles database operations for SnapTrade data with proper error handling
 */

import { db } from '../db';
import { 
  snaptradeUsers, 
  snaptradeConnections, 
  snaptradeAccounts, 
  snaptradeBalances,
  snaptradePositions,
  snaptradeOrders,
  snaptradeActivities,
  snaptradeWebhooks,
  connectedAccounts
} from '../../shared/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { accountsApi } from './snaptrade';

/**
 * User Management
 */
export async function ensureSnapTradeUser(flintUserId: string, snaptradeUserId: string, userSecret: string) {
  try {
    // Check if user exists
    const existing = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUserId))
      .limit(1);

    if (existing.length > 0) {
      // Update with latest SnapTrade user ID (handles versioned IDs)
      const [updated] = await db
        .update(snaptradeUsers)
        .set({
          snaptradeUserId,
          userSecret,
          updatedAt: new Date()
        })
        .where(eq(snaptradeUsers.flintUserId, flintUserId))
        .returning();
      return updated;
    }

    // Create new user
    const [newUser] = await db
      .insert(snaptradeUsers)
      .values({
        flintUserId,
        snaptradeUserId,
        userSecret,
        createdAt: new Date()
      })
      .returning();

    return newUser;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error ensuring user:', error);
    throw error;
  }
}

export async function getSnapTradeUser(flintUserId: string) {
  try {
    const [user] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUserId))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting user:', error);
    throw error;
  }
}

/**
 * Connection Management
 */
export async function upsertSnapTradeConnection(data: {
  flintUserId: string;
  brokerageAuthorizationId: string;
  brokerageName: string;
  disabled?: boolean;
}) {
  try {
    const existing = await db
      .select()
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.brokerageAuthorizationId, data.brokerageAuthorizationId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      const [updated] = await db
        .update(snaptradeConnections)
        .set({
          brokerageName: data.brokerageName,
          disabled: data.disabled ?? false,
          updatedAt: new Date(),
          lastSyncAt: new Date()
        })
        .where(eq(snaptradeConnections.id, existing[0].id))
        .returning();

      return updated;
    } else {
      // Create new connection
      const [newConnection] = await db
        .insert(snaptradeConnections)
        .values({
          flintUserId: data.flintUserId,
          brokerageAuthorizationId: data.brokerageAuthorizationId,
          brokerageName: data.brokerageName,
          disabled: data.disabled ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSyncAt: new Date()
        })
        .returning();

      return newConnection;
    }
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting connection:', error);
    throw error;
  }
}

export async function getSnapTradeConnections(flintUserId: string) {
  try {
    return await db
      .select()
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.flintUserId, flintUserId))
      .orderBy(desc(snaptradeConnections.createdAt));
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting connections:', error);
    throw error;
  }
}

/**
 * Account Management
 */
export async function upsertSnapTradeAccount(connectionId: number, accountData: any) {
  try {
    const existing = await db
      .select()
      .from(snaptradeAccounts)
      .where(eq(snaptradeAccounts.id, accountData.id))
      .limit(1);

    const accountValues = {
      id: accountData.id,
      connectionId,
      brokerageAuthId: accountData.brokerage_authorization,
      brokerageName: accountData.institution_name,
      institution: accountData.institution_name,
      name: accountData.name,
      number: accountData.number,
      numberMasked: accountData.number ? `****${accountData.number.slice(-4)}` : null,
      accountType: accountData.meta?.brokerage_account_type || accountData.meta?.type,
      rawType: accountData.raw_type,
      status: accountData.status || 'open',
      currency: accountData.balance?.total?.currency || 'USD',
      totalBalanceAmount: accountData.balance?.total?.amount || 0,
      cashRestrictions: accountData.cash_restrictions || [],
      meta: accountData.meta || {},
      holdingsLastSync: accountData.sync_status?.holdings?.last_successful_sync ? 
        new Date(accountData.sync_status.holdings.last_successful_sync) : null,
      transactionsLastSync: accountData.sync_status?.transactions?.last_successful_sync ? 
        new Date(accountData.sync_status.transactions.last_successful_sync) : null,
      initialSyncCompleted: accountData.sync_status?.holdings?.initial_sync_completed || false,
      lastHoldingsSyncAt: accountData.sync_status?.holdings?.last_successful_sync ? 
        new Date(accountData.sync_status.holdings.last_successful_sync) : null,
      updatedAt: new Date()
    };

    if (existing.length > 0) {
      // Update existing account
      const [updated] = await db
        .update(snaptradeAccounts)
        .set(accountValues)
        .where(eq(snaptradeAccounts.id, accountData.id))
        .returning();

      return updated;
    } else {
      // Create new account
      const [newAccount] = await db
        .insert(snaptradeAccounts)
        .values({
          ...accountValues,
          createdAt: new Date()
        })
        .returning();

      return newAccount;
    }
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting account:', error);
    throw error;
  }
}

export async function getSnapTradeAccounts(flintUserId: string) {
  try {
    return await db
      .select({
        account: snaptradeAccounts,
        connection: snaptradeConnections
      })
      .from(snaptradeAccounts)
      .innerJoin(snaptradeConnections, eq(snaptradeAccounts.connectionId, snaptradeConnections.id))
      .where(eq(snaptradeConnections.flintUserId, flintUserId))
      .orderBy(desc(snaptradeAccounts.createdAt));
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting accounts:', error);
    throw error;
  }
}

export async function getSnapTradeAccount(accountId: string) {
  try {
    const [result] = await db
      .select({
        account: snaptradeAccounts,
        connection: snaptradeConnections
      })
      .from(snaptradeAccounts)
      .innerJoin(snaptradeConnections, eq(snaptradeAccounts.connectionId, snaptradeConnections.id))
      .where(eq(snaptradeAccounts.id, accountId))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting account:', error);
    throw error;
  }
}

/**
 * Balance Management
 */
export async function upsertSnapTradeBalances(accountId: string, balanceData: any) {
  try {
    // Delete existing balances for this account
    await db
      .delete(snaptradeBalances)
      .where(eq(snaptradeBalances.accountId, accountId));

    // Insert new balances
    const balanceValues = {
      accountId,
      cash: balanceData.cash?.amount || null,
      totalEquity: balanceData.total?.amount || null,
      buyingPower: balanceData.buying_power?.amount || null,
      maintenanceExcess: balanceData.maintenance_excess?.amount || null,
      currency: balanceData.cash?.currency || balanceData.total?.currency || 'USD',
      lastUpdated: new Date()
    };

    const [newBalance] = await db
      .insert(snaptradeBalances)
      .values(balanceValues)
      .returning();

    return newBalance;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting balances:', error);
    throw error;
  }
}

export async function getSnapTradeBalances(accountId: string) {
  try {
    const [balance] = await db
      .select()
      .from(snaptradeBalances)
      .where(eq(snaptradeBalances.accountId, accountId))
      .orderBy(desc(snaptradeBalances.lastUpdated))
      .limit(1);

    return balance || null;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting balances:', error);
    throw error;
  }
}

/**
 * Position Management
 */
export async function upsertSnapTradePositions(accountId: string, positionsData: any[]) {
  try {
    // Delete existing positions for this account
    await db
      .delete(snaptradePositions)
      .where(eq(snaptradePositions.accountId, accountId));

    if (positionsData.length === 0) {
      return [];
    }

    // Insert new positions
    const positionValues = positionsData.map(position => ({
      accountId,
      symbol: position.symbol?.symbol || position.symbol || '',
      symbolId: position.symbol?.id,
      description: position.symbol?.description || position.description,
      quantity: position.units || position.quantity || 0,
      avgCost: position.price || position.average_purchase_price || null,
      lastPrice: position.last_price || null,
      marketValue: position.market_value || null,
      unrealizedPnL: position.unrealized_pnl || null,
      unrealizedPnLPercent: position.unrealized_pnl_percent || null,
      currency: position.currency || 'USD',
      lastUpdated: new Date()
    }));

    return await db
      .insert(snaptradePositions)
      .values(positionValues)
      .returning();
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting positions:', error);
    throw error;
  }
}

export async function getSnapTradePositions(accountId: string) {
  try {
    return await db
      .select()
      .from(snaptradePositions)
      .where(eq(snaptradePositions.accountId, accountId))
      .orderBy(desc(snaptradePositions.marketValue));
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting positions:', error);
    throw error;
  }
}

/**
 * Order Management
 */
export async function upsertSnapTradeOrders(accountId: string, ordersData: any[]) {
  try {
    if (ordersData.length === 0) {
      return [];
    }

    const orderValues = ordersData.map(order => ({
      id: order.id || nanoid(),
      accountId,
      symbol: order.symbol || '',
      symbolId: order.symbol_id,
      side: order.action || order.side || 'BUY',
      type: order.type || 'MARKET',
      timeInForce: order.time_in_force,
      quantity: order.quantity || order.units || 0,
      price: order.price,
      stopPrice: order.stop_price,
      limitPrice: order.limit_price,
      avgFillPrice: order.average_fill_price,
      filledQuantity: order.filled_quantity,
      status: order.state || order.status || 'OPEN',
      placedAt: order.created_date ? new Date(order.created_date) : new Date(),
      filledAt: order.filled_date ? new Date(order.filled_date) : null,
      cancelledAt: order.cancelled_date ? new Date(order.cancelled_date) : null,
      lastUpdated: new Date()
    }));

    // Upsert orders (update if exists, insert if not)
    for (const orderValue of orderValues) {
      await db
        .insert(snaptradeOrders)
        .values(orderValue)
        .onConflictDoUpdate({
          target: snaptradeOrders.id,
          set: {
            status: orderValue.status,
            filledQuantity: orderValue.filledQuantity,
            avgFillPrice: orderValue.avgFillPrice,
            filledAt: orderValue.filledAt,
            cancelledAt: orderValue.cancelledAt,
            lastUpdated: orderValue.lastUpdated
          }
        });
    }

    return orderValues;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting orders:', error);
    throw error;
  }
}

export async function getSnapTradeOrders(
  accountId: string, 
  options: { 
    startDate?: string; 
    endDate?: string; 
    limit?: number; 
    offset?: number; 
  } = {}
) {
  try {
    let query = db
      .select()
      .from(snaptradeOrders)
      .where(eq(snaptradeOrders.accountId, accountId));

    // Apply date filters
    if (options.startDate) {
      query = query.where(and(
        eq(snaptradeOrders.accountId, accountId),
        gte(snaptradeOrders.placedAt, new Date(options.startDate))
      ));
    }
    if (options.endDate) {
      query = query.where(and(
        eq(snaptradeOrders.accountId, accountId),
        lte(snaptradeOrders.placedAt, new Date(options.endDate))
      ));
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.orderBy(desc(snaptradeOrders.placedAt));
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting orders:', error);
    throw error;
  }
}

/**
 * Activity Management
 */
export async function upsertSnapTradeActivities(accountId: string, activitiesData: any[]) {
  try {
    if (activitiesData.length === 0) {
      return [];
    }

    const activityValues = activitiesData.map(activity => ({
      id: activity.id || nanoid(),
      accountId,
      date: activity.date ? new Date(activity.date) : new Date(),
      type: activity.type || 'TRADE',
      description: activity.description || '',
      amount: activity.amount || 0,
      currency: activity.currency || 'USD',
      symbol: activity.symbol,
      symbolId: activity.symbol_id,
      quantity: activity.quantity,
      price: activity.price,
      tradeDate: activity.trade_date ? new Date(activity.trade_date) : null,
      settlementDate: activity.settlement_date ? new Date(activity.settlement_date) : null,
      lastUpdated: new Date()
    }));

    // Upsert activities
    for (const activityValue of activityValues) {
      await db
        .insert(snaptradeActivities)
        .values(activityValue)
        .onConflictDoUpdate({
          target: snaptradeActivities.id,
          set: {
            description: activityValue.description,
            amount: activityValue.amount,
            lastUpdated: activityValue.lastUpdated
          }
        });
    }

    return activityValues;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error upserting activities:', error);
    throw error;
  }
}

export async function getSnapTradeActivities(
  accountId: string, 
  options: { 
    startDate?: string; 
    endDate?: string; 
    limit?: number; 
    offset?: number; 
  } = {}
) {
  try {
    let query = db
      .select()
      .from(snaptradeActivities)
      .where(eq(snaptradeActivities.accountId, accountId));

    // Apply date filters
    if (options.startDate) {
      query = query.where(and(
        eq(snaptradeActivities.accountId, accountId),
        gte(snaptradeActivities.date, new Date(options.startDate))
      ));
    }
    if (options.endDate) {
      query = query.where(and(
        eq(snaptradeActivities.accountId, accountId),
        lte(snaptradeActivities.date, new Date(options.endDate))
      ));
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.orderBy(desc(snaptradeActivities.date));
  } catch (error) {
    console.error('[SnapTrade Persistence] Error getting activities:', error);
    throw error;
  }
}

/**
 * Webhook Management
 */
export async function logSnapTradeWebhook(data: {
  type: string;
  userId?: string;
  authorizationId?: string;
  payload: any;
  processed?: boolean;
  error?: string;
}) {
  try {
    const [webhook] = await db
      .insert(snaptradeWebhooks)
      .values({
        type: data.type,
        userId: data.userId,
        authorizationId: data.authorizationId,
        payloadJson: data.payload,
        processed: data.processed ?? false,
        error: data.error,
        createdAt: new Date()
      })
      .returning();

    return webhook;
  } catch (error) {
    console.error('[SnapTrade Persistence] Error logging webhook:', error);
    throw error;
  }
}

/**
 * Sync accounts for a SnapTrade connection
 * Fetches accounts from SnapTrade API and upserts to both snaptradeAccounts and connectedAccounts tables
 * This ensures the dashboard can display newly connected accounts
 */
export async function syncAccountsForConnection(
  flintUserId: string,
  snaptradeUserId: string,
  userSecret: string,
  authorizationId?: string
): Promise<{ success: boolean; accountsSynced: number; error?: string }> {
  try {
    console.log('[SnapTrade Sync] Starting account sync for user:', flintUserId);

    // Fetch all accounts from SnapTrade
    const accountsResponse = await accountsApi.listUserAccounts({
      userId: snaptradeUserId,
      userSecret: userSecret,
    });

    const accounts = accountsResponse.data || [];
    console.log(`[SnapTrade Sync] Fetched ${accounts.length} accounts from SnapTrade`);

    // Filter by authorizationId if provided
    const filteredAccounts = authorizationId
      ? accounts.filter((acc: any) => acc.brokerage_authorization === authorizationId)
      : accounts;

    console.log(`[SnapTrade Sync] Processing ${filteredAccounts.length} accounts${authorizationId ? ` for authorization ${authorizationId}` : ''}`);

    let syncedCount = 0;

    for (const account of filteredAccounts) {
      try {
        // Find the connection record for this account
        const [connection] = await db
          .select()
          .from(snaptradeConnections)
          .where(eq(snaptradeConnections.brokerageAuthorizationId, account.brokerage_authorization))
          .limit(1);

        if (!connection) {
          // Create the connection if it doesn't exist
          const [newConnection] = await db
            .insert(snaptradeConnections)
            .values({
              flintUserId,
              brokerageAuthorizationId: account.brokerage_authorization,
              brokerageName: account.institution_name || 'Unknown',
              disabled: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSyncAt: new Date()
            })
            .returning();

          console.log('[SnapTrade Sync] Created new connection:', newConnection.id);

          // Use the new connection ID
          await upsertAccountToTables(flintUserId, newConnection.id, account);
        } else {
          // Use existing connection ID
          await upsertAccountToTables(flintUserId, connection.id, account);
        }

        syncedCount++;
      } catch (accountError: any) {
        console.error(`[SnapTrade Sync] Error syncing account ${account.id}:`, accountError.message);
      }
    }

    console.log(`[SnapTrade Sync] Successfully synced ${syncedCount} accounts`);

    return {
      success: true,
      accountsSynced: syncedCount
    };
  } catch (error: any) {
    console.error('[SnapTrade Sync] Error syncing accounts:', error.message);
    return {
      success: false,
      accountsSynced: 0,
      error: error.message
    };
  }
}

/**
 * Helper to upsert account to both snaptradeAccounts and connectedAccounts tables
 */
async function upsertAccountToTables(
  flintUserId: string,
  connectionId: number,
  account: any
): Promise<void> {
  const accountId = account.id;
  const institutionName = account.institution_name || 'Unknown';
  const accountName = account.name || `${institutionName} Account`;
  const balance = account.balance?.total?.amount || 0;
  const currency = account.balance?.total?.currency || 'USD';
  const accountType = account.meta?.type || account.raw_type || 'investment';
  
  // Normalize account status
  const rawStatus = (account.status || 'open').toLowerCase();
  const isActive = rawStatus === 'open' || rawStatus === 'active';
  const normalizedStatus = isActive ? 'connected' : 
    rawStatus === 'closed' ? 'disconnected' : 
    rawStatus === 'archived' ? 'expired' : 'disconnected';

  // 1. Upsert to snaptradeAccounts
  const existingSnapAccount = await db
    .select()
    .from(snaptradeAccounts)
    .where(eq(snaptradeAccounts.id, accountId))
    .limit(1);

  const snapAccountValues = {
    id: accountId,
    connectionId,
    brokerageAuthId: account.brokerage_authorization,
    brokerageName: institutionName,
    institution: institutionName,
    name: accountName,
    number: account.number,
    numberMasked: account.number ? `****${account.number.slice(-4)}` : null,
    accountType: account.meta?.brokerage_account_type || accountType,
    rawType: account.raw_type,
    status: account.status || 'open',
    currency,
    totalBalanceAmount: String(balance),
    cashRestrictions: account.cash_restrictions || [],
    meta: account.meta || {},
    holdingsLastSync: account.sync_status?.holdings?.last_successful_sync
      ? new Date(account.sync_status.holdings.last_successful_sync)
      : null,
    initialSyncCompleted: account.sync_status?.holdings?.initial_sync_completed || false,
    updatedAt: new Date()
  };

  if (existingSnapAccount.length > 0) {
    await db
      .update(snaptradeAccounts)
      .set(snapAccountValues)
      .where(eq(snaptradeAccounts.id, accountId));
  } else {
    await db
      .insert(snaptradeAccounts)
      .values({
        ...snapAccountValues,
        createdAt: new Date()
      });
  }

  // 2. Upsert to connectedAccounts (for dashboard display)
  const existingConnected = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.userId, flintUserId),
        eq(connectedAccounts.provider, 'snaptrade'),
        eq(connectedAccounts.externalAccountId, accountId)
      )
    )
    .limit(1);

  const connectedAccountValues = {
    userId: flintUserId,
    accountType: 'brokerage',
    provider: 'snaptrade',
    institutionName,
    accountName,
    accountNumber: account.number ? `****${account.number.slice(-4)}` : null,
    balance: String(balance),
    currency,
    isActive,
    status: normalizedStatus,
    lastSynced: new Date(),
    externalAccountId: accountId,
    connectionId: account.brokerage_authorization,
    updatedAt: new Date()
  };

  if (existingConnected.length > 0) {
    await db
      .update(connectedAccounts)
      .set(connectedAccountValues)
      .where(eq(connectedAccounts.id, existingConnected[0].id));
    console.log(`[SnapTrade Sync] Updated connected account: ${accountName}`);
  } else {
    await db
      .insert(connectedAccounts)
      .values({
        ...connectedAccountValues,
        createdAt: new Date()
      });
    console.log(`[SnapTrade Sync] Created connected account: ${accountName}`);
  }
}