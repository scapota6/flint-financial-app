import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';
import { db } from '../db';
import { refreshTokens } from '@shared/schema';
import { eq, and, lte } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '20m'; // 20 minutes - matches inactivity timeout
export const ACCESS_TOKEN_COOKIE_MAX_AGE = 20 * 60 * 1000; // 20 minutes in ms - MUST match ACCESS_TOKEN_EXPIRY
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days

export interface AccessTokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenData {
  token: string;
  hashedToken: string;
  expiresAt: Date;
}

/**
 * Generate an access token (JWT) with 20-minute expiry
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: AccessTokenPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Generate a secure refresh token (random token, not JWT)
 * Returns both the plain token and its hashed version
 */
export function generateRefreshToken(): RefreshTokenData {
  const token = crypto.randomBytes(64).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  return {
    token,
    hashedToken,
    expiresAt,
  };
}

/**
 * Verify and decode an access token
 * Returns the payload if valid, throws error if invalid/expired
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Hash a refresh token for secure storage
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a refresh token against its hash (constant-time comparison)
 */
export function verifyRefreshToken(token: string, hashedToken: string): boolean {
  const tokenHash = hashRefreshToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hashedToken, 'hex')
  );
}

/**
 * Issue a proactive token refresh (sliding window)
 * Generates a new access token when the current one is expiring soon
 * Does NOT rotate refresh token - that only happens on explicit /api/auth/refresh
 * @returns New access token
 */
export function issueProactiveRefresh(userId: string, email: string): string {
  return generateAccessToken(userId, email);
}

/**
 * Set authentication cookies (httpOnly, Secure, SameSite=Strict)
 */
export function setCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE, // 20 minutes in ms - matches JWT expiry
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  userId: string,
  hashedToken: string,
  expiresAt: Date,
  deviceInfo?: string,
  ipAddress?: string
): Promise<void> {
  await db.insert(refreshTokens).values({
    userId,
    token: hashedToken,
    deviceInfo,
    ipAddress,
    expiresAt,
    revoked: false,
  });
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(hashedToken: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      revoked: true,
      revokedAt: new Date(),
    })
    .where(eq(refreshTokens.token, hashedToken));
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      revoked: true,
      revokedAt: new Date(),
    })
    .where(and(
      eq(refreshTokens.userId, userId),
      eq(refreshTokens.revoked, false)
    ));
}

/**
 * Update last used timestamp for a refresh token
 */
export async function updateTokenLastUsed(hashedToken: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(refreshTokens.token, hashedToken));
}

/**
 * Get a refresh token from database by its hash
 */
export async function getRefreshTokenFromDb(hashedToken: string) {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, hashedToken))
    .limit(1);

  return token;
}

/**
 * Clean up expired or revoked tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const now = new Date();
  
  await db
    .delete(refreshTokens)
    .where(
      lte(refreshTokens.expiresAt, now)
    );
}

/**
 * Refresh tokens with rotation (invalidate old, issue new)
 * @returns New access and refresh tokens, or null if refresh token is invalid
 */
export async function refreshTokensWithRotation(
  oldRefreshToken: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
} | null> {
  const hashedOldToken = hashRefreshToken(oldRefreshToken);
  
  const dbToken = await getRefreshTokenFromDb(hashedOldToken);

  if (!dbToken) {
    return null;
  }

  if (dbToken.revoked) {
    return null;
  }

  if (new Date() > dbToken.expiresAt) {
    return null;
  }

  await revokeRefreshToken(hashedOldToken);

  const newRefreshTokenData = generateRefreshToken();
  await storeRefreshToken(
    dbToken.userId,
    newRefreshTokenData.hashedToken,
    newRefreshTokenData.expiresAt,
    deviceInfo,
    ipAddress
  );

  const [user] = await db
    .select()
    .from(require('@shared/schema').users)
    .where(eq(require('@shared/schema').users.id, dbToken.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const newAccessToken = generateAccessToken(user.id, user.email || '');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenData.token,
    userId: user.id,
  };
}
