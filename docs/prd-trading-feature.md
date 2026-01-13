# Product Requirements Document: SnapTrade Trading Feature

## Overview
This document outlines the implementation of buy/sell trading functionality for stocks and crypto via SnapTrade API integration in the Flint financial management platform.

## Phase 1: Trading for Existing Holdings (Current Implementation)

### Scope
- Users can buy more or sell existing positions from their brokerage accounts
- Quick Buy/Sell buttons on holdings in portfolio dashboard and account details
- Full trade modal with quantity input, order type selection, preview, and confirmation

### Feature Gate
- **Whitelisted Users Only**: Trading is restricted to `scapota@flint-investing.com` for initial testing
- Backend middleware (`tradingFeatureGate`) blocks all trading endpoints for non-whitelisted users
- Frontend hook (`useTradingEnabled`) conditionally renders trade buttons

### User Flow
1. User views holdings in dashboard or account details
2. Clicks "Buy" or "Sell" button on a holding
3. Quick Trade Modal opens with:
   - Symbol and current price displayed
   - Quantity input (with "Sell All" option for sell orders)
   - Order type selection (Market/Limit)
   - Limit price input (if limit order)
   - Estimated cost/proceeds calculation
4. User clicks "Preview" to check order impact
5. System calls SnapTrade `/trades/impact` API
6. Preview step shows:
   - Order summary (symbol, side, quantity)
   - Estimated cost/proceeds
   - Any fees or commissions
   - Warnings if applicable
7. User confirms order
8. System calls SnapTrade `/trades/place` API with impact ID
9. Success/error confirmation shown

### Technical Implementation

#### Backend Components
- `server/middleware/tradingFeatureGate.ts` - Whitelist middleware
- `server/routes/snaptrade-trading.ts` - Trading API endpoints with feature gate

#### Frontend Components
- `client/src/hooks/useTradingEnabled.ts` - Feature gate hook
- `client/src/components/trading/QuickTradeModal.tsx` - Full trade flow modal
- `client/src/components/trading/QuickTradeButtons.tsx` - Buy/Sell buttons

#### Integration Points
- Holdings Card (`holdings-card.tsx`) - Trade buttons added
- Account Detail Modal (`account-detail-modal.tsx`) - Trade buttons added

### API Endpoints
- `GET /api/snaptrade/trading-enabled` - Check if current user can trade
- `POST /api/snaptrade/trades/impact` - Preview order impact (requires feature gate)
- `POST /api/snaptrade/trades/place` - Execute trade (requires feature gate)

## Phase 2: Expanded Trading (Future)

### Scope
- Search for any symbol across all exchanges
- Buy/sell any tradable security, not just existing holdings
- Order history and status tracking
- Advanced order types (stop, stop-limit)

### Technical Requirements
- Symbol search endpoint integration
- Account balance/buying power validation
- Real-time quote fetching
- Order status webhooks

## Security Considerations
- All trading endpoints protected by authentication
- Feature gate restricts access to whitelisted users only
- CSRF protection on all POST requests
- Order preview step prevents accidental trades
- Rate limiting on trading endpoints

## Testing
- Sandbox/paper trading mode for development
- Manual testing with whitelisted account
- End-to-end flow verification required before production rollout

## Success Metrics
- Successful order submission rate
- Order fill rate
- User error rate (rejected orders)
- Time to complete trade flow

## Rollout Plan
1. Internal testing with single whitelisted user
2. Expand to additional beta testers
3. Full user rollout with proper documentation
