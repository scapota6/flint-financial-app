# Flint - Financial Management Platform

## Overview
Flint is a comprehensive financial management web application designed to consolidate diverse financial data. It allows users to connect bank accounts, brokerage accounts, and cryptocurrency wallets, track investments, execute trades, manage transfers, and monitor financial activity. The platform aims to provide a unified tool for active financial management, catering to both new and experienced investors. The business vision is to be a leading platform in the financial technology market by offering an intuitive and powerful solution for personal finance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features an Apple 2025 "Liquid Glass" aesthetic, utilizing dark neutrals, translucent glass effects (16px blur + 140% saturation), and the Inter font. It employs Tailwind CSS and Radix UI (via shadcn/ui components) for a fully responsive, mobile-first design. Key UI elements include a fixed top navigation with a Liquid Glass effect, animated link glows, responsive account grids, full-screen modals, micro-animations, an Apple blue accent, and accessible design principles. The landing page includes an interactive dashboard preview, social proof notifications, a scrolling institutions banner, FAQ, tiered pricing, and conversion-optimized CTAs. Demo dashboards accurately reflect production data, including account-specific transactions, credit card details, debt summaries, and dynamic financial calculations.

**Responsive Design Implementation**: The landing page at /new is fully optimized for all device sizes (320px-2560px) with:
- Root-level `overflow-x-hidden` to prevent horizontal scrolling
- Mobile-first responsive patterns using Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px)
- Modals using `w-[95vw] sm:w-full !max-w-[95vw] sm:!max-w-{size}` pattern with important flags to override defaults
- Responsive grids: `grid-cols-2 md:grid-cols-4` (demo cards), `grid-cols-1 md:grid-cols-2` (accounts), `grid-cols-1 md:grid-cols-3` (pricing)
- Typography scaling: `text-2xl sm:text-4xl md:text-5xl` (hero), `text-xs sm:text-sm` (mobile tabs)
- Spacing reduction on mobile: `p-4 sm:p-6`, `px-4 sm:px-0`, `gap-3 sm:gap-4`
- Tab navigation with shortened text on mobile: `<span className="hidden sm:inline">Full</span><span className="sm:hidden">Short</span>`
- Touch-friendly interactive elements with adequate spacing for 44px+ touch targets

**CRITICAL: Mobile Touch Interaction Pattern for Modals**:
- **Never use custom CSS classes on DialogOverlay/SheetOverlay** that might interfere with pointer events
- The `modal-shell` class in `flint-glass.css` breaks mobile touch interactions - do NOT apply it to overlay components
- Always use standard Radix/shadcn overlay styling: `bg-black/80` for backdrop with standard animation classes
- Dialog, Sheet, and AlertDialog overlays must allow pointer events to pass through properly for iOS/mobile Safari touch synthesis
- If mobile users cannot tap buttons or close modals, check for custom CSS classes on the overlay component first

### Technical Implementations
-   **Frontend**: Built with React, TypeScript, Wouter for routing, and React Query for server state management. Features include comprehensive banking/brokerage integration, buy/sell workflows, multi-tab stock detail modals with TradingView charts, unified real-time market data, Accounts Directory, Portfolio Dashboard, Watchlist & Alerts, and Money Movement Tracking. A comprehensive logo system uses Brandfetch. Live data polling is aggressive for near real-time updates (e.g., Portfolio at 2-5s, Connections at 2s, Dashboard at 3s).
-   **Backend**: Node.js with Express.js.
-   **Database**: PostgreSQL with Drizzle ORM on Neon Database.
-   **Authentication**: Custom hardened JWT-based system with dual-mode support (web via httpOnly/SameSite cookies with CSRF, mobile via Bearer tokens). Includes Argon2id hashing, multi-device sessions, MFA/TOTP, password reset, rate limiting, and account enumeration protection.
-   **API Pattern**: RESTful API with JSON responses and robust JSON error handling.
-   **Performance**: Utilizes route-based lazy loading, component memoization, database indexing, HTTP compression, browser caching, and TanStack Query optimizations. Live market data uses a tiered polling strategy to optimize API usage.
-   **Security**: AES-256-GCM encryption for credentials, multi-tier rate limiting, activity logging, secure sessions, double-submit-cookie CSRF, SHA-256 hashed password reset tokens, and RBAC middleware.

### Feature Specifications
-   **Public Registration System**: Allows user registration with strong password validation, IP-based rate limiting, and waitlist assignment.
-   **Subscription System**: Three-tier model (Free, Standard, Pro) using Stripe Checkout for payment processing and feature gating, with a Stripe Customer Portal for management.
-   **Financial Data Management**: Supports multi-account connections, real-time balance tracking, portfolio management, and trade execution simulation.
-   **Referral System**: Infrastructure for generating and tracking referral codes.
-   **Communication Systems**: Resend-based email service and Slack notifications for critical events including new user signups, subscriptions, applications, feature requests, bug reports, and lead captures.
-   **Feedback Systems**: A public system for feature requests and bug reports, storing feedback and notifying admins.
-   **Lead Capture System**: Production-ready email lead capture with database persistence, Slack notifications, and rate limiting.
-   **Alert Monitoring System**: Background service for price alerts with debouncing.
-   **Wallet Service**: Internal fund management with pre-authorization and hold/release functionality.
-   **Trading Aggregation Engine**: Intelligent routing, real-time position consolidation, pre-trade validation, and trade APIs.
-   **Compliance**: Legal disclaimers system with user acknowledgment.
-   **Financial Goals System**: User-defined goals for debt payoff, savings, and emergency fund tracking. Features include:
    - Goal types: `debt_payoff`, `savings`, `emergency_fund` with distinct icons and colors
    - Progress tracking with visual progress bars and percentage completion
    - Monthly contribution estimates with projected timeline to goal completion
    - Optional linked account syncing for automatic progress updates
    - Goals API: `GET/POST /api/goals`, `PATCH/DELETE /api/goals/:id`, `POST /api/goals/:id/sync`
    - Analytics tab integration showing all goals with create/delete functionality
    - **Smart Debt Payoff Tracking (Dec 2025)**: Debt payoff goals require selecting a linked credit card. The goal's target amount is auto-populated from the card's current balance, and progress is calculated in real-time as `(initialBalance - currentBalance) / initialBalance`. The UI shows "X paid of Y" and "remaining balance" instead of generic progress text. Credit card balances are synced from Teller, so progress updates automatically as payments are made.
    - **Smart Savings Goal Tracking (Dec 2025)**: Savings goals require selecting a linked bank account (checking/savings). Progress is calculated as `currentBalance / targetAmount`. If starting at $25,000 with a goal of $50,000, progress shows 50%. The UI shows "X of Y" and "Z to go".
    - **Smart Emergency Fund Tracking (Dec 2025)**: Emergency fund goals work identically to savings goals - they require selecting a linked bank account and track progress as `currentBalance / targetAmount`. This allows users to designate which of their connected accounts is their emergency fund and set a target balance goal.
    - **Optimistic Goal Deletion**: Goal cards are removed from the UI immediately when deleted (optimistic update). A loading spinner shows on the delete button, and if the API fails, the goal is restored to the list.

### System Design Choices
-   **Modular Architecture**: Dedicated service layers for encryption, wallet management, trading aggregation, and email delivery.
-   **Webhook-Driven Data Sync**: Primary data updates (e.g., holdings) are driven by SnapTrade webhooks for real-time, event-driven refresh, with a background polling service as a backup.
-   **Orphaned Connection Cleanup**: Automated service (runs every 6 hours) to detect and remove orphaned SnapTrade users. Includes:
    - Database-level orphan cleanup (connections/users without parent records)
    - **SnapTrade API-level orphan cleanup** (users in SnapTrade that don't exist in our database)
    - Cleanup of `connected_accounts` table to ensure disconnected accounts don't appear in dashboard
    - Stale connection detection (30+ days without sync)
-   **Defensive Holdings Sync**: Background sync checks account existence before syncing, handles FK constraint errors gracefully, and auto-cleans orphaned positions.
-   **Admin Cleanup Endpoints**:
    - `POST /api/admin/users/:userId/cleanup-snaptrade` - Manual cleanup for specific user
    - `GET /api/admin/snaptrade/orphaned-users` - List orphaned SnapTrade users
    - `DELETE /api/admin/snaptrade/users/:snaptradeUserId` - Delete specific SnapTrade user from API
    - `POST /api/admin/snaptrade/cleanup-orphaned` - Delete all orphaned SnapTrade users
-   **Error Monitoring & Logging**: Betterstack Logtail for real-time error tracking, PII redaction, structured logging, and custom metrics.

## External Dependencies

### Core Integrations
-   **Teller.io**: Bank account connections, ACH transfers, Zelle-based credit card payments, with mTLS implementation.
-   **SnapTrade**: Brokerage account connections, real-time quotes, trading functionalities, and webhook-driven data synchronization.
-   **MetaMask SDK**: Crypto wallet connection for internal testers (scapota@flint-investing.com, seba.rod136@gmail.com). Uses existing `connected_accounts` table with `accountType='crypto'` and `provider='metamask'`. Holdings stored in `holdings` table with real USD values from Ethplorer API. Endpoints: POST/DELETE `/api/connections/metamask`, POST `/api/connections/metamask/sync`. Frontend auto-registers wallet on connect, fetches all token balances and USD prices from Ethplorer, and syncs holdings to Portfolio Holdings section.
    - **Enhanced Integration (Dec 2025)**: Modular helper architecture in `client/src/lib/metamask/`:
      - `errors.ts`: User-friendly error messages from MetaMask error codes (4001=rejected, -32602=invalid params, etc.)
      - `events.ts`: Event listener setup/cleanup for accountsChanged, chainChanged, connect, disconnect
      - `chains.ts`: Chain switching with wallet_switchEthereumChain and wallet_addEthereumChain
      - `transactions.ts`: ETH/ERC-20 transfers with ABI encoding, transaction lifecycle polling
      - `signing.ts`: personal_sign and eth_signTypedData_v4 (EIP-712) for wallet authentication
    - **Wallet Card Features**: Event-driven UI updates, network switch button, token selector for ERC-20 transfers, transaction status badges (pending/confirmed/failed), proper cleanup on unmount
-   **Ethplorer API**: Free-tier token discovery for MetaMask wallets. Provides complete token list, balances, USD prices, and ETH price. Rate limit: 2 req/sec. Used to populate crypto holdings with accurate USD valuations.
-   **Stripe**: Subscription management and payment processing.
-   **Finnhub**: General financial data.
-   **Polygon.io**: Real-time market data and live pricing.
-   **Alpha Vantage**: Fallback for real-time market data.
-   **Brandfetch Logo API**: Provides institutional and stock logos.
-   **Resend**: Email delivery service.
-   **Betterstack Logtail**: Real-time error monitoring and logging.
-   **Grafana**: Dashboarding and metrics visualization.

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