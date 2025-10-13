import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth-tokens';

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
 * JWT Authentication Middleware
 * Verifies the access token from cookies and attaches user info to req.user
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT from cookie
    const accessToken = req.cookies.accessToken;

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
