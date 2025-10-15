import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { db } from '../db';
import { users, passwordResetTokens, auditLogs, refreshTokens } from '@shared/schema';
import { eq, and, ne } from 'drizzle-orm';
import { validatePassword } from '../lib/password-validation';
import { 
  hashPassword, 
  updatePasswordHistory,
  isPasswordReused,
  verifyPassword
} from '../lib/argon2-utils';
import { hashToken, verifyToken, generateSecureToken } from '../lib/token-utils';
import { sendPasswordResetEmail, sendApprovalEmail } from '../services/email';
import {
  generateAccessToken,
  generateRefreshToken,
  setCookies,
  clearAuthCookies,
  storeRefreshToken,
  revokeAllUserTokens,
  refreshTokensWithRotation
} from '../lib/auth-tokens';
import { rateLimits } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/jwt-auth';

const router = Router();

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

const requestResetSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

/**
 * Helper function to add jittered delay (200-500ms)
 * Prevents timing attacks by making all responses take roughly the same time
 */
async function jitteredDelay(): Promise<void> {
  const delay = 200 + Math.random() * 300; // 200-500ms
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Log login attempt to audit logs
 */
async function logLoginAttempt(
  email: string,
  success: boolean,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: userId || null,
      adminEmail: email,
      action: success ? 'login_success' : 'login_failed',
      details: {
        ipAddress,
        userAgent,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// POST /api/auth/login - Authenticate user and issue JWT tokens
router.post('/login', rateLimits.login, async (req, res) => {
  const startTime = Date.now();
  let userFound = false;
  let user: any = null;

  try {
    const parseResult = loginSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      await jitteredDelay();
      return res.status(400).json({
        message: 'Invalid request',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { email, password, mfaCode } = parseResult.data;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Find user by email
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    userFound = !!foundUser;
    user = foundUser;

    // Always add jittered delay before responding to prevent timing attacks
    // This ensures the same response time whether user exists or not
    const elapsedTime = Date.now() - startTime;
    const minResponseTime = 200;
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }
    await jitteredDelay();

    // If user not found, return generic error (prevent user enumeration)
    if (!userFound || !user) {
      await logLoginAttempt(email, false, undefined, ipAddress, userAgent, 'User not found');
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      await logLoginAttempt(email, false, user.id, ipAddress, userAgent, 'No password set');
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Verify password FIRST using Argon2id (constant-time comparison)
    // This prevents account enumeration - attackers with wrong passwords
    // get generic errors regardless of email verification or ban status
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      await logLoginAttempt(email, false, user.id, ipAddress, userAgent, 'Invalid password');
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Email verification disabled - users can log in immediately after account creation
    // Uncomment below to re-enable email verification requirement:
    // if (!user.emailVerified) {
    //   await logLoginAttempt(email, false, user.id, ipAddress, userAgent, 'Email not verified');
    //   return res.status(401).json({
    //     message: 'Please verify your email address to log in',
    //   });
    // }

    // AFTER password is verified, check if user is banned
    // It's safe to show specific errors now because the user proved they know the password
    if (user.isBanned) {
      await logLoginAttempt(email, false, user.id, ipAddress, userAgent, 'User banned');
      return res.status(401).json({
        message: 'This account has been disabled. Please contact support.',
      });
    }

    // If MFA is enabled, verify TOTP code
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaCode) {
        return res.status(401).json({
          message: 'MFA code required',
          mfaRequired: true,
        });
      }

      const mfaValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 1, // Allow 1 time step before/after for clock skew
      });

      if (!mfaValid) {
        await logLoginAttempt(email, false, user.id, ipAddress, userAgent, 'Invalid MFA code');
        return res.status(401).json({
          message: 'Invalid MFA code',
        });
      }
    }

    // Generate new access and refresh tokens
    const accessToken = generateAccessToken(user.id, user.email || '');
    const refreshTokenData = generateRefreshToken();

    // Store refresh token in database
    await storeRefreshToken(
      user.id,
      refreshTokenData.hashedToken,
      refreshTokenData.expiresAt,
      userAgent,
      ipAddress
    );

    // Set httpOnly, Secure, SameSite=Strict cookies
    setCookies(res, accessToken, refreshTokenData.token);

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Log successful login
    await logLoginAttempt(email, true, user.id, ipAddress, userAgent, 'Login successful');

    // Return user data (exclude sensitive fields)
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.isAdmin ? 'admin' : 'user',
        subscriptionTier: user.subscriptionTier,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Ensure consistent response time
    await jitteredDelay();
    
    if (user) {
      await logLoginAttempt(
        req.body.email, 
        false, 
        user.id, 
        req.ip, 
        req.headers['user-agent'], 
        'Server error'
      );
    }

    return res.status(500).json({
      message: 'An error occurred during login',
    });
  }
});

// POST /api/auth/refresh - Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'No refresh token provided',
      });
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || 'unknown';

    // Refresh tokens with rotation (invalidate old, issue new)
    const result = await refreshTokensWithRotation(
      refreshToken,
      userAgent,
      ipAddress
    );

    if (!result) {
      clearAuthCookies(res);
      return res.status(401).json({
        message: 'Invalid or expired refresh token',
      });
    }

    // Set new cookies
    setCookies(res, result.accessToken, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuthCookies(res);
    return res.status(500).json({
      message: 'An error occurred during token refresh',
    });
  }
});

// POST /api/auth/logout - Logout user and revoke tokens
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const { hashRefreshToken, revokeRefreshToken } = await import('../lib/auth-tokens');
      const hashedToken = hashRefreshToken(refreshToken);
      await revokeRefreshToken(hashedToken);
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    return res.status(500).json({
      message: 'An error occurred during logout',
    });
  }
});

// GET /api/auth/logout - Logout user and redirect (for direct browser navigation)
router.get('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const { hashRefreshToken, revokeRefreshToken } = await import('../lib/auth-tokens');
      const hashedToken = hashRefreshToken(refreshToken);
      await revokeRefreshToken(hashedToken);
    }

    clearAuthCookies(res);

    // Redirect to home page after logout
    return res.redirect('/');
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    return res.redirect('/');
  }
});

// ========================================
// SESSION MANAGEMENT ENDPOINTS
// ========================================

// GET /api/auth/sessions - Get list of active sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    // Get current refresh token from cookie
    const currentRefreshToken = req.cookies.refreshToken;
    const { hashRefreshToken } = await import('../lib/auth-tokens');
    const currentHashedToken = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null;

    // Fetch all active (non-revoked, non-expired) refresh tokens for the user
    const activeSessions = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revoked, false)
      ));

    // Filter out expired sessions and format response
    const now = new Date();
    const sessions = activeSessions
      .filter(session => session.expiresAt > now)
      .map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        isCurrent: session.token === currentHashedToken,
      }));

    return res.status(200).json({
      sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      message: 'Failed to fetch sessions',
    });
  }
});

// DELETE /api/auth/sessions/:tokenId - Revoke specific session
router.delete('/sessions/:tokenId', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const tokenId = parseInt(req.params.tokenId);

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    if (isNaN(tokenId)) {
      return res.status(400).json({
        message: 'Invalid token ID',
      });
    }

    // Find the session
    const [session] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, tokenId))
      .limit(1);

    if (!session) {
      return res.status(404).json({
        message: 'Session not found',
      });
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        message: 'You can only revoke your own sessions',
      });
    }

    // Revoke the session
    await db
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(eq(refreshTokens.id, tokenId));

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return res.status(500).json({
      message: 'Failed to revoke session',
    });
  }
});

// DELETE /api/auth/sessions - Revoke all sessions except current
router.delete('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    // Get current refresh token from cookie
    const currentRefreshToken = req.cookies.refreshToken;
    
    if (!currentRefreshToken) {
      // No current session, just revoke all
      await revokeAllUserTokens(userId);
    } else {
      // Revoke all tokens except the current one
      const { hashRefreshToken } = await import('../lib/auth-tokens');
      const currentHashedToken = hashRefreshToken(currentRefreshToken);

      // Single optimized query: revoke all user's tokens except the current one
      await db
        .update(refreshTokens)
        .set({
          revoked: true,
          revokedAt: new Date(),
        })
        .where(and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revoked, false),
          ne(refreshTokens.token, currentHashedToken)
        ));
    }

    return res.status(200).json({
      success: true,
      message: 'All other sessions have been revoked',
    });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    return res.status(500).json({
      message: 'Failed to revoke sessions',
    });
  }
});

// ========================================
// MFA/TOTP ENDPOINTS
// ========================================

// POST /api/auth/mfa/setup - Generate TOTP secret and QR code
router.post('/mfa/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Flint (${userEmail})`,
      issuer: 'Flint',
      length: 32,
    });

    // Return secret and QR code data URI
    // Note: We don't save to DB yet - wait for verification
    return res.status(200).json({
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    });
  } catch (error) {
    console.error('Error setting up MFA:', error);
    return res.status(500).json({
      message: 'Failed to set up MFA',
    });
  }
});

// POST /api/auth/mfa/verify-setup - Verify TOTP and enable MFA
router.post('/mfa/verify-setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { secret, code } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    if (!secret || !code) {
      return res.status(400).json({
        message: 'Secret and code are required',
      });
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before/after (60 seconds total)
    });

    if (!verified) {
      return res.status(400).json({
        message: 'Invalid verification code',
      });
    }

    // Save MFA settings to database
    await db
      .update(users)
      .set({
        mfaSecret: secret,
        mfaEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the MFA enablement
    await db.insert(auditLogs).values({
      userId,
      adminEmail: req.user?.email || '',
      action: 'mfa_enabled',
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    console.error('Error verifying MFA setup:', error);
    return res.status(500).json({
      message: 'Failed to verify MFA setup',
    });
  }
});

// DELETE /api/auth/mfa/disable - Disable MFA with password verification
router.delete('/mfa/disable', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    if (!password) {
      return res.status(400).json({
        message: 'Password is required to disable MFA',
      });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'No password set for this account',
      });
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      return res.status(401).json({
        message: 'Invalid password',
      });
    }

    // Disable MFA
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the MFA disablement
    await db.insert(auditLogs).values({
      userId,
      adminEmail: req.user?.email || '',
      action: 'mfa_disabled',
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    return res.status(500).json({
      message: 'Failed to disable MFA',
    });
  }
});

// POST /api/auth/setup-password - Set up password for approved user
router.post('/setup-password', async (req, res) => {
  try {
    const parseResult = setupPasswordSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { token, password } = parseResult.data;

    console.log('[Setup Password] Token verification started:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8) + '...',
    });

    // Find all non-expired, unused password reset tokens and verify against our hash
    const allTokens = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.used, false),
        eq(passwordResetTokens.tokenType, 'password_reset')
      ));

    console.log('[Setup Password] Found unused tokens in DB:', allTokens.length);

    // Find matching token using timing-safe comparison
    let resetToken = null;
    for (const dbToken of allTokens) {
      if (verifyToken(token, dbToken.token)) {
        resetToken = dbToken;
        console.log('[Setup Password] Token match found for user:', dbToken.userId);
        break;
      }
    }

    if (!resetToken) {
      console.log('[Setup Password] No matching token found');
      return res.status(400).json({
        message: 'Invalid or expired token',
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        message: 'Token has expired',
      });
    }

    // Check if token has already been used
    if (resetToken.used) {
      return res.status(400).json({
        message: 'Token has already been used',
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId));

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Hardened password validation (12-128 chars, 3 of 4 classes, common passwords, etc.)
    const validation = validatePassword(password, user.email || undefined);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: validation.errors,
      });
    }

    // Check password history to prevent reuse
    if (user.lastPasswordHashes && user.lastPasswordHashes.length > 0) {
      const isReused = await isPasswordReused(password, user.lastPasswordHashes);
      if (isReused) {
        return res.status(400).json({
          message: 'Password has been used recently. Please choose a different password.',
          errors: ['This password has been used recently'],
        });
      }
    }

    // Hash password using Argon2id
    const passwordHash = await hashPassword(password);

    // Update password history
    const updatedPasswordHistory = updatePasswordHistory(
      passwordHash, 
      user.lastPasswordHashes || [], 
      5
    );

    // Update user password in a transaction
    await db.transaction(async (tx) => {
      // Update user with new password and mark email as verified
      await tx
        .update(users)
        .set({
          passwordHash,
          lastPasswordHashes: updatedPasswordHistory,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({
          used: true,
        })
        .where(eq(passwordResetTokens.id, resetToken.id));
    });

    return res.status(200).json({
      message: 'Password set successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error setting up password:', error);
    return res.status(500).json({
      message: 'Failed to set up password',
    });
  }
});

// POST /api/auth/request-reset - Request password reset
router.post('/request-reset', async (req, res) => {
  try {
    const parseResult = requestResetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Valid email is required',
      });
    }

    const { email } = parseResult.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Check if user has been set up (has a password or has been given a setup token)
    // This prevents unapproved users from requesting resets
    const existingToken = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.tokenType, 'password_reset')
      ))
      .limit(1);
    
    if (!user.passwordHash && existingToken.length === 0) {
      // User hasn't been approved/set up yet
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate password reset token with 30min TTL
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Insert token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      tokenType: 'password_reset',
      expiresAt,
      used: false,
    });

    // Build reset link
    const baseUrl = 'https://www.flint-investing.com';
    const resetLink = `${baseUrl}/setup-password?token=${plainToken}`;

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email || '',
      user.firstName || 'User',
      resetLink
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    return res.status(200).json({
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return res.status(500).json({
      message: 'Failed to process password reset request',
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', rateLimits.auth, async (req, res) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid request',
        errors: parseResult.error.errors.map(e => e.message),
      });
    }

    const { token, password } = parseResult.data;

    // Find token in database
    const tokenHash = hashToken(token);
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, tokenHash),
        eq(passwordResetTokens.tokenType, 'password_reset')
      ))
      .limit(1);

    // Validate token exists
    if (!resetToken) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        message: 'Reset token has expired',
      });
    }

    // Check if token has been used
    if (resetToken.used) {
      return res.status(400).json({
        message: 'Reset token has already been used',
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (!user) {
      return res.status(400).json({
        message: 'User not found',
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, user.email || undefined, user.firstName || undefined);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check password history (prevent reuse of last 5 passwords)
    const lastPasswordHashes = user.lastPasswordHashes || [];
    const isReused = await isPasswordReused(password, lastPasswordHashes);
    
    if (isReused) {
      return res.status(400).json({
        message: 'Password has been used recently. Please choose a different password.',
      });
    }

    // Hash the new password with Argon2id
    const passwordHash = await hashPassword(password);

    // Update password history (keep last 5 passwords)
    const updatedPasswordHistory = updatePasswordHistory(passwordHash, lastPasswordHashes, 5);

    // Update user password and history in database
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash,
          lastPasswordHashes: updatedPasswordHistory,
          emailVerified: true, // Mark email as verified on password reset
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({
          used: true,
        })
        .where(eq(passwordResetTokens.id, resetToken.id));
    });

    // Log the password reset
    await db.insert(auditLogs).values({
      userId: user.id,
      adminEmail: user.email || '',
      action: 'password_reset',
      details: {
        timestamp: new Date().toISOString(),
        method: 'password_reset_token',
      },
    });

    return res.status(200).json({
      message: 'Password has been reset successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({
      message: 'Failed to reset password',
    });
  }
});

// POST /api/auth/resend-setup-email - Resend password setup email
router.post('/resend-setup-email', async (req, res) => {
  try {
    const parseResult = requestResetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Valid email is required',
      });
    }

    const { email } = parseResult.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address.',
      });
    }

    // Check if user already has a password set
    if (user.passwordHash) {
      return res.status(400).json({
        message: 'Your account is already set up. Please use the login page or request a password reset.',
      });
    }

    // Delete any existing unused password reset tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.used, false),
        eq(passwordResetTokens.tokenType, 'password_reset')
      ));

    // Generate new password setup token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      tokenType: 'password_reset',
      expiresAt,
      used: false,
    });

    // Generate password setup link
    const baseUrl = 'https://www.flint-investing.com';
    const passwordSetupLink = `${baseUrl}/setup-password?token=${plainToken}`;

    // Send approval email with password setup link
    await sendApprovalEmail(
      user.email || '',
      user.firstName || 'User',
      passwordSetupLink
    );

    return res.status(200).json({
      success: true,
      message: 'Setup email has been resent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending setup email:', error);
    return res.status(500).json({
      message: 'Failed to resend setup email. Please try again.',
    });
  }
});

// POST /api/auth/resend-verification - Resend email verification link
router.post('/resend-verification', rateLimits.auth, async (req, res) => {
  try {
    const parseResult = requestResetSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Valid email is required',
      });
    }

    const { email } = parseResult.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      // Don't reveal if email exists (security)
      return res.status(200).json({
        message: 'If an account exists with this email, a verification link will be sent.',
      });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Your email is already verified. You can log in now.',
      });
    }

    // Delete any existing unused email verification tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.used, false),
        eq(passwordResetTokens.tokenType, 'email_verification')
      ));

    // Generate new verification token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      tokenType: 'email_verification',
      expiresAt,
      used: false,
    });

    // Generate verification link
    const baseUrl = process.env.REPLIT_DEPLOYMENT 
      ? `https://${process.env.REPLIT_DEPLOYMENT}` 
      : process.env.BASE_URL 
      || (process.env.REPL_SLUG && process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : req.protocol + '://' + req.get('host'));
    const verificationLink = `${baseUrl}/verify-email?token=${plainToken}`;

    // Send verification email
    const { sendVerificationEmail } = await import('../services/email');
    await sendVerificationEmail(
      user.email || '',
      user.firstName || 'User',
      verificationLink
    );

    return res.status(200).json({
      success: true,
      message: 'Verification email has been sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({
      message: 'Failed to send verification email. Please try again.',
    });
  }
});

// GET /api/auth/verify-email - Verify email with token
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({
        message: 'Verification token is required',
      });
    }

    // Find email verification token in database
    const tokenHash = hashToken(token);
    const [verificationToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, tokenHash),
        eq(passwordResetTokens.tokenType, 'email_verification')
      ))
      .limit(1);

    // Validate token exists
    if (!verificationToken) {
      return res.status(400).json({
        message: 'Invalid or expired verification token',
      });
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      return res.status(400).json({
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Check if token has been used
    if (verificationToken.used) {
      return res.status(400).json({
        message: 'Verification token has already been used',
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, verificationToken.userId))
      .limit(1);

    if (!user) {
      return res.status(400).json({
        message: 'User not found',
      });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Your email is already verified. You can log in now.',
        success: true,
        alreadyVerified: true,
      });
    }

    // Update user email verification status in database
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({
          used: true,
        })
        .where(eq(passwordResetTokens.id, verificationToken.id));
    });

    // Log the email verification
    await db.insert(auditLogs).values({
      userId: user.id,
      adminEmail: user.email || '',
      action: 'email_verified',
      details: {
        timestamp: new Date().toISOString(),
        method: 'verification_token',
      },
    });

    return res.status(200).json({
      message: 'Email verified successfully! You can now log in.',
      success: true,
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({
      message: 'Failed to verify email',
    });
  }
});

export default router;
