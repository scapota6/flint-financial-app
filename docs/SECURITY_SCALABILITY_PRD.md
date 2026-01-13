# Flint Security & Scalability PRD

## Document Information
- **Version**: 1.0
- **Last Updated**: January 2026
- **Status**: Production Readiness Assessment
- **Target Scale**: 100,000+ users

---

## Executive Summary

This document outlines the security architecture, rate limiting strategies, attack prevention mechanisms, and scalability considerations for Flint's production deployment. The platform handles sensitive financial data from multiple sources (banking, brokerage, crypto), requiring enterprise-grade security controls.

---

## 1. Current Security Architecture

### 1.1 Authentication System

**Dual-Mode JWT Authentication** (server/middleware/jwt-auth.ts)
- Web clients: httpOnly/SameSite cookies with CSRF on non-exempt endpoints only
- Mobile clients: Bearer token via Authorization header (no CSRF)
- Argon2id password hashing (server/lib/argon2-utils.ts) with OWASP-recommended config
- Sliding window token refresh for web clients ONLY (refreshes when <50% TTL remaining)

**IMPORTANT: Mobile Client Implementation Requirements:**
- Mobile clients MUST disable cookie storage or ignore received cookies
- `/api/auth/login` always sets cookies even for mobile; these must be ignored
- Risk: If mobile client honors cookies, subsequent requests may use cookie auth instead of Bearer, leading to session confusion
- Mobile MUST use `Authorization: Bearer <token>` for all authenticated requests

**Authentication Flow Details:** (server/routes/auth.ts)
- Web clients: Tokens set via httpOnly cookies (`setCookies()` at line 400)
- Mobile clients: Tokens returned in response body (`mobileAccessToken`/`mobileRefreshToken` at lines 395-396)
  - Note: Server still sets cookies on mobile login responses; mobile clients should ignore cookies and use bearer tokens
  - Mobile login: POST `/api/auth/login` with `X-Mobile-App: true` header
  - Mobile subsequent requests: `Authorization: Bearer <mobileAccessToken>` header
  - Mobile token refresh: POST `/api/auth/refresh-token` (lines 474-507) with `refreshToken` in body
- Web cookie refresh: POST `/api/auth/refresh` (line 430) - automatic via cookies

**CSRF Exemptions:** (server/security/csrf.ts lines 19-37)
The following routes are exempted from CSRF validation:
- All mobile requests with `X-Mobile-App: true` header
- `/api/auth/local-login` - Public login endpoint
- `/api/auth/public-register` - Public registration
- `/api/auth/setup-password`, `/api/auth/request-reset` - Password recovery
- All webhook endpoints (`/api/teller/webhook`, `/api/snaptrade/webhooks`, `/api/stripe/webhook`, etc.)
- Stripe checkout endpoints - Public landing page flows
- Feature requests, leads capture - Public forms
- Note: Web cookie refresh (`/api/auth/refresh`) does require CSRF for logged-in users

**Multi-Factor Authentication (MFA)** (server/routes/auth.ts lines 725-850)
- TOTP-based MFA using `speakeasy` library
- QR code enrollment flow via /api/auth/mfa/setup
- MFA verification on login when enabled

**Token Management** (server/lib/auth-tokens.ts)
- JWT access tokens (20-minute expiry, configurable)
- Refresh tokens stored in PostgreSQL via `storeRefreshToken()` (line 163)
- Dual-mode token delivery:
  - Web clients: httpOnly cookies set via `setCookies()`
  - Mobile clients: Tokens in response body; cookies also set but should be ignored
- Sliding window refresh: WEB ONLY (server/middleware/jwt-auth.ts lines 68-94)
  - Refreshes when <50% TTL remaining
  - Mobile bearer flows must explicitly call `/api/auth/refresh-token`

**Roadmap Items** (not yet implemented):
- Backup codes for MFA recovery
- Automatic session invalidation on security events
- Password-less authentication options
- Scheduled cleanup of expired refresh tokens

### 1.2 Data Encryption

**At-Rest Encryption**
- AES-256-GCM encryption for sensitive credentials (EncryptionService)
- PBKDF2 key derivation with configurable salt
- Per-record IV generation for defense in depth

**In-Transit Security**
- TLS termination handled by Replit platform (application runs HTTP behind proxy)
- mTLS support for Teller API integration (production mode only, sandbox uses plain HTTPS)
- Standard HTTPS for SnapTrade and Stripe APIs
- All external API calls use HTTPS

### 1.3 Access Control

**Role-Based Access Control (RBAC)**
```
Roles (server/middleware/rbac.ts):
  - SUPER_ADMIN: All permissions
  - ADMIN: User management, unlimited accounts, trading, analytics, system metrics
  - PRO_USER: Unlimited accounts, advanced trading, API access, real-time data
  - BASIC_USER: Multiple accounts, basic trading, data export
  - FREE_USER: Single account, view trades, basic analytics

Permissions:
  User Management: MANAGE_USERS, VIEW_ALL_USERS
  Account Access: CONNECT_UNLIMITED_ACCOUNTS, CONNECT_MULTIPLE_ACCOUNTS, CONNECT_SINGLE_ACCOUNT
  Trading: EXECUTE_TRADES, VIEW_TRADES, ADVANCED_TRADING
  Data: EXPORT_DATA, API_ACCESS, REAL_TIME_DATA
  Analytics: ADVANCED_ANALYTICS, BASIC_ANALYTICS
  Admin: VIEW_SYSTEM_METRICS, MANAGE_SYSTEM_SETTINGS

Tier Mapping:
  premium/pro → PRO_USER
  basic → BASIC_USER
  free/default → FREE_USER
```

**Admin Triple-Layer Verification**
1. JWT authentication required
2. Email whitelist check (hardcoded)
3. Database `isAdmin` flag verification

**Trading Feature Gate**
- Email whitelist for trading access
- Per-account `canTrade` capability flag
- Connection type verification (read vs trade)

---

## 2. Rate Limiting Strategy

### 2.1 Current Implementation

Source: `server/middleware/rateLimiter.ts`

| Category | Limit | Window | Key | Usage |
|----------|-------|--------|-----|-------|
| Auth | 5 req | 15 min | IP + userID | /api/auth/*, /api/me |
| Login | 5 req | 1 min | IP | /login composite |
| Login (hourly) | 50 req | 1 hour | IP | /login composite |
| Registration | 3 req | 1 min | IP | /public-register composite |
| Registration (hourly) | 10 req | 1 hour | IP | /public-register composite |
| Trading | 30 req | 1 min | userID or IP | /trading/*, /wallet/* |
| Data Retrieval | 100 req | 1 min | userID or IP | /dashboard, /transactions |
| External API | 10 req | 1 min | userID or IP | /transfers/ach |
| Public Checkout | 10 req | 15 min | IP | /stripe/checkout/* |

Note: Rate limiting uses in-memory storage; will need Redis for horizontal scaling.

### 2.2 Scaling Rate Limiting for 100k+ Users

**Current Architecture (Single Node)**
```
Express Server → In-Memory Rate Limiter
```

**Recommended Production Architecture**
```
Load Balancer → Multiple Express Nodes → Redis Cluster
                                        ↓
                                   Rate Limit Store
```

**Migration Path**
1. Replace in-memory rate limiter with Redis-backed implementation
2. Use `ioredis` with Redis Cluster for horizontal scaling
3. Implement sliding window algorithm for accurate rate limiting
4. Add rate limit headers to responses (X-RateLimit-Remaining, X-RateLimit-Reset)

**Redis Configuration**
```javascript
// Recommended Redis rate limiting setup
{
  cluster: true,
  nodes: [
    { host: 'redis-1', port: 6379 },
    { host: 'redis-2', port: 6379 },
    { host: 'redis-3', port: 6379 }
  ],
  keyPrefix: 'flint:ratelimit:',
  windowMs: 60000,
  maxRequests: 100
}
```

### 2.3 Adaptive Rate Limiting

**Tier-Based Limits**
| Tier | Trading | Data | Connections |
|------|---------|------|-------------|
| Free | 10/min | 50/min | 1 brokerage |
| Standard | 30/min | 100/min | 3 brokerages |
| Pro | 60/min | 200/min | Unlimited |

**Burst Allowance**
- Allow 2x burst for 10 seconds, then enforce strict limits
- Token bucket algorithm for smooth rate limiting

---

## 3. API Key & Secret Protection

### 3.1 Current Key Management

**Environment Variables (Secrets)**
- `SNAPTRADE_CLIENT_ID` / `SNAPTRADE_CONSUMER_KEY`
- `TELLER_APPLICATION_ID` / `TELLER_API_TOKEN`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `ENCRYPTION_MASTER_KEY` / `SESSION_SECRET`
- `DATABASE_URL` (contains credentials)

**Secret Rotation Schedule**
| Secret Type | Current Rotation | Recommended |
|-------------|------------------|-------------|
| Database credentials | Manual | 90 days |
| API keys | Manual | 180 days |
| Encryption keys | Never | Annual + incident |
| Session secrets | Never | 30 days |

### 3.2 Production Recommendations

**Secrets Management**
1. **HashiCorp Vault** or **AWS Secrets Manager**
   - Centralized secret storage
   - Automatic rotation support
   - Audit logging for secret access
   - Dynamic database credentials

2. **Secret Access Patterns**
   ```
   Application → Vault Agent → Secrets
                     ↓
              Audit Log → SIEM
   ```

3. **Key Rotation Implementation**
   - Zero-downtime rotation with dual-key support
   - Automated rotation triggers (schedule + incident)
   - Secret version tracking

**Encryption Key Hierarchy**
```
Master Key (HSM/KMS)
    ├── Data Encryption Key (rotating)
    │       └── Per-record encryption
    └── Key Encryption Key (KEK)
            └── Wraps DEKs
```

---

## 4. Attack Prevention

### 4.1 Current Mitigations

| Attack Vector | Current Defense | Status | Notes |
|--------------|-----------------|--------|-------|
| SQL Injection | Drizzle ORM (parameterized) | ✅ Protected | All queries use ORM |
| XSS | React auto-escaping | ✅ Protected | No dangerouslySetInnerHTML |
| CSRF | csurf middleware (server/security/csrf.ts) | ⚠️ Partial | Web flows only; mobile bypassed via X-Mobile-App header |
| Brute Force | Rate limiting + lockout | ✅ Protected | See Section 2.1 for limits |
| Session Hijacking | httpOnly + SameSite cookies | ⚠️ Partial | Secure=false in dev; production uses Secure=true |
| Timing Attacks | timingSafeEqual (server/lib/token-utils.ts) | ✅ Protected | Token comparison is timing-safe |

Note: `server/middleware/csrf.ts` is legacy/unmounted; active CSRF uses `server/security/csrf.ts` via `installCsrf()`.

### 4.2 Additional Security Measures Needed

**1. DDoS Protection**
- Current: Basic rate limiting
- Recommended:
  - Cloudflare Pro/Business tier
  - WAF rules for common attack patterns
  - Challenge pages for suspicious traffic
  - Geographic rate limiting

**2. Bot Detection**
- Current: None
- Recommended:
  - Honeypot fields on forms
  - reCAPTCHA v3 for registration/login
  - Device fingerprinting
  - Behavioral analysis

**3. Credential Stuffing Prevention**
- Current: Rate limiting only
- Recommended:
  - Breached password database check (HaveIBeenPwned API)
  - Anomaly detection for login patterns
  - Geographic login verification
  - Progressive delays on failed attempts

**4. Account Takeover Prevention**
```
Risk Signals → Risk Engine → Action
    │              │
    ├── New device ├── Step-up auth (MFA)
    ├── New IP     ├── Email verification
    ├── New geo    ├── Session termination
    └── Unusual time └── Block + notify
```

### 4.3 Security Headers

**Current Headers (via Helmet.js)**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Recommended Additions**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.snaptrade.com https://*.teller.io https://*.stripe.com;
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 5. Scalability Architecture

### 5.1 Current Architecture (Single Node)

```
Client → Nginx (Replit) → Express Server → PostgreSQL (Neon)
                               │
                               ├── SnapTrade API
                               ├── Teller API
                               └── Stripe API
```

**Bottlenecks**
- Single Express instance
- In-memory session storage
- In-memory rate limiting
- Synchronous external API calls

### 5.2 Production Architecture (100k+ Users)

```
                    ┌─────────────┐
                    │ CloudFlare  │
                    │    WAF      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    ALB      │
                    │ (SSL Term)  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ App-1   │       │ App-2   │       │ App-3   │
    │ (ECS)   │       │ (ECS)   │       │ (ECS)   │
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         └────────────┬────┴────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼────┐              ┌─────▼─────┐
    │  Redis  │              │ PostgreSQL│
    │ Cluster │              │  Primary  │
    │(Sessions│              │ + Replicas│
    │+ Cache) │              └───────────┘
    └─────────┘
```

### 5.3 Database Scaling

**Read Scaling**
- Neon supports read replicas
- Query routing: writes → primary, reads → replicas
- Connection pooling via PgBouncer

**Write Scaling**
- Optimize queries with proper indexing
- Async writes for non-critical data
- Event-driven architecture for heavy operations

**Recommended Indexes**
```sql
-- User lookups
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Holdings queries
CREATE INDEX CONCURRENTLY idx_holdings_account ON holdings(account_id);
CREATE INDEX CONCURRENTLY idx_holdings_symbol ON holdings(symbol);

-- Activity logging
CREATE INDEX CONCURRENTLY idx_activity_user_time ON activity_logs(user_id, created_at DESC);

-- Session management
CREATE INDEX CONCURRENTLY idx_sessions_user ON sessions(user_id) WHERE expires_at > NOW();
```

### 5.4 Caching Strategy

**Layer 1: Browser Cache**
- Static assets: 1 year (with versioning)
- API responses: 5 minutes (stale-while-revalidate)

**Layer 2: CDN Cache (CloudFlare)**
- Public assets: 24 hours
- API responses: Edge caching with Vary headers

**Layer 3: Application Cache (Redis)**
- Session data: TTL = session duration
- Rate limit counters: TTL = window duration
- User preferences: TTL = 1 hour
- Market data: TTL = 5 seconds (real-time)

**Layer 4: Database Query Cache**
- Materialized views for dashboard aggregates
- Refresh every 15 minutes

### 5.5 Background Jobs

**Current: In-Process Crons**
- Holdings sync (every 15 min)
- Connection health check (every 6 hours)
- Daily snapshots (midnight ET)

**Production: Distributed Job Queue**
```
                    ┌──────────────┐
                    │   BullMQ     │
                    │ (Redis-based)│
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Worker-1│       │ Worker-2│       │ Worker-3│
    │ Holdings│       │  Alerts │       │Snapshots│
    └─────────┘       └─────────┘       └─────────┘
```

**Job Priorities**
| Job Type | Priority | Concurrency | Retry |
|----------|----------|-------------|-------|
| Webhooks | High | 10 | 3 |
| Trades | High | 5 | 2 |
| Holdings Sync | Medium | 20 | 3 |
| Snapshots | Low | 5 | 1 |

---

## 6. Monitoring & Observability

### 6.1 Current Logging

- Betterstack Logtail for error tracking
- PII redaction in logs
- Structured JSON logging

### 6.2 Production Monitoring Stack

**Metrics (Prometheus + Grafana)**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- External API latency
- Database query times
- Cache hit rates

**Tracing (OpenTelemetry)**
- Distributed tracing across services
- Request correlation IDs
- Span-level performance analysis

**Alerting Thresholds**
| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 1% | > 5% |
| P99 latency | > 2s | > 5s |
| External API errors | > 5% | > 20% |
| Database connections | > 80% | > 95% |

---

## 7. Compliance Considerations

### 7.1 Data Privacy

**PII Data Fields**
- Email, name, phone (users table)
- Account numbers (masked in transit/display)
- Transaction history

**Retention Policy**
| Data Type | Retention | Deletion |
|-----------|-----------|----------|
| User accounts | Active + 7 years | Manual request |
| Transaction logs | 7 years | Automated |
| Session data | 30 days | Automated |
| Access logs | 90 days | Automated |

### 7.2 Financial Compliance

- SOC 2 Type II readiness checklist
- PCI DSS considerations (if handling card data)
- AML/KYC integration points

---

## 8. Incident Response

### 8.1 Security Incident Classification

| Severity | Examples | Response Time |
|----------|----------|---------------|
| P1 - Critical | Data breach, system compromise | 15 min |
| P2 - High | Auth bypass, API key exposure | 1 hour |
| P3 - Medium | Rate limit bypass, minor vuln | 24 hours |
| P4 - Low | Security best practice gap | 1 week |

### 8.2 Runbooks

**API Key Compromise**
1. Revoke compromised key immediately
2. Generate new key
3. Update secret in Vault/Secrets Manager
4. Restart affected services
5. Audit access logs for misuse
6. Notify affected users if applicable

**Database Breach**
1. Isolate affected database
2. Revoke all active sessions
3. Force password reset for affected users
4. Forensic analysis
5. Regulatory notification (if applicable)
6. Public disclosure (if required)

---

## 9. Implementation Roadmap

### Phase 1: Critical Security (Week 1-2)
- [ ] Implement Redis-backed rate limiting
- [ ] Add DDoS protection (CloudFlare)
- [ ] Deploy CSP headers
- [ ] Enable breached password checking

### Phase 2: Scalability (Week 3-4)
- [ ] Migrate sessions to Redis
- [ ] Set up read replicas
- [ ] Implement connection pooling
- [ ] Deploy to multi-node ECS

### Phase 3: Observability (Week 5-6)
- [ ] Deploy Prometheus + Grafana
- [ ] Implement OpenTelemetry tracing
- [ ] Set up alerting rules
- [ ] Create incident runbooks

### Phase 4: Compliance (Week 7-8)
- [ ] Complete SOC 2 readiness assessment
- [ ] Implement data retention automation
- [ ] Document security policies
- [ ] Conduct penetration testing

---

## 10. Appendix

### A. Security Checklist

- [x] HTTPS only (enforced)
- [x] CSRF protection (web flows only, excludes login and public endpoints)
- [x] Rate limiting
- [x] Password hashing (Argon2id)
- [x] SQL injection prevention (ORM)
- [x] XSS prevention (React)
- [x] Secure session cookies (Secure=true in production, Secure=false in development)
- [x] MFA support
- [ ] CSP headers (partial)
- [ ] Bot detection
- [ ] WAF rules
- [ ] Secrets rotation automation
- [ ] Distributed rate limiting

### B. Performance Targets

| Metric | Current | Target (100k users) |
|--------|---------|---------------------|
| P95 Latency | ~500ms | < 200ms |
| Error Rate | < 1% | < 0.1% |
| Uptime | 99% | 99.9% |
| RPS Capacity | 100 | 10,000 |

### C. External Dependencies

| Service | Current SLA | Backup Plan |
|---------|-------------|-------------|
| SnapTrade | 99.9% | Queue failed requests, retry |
| Teller | 99.9% | Cached account data (1 hour) |
| Stripe | 99.99% | Webhook retry queue |
| Neon PostgreSQL | 99.95% | Read replica failover |
