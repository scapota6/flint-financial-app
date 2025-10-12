# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application that provides users with a unified dashboard to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to offer a seamless and unified financial management experience by consolidating diverse financial data and enabling active management, with ambitions to become a leading personal finance tool for both novice and experienced investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: React Query (@tanstack/react-query)
- **Styling**: Tailwind CSS with custom dark theme, leveraging Radix UI components via shadcn/ui.
- **Build Tool**: Vite
- **UI/UX Decisions**: Fixed top navigation, animated link glows, three-column responsive account grid with glow borders and hover effects, full-screen modals with animated underlines, full-width quick action bars, interactive micro-animations (icon pulse, button hover glows, smooth transitions). Uses Inter font family and a consistent purple accent color. Includes accessibility features like keyboard navigation, focus outlines, and ARIA compliance.
- **Key Features**: Comprehensive banking integration (balances, transactions), full buy/sell workflow with real-time pricing, multi-tab stock detail modal with TradingView charts, unified real-time market data system, Accounts Directory, Portfolio Dashboard (net worth, asset allocation), TradingView Lightweight Charts (multiple timeframes), IndexedDB caching for market data, complete trading MVP (order placement/cancellation via SnapTrade), Watchlist & Alerts with price monitoring and notifications, enhanced instrument resolution with cross-SDK compatibility, official bank logos via Brandfetch Logo API displaying authentic brand imagery for all connected accounts.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon Database.
- **Authentication**: Replit Auth with OpenID Connect and PostgreSQL-backed session management, enhanced with httpOnly/SameSite cookies, double-submit-cookie CSRF protection (csurf with ignoreMethods for GET/HEAD/OPTIONS), and session revocation.
- **API Pattern**: RESTful API with JSON responses.
- **Route Configuration**: API routes mounted first before static files, JSON 404 handler with path for unknown API endpoints, comprehensive JSON error handler ensuring all API errors return JSON (never HTML).

### Performance Optimizations
- **Code Splitting**: Route-based lazy loading using React.lazy() and Suspense for optimal bundle sizes and faster initial page loads.
- **Component Memoization**: React.memo() applied to expensive components (GlobalNavbar, SummaryCards, HoldingsCard, RealTimeHoldings) to prevent unnecessary re-renders.
- **Database Optimization**: Comprehensive indexing strategy with 23+ indexes on frequently queried columns (users.email, accounts.userId, holdings.userId/accountId, watchlist.userId/symbol, trades.userId/status, etc.) for faster query performance.
- **HTTP Compression**: Gzip/deflate compression enabled via Express compression middleware (level 6, 1KB threshold) for reduced bandwidth usage. Note: Brotli compression is recommended at nginx/CDN level in production.
- **Browser Caching**: Intelligent cache headers configured - 1 year for static assets with immutable flag, 60s for dashboard data, 5s for real-time market data, no-store for authentication endpoints.
- **TanStack Query Optimization**: Query client configured with staleTime=60s, gcTime=5min, refetchOnWindowFocus=false, refetchOnReconnect=false to minimize unnecessary API requests while maintaining data freshness.
- **Bundle Optimization**: Tree-shaking enabled, unused dependencies removed, imports optimized for minimal bundle size.

### Key Components
- **Authentication System**: Dual authentication supporting both Replit OAuth (OpenID Connect) and local email/password login. LocalStrategy (passport-local) verifies hashed passwords from database using bcrypt. Both auth types share session-based, PostgreSQL-stored sessions. Protected routes via isAuthenticated middleware handle OAuth token refresh and local session verification. Login page at `/login` offers both options. Admin panel includes "Set Password" feature for direct password management.
- **Database Schema**: Tables for Users, Connected Accounts, Holdings, Watchlist, Trades, Transfers, Activity Log, Market Data, Price Alerts, Alert History, Notification Preferences, Account Applications, Audit Logs, Email Logs, Feature Flags, and Password Reset Tokens.
- **Application Approval System**: Landing page form for free account applications, admin dashboard for review/approval, automated user account creation with secure password setup links (SHA-256 hashed tokens with timing-safe verification).
- **Admin Dashboard**: Comprehensive admin panel at `/admin` (restricted to scapota@flint-investing.com) with triple-layer security (authentication + email check + isAdmin flag). Features 9 management categories: Applications Queue, User Management, Connected Accounts, Subscription Tiers, Analytics, Error Logs, Feature Flags, Email Queue, and Audit Trail.
- **Email Service**: Resend-based email system with templates for approval, rejection, and password reset. Logs all emails to database. Admin panel displays manual password reset links when email provider not configured.
- **Alert Monitoring System**: Background service for price alerts with debouncing, quiet hours, and email/push notifications.
- **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, trade execution simulation, transfer management, and watchlist.
- **Subscription System**: Multi-tier model (Free, Basic, Pro, Premium) with Lemon Squeezy integration for payment processing and feature gating. Premium tier exclusively grants account disconnection privileges to prevent free/basic/pro users from rotating connected accounts. Lemon Squeezy integration uses API-generated checkout sessions (POST /v1/checkouts) for reliable payment URLs, checkout overlay for seamless payment experience, and automatic account creation with password setup email delivery via webhooks. Checkout flow: frontend → backend API → Lemon Squeezy Checkouts API → custom checkout URL with signature → overlay display.
- **Security Framework**: AES-256-GCM encryption for sensitive credentials, multi-tier rate limiting, activity logging with sensitive data hashing, secure PostgreSQL-backed sessions, double-submit-cookie CSRF protection with csurf (x-csrf-token header validation, public endpoints exempted), SHA-256 hashed password reset tokens with timing-safe comparison, session revocation on logout, RBAC middleware, encrypted token storage, automatic secret rotation, SOC 2 compliant infrastructure.
- **Wallet Service Architecture**: Internal fund management with pre-authorization and hold/release, integrated ACH transfers via Teller.
- **Teller Payments Integration**: Credit card payment system using Zelle-based transfers with tellerForUser client wrapper for per-user authentication, MFA handling with 409 status codes, and real-time payment status tracking.
- **Trading Aggregation Engine**: Complete trading system with intelligent routing, real-time position consolidation, pre-trade validation, enhanced instrument resolution with cross-SDK compatibility, robust trade preview/placement APIs with version-safe wrappers, tradeId-based order placement with fallbacks, comprehensive error handling with detailed debugging, and flexible validation flow supporting both preview-then-place and direct placement workflows.
- **Modular Architecture**: Clean separation of concerns with dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
- **Compliance Framework**: Legal disclaimers system (not a financial advisor, custodian, or broker-dealer) with user acknowledgment tracking, RBAC groundwork, and security dashboard.
- **Settings Management**: Streamlined profile management with password change functionality (requiring current password verification), connected accounts management, data export (CSV), and account deletion. Settings menu and notification preferences have been removed to simplify the UI. Theme is forced to dark mode only (ThemeToggle removed).
- **Password Reset System**: Public password reset flow at `/reset-password` where approved users can request password reset by email. System generates secure SHA-256 hashed tokens with 24-hour expiration, sends reset emails via Resend, and includes email enumeration prevention for security.
- **Teller Balance Mapping System**: Dedicated utility (`server/lib/teller-mapping.ts`) that properly maps Teller.io account balances to Flint's internal format. For credit cards: ledger (amount owed) is mapped to positive `owed` field and negative `displayBalance` to reduce net worth; credit limit is calculated as ledger + available (total borrowing capacity). For depository accounts: available/ledger is mapped to positive `displayBalance`. Ensures accurate net worth calculations by treating credit card debt as negative balances.
- **SnapTrade Integration Architecture**: SnapTrade user credentials are stored in database tables `snaptrade_users` (user credentials) and `snaptrade_connections` (brokerage authorizations). Registration flow consolidated to single endpoint `/api/connections/snaptrade/register` which uses `req.user.claims.sub` as userId, registers with SnapTrade API, and stores userSecret in database. OAuth callback handled by `/snaptrade/callback` route which **automatically syncs authorizations to database** immediately after successful connection validation - fetches authorizations from SnapTrade API and saves to `snaptrade_connections` table using upsert (prevents duplicates). This server-side auto-sync ensures connections are persisted before user redirect, eliminating sync race conditions. SNAPTRADE_REDIRECT_URI environment variable is optional - redirect URLs are dynamically constructed. File storage at `data/snaptrade-users.json` is deprecated and kept empty. All operations use database as source of truth. Account display names are normalized to handle "Default" placeholder names from brokers like Coinbase, falling back to institution_name → account_type → 'Investment Account' when account name is empty, null, or "default" (case-insensitive).

## External Dependencies

### Core Integrations
- **Teller.io**: Bank account connections, ACH transfers, and Zelle-based credit card payments.
- **SnapTrade**: Brokerage account connections, real-time quotes, and trading functionalities (buy/sell orders, account activities, positions).
- **Lemon Squeezy**: Subscription management and payment processing (test mode).
- **Finnhub**: General financial data.
- **Polygon.io**: Real-time market data and live pricing.
- **Alpha Vantage**: Fallback for real-time market data.

### Technical Libraries/Frameworks
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Database ORM.
- **@stripe/stripe-js**: Stripe API integration.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: UI component primitives.
- **passport**: Authentication middleware.
- **openid-client**: OpenID Connect authentication.
- **vite**: Frontend build tool.
- **typescript**: Language.
- **tailwindcss**: CSS framework.
- **esbuild**: Backend bundling.
- **date-fns**: Date formatting.

## Production Infrastructure

### Database Backup & Recovery
- **Provider**: Neon Database (PostgreSQL-compatible serverless database)
- **Automatic Backups**: Neon provides continuous data protection with automatic point-in-time recovery (PITR)
- **Recovery Window**: Can restore database to any point within the last 7 days (or 30 days on paid plans)
- **Backup Method**: Continuous automated backups using Write-Ahead Log (WAL) archiving - no manual backup configuration needed
- **Disaster Recovery**: Full database snapshots taken automatically, stored in geographically distributed cloud storage
- **Recovery Process**: Database can be restored via Neon console by selecting a specific timestamp
- **Zero Downtime**: Recovery operations don't require application downtime - can restore to a new branch or instance

### SSL/HTTPS Configuration
- **Provider**: Replit Platform
- **Certificate Management**: Automatic SSL certificate provisioning via Let's Encrypt when application is published
- **Auto-Renewal**: Certificates automatically renewed before expiration - no manual intervention required
- **Deployment**: SSL/HTTPS enabled automatically on publish - all traffic encrypted in transit
- **Custom Domains**: SSL certificates automatically provisioned for custom domains configured in Replit settings
- **Security**: TLS 1.2+ enforced, modern cipher suites, HTTPS redirects configured automatically

### Error Monitoring
- **Framework**: Sentry integration configured but currently disabled (no DSN provided)
- **PII Protection**: beforeSend hooks configured to redact sensitive data (emails, passwords, tokens, cookies)
- **Coverage**: Both client-side (React) and server-side (Express) error tracking ready
- **Configuration**: Set SENTRY_DSN and VITE_SENTRY_DSN environment variables to enable