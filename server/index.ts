import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { installCsrf } from "./security/csrf";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "@shared/logger";
import snaptradeRouter from "./routes/snaptrade";
import ordersRouter from "./routes/orders";
import orderPreviewRouter from "./routes/order-preview";
import watchlistRouter from "./routes/watchlist";
import quotesRouter from "./routes/quotes";
import { errorLoggerMiddleware } from "./middleware/error-logger";

const app = express();

(async () => {
  try {
  // 1) HTTP Compression with gzip/deflate support (must be early in middleware stack)
  // Note: Brotli is supported natively by Node.js v10.16+ via zlib module but requires
  // custom middleware implementation. For production use, consider nginx/CDN-level Brotli.
  app.use(compression({
    level: 6, // Compression level (0-9, where 6 is a good balance)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter for everything else
      return compression.filter(req, res);
    },
  }));

  // 2) Security + parsers (improved CSP configuration)
  const SELF = "'self'";
  const UNSAFE_INLINE = "'unsafe-inline'"; // keep temporarily if you rely on inline styles/scripts
  const isProdCSP = process.env.NODE_ENV === 'production';
  
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: [SELF],
        // Scripts
        scriptSrc: [
          SELF,
          UNSAFE_INLINE,              // ideally replace with nonces/hashes later
          'https://cdn.teller.io',
          'https://js.stripe.com',
          'https://replit.com',
          'https://app.lemonsqueezy.com',
          'https://assets.lemonsqueezy.com',
          'https://js.whop.com',
          'https://whop.com',
          'https://us-assets.i.posthog.com'
        ],
        // Styles (separate style-src-elem is respected by newer browsers)
        styleSrc: [SELF, UNSAFE_INLINE, 'https://fonts.googleapis.com'],
        styleSrcElem: [SELF, UNSAFE_INLINE, 'https://fonts.googleapis.com'],
        // Fonts
        fontSrc: [SELF, 'https://fonts.gstatic.com', 'data:'],
        // Frames (Stripe elements, Teller Connect iframed, Lemon Squeezy checkout, Whop checkout)
        frameSrc: [
          SELF,
          'https://teller.io',
          'https://cdn.teller.io',
          'https://js.stripe.com',
          'https://hooks.stripe.com',
          'https://flint-investing.lemonsqueezy.com',
          'https://app.lemonsqueezy.com',
          'https://whop.com',
          'https://js.whop.com'
        ],
        // XHR/WebSocket endpoints
        connectSrc: [
          SELF,
          'https://api.teller.io',
          'https://cdn.teller.io',
          'https://js.stripe.com',
          'https://api.stripe.com',
          'https://hooks.stripe.com',
          'https://app.lemonsqueezy.com',
          'https://api.lemonsqueezy.com',
          'https://api.whop.com',
          'https://whop.com',
          'https://us.i.posthog.com',
          'https://us-assets.i.posthog.com',
          // MetaMask SDK - for crypto wallet integration
          'https://metamask-sdk.api.cx.metamask.io',
          'wss://metamask-sdk.api.cx.metamask.io',
          'https://*.infura.io',
          'wss://*.infura.io',
          // add your exact Replit base (scheme+host+port) if you ever call absolute URLs
        ],
        imgSrc: [SELF, 'data:', 'https://cdn.brandfetch.io', 'https://img.logo.dev', 'https://docs.brandfetch.com'],
        baseUri: [SELF],
        frameAncestors: [SELF], // adjust if you embed your app elsewhere
        // If you use Stripe web workers or wasm, add workerSrc/childSrc as needed.
      },
      // reportOnly: true, // optionally trial first to see console reports without blocking
    },
    crossOriginEmbedderPolicy: false, // keep false if third-party scripts require it
  }));
  
  // Raw body middleware for payment webhooks (MUST be before express.json())
  // Use express.text() to preserve exact body string for signature validation
  app.use('/api/lemonsqueezy/webhook', express.text({ type: 'application/json' }));
  app.use('/api/webhook/whop', express.text({ type: 'application/json' }));
  app.use('/api/stripe/webhook', express.text({ type: 'application/json' }));
  app.use('/api/teller/webhook', express.text({ type: 'application/json' })); // Teller webhook signature verification
  
  // Standard JSON parsing for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // 3) Add caching headers for better performance
  app.use((req, res, next) => {
    // Cache static assets aggressively
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // API responses - different strategies based on endpoint
    else if (req.url.startsWith('/api/')) {
      if (req.url.includes('/auth') || req.url.includes('/login') || req.url.includes('/logout')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      } else if (req.url.includes('/dashboard')) {
        res.setHeader('Cache-Control', 'private, max-age=60'); // 60s for dashboard
      } else if (req.url.includes('/portfolio-holdings') || req.url.includes('/quotes')) {
        res.setHeader('Cache-Control', 'private, max-age=5'); // 5s for real-time data
      } else {
        res.setHeader('Cache-Control', 'private, max-age=300'); // 5min default for API
      }
    }
    next();
  });

  // 4) CORS — allow credentials from all origins (configured for mobile app)
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Mobile-App', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  }));

  // 3) Trust proxy so Secure cookies work behind Replit's TLS
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });
  
  // Add webhook routes before CSRF to allow external calls
  // SnapTrade webhook endpoint (configured in SnapTrade dashboard)
  app.post('/api/webhooks/snaptrade', async (req: Request, res: Response) => {
    try {
      // Import webhook handler dynamically
      const { handleSnapTradeWebhook } = await import('./routes/snaptrade-webhooks');
      await handleSnapTradeWebhook(req, res);
    } catch (error) {
      console.error('[SnapTrade Webhook] Fatal error in webhook route:', error);
      // Always return 200 to prevent SnapTrade from retrying
      res.status(200).json({ ok: true, error: 'Internal error logged' });
    }
  });
  
  // Legacy webhook path (keeping for backward compatibility)
  app.post('/api/snaptrade/webhooks', async (req: Request, res: Response) => {
    try {
      const { handleSnapTradeWebhook } = await import('./routes/snaptrade-webhooks');
      await handleSnapTradeWebhook(req, res);
    } catch (error) {
      console.error('[SnapTrade Webhook] Fatal error in webhook route:', error);
      // Always return 200 to prevent SnapTrade from retrying
      res.status(200).json({ ok: true, error: 'Internal error logged' });
    }
  });

  // Whop webhook route
  app.post('/api/webhook/whop', async (req: Request, res: Response) => {
    try {
      // Import webhook handler dynamically
      const { handleWhopWebhook } = await import('./routes/whop');
      await handleWhopWebhook(req, res);
    } catch (error: any) {
      console.error('[Whop Webhook] Error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error.message 
      });
    }
  });

  // 4) CSRF setup (must come BEFORE protected routes)
  installCsrf(app);

  // Initialize PostHog for server-side analytics
  const { posthog, captureEvent } = await import('./lib/posthog');
  console.log('[PostHog] Server-side analytics initialized');
  
  // Send test event to verify PostHog integration
  captureEvent('server', 'server_started', {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  console.log('[PostHog] Test event sent: server_started');

  // Start background services
  const { snaptradeBackgroundService } = await import('./services/snaptrade-background');
  await snaptradeBackgroundService.start();

  // Start orphaned connections cleanup service
  const { startOrphanedConnectionsCleanup } = await import('./services/orphaned-connections-cleanup');
  startOrphanedConnectionsCleanup();

  // Start holdings sync service
  const { startHoldingsSyncService } = await import('./services/holdings-sync');
  startHoldingsSyncService();

  // Start net worth snapshot cron service
  const { startSnapshotCronService } = await import('./services/snapshot-cron');
  startSnapshotCronService();

  // Validate SnapTrade credentials on startup
  const { validateSnapTradeCredentials } = await import('./lib/snaptrade');
  validateSnapTradeCredentials().then(isValid => {
    if (!isValid) {
      console.warn('[Server] ⚠️  Starting with invalid SnapTrade credentials - SnapTrade features will not work');
    }
  });

  // Initialize authentication and base routes
  const server = await registerRoutes(app);
  
  // Graceful shutdown flag
  let isShuttingDown = false;
  
  // Graceful shutdown function
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`${signal} received, shutting down gracefully`);
    
    // Create timeout promise (30 seconds max wait)
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), 30000);
    });
    
    // Create server close promise
    const closePromise = new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
    
    try {
      // Wait for server to close OR timeout
      await Promise.race([closePromise, timeoutPromise]);
    } catch (error) {
      logger.error('Forcefully shutting down after timeout');
    }
    
    // Flush logs before exit
    try {
      await logger.flush();
    } catch (error) {
      console.error('Error flushing logs:', error);
    }
    
    // Flush PostHog events before exit
    try {
      const { shutdownPostHog } = await import('./lib/posthog');
      await shutdownPostHog();
    } catch (error) {
      console.error('Error shutting down PostHog:', error);
    }
    
    process.exit(0);
  };
  
  // Mount SnapTrade API routers AFTER auth setup (require authentication)
  app.use("/api/snaptrade", snaptradeRouter);
  
  // Mount versioned SnapTrade routes with proper error handling
  const versionedSnaptradeRouter = (await import('./routes/snaptrade')).default;
  app.use("/api/snaptrade", versionedSnaptradeRouter);
  
  // Mount new SnapTrade management routes (require authentication)
  const { snaptradeUsersRouter } = await import('./routes/snaptrade-users');
  const { snaptradeConnectionsRouter } = await import('./routes/snaptrade-connections');
  const { snaptradeAccountsRouter } = await import('./routes/snaptrade-accounts');
  const { snaptradeTradingRouter } = await import('./routes/snaptrade-trading');
  app.use("/api/snaptrade/users", snaptradeUsersRouter);
  app.use("/api/snaptrade", snaptradeConnectionsRouter);
  app.use("/api/snaptrade", snaptradeAccountsRouter);
  app.use("/api/snaptrade", snaptradeTradingRouter);
  
  // Mount SnapTrade authentication and connections management routes
  const snaptradeAuthRouter = (await import('./routes/snaptrade-auth')).default;
  const snaptradeConnectionsManagementRouter = (await import('./routes/snaptrade-connections-management')).default;
  const snaptradeAccountInformationRouter = (await import('./routes/snaptrade-account-information')).default;
  const snaptradeOptionsRouter = (await import('./routes/snaptrade-options')).default;
  const snaptradeReferenceDataRouter = (await import('./routes/snaptrade-reference-data')).default;
  app.use("/api/snaptrade", snaptradeAuthRouter);
  app.use("/api/snaptrade", snaptradeConnectionsManagementRouter);
  app.use("/api/snaptrade", snaptradeAccountInformationRouter);
  app.use("/api/snaptrade/options", snaptradeOptionsRouter);
  app.use("/api/snaptrade/reference", snaptradeReferenceDataRouter);
  
  // Mount routes that REQUIRE authentication AFTER passport is initialized
  // Mount SnapTrade connections router
  const connectionsSnaptradeRouter = (await import("./routes/connections.snaptrade")).default;
  app.use("/api", connectionsSnaptradeRouter);
  
  // Mount disconnect routes
  const disconnectRouter = (await import("./routes/connections/disconnect")).default;
  app.use("/api/connections/disconnect", disconnectRouter);
  
  // Mount account details route
  const accountDetailsRouter = (await import("./routes/account-details")).default;
  app.use("/api", accountDetailsRouter);
  
  // Mount payment capability route
  const paymentCapabilityRouter = (await import("./routes/payment-capability")).default;
  app.use("/api", paymentCapabilityRouter);
  
  // Mount accounts route
  const accountsRouter = (await import("./routes/accounts")).default;
  app.use("/api/accounts", accountsRouter);
  
  // Mount Orders API router
  app.use("/api", ordersRouter);
  
  // Mount Order Preview API router (SnapTrade two-step process)
  app.use("/api/order-preview", orderPreviewRouter);
  
  // Mount Accounts Brokerage API router
  const accountsBrokerageRouter = (await import("./routes/accounts-brokerage")).default;
  app.use("/api", accountsBrokerageRouter);
  

  
  // Mount Watchlist API router
  app.use("/api/watchlist", watchlistRouter);
  
  // Mount PostHog test endpoint (development/testing only)
  const posthogTestRouter = (await import("./routes/posthog-test")).default;
  app.use("/api/posthog", posthogTestRouter);

  // Development-only repair endpoint for 409 SNAPTRADE_USER_MISMATCH
  if (process.env.NODE_ENV === 'development') {
    const { authApi } = await import("./lib/snaptrade");
    const { deleteSnapUser, saveSnapUser } = await import("./store/snapUsers");

    app.post('/api/debug/snaptrade/repair-user', async (req, res) => {
      try {
        const userId = String(req.body?.userId || '').trim();
        if (!userId) return res.status(400).json({ message: 'userId required' });

        await authApi.deleteSnapTradeUser({ userId }); // provider-side async delete
        await deleteSnapUser(userId);
        const created = await authApi.registerSnapTradeUser({ userId });
        await saveSnapUser({ userId: created.data.userId!, userSecret: created.data.userSecret! });
        res.json({ ok: true, userId, userSecretLen: created.data.userSecret?.length || 0 });
      } catch (e: any) {
        res.status(500).json({ ok: false, error: e?.responseBody || e?.message });
      }
    });
  }
  
  // Mount Quotes API router
  app.use("/api/quotes", quotesRouter);
  
  // Mount Market Data API router
  const marketDataRouter = (await import("./routes/market-data")).default;
  app.use("/api/market-data", marketDataRouter);
  
  // Mount Banking API router
  const bankingRouter = (await import("./routes/banking")).default;
  app.use("/api/banking", bankingRouter);
  
  // Mount Teller API router
  const tellerRouter = (await import("./routes/teller")).default;
  app.use("/api/teller", tellerRouter);
  
  // Mount Transfers API router
  const transfersRouter = (await import("./routes/transfers")).default;
  app.use("/api/transfers", transfersRouter);
  
  // Mount Deposits API router
  const depositsRouter = (await import("./routes/deposits")).default;
  app.use("/api/deposits", depositsRouter);
  
  // Mount Search API router
  const searchRouter = (await import("./routes/search")).default;
  app.use("/api/search", searchRouter);
  
  // Mount Simple Watchlist API router
  const watchlistSimpleRouter = (await import("./routes/watchlist-simple")).default;
  app.use("/api/watchlist", watchlistSimpleRouter);
  
  // Mount Holdings API router
  const holdingsRouter = (await import("./routes/holdings")).default;
  app.use("/api/holdings", holdingsRouter);
  
  // Mount Asset Detail API router
  const assetDetailRouter = (await import("./routes/asset-detail")).default;
  app.use("/api/asset", assetDetailRouter);
  
  // Mount Trading API router
  const tradingRouter = (await import("./routes/trading")).default;
  app.use("/api/trade", tradingRouter);

  // Mount Feature Requests API router
  const featureRequestsRouter = (await import("./routes/feature-requests")).default;
  app.use("/api/feature-requests", featureRequestsRouter);

  // Mount Leads API router
  const leadsRouter = (await import("./routes/leads")).default;
  app.use("/api/leads", leadsRouter);

  // ========================================
  // IMPORTANT: All API routes must be mounted BEFORE static files
  // ========================================
  
  // JSON error handler for API routes (ensures even crashes return JSON)
  app.use("/api/*", (err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const body = {
      message: err.message || 'Internal Server Error',
      code: err.code,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    };
    res.status(status).type('application/json').send(body);
  });
  
  // 404 handler for API routes (must be before static files)
  app.use("/api/*", (req: Request, res: Response) => {
    res.status(404).json({ message: "Not found", path: req.originalUrl });
  });

  // ========================================
  // Static files and catch-all route LAST
  // ========================================
  
  // Setup Vite (dev) or serve static files (prod)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Error logging middleware (logs errors to database before sending response)
  app.use(errorLoggerMiddleware);
  
  // Global error handler (ensures API routes always return JSON)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // For API routes, always return JSON
    if (req.path.startsWith("/api")) {
      const body = {
        message: err.message || 'Internal Server Error',
        code: err.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      };
      res.status(status).type('application/json').send(body);
    } else {
      // For non-API routes, let the default error handler manage it
      const message = err.message || "Internal Server Error";
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      res.status(status).send(message);
    }
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start services after server is up
    setTimeout(async () => {
      try {
        const { healthCheckService } = await import("./services/health-check");
        healthCheckService.start();
        console.log('[Health Check] Service initialized');
      } catch (error) {
        console.error('[Health Check] Failed to start:', error);
      }
    }, 1000);
  });
  
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
