# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application that unifies diverse financial data. It enables users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to consolidate financial information and facilitate active financial management, aspiring to be a leading tool for both new and experienced investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React with TypeScript, Wouter for routing, React Query for server state management.
- **Styling**: Apple 2025 "Liquid Glass" aesthetic (dark neutrals, translucent glass, 16px blur + 140% saturation), Tailwind CSS, Radix UI via shadcn/ui components, Inter font. Emphasizes an Apple-inspired color palette and mobile-responsive design.
- **UI/UX Decisions**: Fixed top navigation with Liquid Glass effect, animated link glows, responsive account grid, full-screen modals, micro-animations, Apple blue accent, accessibility features, and liquid glass card aesthetics.
- **Key Features**: Comprehensive banking and brokerage integration, full buy/sell workflow, multi-tab stock detail modal with TradingView charts, unified real-time market data, Accounts Directory, Portfolio Dashboard, Watchlist & Alerts, Money Movement Tracking (transaction analysis, top 10 sources/spend with 3-month averages), and a comprehensive logo system via Brandfetch. Landing page includes interactive dashboard preview, "As Seen On" section, scrolling institutions banner, FAQ, and tiered pricing comparison.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM on Neon Database.
- **Authentication**: Custom hardened JWT-based dual-mode authentication (web via httpOnly/SameSite cookies with CSRF, mobile via Bearer tokens). Features Argon2id hashing, multi-device sessions, MFA/TOTP, password reset, rate limiting, and account enumeration protection. All API endpoints use `requireAuth` middleware.
- **CSRF Protection**: Web requests use CSRF tokens; mobile apps bypass via `X-Mobile-App: true` header.
- **API Pattern**: RESTful API with JSON responses and robust JSON error handling.

### Performance Optimizations
- Route-based lazy loading, component memoization, comprehensive database indexing, HTTP compression, browser caching, and TanStack Query optimizations.
- **Live Market Data**: Tiered polling strategy (1s for quotes, 2s for orders, 5s for positions, 10s for balances, 15s for historical data) to respect API limits and reduce calls, managed by React Query `refetchInterval`.

### Key Components
- **Application Approval System**: Landing page form for account applications with admin review.
- **Admin Dashboard**: Restricted access for managing users, accounts, subscriptions, and analytics.
- **Email Service**: Resend-based email system with automated logging.
- **Slack Notification System**: Real-time Slack webhooks for business-critical events (new applications, subscriptions, user signups, feature requests/bug reports). Non-blocking notifications with structured error logging.
- **Alert Monitoring System**: Background service for price alerts with debouncing and notifications.
- **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, trade execution simulation.
- **Subscription System**: Three-tier model (Free, Basic, Pro) utilizing Stripe Checkout for payment processing and feature gating. Includes Stripe Customer Portal for subscription management and webhook-driven lifecycle management.
- **Security Framework**: AES-256-GCM encryption for credentials, multi-tier rate limiting, activity logging, secure sessions, double-submit-cookie CSRF, SHA-256 hashed password reset tokens, and RBAC middleware.
- **Wallet Service Architecture**: Internal fund management with pre-authorization and hold/release, integrated with ACH transfers via Teller.
- **Trading Aggregation Engine**: Intelligent routing, real-time position consolidation, pre-trade validation, trade preview/placement APIs.
- **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
- **Compliance Framework**: Legal disclaimers system with user acknowledgment and RBAC.
- **Teller Integration Architecture**: One enrollment per user with access tokens. Comprehensive mTLS implementation using `undici` for client certificate authentication across all Teller API calls, with `resilientTellerFetch` wrapper for retry logic and error handling.
- **SnapTrade Integration**: Manages user credentials and brokerage authorizations, consolidated registration, server-side auto-sync, and auto-recovery for orphaned accounts. Includes brokerage capability detection, real-time market data via `/api/quotes/:symbol`, mobile OAuth support, and real-time webhook system for transactional cascading deletion.
- **Feature Request & Bug Report System**: Public endpoint for user feedback submission, stored in a `feature_requests` table with validation, Slack notifications, and admin review capabilities.

### Production Infrastructure
- **Database Backup & Recovery**: Neon Database with continuous data protection and 7-day PITR.
- **SSL/HTTPS Configuration**: Automatic SSL via Let's Encrypt on Replit.
- **Error Monitoring & Logging**: Betterstack Logtail for real-time error tracking and log streaming with PII redaction and structured logging, including custom metrics logging.

## External Dependencies

### Core Integrations
- **Teller.io**: Bank account connections, ACH transfers, Zelle-based credit card payments.
- **SnapTrade**: Brokerage account connections, real-time quotes, trading functionalities.
- **Stripe**: Subscription management and payment processing (migrating from Whop.com).
- **Finnhub**: General financial data.
- **Polygon.io**: Real-time market data and live pricing.
- **Alpha Vantage**: Fallback for real-time market data.
- **Brandfetch Logo API**: Provides logos for financial institutions, crypto, stocks, and merchants.
- **Resend**: Email delivery service.
- **Betterstack Logtail**: Real-time error monitoring and logging.
- **Grafana**: Dashboarding and metrics visualization.

### Technical Libraries/Frameworks
- **@neondatabase/serverless**: PostgreSQL connectivity.
- **drizzle-orm**: Database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-\***: UI component primitives.
- **argon2**: Secure password hashing.
- **jsonwebtoken**: JWT token generation and verification.
- **speakeasy**: TOTP/MFA implementation.
- **undici**: HTTP client with mTLS support for Teller.io authentication.
- **vite**: Frontend build tool.
- **typescript**: Language.
- **tailwindcss**: CSS framework.
- **esbuild**: Backend bundling.
- **date-fns**: Date formatting.