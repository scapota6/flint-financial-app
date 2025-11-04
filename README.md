# Flint - Financial Management Platform

A comprehensive financial platform that enables seamless multi-brokerage trading and intelligent financial management through advanced API integrations and user-centric design.

## 🚀 Features

### Core Financial Management
- **Multi-Account Dashboard**: Connect banks, brokerages, and crypto accounts in one unified interface
- **Real-Time Portfolio Tracking**: Live balance updates and holdings monitoring across all accounts
- **Smart Trading**: Execute trades through multiple brokerages with intelligent routing
- **Transfer Management**: Seamless ACH transfers between connected accounts
- **Watchlist & Alerts**: Track favorite stocks and crypto with customizable notifications

### Advanced Capabilities
- **Real-Time Market Data**: Live quotes and charts powered by SnapTrade and Polygon.io
- **Subscription Tiers**: Flexible pricing with Basic, Pro, and Premium features
- **Activity Logging**: Comprehensive transaction and activity tracking
- **Security First**: AES-256-GCM encryption and secure session management

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui component library
- **React Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Drizzle ORM
- **Neon Database** for serverless deployment
- **Replit Auth** with OpenID Connect

### External Integrations

#### Financial Services
- **SnapTrade API** - Multi-brokerage trading and account data
- **Teller.io** - Bank account connections and ACH transfers
- **Polygon.io** - Real-time market data and quotes

#### Payment & Subscription Management
- **Whop** - Primary subscription management and payment processing
- **Stripe** - Additional payment processing
- **Lemon Squeezy** - Legacy subscription system (deprecated)

#### Communication & Analytics
- **Resend** - Transactional email service (approval emails, password resets)
- **PostHog** - Analytics tracking (client and server-side)

#### Authentication
- **Replit Auth** - OpenID Connect authentication

## 🏗️ Architecture

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── lib/           # Utilities and configurations
│   │   └── hooks/         # Custom React hooks
├── server/                # Express.js backend
│   ├── routes/           # API route handlers
│   ├── db.ts            # Database configuration
│   └── index.ts         # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema definitions
└── attached_assets/     # Documentation and assets
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- API keys for SnapTrade, Teller.io, Polygon.io, and Stripe

### Environment Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   # Database
   DATABASE_URL=your_postgresql_url
   
   # Financial Services
   SNAPTRADE_CLIENT_ID=your_client_id
   SNAPTRADE_CONSUMER_KEY=your_consumer_key
   TELLER_APPLICATION_ID=your_app_id
   TELLER_SIGNING_SECRET=your_secret
   POLYGON_API_KEY=your_api_key
   
   # Payment & Subscriptions
   WHOP_API_KEY=your_whop_api_key
   WHOP_WEBHOOK_SECRET=your_whop_webhook_secret
   STRIPE_SECRET_KEY=your_stripe_key
   VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
   LEMONSQUEEZY_API_KEY=your_lemonsqueezy_key (legacy)
   LEMONSQUEEZY_STORE_ID=your_store_id (legacy)
   
   # Communication & Analytics
   RESEND_API_KEY=your_resend_api_key
   VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   
   # Authentication
   ISSUER_URL=your_replit_auth_issuer_url
   CLIENT_ID=your_replit_auth_client_id
   CLIENT_SECRET=your_replit_auth_client_secret
   ```

4. Push database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema including:

- **Users**: Profile, subscription, and authentication data
- **Connected Accounts**: Bank and brokerage account connections
- **Holdings**: Stock and crypto positions across accounts
- **Trades**: Trading history and execution records
- **Transfers**: ACH and internal transfer tracking
- **Activity Log**: Comprehensive user activity monitoring
- **Watchlist**: User-defined stock and crypto watchlists

## 🔒 Security Features

- **Encryption**: AES-256-GCM for sensitive credential storage
- **Rate Limiting**: Multi-tier protection for auth, trading, and API calls
- **Session Management**: Secure PostgreSQL-backed sessions
- **Activity Logging**: Comprehensive audit trail with sensitive data hashing

## 🎨 UI/UX Highlights

- **Dark Theme**: Modern purple-accented dark interface
- **Responsive Design**: Optimized for desktop and mobile
- **Real-Time Updates**: Live data refresh without page reloads
- **Micro-Interactions**: Smooth animations and hover effects
- **Accessibility**: ARIA compliance and keyboard navigation

## 📈 Subscription Tiers

- **Basic**: Core account connections and portfolio tracking
- **Pro**: Advanced trading features and market data
- **Premium**: Full API access and priority support

## 🚀 Deployment

The application is designed for deployment on Replit with:
- Automatic HTTPS and custom domains
- Built-in PostgreSQL database
- Environment variable management
- One-click deployment process

## 📝 API Documentation

### Core Endpoints
- `GET /api/accounts` - Fetch connected accounts
- `GET /api/holdings` - Get portfolio holdings
- `POST /api/trades` - Execute trades
- `GET /api/quotes/:symbol` - Real-time quotes
- `POST /api/transfers` - ACH transfers

### Authentication
All API endpoints require authentication via session cookies managed by Replit Auth.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 🔗 Links

### Repository
- [GitHub Repository](https://github.com/scapota6/flint-financial-app)

### Financial Services
- [SnapTrade Documentation](https://docs.snaptrade.com)
- [Teller API Docs](https://teller.io/docs)
- [Polygon.io API](https://polygon.io/docs)

### Payment & Subscriptions
- [Whop Documentation](https://docs.whop.com)
- [Stripe Documentation](https://stripe.com/docs)
- [Lemon Squeezy Docs](https://docs.lemonsqueezy.com)

### Communication & Analytics
- [Resend Documentation](https://resend.com/docs)
- [PostHog Documentation](https://posthog.com/docs)

### Platform
- [Replit Auth Docs](https://docs.replit.com/hosting/authentication)

---

Built with ❤️ using modern web technologies for seamless financial management.
