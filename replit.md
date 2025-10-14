# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application designed to provide users with a unified dashboard for managing diverse financial data. It allows users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to consolidate financial information and enable active financial management, aspiring to be a leading tool for both new and experienced investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, Wouter for routing, and React Query for state management.
- **Styling**: Tailwind CSS with a custom dark theme, using Radix UI components via shadcn/ui.
- **UI/UX**: Features a fixed top navigation, animated link glows, a three-column responsive account grid, full-screen modals, and interactive micro-animations. It uses the Inter font family, a consistent purple accent, and includes accessibility features.
- **Key Features**: Comprehensive banking integration, full buy/sell workflow with real-time pricing, multi-tab stock detail modal with TradingView charts, unified real-time market data, Accounts Directory, Portfolio Dashboard, TradingView Lightweight Charts, IndexedDB caching for market data, complete trading MVP (order placement/cancellation via SnapTrade), Watchlist & Alerts, enhanced instrument resolution, and comprehensive logo system featuring: (1) bank/brokerage logos via Brandfetch Logo API (supports PNC, Chase, Wells Fargo, Bank of America, Fidelity, Schwab, E*TRADE, TD Ameritrade, Interactive Brokers, Webull, Vanguard, Merrill Lynch, USAA, American Express with graceful fallbacks), (2) crypto logos via CoinGecko CDN for 60+ cryptocurrencies (BTC, ETH, XLM, MATIC, etc.), (3) stock logos via Brandfetch for 100+ tickers (AAPL, TSLA, GOOGL, etc.), and (4) merchant logos for recurring subscriptions (Netflix, Costco, Starbucks, etc.). All logo systems include colored backgrounds and fallback icons. Credit card balances display debt amounts correctly using Teller's `ledger` field for amount owed and `available` field for remaining credit, with both initial connection (teller.ts) and live sync (banking.ts) routes properly handling credit vs depository account types. The landing page includes an interactive dashboard preview with zoom functionality.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon Database.
- **Authentication**: Custom hardened JWT-based authentication with Argon2id password hashing, featuring httpOnly/SameSite cookies, double-submit-cookie CSRF protection, and multi-device session management.
- **API Pattern**: RESTful API with JSON responses and robust JSON error handling.

### Performance Optimizations
- Route-based lazy loading, component memoization, comprehensive database indexing (23+ indexes), HTTP compression (gzip/deflate), intelligent browser caching, and TanStack Query optimizations (staleTime, gcTime).

### Key Components
- **Authentication System**: Custom hardened authentication featuring Argon2id password hashing (timeCost=3, memoryCost=64MB, parallelism=2), strict password policies (12-128 chars, 3 of 4 character classes, common password blocking), JWT tokens (20-min access with sliding window auto-refresh, 7-day refresh with rotation), activity-based session timeout (19-min inactivity warning with 60-sec non-dismissible countdown, auto-logout at 20 min), MFA/TOTP support, multi-device session management, password reset via email with SHA-256 hashed tokens, and comprehensive security measures (rate limiting, account enumeration protection, timing-safe operations).
- **Database Schema**: Includes tables for Users, Connected Accounts, Holdings, Watchlist, Trades, Transfers, Activity Log, Market Data, Price Alerts, and more.
- **Application Approval System**: Landing page form for account applications with admin review and automated user account creation.
- **Admin Dashboard**: Restricted access at `/admin` for user, account, subscription, and analytics management. Features permanent user deletion with full cascade (removes all user data, sessions, connections, trades, etc.), connection limit tracking showing current/max connections per user (e.g., "13/∞" for admin users), with filtering options for over-limit users (audit risk), within-limit users, and zero-connection users (churn risk). Connection limits: Free (2), Basic (3), Pro (5), Premium (unlimited). Admin users have unlimited connections regardless of subscription tier. Includes SnapTrade management tab for viewing and disconnecting individual brokerage connections with intelligent cascade deletion (removes snaptradeUsers record only when last connection is removed).
- **Email Service**: Resend-based email system using Replit connector for secure API key management. Configured to send from `Flint <updates@updates.flint-investing.com>` using the verified domain `updates.flint-investing.com`. Support contact (`support@flint-investing.com`) is displayed in email footers. Includes automated email logging to database. Test endpoint available at `POST /api/admin/test-email`.
- **Alert Monitoring System**: Background service for price alerts with debouncing and email/push notifications.
- **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, and trade execution simulation.
- **Subscription System**: Multi-tier model (Free, Basic, Pro, Premium) integrated with Lemon Squeezy for payment processing and feature gating. Features calendar-aware next billing date calculations for recurring subscriptions (weekly, monthly, quarterly, yearly) that correctly handle historical data and always display future dates.
- **Security Framework**: AES-256-GCM encryption for sensitive credentials, multi-tier rate limiting, activity logging, secure sessions, double-submit-cookie CSRF protection, SHA-256 hashed password reset tokens, and RBAC middleware.
- **Wallet Service Architecture**: Internal fund management with pre-authorization and hold/release, integrated with ACH transfers via Teller.
- **Trading Aggregation Engine**: Comprehensive trading system with intelligent routing, real-time position consolidation, pre-trade validation, and robust trade preview/placement APIs.
- **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
- **Compliance Framework**: Legal disclaimers system with user acknowledgment tracking and RBAC groundwork.
- **Settings Management**: Profile management with password change functionality, connected accounts management, and data export.
- **Password Reset System**: Public `/reset-password` flow with secure SHA-256 hashed tokens and email enumeration prevention.
- **Teller Balance Mapping System**: Utility for accurately mapping Teller.io account balances to Flint's internal format, ensuring correct net worth calculations.
- **SnapTrade Integration**: Stores user credentials and brokerage authorizations in the database. Features a consolidated registration flow and server-side auto-sync for authorizations, ensuring connection persistence. Account display names are normalized for consistency. Includes auto-recovery system for error 1010 (user already exists) that logs orphaned accounts and retries with versioned IDs (userId-v2 pattern). Admin panel tracks all orphaned accounts with CSV export and support email generator for cleanup requests.

### Production Infrastructure
- **Database Backup & Recovery**: Neon Database provides continuous data protection with automatic point-in-time recovery (PITR) within a 7-day window.
- **SSL/HTTPS Configuration**: Automatic SSL certificate provisioning and auto-renewal via Let's Encrypt on the Replit Platform.
- **Error Monitoring & Logging**: Betterstack Logtail integration for real-time error tracking and log streaming. Features automatic PII redaction, structured logging with full context (user IDs, request IDs, stack traces), resilient error handling for service outages, and graceful shutdown that ensures all logs are flushed before process termination. Configured via `LOGTAIL_SOURCE_TOKEN` environment variable.

## External Dependencies

### Core Integrations
- **Teller.io**: Bank account connections, ACH transfers, Zelle-based credit card payments.
- **SnapTrade**: Brokerage account connections, real-time quotes, trading functionalities.
- **Lemon Squeezy**: Subscription management and payment processing.
- **Finnhub**: General financial data.
- **Polygon.io**: Real-time market data and live pricing.
- **Alpha Vantage**: Fallback for real-time market data.

### Technical Libraries/Frameworks
- **@neondatabase/serverless**: PostgreSQL connectivity.
- **drizzle-orm**: Database ORM.
- **@stripe/stripe-js**: Stripe API integration.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-\***: UI component primitives.
- **argon2**: Secure password hashing.
- **jsonwebtoken**: JWT token generation and verification.
- **speakeasy**: TOTP/MFA implementation.
- **vite**: Frontend build tool.
- **typescript**: Language.
- **tailwindcss**: CSS framework.
- **esbuild**: Backend bundling.
- **date-fns**: Date formatting.