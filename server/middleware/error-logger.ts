import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { InsertErrorLog } from '@shared/schema';

/**
 * Error logging middleware - captures all API errors and saves to database
 * This middleware should be added BEFORE the final error handler
 */
export function errorLoggerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Skip logging for non-API routes
  if (!req.path.startsWith('/api')) {
    return next(err);
  }

  // Extract user ID from session if available
  const userId = (req as any).user?.id || null;

  // Determine error type based on the error object or endpoint
  let errorType = 'API';
  if (err.code === 'SNAPTRADE_NOT_REGISTERED' || err.code === 'SNAPTRADE_USER_MISMATCH' || req.path.includes('snaptrade')) {
    errorType = 'SnapTrade';
  } else if (req.path.includes('teller') || req.path.includes('bank')) {
    errorType = 'Teller';
  } else if (err.name === 'DatabaseError' || err.code?.startsWith('23')) {
    errorType = 'Database';
  } else if (req.path.includes('auth') || req.path.includes('login') || req.path.includes('register')) {
    errorType = 'Auth';
  }

  // Extract error message and stack trace
  const errorMessage = err.message || err.toString() || 'Unknown error';
  const stackTrace = err.stack || null;
  const statusCode = err.status || err.statusCode || res.statusCode || 500;

  // Build error log entry
  const errorLog: InsertErrorLog = {
    userId,
    errorType,
    errorMessage,
    stackTrace,
    endpoint: req.path,
    method: req.method,
    statusCode,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    metadata: {
      query: req.query,
      body: sanitizeBody(req.body),
      params: req.params,
      errorCode: err.code || null,
      errorName: err.name || null,
    },
  };

  // Log to database asynchronously (don't block response)
  storage.logError(errorLog).catch((logError) => {
    console.error('[Error Logger] Failed to log error to database:', logError);
  });

  // Pass error to next error handler
  next(err);
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
