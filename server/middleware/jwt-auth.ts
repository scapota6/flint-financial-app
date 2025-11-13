import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, issueProactiveRefresh, ACCESS_TOKEN_COOKIE_MAX_AGE } from '../lib/auth-tokens';

// Extend Express Request to include user (compatible with existing routes)
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      claims: {
        sub: string;
        email: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware (Dual-Mode)
 * Verifies the access token from either Authorization header (mobile) or cookies (web)
 * and attaches user info to req.user
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let accessToken: string | undefined;
    let isMobileAuth = false;

    // PRIORITY 1: Check for Bearer token in Authorization header (mobile)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
      isMobileAuth = true;
    }

    // PRIORITY 2: Fall back to cookie authentication (web)
    if (!accessToken) {
      accessToken = req.cookies.accessToken;
      isMobileAuth = false;
    }

    // No token found in either location
    if (!accessToken) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Verify and decode the token
    try {
      const payload = verifyAccessToken(accessToken);

      // Attach user info to request (compatible with existing routes)
      req.user = {
        userId: payload.userId,
        email: payload.email,
        claims: {
          sub: payload.userId,
          email: payload.email,
        },
      };

      // Sliding window token refresh: ONLY for cookie-based auth (web)
      // Mobile apps use explicit /api/auth/refresh-token endpoint
      if (!isMobileAuth && payload.exp) {
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const timeUntilExpiry = payload.exp - now; // Time remaining in seconds
        const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

        // If token expires within 5 minutes, issue a new one
        if (timeUntilExpiry <= REFRESH_THRESHOLD && timeUntilExpiry > 0) {
          try {
            const newAccessToken = issueProactiveRefresh(payload.userId, payload.email);
            
            // Set new access token cookie (keep refresh token unchanged)
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('accessToken', newAccessToken, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'strict',
              maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
              path: '/',
            });

            // Log refresh for debugging (optional, remove in production if verbose)
            console.log(`[Sliding Window] Refreshed token for user ${payload.userId}, ${timeUntilExpiry}s remaining`);
          } catch (refreshError) {
            // Log error but don't block the request - user can continue with current token
            console.error('[Sliding Window] Failed to refresh token:', refreshError);
          }
        }
      }

      // Continue to next middleware/route handler
      next();
    } catch (error: any) {
      // Handle specific JWT errors
      if (error.message === 'Token expired') {
        res.status(401).json({
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (error.message === 'Invalid token') {
        res.status(401).json({
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Generic error
      res.status(401).json({
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      });
      return;
    }
  } catch (error) {
    console.error('JWT auth middleware error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
    return;
  }
}
