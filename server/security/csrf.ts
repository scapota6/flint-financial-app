import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import type { Express, Request, Response, NextFunction } from 'express';

export function installCsrf(app: Express) {
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use((req, _res, next) => {
    // some hosts (replit) need body parser before csurf
    if (req.headers['content-type']?.includes('application/json')) {
      // if you already call express.json() globally, remove this
    }
    next();
  });

  const isProd = process.env.NODE_ENV === 'production';
  
  // List of public paths that don't require CSRF protection
  const publicPaths = [
    '/api/teller/webhook',
    '/api/snaptrade/webhooks',
    '/api/lemonsqueezy/webhook',  // Lemon Squeezy payment webhooks
    '/api/stripe/webhook',  // Stripe payment webhooks
    '/api/stripe/create-embedded-checkout',  // Stripe embedded checkout from public landing page
    '/api/whop/create-checkout',  // Whop checkout creation from public landing page
    '/api/applications/submit',
    '/api/feature-requests',  // Feature requests from public landing page
    '/api/auth/setup-password',
    '/api/auth/request-reset',
    '/api/auth/local-login'  // Local password login doesn't require CSRF
  ];
  
  // Apply CSRF middleware with conditional logic
  app.use((req, res, next) => {
    const isPublicPath = publicPaths.some(path => req.path === path) || req.url.includes('/webhook');
    
    // Check if request is from mobile app (React Native/iOS/Android)
    // Mobile apps send X-Mobile-App header to bypass CSRF
    const isMobileApp = req.headers['x-mobile-app'] === 'true';
    
    // Debug logging for webhook paths
    if (req.path.includes('webhook') || req.url.includes('webhook')) {
      console.log('[CSRF] Webhook request - path:', req.path, 'url:', req.url, 'isPublic:', isPublicPath);
    }
    
    if (isPublicPath) {
      console.log('[CSRF] Skipping CSRF for public path:', req.path);
      return next();
    }
    
    // Skip CSRF for mobile app requests
    if (isMobileApp) {
      console.log('[CSRF] Skipping CSRF for mobile app request:', req.path);
      return next();
    }
    
    // Apply CSRF for all other routes (web browser requests)
    csrf({
      cookie: {
        key: 'flint_csrf',
        path: '/',
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        httpOnly: false,
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      value: function (req: any) {
        return req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;
      }
    })(req, res, next);
  });

  app.get('/api/csrf-token', (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // dev-only probe to see what the server receives (remove in prod)
  app.post('/api/_debug/csrf-check', (req: Request, res: Response) => {
    const header = (req.headers['x-csrf-token'] || req.headers['csrf-token'] || '') as string;
    const cookie = (req.headers.cookie || '').includes('flint_csrf=');
    res.json({ ok: true, headerPresent: !!header, cookiePresent: cookie });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ code: 'CSRF_INVALID', message: 'Invalid CSRF token' });
    }
    next(err);
  });
}