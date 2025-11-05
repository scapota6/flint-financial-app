# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application designed to provide users with a unified dashboard for managing diverse financial data. It allows users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to consolidate financial information and enable active financial management, aspiring to be a leading tool for both new and experienced investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React with TypeScript, Wouter, React Query.
- **Styling**: Apple-style dark glassmorphism theme (`flint-glass.css`) with Tailwind CSS utilities, Radix UI via shadcn/ui, SF Pro Display/Inter font stack. Complete design system includes glass components (backdrop blur, semi-transparent backgrounds, subtle borders), comprehensive typography hierarchy (responsive headings, gradient text, stat numbers, pricing), accent color utilities, and mobile-responsive adjustments.
- **UI/UX Decisions**: Fixed top navigation, animated link glows, responsive three-column account grid, full-screen modals, interactive micro-animations, consistent purple accent, accessibility features, glass card aesthetics throughout.
- **Key Features**: Comprehensive banking integration, full buy/sell workflow with real-time pricing, multi-tab stock detail modal (TradingView charts), unified real-time market data, Accounts Directory, Portfolio Dashboard (separate Banking/Debt/Investments visualization), IndexedDB caching for market data, trading MVP (order placement/cancellation via SnapTrade), Watchlist & Alerts, enhanced instrument resolution, Money Movement Tracking (scrollable transaction analysis with merchant logos, top 10 sources/spend with 3-month averages), comprehensive logo system (banks, crypto, stocks, merchants) powered by Brandfetch Logo API with colored backgrounds and Lucide React icon fallback. Credit card balances correctly display debt using Teller's `ledger` and `available` fields. Landing page includes interactive dashboard preview with zoom, "As Seen On" section with media logos (Forbes, WSJ, Entrepreneur, Bloomberg) from Brandfetch with text fallbacks, and scrolling institutions banner with circular logos from Brandfetch (24 institutions, seamless loop animation) with abbreviated name fallbacks.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon Database.
- **Authentication**: Custom hardened JWT-based authentication (Argon2id, httpOnly/SameSite cookies, double-submit-cookie CSRF, multi-device sessions, MFA/TOTP support, password reset via email with SHA-256 tokens, rate limiting, account enumeration protection, timing-safe operations).
- **CSRF Protection**: Web requests require CSRF tokens; mobile apps (React Native/iOS) bypass CSRF by sending `X-Mobile-App: true` header.
- **API Pattern**: RESTful API with JSON responses and robust JSON error handling.

### Performance Optimizations
- Route-based lazy loading, component memoization, comprehensive database indexing (23+ indexes), HTTP compression (gzip/deflate), intelligent browser caching, and TanStack Query optimizations (staleTime, gcTime).

### Key Components
- **Application Approval System**: Landing page form for account applications with admin review.
- **Admin Dashboard**: Restricted access at `/admin` for user, account, subscription, and analytics management. Features permanent user deletion, connection limit tracking (Free: 2, Basic: 3, Pro: 5, Premium: unlimited, Admin: unlimited), SnapTrade management.
- **Email Service**: Resend-based email system for updates and support, with automated logging to database.
- **Alert Monitoring System**: Background service for price alerts with debouncing and notifications.
- **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, trade execution simulation.
- **Subscription System**: Multi-tier model (Free, Basic, Pro, Premium) integrated with Whop.com for payment processing and feature gating, with calendar-aware next billing date calculations.
- **Security Framework**: AES-256-GCM encryption for sensitive credentials, multi-tier rate limiting, activity logging, secure sessions, double-submit-cookie CSRF protection, SHA-256 hashed password reset tokens, and RBAC middleware.
- **Wallet Service Architecture**: Internal fund management with pre-authorization and hold/release, integrated with ACH transfers via Teller.
- **Trading Aggregation Engine**: Comprehensive trading system with intelligent routing, real-time position consolidation, pre-trade validation, and robust trade preview/placement APIs.
- **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
- **Compliance Framework**: Legal disclaimers system with user acknowledgment tracking and RBAC groundwork.
- **Settings Management**: Profile management, connected accounts management, data export.
- **Teller Balance Mapping System**: Utility for accurately mapping Teller.io account balances.
- **Teller Integration Architecture**: One enrollment per user pattern - access tokens stored in `teller_users` table (similar to SnapTrade), with helper function `getTellerAccessToken(userId)` for API calls. Prevents token duplication across connected accounts. **mTLS Authentication**: Comprehensive mTLS implementation using undici Agent/Dispatcher for client certificate authentication across ALL Teller API calls (dashboard, account details, banking, portfolio, connections, health checks, teller routes). Uses `resilientTellerFetch` wrapper with exponential backoff, jitter-based retry logic (3 attempts), request ID tracking, and response validation. Configured via TELLER_CERT and TELLER_PRIVATE_KEY environment variables.
- **SnapTrade Integration**: Stores user credentials and brokerage authorizations in `snaptrade_users` table, consolidated registration, server-side auto-sync, normalized account display names, auto-recovery for orphaned accounts. **Mobile OAuth Support**: `/api/connections/snaptrade/register` endpoint accepts custom `redirectUri` from request body for mobile deep links (e.g., `flintapp://snaptrade-callback`), enabling OAuth flows on iOS/React Native apps. Returns both `url` and `redirectUrl` fields for backward compatibility with web clients. **Mobile OAuth Callback**: `POST /api/snaptrade/callback` endpoint accepts `authorizationId` or `connection_id` from request body to complete mobile OAuth flow, syncs only the specific brokerage connection to database, returns 400 if ID missing or 404 if connection not found. **Mobile Portfolio API**: `/api/portfolio-holdings` endpoint includes mobile-friendly field aliases (`value`, `shares`, `gainLoss`, `gainLossPercent`) alongside existing web app fields for iOS/React Native compatibility.

### Production Infrastructure
- **Database Backup & Recovery**: Neon Database with continuous data protection and 7-day PITR.
- **SSL/HTTPS Configuration**: Automatic SSL via Let's Encrypt on Replit.
- **Error Monitoring & Logging**: Betterstack Logtail for real-time error tracking and log streaming with PII redaction, structured logging, resilient error handling, and graceful shutdown.

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
- **@stripe/stripe-js**: Stripe API integration (potentially for future use or internal Whop integration).
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
- **@whop/api**: Whop server-side SDK.