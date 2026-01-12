# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application designed to consolidate diverse financial data. It allows users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to provide a unified tool for active financial management, catering to both new and experienced investors. The business vision is to be a leading platform in the financial technology market by offering an intuitive and powerful solution for personal finance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a clean "Cream Startup Template" aesthetic with a cream background, white cards, and professional typography. It utilizes Tailwind CSS and Radix UI (via shadcn/ui components) for a fully responsive, mobile-first design. Key UI elements include a fixed top navigation, responsive account grids, full-screen modals, micro-animations, and accessible design principles. Critical mobile touch interaction for modals strictly uses standard Radix/shadcn overlay styling to ensure proper pointer event handling.

### Technical Implementations
-   **Frontend**: React, TypeScript, Wouter for routing, and React Query for server state management. Features include banking/brokerage integration, buy/sell workflows, multi-tab stock detail modals with TradingView charts, unified real-time market data, Accounts Directory, Portfolio Dashboard, Watchlist & Alerts, and Money Movement Tracking.
-   **Backend**: Node.js with Express.js.
-   **Database**: PostgreSQL with Drizzle ORM on Neon Database.
-   **Authentication**: Custom hardened JWT-based system with dual-mode support (web via httpOnly/SameSite cookies with CSRF, mobile via Bearer tokens), Argon2id hashing, MFA/TOTP, and robust security features.
-   **API Pattern**: RESTful API with JSON responses and robust JSON error handling.
-   **Performance**: Utilizes route-based lazy loading, component memoization, database indexing, HTTP compression, browser caching, and TanStack Query optimizations.
-   **Security**: AES-256-GCM encryption for credentials, multi-tier rate limiting, activity logging, secure sessions, and RBAC middleware.

### Feature Specifications
-   **Public Registration System**: User registration with strong password validation and rate limiting.
-   **Subscription System**: Three-tier model (Free, Standard, Pro) using Stripe Checkout for payment processing and feature gating.
-   **Financial Data Management**: Multi-account connections, real-time balance tracking, portfolio management, and trade execution simulation.
-   **Referral System**: Infrastructure for generating and tracking referral codes.
-   **Communication Systems**: Resend-based email service and Slack notifications for critical events.
-   **Feedback Systems**: Public system for feature requests and bug reports.
-   **Lead Capture System**: Email lead capture with database persistence, Slack notifications, and rate limiting.
-   **Alert Monitoring System**: Background service for price alerts.
-   **Wallet Service**: Internal fund management with pre-authorization.
-   **Trading Aggregation Engine**: Intelligent routing, real-time position consolidation, pre-trade validation.
-   **Compliance**: Legal disclaimers system with user acknowledgment.
-   **Financial Goals System**: User-defined goals for debt payoff, savings, and emergency fund tracking with detailed progress monitoring and linked account syncing capabilities.

### System Design Choices
-   **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
-   **Webhook-Driven Data Sync**: Primary data updates are driven by SnapTrade webhooks with a background polling service as a backup.
-   **Connection Health Monitor**: Background service for detecting connection issues, logging to Betterstack for monitoring, with manual admin-only cleanup.
-   **Defensive Holdings Sync**: Background sync checks account existence, handles FK constraint errors, and auto-cleans orphaned positions.
-   **Admin Cleanup Endpoints**: Specific API endpoints for manual administrative cleanup of user and SnapTrade data.
-   **Error Monitoring & Logging**: Betterstack Logtail for real-time error tracking, PII redaction, structured logging, and custom metrics.

## External Dependencies

### Core Integrations
-   **Teller.io**: Bank account connections, ACH transfers, Zelle-based credit card payments.
-   **SnapTrade**: Brokerage account connections, real-time quotes, trading functionalities, and webhook-driven data synchronization.
-   **MetaMask SDK**: Crypto wallet connection for internal testers, including enhanced integration for error handling, event listeners, chain switching, transactions, and signing.
-   **Ethplorer API**: Free-tier token discovery for MetaMask wallets, providing token list, balances, and USD prices.
-   **Stripe**: Subscription management and payment processing.
-   **Finnhub**: General financial data.
-   **Polygon.io**: Real-time market data and live pricing.
-   **Alpha Vantage**: Fallback for real-time market data.
-   **Brandfetch Logo API**: Institutional and stock logos.
-   **Resend**: Email delivery service.
-   **Betterstack Logtail**: Real-time error monitoring and logging.
-   **Grafana**: Dashboarding and metrics visualization.
-   **Capacitor**: Native mobile app wrapper for iOS and Android, enabling distribution of the React web app as native mobile applications.
-   **@capgo/capacitor-native-biometric**: Face ID/Touch ID support for secure app unlock on iOS (replaces web-style inactivity timeout on native platforms).

### Technical Libraries/Frameworks
-   **@neondatabase/serverless**: PostgreSQL connectivity.
-   **drizzle-orm**: Database ORM.
-   **@tanstack/react-query**: Server state management.
-   **@radix-ui/react-\***: UI component primitives.
-   **argon2**: Secure password hashing.
-   **jsonwebtoken**: JWT token handling.
-   **speakeasy**: TOTP/MFA implementation.
-   **undici**: HTTP client with mTLS support.
-   **vite**: Frontend build tool.
-   **typescript**: Language.
-   **tailwindcss**: CSS framework.
-   **esbuild**: Backend bundling.
-   **date-fns**: Date formatting utilities.