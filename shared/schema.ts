import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  json,
  index,
  decimal,
  integer,
  boolean,
  serial,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // For password-based login (Argon2id)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Email verification
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  // MFA/TOTP
  mfaSecret: varchar("mfa_secret"), // TOTP secret for Google Authenticator
  mfaEnabled: boolean("mfa_enabled").default(false),
  // Password history (last N hashes to prevent reuse)
  lastPasswordHashes: text("last_password_hashes").array(),
  // Subscription & payment
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, basic, pro, premium
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired
  // Lemon Squeezy payment tracking (legacy)
  lemonSqueezyOrderId: varchar("lemonsqueezy_order_id"),
  lemonSqueezyCustomerId: varchar("lemonsqueezy_customer_id"),
  lemonSqueezyVariantId: varchar("lemonsqueezy_variant_id"),
  // Whop payment tracking
  whopMembershipId: varchar("whop_membership_id"),
  whopCustomerId: varchar("whop_customer_id"),
  whopPlanId: varchar("whop_plan_id"),
  // User metadata
  isAdmin: boolean("is_admin").default(false),
  isBanned: boolean("is_banned").default(false),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("users_last_login_idx").on(table.lastLogin),
  index("users_subscription_tier_idx").on(table.subscriptionTier),
  index("users_email_verified_idx").on(table.emailVerified),
]);

// SnapTrade users table per specification: snaptrade_users(flint_user_id PK, user_secret, created_at, rotated_at)
export const snaptradeUsers = pgTable('snaptrade_users', {
  flintUserId: varchar('flint_user_id').primaryKey().references(() => users.id), // Changed to PK as per spec
  snaptradeUserId: varchar('snaptrade_user_id').notNull(), // The actual SnapTrade user ID (original or versioned)
  userSecret: varchar('user_secret').notNull(), // Simplified name as per spec
  createdAt: timestamp('created_at').defaultNow(),
  rotatedAt: timestamp('rotated_at'),
});

// SnapTrade connections table per specification: snaptrade_connections(id PK, flint_user_id, brokerage_name, disabled, created_at, updated_at, last_sync_at)
export const snaptradeConnections = pgTable('snaptrade_connections', {
  id: serial('id').primaryKey(),
  flintUserId: varchar('flint_user_id').notNull().references(() => users.id),
  brokerageAuthorizationId: varchar('brokerage_authorization_id').notNull().unique(), // the actual UUID from SnapTrade
  brokerageName: varchar('brokerage_name').notNull(),
  disabled: boolean('disabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSyncAt: timestamp('last_sync_at'), // Renamed to match spec
}, (table) => ({
  userAuthIndex: index('snaptrade_connections_user_auth_idx').on(table.flintUserId, table.brokerageAuthorizationId),
}));

// Teller users table: stores one enrollment per user (similar to snaptrade_users)
export const tellerUsers = pgTable('teller_users', {
  flintUserId: varchar('flint_user_id').primaryKey().references(() => users.id),
  enrollmentId: varchar('enrollment_id').notNull().unique(), // Teller enrollment ID
  accessToken: varchar('access_token').notNull(), // Teller access token (stored once per user)
  institutionName: varchar('institution_name'), // Primary institution name
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Connected accounts (banks, brokerages, crypto)
export const connectedAccounts = pgTable("connected_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accountType: varchar("account_type").notNull(), // bank, brokerage, crypto
  provider: varchar("provider").notNull(), // teller, snaptrade
  institutionName: varchar("institution_name").notNull(),
  accountName: varchar("account_name").notNull(),
  accountNumber: varchar("account_number"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  isActive: boolean("is_active").default(true),
  status: varchar("status").default("connected"), // connected, disconnected, expired
  lastSynced: timestamp("last_synced").defaultNow(),
  lastCheckedAt: timestamp("last_checked_at"),
  accessToken: varchar("access_token"), // API access token
  refreshToken: varchar("refresh_token"), // refresh token if needed
  externalAccountId: varchar("external_account_id"), // provider's account ID
  connectionId: varchar("connection_id"), // provider's connection ID
  institutionId: varchar("institution_id"), // provider's institution ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("connected_accounts_user_idx").on(table.userId),
  typeIdx: index("connected_accounts_type_idx").on(table.accountType),
  activeIdx: index("connected_accounts_active_idx").on(table.isActive),
  userTypeIdx: index("connected_accounts_user_type_idx").on(table.userId, table.accountType),
  uniqueAccountConstraint: unique("connected_accounts_user_provider_external_unique").on(table.userId, table.provider, table.externalAccountId),
}));

// Account snapshots cache table for SnapTrade API responses
export const accountSnapshots = pgTable("account_snapshots", {
  id: serial("id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  userId: varchar("user_id").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  accountUserUnique: unique("account_snapshots_account_user_unique").on(table.accountId, table.userId),
  expiresIdx: index("account_snapshots_expires_idx").on(table.expiresAt),
}));

// SnapTrade accounts table per specification: snaptrade_accounts(id PK, connection_id, institution, name, number_masked, raw_type, status, currency, total_balance_amount, last_holdings_sync_at)
export const snaptradeAccounts = pgTable('snaptrade_accounts', {
  id: varchar('id').primaryKey(), // account UUID
  connectionId: integer('connection_id').notNull().references(() => snaptradeConnections.id),
  brokerageAuthId: varchar('brokerage_auth_id'),
  brokerageName: varchar('brokerage_name'),
  institution: varchar('institution').notNull(),
  name: varchar('name'),
  number: varchar('number'),
  numberMasked: varchar('number_masked'),
  accountType: varchar('account_type'),
  rawType: varchar('raw_type'),
  status: varchar('status'),
  currency: varchar('currency').default('USD'),
  totalBalanceAmount: decimal('total_balance_amount', { precision: 15, scale: 2 }),
  cashRestrictions: json('cash_restrictions'),
  meta: json('meta'),
  holdingsLastSync: timestamp('holdings_last_sync'),
  transactionsLastSync: timestamp('transactions_last_sync'),
  initialSyncCompleted: boolean('initial_sync_completed').default(false),
  lastHoldingsSyncAt: timestamp('last_holdings_sync_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  connectionIndex: index('snaptrade_accounts_connection_idx').on(table.connectionId),
}));

// SnapTrade account balances table (with 10-second caching for cross-platform consistency)
export const snaptradeBalances = pgTable('snaptrade_balances', {
  id: serial('id').primaryKey(),
  accountId: varchar('account_id').notNull().unique().references(() => snaptradeAccounts.id),
  cash: decimal('cash', { precision: 15, scale: 2 }),
  totalEquity: decimal('total_equity', { precision: 15, scale: 2 }),
  buyingPower: decimal('buying_power', { precision: 15, scale: 2 }),
  maintenanceExcess: decimal('maintenance_excess', { precision: 15, scale: 2 }),
  currency: varchar('currency').default('USD'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  accountIndex: index('snaptrade_balances_account_idx').on(table.accountId),
  lastUpdatedIndex: index('snaptrade_balances_last_updated_idx').on(table.lastUpdated),
}));

// SnapTrade positions/holdings table
export const snaptradePositions = pgTable('snaptrade_positions', {
  id: serial('id').primaryKey(),
  accountId: varchar('account_id').notNull().references(() => snaptradeAccounts.id),
  symbol: varchar('symbol').notNull(),
  symbolId: varchar('symbol_id'),
  description: varchar('description'),
  quantity: decimal('quantity', { precision: 15, scale: 8 }).notNull(),
  avgCost: decimal('avg_cost', { precision: 15, scale: 4 }),
  lastPrice: decimal('last_price', { precision: 15, scale: 4 }),
  marketValue: decimal('market_value', { precision: 15, scale: 2 }),
  unrealizedPnL: decimal('unrealized_pnl', { precision: 15, scale: 2 }),
  unrealizedPnLPercent: decimal('unrealized_pnl_percent', { precision: 8, scale: 4 }),
  currency: varchar('currency').default('USD'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  accountSymbolIndex: index('snaptrade_positions_account_symbol_idx').on(table.accountId, table.symbol),
}));

// SnapTrade orders table
export const snaptradeOrders = pgTable('snaptrade_orders', {
  id: varchar('id').primaryKey(), // order UUID from SnapTrade
  accountId: varchar('account_id').notNull().references(() => snaptradeAccounts.id),
  symbol: varchar('symbol').notNull(),
  symbolId: varchar('symbol_id'),
  side: varchar('side').notNull(), // BUY/SELL
  type: varchar('type').notNull(), // MARKET/LIMIT/STOP/STOP_LIMIT
  timeInForce: varchar('time_in_force'), // DAY/GTC/FOK/IOC
  quantity: decimal('quantity', { precision: 15, scale: 8 }).notNull(),
  price: decimal('price', { precision: 15, scale: 4 }),
  stopPrice: decimal('stop_price', { precision: 15, scale: 4 }),
  limitPrice: decimal('limit_price', { precision: 15, scale: 4 }),
  avgFillPrice: decimal('avg_fill_price', { precision: 15, scale: 4 }),
  filledQuantity: decimal('filled_quantity', { precision: 15, scale: 8 }),
  status: varchar('status').notNull(), // OPEN/FILLED/CANCELLED/REJECTED/EXPIRED
  placedAt: timestamp('placed_at').notNull(),
  filledAt: timestamp('filled_at'),
  cancelledAt: timestamp('cancelled_at'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  accountIndex: index('snaptrade_orders_account_idx').on(table.accountId),
  symbolIndex: index('snaptrade_orders_symbol_idx').on(table.symbol),
  statusIndex: index('snaptrade_orders_status_idx').on(table.status),
}));

// SnapTrade activities table
export const snaptradeActivities = pgTable('snaptrade_activities', {
  id: varchar('id').primaryKey(), // activity UUID from SnapTrade
  accountId: varchar('account_id').notNull().references(() => snaptradeAccounts.id),
  date: timestamp('date').notNull(),
  type: varchar('type').notNull(), // TRADE/DIVIDEND/INTEREST/FEE/TRANSFER
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // positive credit / negative debit
  currency: varchar('currency').default('USD'),
  symbol: varchar('symbol'),
  symbolId: varchar('symbol_id'),
  quantity: decimal('quantity', { precision: 15, scale: 8 }),
  price: decimal('price', { precision: 15, scale: 4 }),
  tradeDate: timestamp('trade_date'),
  settlementDate: timestamp('settlement_date'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  accountIndex: index('snaptrade_activities_account_idx').on(table.accountId),
  dateIndex: index('snaptrade_activities_date_idx').on(table.date),
  typeIndex: index('snaptrade_activities_type_idx').on(table.type),
}));

// SnapTrade option holdings table
export const snaptradeOptionHoldings = pgTable('snaptrade_option_holdings', {
  id: serial('id').primaryKey(),
  accountId: varchar('account_id').notNull().references(() => snaptradeAccounts.id),
  occSymbol: varchar('occ_symbol').notNull(), // OCC symbol format
  description: varchar('description'),
  quantity: decimal('quantity', { precision: 15, scale: 8 }).notNull(),
  markPrice: decimal('mark_price', { precision: 15, scale: 4 }),
  marketValue: decimal('market_value', { precision: 15, scale: 2 }),
  unrealizedPnL: decimal('unrealized_pnl', { precision: 15, scale: 2 }),
  currency: varchar('currency').default('USD'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  accountIndex: index('snaptrade_option_holdings_account_idx').on(table.accountId),
}));

// Holdings (stocks, crypto, etc.)
export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accountId: integer("account_id").references(() => connectedAccounts.id).notNull(),
  symbol: varchar("symbol").notNull(),
  name: varchar("name").notNull(),
  assetType: varchar("asset_type").notNull(), // stock, crypto, etf, etc.
  quantity: decimal("quantity", { precision: 15, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 15, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 2 }).notNull(),
  marketValue: decimal("market_value", { precision: 15, scale: 2 }).notNull(),
  gainLoss: decimal("gain_loss", { precision: 15, scale: 2 }).notNull(),
  gainLossPercentage: decimal("gain_loss_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("holdings_user_idx").on(table.userId),
  index("holdings_account_idx").on(table.accountId),
  index("holdings_symbol_idx").on(table.symbol),
  index("holdings_user_symbol_idx").on(table.userId, table.symbol),
]);

// Watchlist
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbol: varchar("symbol").notNull(),
  name: varchar("name").notNull(),
  assetType: varchar("asset_type").notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 2 }).notNull(),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("watchlist_user_idx").on(table.userId),
  index("watchlist_symbol_idx").on(table.symbol),
  index("watchlist_user_symbol_idx").on(table.userId, table.symbol),
]);

// Trades
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accountId: varchar("account_id").notNull(),
  symbol: varchar("symbol").notNull(),
  assetType: varchar("asset_type").notNull(),
  side: varchar("side").notNull(), // buy, sell
  quantity: decimal("quantity", { precision: 15, scale: 8 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  orderType: varchar("order_type").notNull(), // market, limit, stop
  status: varchar("status").notNull(), // pending, filled, cancelled
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("trades_user_idx").on(table.userId),
  index("trades_account_idx").on(table.accountId),
  index("trades_status_idx").on(table.status),
  index("trades_created_idx").on(table.createdAt),
]);

// Transfers
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fromAccountId: varchar("from_account_id").notNull(),
  toAccountId: varchar("to_account_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").notNull(), // pending, completed, failed
  description: text("description"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("transfers_user_idx").on(table.userId),
  index("transfers_status_idx").on(table.status),
  index("transfers_created_idx").on(table.createdAt),
]);

// Activity log
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // login, trade, transfer, watchlist_add, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("activity_log_user_idx").on(table.userId),
  index("activity_log_action_idx").on(table.action),
  index("activity_log_created_idx").on(table.createdAt),
]);

// Market data cache
export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol").notNull(),
  name: varchar("name").notNull(),
  assetType: varchar("asset_type").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("market_data_symbol_idx").on(table.symbol),
  index("market_data_asset_type_idx").on(table.assetType),
  index("market_data_updated_idx").on(table.lastUpdated),
]);

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Price alerts table
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  abovePrice: decimal("above_price", { precision: 10, scale: 2 }),
  belowPrice: decimal("below_price", { precision: 10, scale: 2 }),
  active: boolean("active").default(true).notNull(),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("alerts_user_idx").on(table.userId),
  index("alerts_symbol_idx").on(table.symbol),
  index("alerts_active_idx").on(table.active),
]);

// Alert history for debouncing
export const alertHistory = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").notNull().references(() => priceAlerts.id, { onDelete: 'cascade' }),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  triggerPrice: decimal("trigger_price", { precision: 10, scale: 2 }).notNull(),
  triggerType: varchar("trigger_type", { length: 10 }).notNull(), // 'above' or 'below'
  notificationSent: boolean("notification_sent").default(false).notNull(),
}, (table) => [
  index("history_alert_idx").on(table.alertId),
  index("history_triggered_idx").on(table.triggeredAt),
]);

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  emailAlerts: boolean("email_alerts").default(true).notNull(),
  pushAlerts: boolean("push_alerts").default(true).notNull(),
  quietHoursStart: integer("quiet_hours_start"), // Hour in 24h format (0-23)
  quietHoursEnd: integer("quiet_hours_end"), // Hour in 24h format (0-23)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;
export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;

export type InsertConnectedAccount = typeof connectedAccounts.$inferInsert;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;

export type InsertHolding = typeof holdings.$inferInsert;
export type Holding = typeof holdings.$inferSelect;

export type InsertWatchlistItem = typeof watchlist.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;

export type InsertTrade = typeof trades.$inferInsert;
export type Trade = typeof trades.$inferSelect;

export type InsertTransfer = typeof transfers.$inferInsert;
export type Transfer = typeof transfers.$inferSelect;

export type InsertActivityLog = typeof activityLog.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;

export type InsertMarketData = typeof marketData.$inferInsert;
export type MarketData = typeof marketData.$inferSelect;

// SnapTrade webhooks table per specification: snaptrade_webhooks(id, type, created_at, user_id, authorization_id, payload_json)
export const snaptradeWebhooks = pgTable('snaptrade_webhooks', {
  id: serial('id').primaryKey(),
  type: varchar('type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  userId: varchar('user_id'), // flint user ID
  authorizationId: varchar('authorization_id'), // brokerage authorization ID
  payloadJson: jsonb('payload_json').notNull(),
  processed: boolean('processed').default(false),
  error: text('error'),
}, (table) => ({
  typeIndex: index('snaptrade_webhooks_type_idx').on(table.type),
  userIndex: index('snaptrade_webhooks_user_idx').on(table.userId),
  processedIndex: index('snaptrade_webhooks_processed_idx').on(table.processed),
}));

export type SnaptradeUser = typeof snaptradeUsers.$inferSelect;
export type InsertSnaptradeUser = typeof snaptradeUsers.$inferInsert;

export type SnaptradeConnection = typeof snaptradeConnections.$inferSelect;
export type InsertSnaptradeConnection = typeof snaptradeConnections.$inferInsert;

export type TellerUser = typeof tellerUsers.$inferSelect;
export type InsertTellerUser = typeof tellerUsers.$inferInsert;

// Insert schemas
export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWatchlistItemSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

// Account applications table (for landing page form submissions)
export const accountApplications = pgTable("account_applications", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  email: varchar("email").notNull(),
  accountCount: varchar("account_count").notNull(),
  connectType: varchar("connect_type").notNull(), // banks, brokerages, both
  status: varchar("status").default("pending"), // pending, approved, rejected
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by"), // admin email who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

// Feature requests table (user feedback and feature suggestions)
export const featureRequests = pgTable("feature_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, critical
  description: text("description").notNull(),
  status: varchar("status").default("pending"), // pending, reviewing, planned, in_progress, completed, rejected
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by"), // admin email who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
}, (table) => [
  index("feature_requests_status_idx").on(table.status),
  index("feature_requests_priority_idx").on(table.priority),
  index("feature_requests_submitted_idx").on(table.submittedAt),
]);

// Audit logs table (admin actions tracking)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // User who was affected
  adminEmail: varchar("admin_email").notNull(), // Admin who performed the action
  action: varchar("action").notNull(), // approve_application, delete_user, reset_password, etc.
  targetUserId: varchar("target_user_id"), // Optional target user
  details: jsonb("details"), // Additional details about the action
  timestamp: timestamp("timestamp").defaultNow(),
});

// Email logs table (track all emails sent)
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipient: varchar("recipient").notNull(),
  subject: varchar("subject").notNull(),
  template: varchar("template").notNull(), // approval, rejection, password_reset
  status: varchar("status").notNull(), // sent, failed
  sentAt: timestamp("sent_at").defaultNow(),
  error: text("error"),
});

// Feature flags table (toggle features on/off)
export const featureFlags = pgTable("feature_flags", {
  key: varchar("key").primaryKey(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
  updatedBy: varchar("updated_by"), // Admin email who updated
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table (for secure password setup links)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  tokenType: varchar("token_type").notNull().default("password_reset"), // password_reset or email_verification
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_tokens_type_idx").on(table.tokenType),
  index("password_reset_tokens_user_type_idx").on(table.userId, table.tokenType),
]);

// JWT refresh tokens table for session management
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  deviceInfo: varchar("device_info"), // User agent, device name
  ipAddress: varchar("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").default(false),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
}, (table) => [
  index("refresh_tokens_user_idx").on(table.userId),
  index("refresh_tokens_token_idx").on(table.token),
]);

// Orphaned SnapTrade accounts tracking (for error 1010 - user already exists on SnapTrade but not in our DB)
export const orphanedSnaptradeAccounts = pgTable("orphaned_snaptrade_accounts", {
  id: serial("id").primaryKey(),
  flintUserId: varchar("flint_user_id").references(() => users.id).notNull(),
  orphanedSnaptradeId: varchar("orphaned_snaptrade_id").notNull(), // The ID that's stuck on SnapTrade
  newSnaptradeId: varchar("new_snaptrade_id"), // The recovery ID we used (e.g., userId-v2)
  userEmail: varchar("user_email").notNull(),
  errorCode: varchar("error_code").default("1010"),
  errorMessage: text("error_message"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("orphaned_snaptrade_user_idx").on(table.flintUserId),
  index("orphaned_snaptrade_resolved_idx").on(table.resolved),
]);

// Error logs table for per-user error tracking
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  errorType: varchar("error_type").notNull(), // e.g., 'SnapTrade', 'Teller', 'Database', 'Auth', 'API'
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  endpoint: varchar("endpoint"), // API endpoint where error occurred
  method: varchar("method"), // HTTP method (GET, POST, etc.)
  statusCode: integer("status_code"), // HTTP status code
  userAgent: varchar("user_agent"),
  ipAddress: varchar("ip_address"),
  metadata: jsonb("metadata"), // Additional context (request body, query params, etc.)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("error_logs_user_idx").on(table.userId),
  index("error_logs_timestamp_idx").on(table.timestamp),
  index("error_logs_error_type_idx").on(table.errorType),
  index("error_logs_user_timestamp_idx").on(table.userId, table.timestamp),
]);

// Insert schemas for new tables
export const insertAccountApplicationSchema = createInsertSchema(accountApplications).omit({
  id: true,
  submittedAt: true,
});

export const insertFeatureRequestSchema = createInsertSchema(featureRequests).omit({
  id: true,
  submittedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
}).extend({
  phone: z.string().trim().transform(v => v === '' ? undefined : v).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

// Types for new tables
export type AccountApplication = typeof accountApplications.$inferSelect;
export type InsertAccountApplication = z.infer<typeof insertAccountApplicationSchema>;

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type InsertFeatureRequest = z.infer<typeof insertFeatureRequestSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export const insertOrphanedSnaptradeAccountSchema = createInsertSchema(orphanedSnaptradeAccounts).omit({
  id: true,
  createdAt: true,
});

export type OrphanedSnaptradeAccount = typeof orphanedSnaptradeAccounts.$inferSelect;
export type InsertOrphanedSnaptradeAccount = z.infer<typeof insertOrphanedSnaptradeAccountSchema>;

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  timestamp: true,
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export const insertAccountSnapshotSchema = createInsertSchema(accountSnapshots).omit({
  id: true,
  createdAt: true,
});

export type AccountSnapshot = typeof accountSnapshots.$inferSelect;
export type InsertAccountSnapshot = z.infer<typeof insertAccountSnapshotSchema>;