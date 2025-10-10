import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { verifyPassword } from "./lib/password-utils";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'flint.sid', // Custom session name instead of default
    cookie: {
      httpOnly: true,
      secure: true, // Always secure since Replit runs on HTTPS
      sameSite: 'lax', // Changed from 'strict' for Replit preview compatibility
      maxAge: sessionTtl,
      path: '/',
      domain: undefined, // Let browser handle domain
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const user = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  // Auto-provision SnapTrade user on signup/first login
  try {
    const { ensureSnaptradeUser } = await import('./services/snaptradeProvision');
    await ensureSnaptradeUser(user.id);
    // Auto-provisioned SnapTrade user
  } catch (error) {
    // Auto-provision failed (non-blocking)
    // Don't fail the auth flow if SnapTrade provision fails
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Local authentication strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const { db } = await import('./db');
        const { users } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const [user] = await db.select().from(users).where(eq(users.email, email));
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: 'Password login not enabled for this account' });
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Return user object for session (local auth type)
        return done(null, {
          authType: 'local',
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    const isOAuthUser = user?.authType !== 'local';
    
    // Properly revoke session
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      
      // Destroy session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        
        // Clear session cookie
        res.clearCookie('flint.sid', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/'
        });
        
        // For OAuth users, redirect to Replit logout
        // For local users, just redirect to home
        if (isOAuthUser) {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        } else {
          res.redirect('/');
        }
      });
    });
  });

  // Local login route
  app.post("/api/auth/local-login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Authentication error',
          error: err.message 
        });
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: info?.message || 'Invalid email or password' 
        });
      }
      
      // Create session
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to create session',
            error: loginErr.message 
          });
        }
        
        // Update last login time
        storage.updateLastLogin(user.id).catch(err => {
          console.error('Failed to update last login:', err);
        });
        
        return res.json({ 
          success: true, 
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        });
      });
    })(req, res, next);
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Add debugging breadcrumb header
  res.setHeader('X-Debug-Reason', 'AUTH_CHECKING');

  if (!req.isAuthenticated()) {
    res.setHeader('X-Debug-Reason', 'AUTH_REQUIRED');
    return res.status(401).json({ 
      code: 'AUTH_REQUIRED',
      message: "Authentication required" 
    });
  }

  // For local auth users, just check if authenticated
  if (user?.authType === 'local') {
    res.setHeader('X-Debug-Reason', 'OK');
    // Create claims-like structure for compatibility
    if (!user.claims) {
      user.claims = {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      };
    }
    return next();
  }

  // For OAuth users, check token expiration
  if (!user?.expires_at) {
    res.setHeader('X-Debug-Reason', 'AUTH_REQUIRED');
    return res.status(401).json({ 
      code: 'AUTH_REQUIRED',
      message: "Authentication required" 
    });
  }

  const now = Math.floor(Date.now() / 1000);
  
  if (now <= user.expires_at) {
    res.setHeader('X-Debug-Reason', 'OK');
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.setHeader('X-Debug-Reason', 'NO_REFRESH_TOKEN');
    res.status(401).json({ 
      code: 'NO_REFRESH_TOKEN',
      message: "Session expired and no refresh token available" 
    });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Token refresh successful
    res.setHeader('X-Debug-Reason', 'OK');
    return next();
  } catch (error) {
    // Token refresh failed
    res.setHeader('X-Debug-Reason', 'TOKEN_REFRESH_FAILED');
    res.status(401).json({ 
      code: 'TOKEN_REFRESH_FAILED',
      message: "Token refresh failed" 
    });
    return;
  }
};
