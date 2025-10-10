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
    '/api/applications/submit',
    '/api/auth/setup-password',
    '/api/auth/request-reset'
  ];
  
  // Apply CSRF middleware with conditional logic
  app.use((req, res, next) => {
    const isPublicPath = publicPaths.some(path => req.path === path) || req.url.includes('/webhooks');
    
    if (isPublicPath) {
      console.log('[CSRF] Skipping CSRF for public path:', req.path);
      return next();
    }
    
    // Apply CSRF for all other routes
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