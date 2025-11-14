# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application designed to provide users with a unified dashboard for managing diverse financial data. It allows users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to consolidate financial information and enable active financial management, aspiring to be a leading tool for both new and experienced investors, with a vision to be a leading tool for both new and experienced investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React with TypeScript, Wouter, React Query.
- **Styling**: Apple 2025 "Liquid Glass" aesthetic (dark neutrals, translucent glass, 16px blur + 140% saturation), Tailwind CSS, Radix UI via shadcn/ui, Inter font. Apple color palette and mobile-responsive design.
- **UI/UX Decisions**: Fixed top navigation with Liquid Glass effect, animated link glows, responsive account grid, full-screen modals, micro-animations, Apple blue accent, accessibility features, liquid glass card aesthetics.
- **Key Features**: Comprehensive banking integration, full buy/sell workflow, multi-tab stock detail modal (TradingView charts), unified real-time market data, Accounts Directory, Portfolio Dashboard, Watchlist & Alerts, Money Movement Tracking (transaction analysis, top 10 sources/spend with 3-month averages), comprehensive logo system (banks, crypto, stocks, merchants) via Brandfetch. Landing page with interactive dashboard preview, "As Seen On" section, scrolling institutions banner, FAQ, and tiered pricing comparison.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM on Neon Database.
- **Authentication**: Custom hardened JWT-based dual-mode authentication (web via httpOnly/SameSite cookies with CSRF, mobile via Bearer tokens). Argon2id hashing, multi-device sessions, MFA/TOTP, password reset, rate limiting, account enumeration protection. All API endpoints use `requireAuth` middleware supporting both cookie and Bearer token authentication.
- **CSRF Protection**: Web requests use CSRF tokens; mobile apps bypass via `X-Mobile-App: true` header. OAuth callbacks (`/api/snaptrade/callback`, `/api/teller/callback`) are in CSRF skip list.
- **API Pattern**: RESTful API with JSON responses and robust JSON error handling.

### Performance Optimizations
- Route-based lazy loading, component memoization, comprehensive database indexing, HTTP compression, browser caching, TanStack Query optimizations.
- **Live Market Data**: Tiered polling strategy (1s for quotes, 2s for orders, 5s for positions, 10s for balances, 15s for historical data) to respect API limits and reduce calls, managed by React Query `refetchInterval`.

### Key Components
- **Application Approval System**: Landing page form for account applications with admin review.
- **Admin Dashboard**: Restricted access for user, account, subscription, and analytics management.
- **Email Service**: Resend-based email system with automated logging.
- **Slack Notification System**: Real-time Slack webhooks for business-critical events (new applications, subscriptions, user signups). Non-blocking notifications with structured error logging. Requires `SLACK_WEBHOOK_URL` environment variable.
- **Alert Monitoring System**: Background service for price alerts with debouncing and notifications.
- **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, trade execution simulation.
- **Subscription System**: Three-tier model (Free, Basic, Pro) migrated from Whop to Stripe Checkout for payment processing and feature gating. Includes Stripe Customer Portal for subscription management, webhook-driven lifecycle management, and dual authentication (cookie for web, Bearer token for mobile).
- **Security Framework**: AES-256-GCM encryption for credentials, multi-tier rate limiting, activity logging, secure sessions, double-submit-cookie CSRF, SHA-256 hashed password reset tokens, and RBAC middleware.
- **Wallet Service Architecture**: Internal fund management with pre-authorization and hold/release, integrated with ACH transfers via Teller.
- **Trading Aggregation Engine**: Intelligent routing, real-time position consolidation, pre-trade validation, trade preview/placement APIs.
- **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
- **Compliance Framework**: Legal disclaimers system with user acknowledgment and RBAC.
- **Settings Management**: Profile, connected accounts, data export.
- **Teller Integration Architecture**: One enrollment per user with access tokens stored in `teller_users` table. Comprehensive mTLS implementation using `undici` for client certificate authentication across all Teller API calls, with `resilientTellerFetch` wrapper for retry logic and error handling.
- **SnapTrade Integration**: Stores user credentials and brokerage authorizations, consolidated registration, server-side auto-sync, auto-recovery for orphaned accounts. Brokerage capability detection, real-time market data via `/api/quotes/:symbol`, mobile OAuth support with deep links, mobile-friendly portfolio API aliases. Real-time webhook system at `/api/webhooks/snaptrade` handles all official events, performing transactional cascading deletion for broken/deleted connections.

### Production Infrastructure
- **Database Backup & Recovery**: Neon Database with continuous data protection and 7-day PITR.
- **SSL/HTTPS Configuration**: Automatic SSL via Let's Encrypt on Replit.
- **Error Monitoring & Logging**: Betterstack Logtail for real-time error tracking and log streaming with PII redaction and structured logging.

## External Dependencies

### Core Integrations
- **Teller.io**: Bank account connections, ACH transfers, Zelle-based credit card payments.
- **SnapTrade**: Brokerage account connections, real-time quotes, trading functionalities.
- **Whop.com**: Subscription management and payment processing.
- **Finnhub**: General financial data.
- **Polygon.io**: Real-time market data and live pricing.
- **Alpha Vantage**: Fallback for real-time market data.
- **Brandfetch Logo API**: For financial institution, crypto, stock, and merchant logos.

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
- **@whop/api**: Whop server-side SDK (legacy, migrating to Stripe).
- **stripe**: Stripe payment processing SDK.

## Recent Changes (November 14, 2025)
- **Implemented Stripe Embedded Checkout with "Pay First, Set Password Later" Flow**: Complete embedded checkout integration allowing unauthenticated purchases with post-payment account creation
  - **Backend Implementation**:
    - Created `/api/stripe/create-embedded-checkout` endpoint with rate limiting (10 req/15min per IP) and CSRF exemption
    - Configured sessions with `redirect_on_completion: 'never'` for client-side navigation control
    - Idempotent webhook handler with multi-source email reading (`metadata.customerEmail` → `customer_details.email` → `customer_email`)
    - Automatic user account creation on payment completion with passwordHash: null
    - Password reset token generation and welcome email dispatch via `sendPasswordResetEmail`
    - Stripe customer ID persistence for existing users
    - Structured logging tracks email source (metadata vs Stripe-collected) for debugging
  - **Frontend Implementation**:
    - Created `EmbeddedCheckoutModal` component using `@stripe/react-stripe-js`
    - Stripe collects email directly in checkout form (no custom email dialog)
    - Modal state management with `onComplete` callback for navigation to success page
    - Error handling with inline retry button
    - Fresh clientSecret fetch on every modal open
    - Post-checkout success page (`/checkout-success`) with password setup instructions
  - **User Flow**: Landing page CTA → Embedded checkout modal → Stripe collects email + payment → Payment succeeds → Account created → Webhook sends password reset email → Success page → User sets password → Login
  - **Security**: Rate limiting, CSRF exemption for public endpoint, idempotent webhooks, SHA-256 hashed tokens, .onConflictDoNothing() for race conditions
  - **Current Status**: All 4 production plans active (Basic/Pro × Monthly/Annual) with production Price IDs configured
- Fixed admin dashboard UI: mutations now await cache invalidation for immediate updates after approving/rejecting users
- Fixed password setup link blank page: removed lazy loading for critical email-linked pages and added branded PageLoader
- Resolved SnapTrade billing incident: deleted 2 orphaned users, created recovery documentation
- **Implemented Slack Webhook Integration for Real-Time Business Notifications**:
  - Created `slackNotifier.ts` service with notification functions: `notifyNewUserSignup`, `notifyNewSubscription`, `notifyNewApplication`, `notifyFeatureRequest`
  - Integrated instant notifications for new account applications (`/api/applications/submit`)
  - Integrated instant notifications for new subscriptions in Stripe webhook (`checkout.session.completed` for both new and existing users)
  - Integrated instant notifications for feature requests with funny quips ending in "Flint to the moon ! 🚀🚀🚀"
  - All notifications are non-blocking with error logging, require `SLACK_WEBHOOK_URL` environment variable
  - Notifications include formatted messages with user details (name, email, plan, timestamp) for COO/admin monitoring
- **Implemented Feature Request & Bug Report System for User Feedback Collection**:
  - **Database Schema**: `feature_requests` table with fields: id, name, email, phone (optional), type (enum: 'feature_request' | 'bug_report', default 'feature_request'), priority (low/medium/high/critical), description, status (pending/approved/in_progress/completed/rejected), submittedAt, reviewedBy, reviewedAt, reviewNotes
  - **Backend**: Public POST endpoint `/api/feature-requests` with CSRF exemption, schema validation with empty-string normalization, type-aware Slack notification integration
  - **Frontend**: Reusable `FeatureRequestModal` component with Type dropdown (📝 Feature Request or 🐛 Bug Report), form validation, floating action buttons on landing page and dashboard
  - **Schema Alignment**: Frontend imports shared `insertFeatureRequestSchema` from `@shared/schema` for perfect validation alignment
  - **Data Handling**: Empty phone strings transformed to undefined, priority defaults to 'medium', type defaults to 'feature_request', server-managed fields (status, timestamps) auto-populated
  - **Slack Notifications**: Bug reports show red color with 🐛 icon and urgent quips; feature requests show purple color with 💡 icon and innovation-focused quips
  - **User Flow**: Landing/dashboard → Click "Request a Feature" → Select type → Fill form → Submit → Success toast → Type-specific Slack notification sent
- **Configured Production Stripe Environment with All 4 Subscription Plans**:
  - **Production Price IDs**: 
    - Basic Monthly: price_1RUGqMKgl6E3u5QE9OtHKCOS ($9.99/month)
    - Basic Annual: price_1ST8THKgl6E3u5QEbFXJR1Qi ($95.88/year = $7.99/month)
    - Pro Monthly: price_1ST7B1Kgl6E3u5QElvyoQnY7 ($29.99/month)
    - Pro Annual: price_1ST7CuKgl6E3u5QEzXDsvsxx ($287.88/year = $23.99/month)
  - **Landing Page Pricing**: Updated to display correct production prices for all 4 plans with monthly/annual toggle
  - **Embedded Checkout**: Enhanced to accept tier (basic/pro) and billingPeriod (monthly/yearly) parameters
  - **Backend Validation**: Strict whitelisting of tier and billing period combinations with explicit error handling
  - **Webhook Configuration**: Production webhook at https://www.flint-investing.com/api/stripe/webhook with signing secret whsec_XRVWF8zT1hCfJiu2G6Yoakd35UNWdCvV
  - **Security**: Maintained rate limiting (10 req/15min per IP), CSRF exemption for public checkout endpoint, production Stripe keys stored as Replit secrets