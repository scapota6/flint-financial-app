/**
 * Connections Hub - Unified endpoint for managing SnapTrade and Teller connections
 */

import { Router } from "express";
import { authApi, accountsApi, snaptradeClient } from "../lib/snaptrade";
import { requireAuth } from "../middleware/jwt-auth";
import { storage } from "../storage";
import { logger } from "@shared/logger";
import crypto from "crypto";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/connections
 * Returns all connected accounts for the authenticated user
 */
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get all connected accounts from database
    const accounts = await storage.getConnectedAccounts(userId);
    
    // Format response with required fields
    const connections = accounts.map(account => ({
      id: account.id,
      provider: account.provider, // 'snaptrade' or 'teller'
      type: account.accountType, // 'brokerage', 'bank', or 'card'
      label: account.accountName,
      institutionName: account.institutionName,
      status: account.isActive ? 'connected' : 'disconnected',
      balance: account.balance,
      currency: account.currency,
      lastSynced: account.lastSynced,
    }));
    
    logger.info("Connections retrieved", { 
      userId, 
      metadata: { count: connections.length }
    });
    
    res.json(connections);
  } catch (error) {
    logger.error("Error fetching connections", { error: error as Error });
    res.status(500).json({ 
      message: "Failed to fetch connections",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/connections/snaptrade/register
 * Registers a user with SnapTrade and returns the redirect URL
 * This is the ONLY registration endpoint - all others are disabled
 */
router.post("/snaptrade/register", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info("SnapTrade registration started", { userId });
    
    // Step 1: Check if user exists in snaptrade_users table
    const { db } = await import('../db');
    const { snaptradeUsers } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [existingUser] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, userId))
      .limit(1);
    
    let userSecret: string;
    let snaptradeUserId: string;
    
    if (!existingUser) {
      // Step 2: Register new user with SnapTrade using Flint user ID
      logger.info("Registering new SnapTrade user", { userId });
      
      const { data: registerData } = await authApi.registerSnapTradeUser({
        userId: userId,
      });
      
      userSecret = registerData.userSecret!;
      snaptradeUserId = userId; // Initially use Flint user ID
      
      // Step 3: Save userSecret to snaptrade_users table
      await db
        .insert(snaptradeUsers)
        .values({
          flintUserId: userId,
          snaptradeUserId: snaptradeUserId,
          userSecret: userSecret,
        });
      
      logger.info("SnapTrade user registered and saved to database", { userId });
    } else {
      userSecret = existingUser.userSecret;
      snaptradeUserId = existingUser.snaptradeUserId;
      logger.info("Using existing SnapTrade user", { userId });
    }
    
    // Step 4: Call loginSnapTradeUser with dynamic redirect URL
    const redirectUrl = `${req.protocol}://${req.get('host')}/snaptrade/callback`;
    
    logger.info("Generating SnapTrade portal URL", { userId, metadata: { redirectUrl } });
    
    const { data: loginData } = await authApi.loginSnapTradeUser({
      userId: snaptradeUserId, // Use the actual SnapTrade user ID (original or versioned)
      userSecret: userSecret,
      immediateRedirect: true,
      customRedirect: redirectUrl,
      connectionType: "trade",
    });
    
    // Step 5: Return the portal URL
    const portalUrl = (loginData as any).redirectURI;
    
    logger.info("SnapTrade portal URL generated", { userId, metadata: { hasPortalUrl: !!portalUrl } });
    
    res.json({ 
      redirectUrl: portalUrl,
      message: "Redirect user to SnapTrade connection portal"
    });
    
  } catch (error: any) {
    const userId = req.user?.claims?.sub;
    
    // Comprehensive error logging to debug SDK error structure
    logger.error("SnapTrade registration error - full diagnostic", { 
      userId,
      metadata: {
        errorMessage: error.message,
        errorResponseData: error.response?.data,
        errorResponseStatus: error.response?.status,
        errorBody: error.body,
        errorResponseBody: error.responseBody,
        errorData: error.data,
        errorKeys: Object.keys(error),
        errorToJSON: error.toJSON ? error.toJSON() : null,
      }
    });
    
    // Check for error 1010 - user already exists on SnapTrade
    // The SnapTrade SDK may wrap errors differently, so check all possible locations
    let errorDetail = '';
    let errorCode = '';
    
    // Try to extract error details from various possible locations
    if (error.response?.data) {
      errorDetail = error.response.data.detail || error.response.data.message || '';
      errorCode = error.response.data.code || error.response.data.status_code || '';
    } else if (error.body) {
      // Some SDKs put response in error.body
      try {
        const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        errorDetail = body.detail || body.message || '';
        errorCode = body.code || body.status_code || '';
      } catch (e) {
        // If JSON parse fails, treat as string
        errorDetail = String(error.body);
      }
    } else if (error.data) {
      // Or in error.data
      try {
        const data = typeof error.data === 'string' ? JSON.parse(error.data) : error.data;
        errorDetail = data.detail || data.message || '';
        errorCode = data.code || data.status_code || '';
      } catch (e) {
        // If JSON parse fails, treat as string
        errorDetail = String(error.data);
      }
    }
    
    // Also check if the error message contains the detail directly
    const errorMessage = error.message || '';
    
    // Check for error 1010 in multiple ways
    const isUserAlreadyExists = 
      errorCode === '1010' || 
      String(errorCode) === '1010' || 
      errorDetail.toLowerCase().includes('already exist') ||
      errorMessage.toLowerCase().includes('already exist');
    
    if (isUserAlreadyExists && userId) {
      // Auto-recovery: Log orphaned account and try with new ID
      logger.warn("SnapTrade user already exists - attempting auto-recovery", { userId });
      
      try {
        const { db } = await import('../db');
        const { orphanedSnaptradeAccounts, users } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        // Get user email for logging
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const userEmail = user?.email || 'unknown';
        
        // Check if we already logged this orphan
        const [existingOrphan] = await db
          .select()
          .from(orphanedSnaptradeAccounts)
          .where(eq(orphanedSnaptradeAccounts.flintUserId, userId))
          .limit(1);
        
        // Generate new ID with version suffix
        let newId = userId;
        let attempt = 2;
        
        if (existingOrphan?.newSnaptradeId) {
          // Extract version number and increment
          const match = existingOrphan.newSnaptradeId.match(/-v(\d+)$/);
          attempt = match ? parseInt(match[1]) + 1 : 2;
        }
        
        newId = `${userId}-v${attempt}`;
        
        // Log the orphaned account
        if (!existingOrphan) {
          await db.insert(orphanedSnaptradeAccounts).values({
            flintUserId: userId,
            orphanedSnaptradeId: userId,
            newSnaptradeId: newId,
            userEmail,
            errorCode: '1010',
            errorMessage: errorDetail,
          });
        } else {
          // Update existing orphan record with new recovery attempt
          await db
            .update(orphanedSnaptradeAccounts)
            .set({ newSnaptradeId: newId })
            .where(eq(orphanedSnaptradeAccounts.id, existingOrphan.id));
        }
        
        logger.info("Attempting SnapTrade registration with recovery ID", { userId, metadata: { newId } });
        
        // Try registering with new ID
        const { data: registerData } = await authApi.registerSnapTradeUser({
          userId: newId,
        });
        
        const userSecret = registerData.userSecret!;
        
        // Save to database with recovery ID
        const { snaptradeUsers } = await import('@shared/schema');
        await db.insert(snaptradeUsers).values({
          flintUserId: userId,
          snaptradeUserId: newId, // Store the versioned ID
          userSecret: userSecret,
        });
        
        // Generate login URL with recovery ID
        const redirectUrl = `${req.protocol}://${req.get('host')}/snaptrade/callback`;
        const { data: loginData } = await authApi.loginSnapTradeUser({
          userId: newId,
          userSecret: userSecret,
          immediateRedirect: true,
          customRedirect: redirectUrl,
          connectionType: "trade",
        });
        
        const portalUrl = (loginData as any).redirectURI;
        
        logger.info("Auto-recovery successful", { userId, metadata: { newId, hasPortalUrl: !!portalUrl } });
        
        return res.json({ 
          redirectUrl: portalUrl,
          message: "Redirect user to SnapTrade connection portal",
          recovered: true
        });
        
      } catch (recoveryError: any) {
        logger.error("Auto-recovery failed", { 
          userId, 
          error: recoveryError.response?.data || recoveryError.message 
        });
        
        // Fall through to original error handling
      }
    }
    
    // Handle SnapTrade API specific errors with user-friendly messages
    let statusCode = 500;
    let userMessage = "Unable to connect to brokerage service";
    let errorDetails = error.response?.data?.detail || error.message;
    
    // Check for SnapTrade API errors (various formats)
    const isSnapTradeApiError = 
      error.response?.status === 400 || 
      error.response?.status === 401 ||
      error.message?.includes('status code 400') ||
      error.message?.includes('status code 401');
    
    // SnapTrade API error - provide helpful message
    if (isSnapTradeApiError) {
      statusCode = 503; // Service Unavailable - external API issue
      userMessage = "Brokerage connection service is temporarily unavailable. This is a known issue with our provider. Please try again later or contact support.";
    } else if (error.message?.includes('credentials') || error.message?.includes('authentication')) {
      statusCode = 503;
      userMessage = "Brokerage service authentication error. Our team has been notified. Please try again later.";
    }
    
    res.status(statusCode).json({ 
      message: userMessage,
      technicalDetails: errorDetails,
      suggestion: "If this issue persists, please contact support@flint-investing.com"
    });
  }
});

/**
 * GET /api/connections/snaptrade/callback
 * Handles the OAuth callback from SnapTrade
 * NOTE: This route is not currently used. The active callback is /snaptrade/callback in routes.ts
 * which receives userId/userSecret from SnapTrade in the query params
 */
router.get("/snaptrade/callback", async (req: any, res) => {
  // This route is legacy - redirect to main callback
  return res.redirect("/snaptrade/callback?" + new URLSearchParams(req.query).toString());
});

/**
 * POST /api/connections/teller/exchange
 * Exchanges Teller enrollment ID for access token
 */
router.post("/teller/exchange", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { enrollmentId } = req.body;
    
    if (!enrollmentId) {
      return res.status(400).json({ 
        message: "Enrollment ID required" 
      });
    }
    
    // Exchange enrollment ID for access token
    const response = await fetch("https://api.teller.io/accounts/", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(enrollmentId + ":").toString("base64")}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Teller API error: ${response.status}`);
    }
    
    const accounts = await response.json();
    
    // Store connected accounts in database
    for (const account of accounts) {
      await storage.createConnectedAccount({
        userId,
        accountType: account.type === 'depository' ? 'bank' : 'card',
        provider: 'teller',
        institutionName: account.institution?.name || 'Unknown Bank',
        accountName: account.name,
        accountNumber: account.last_four,
        balance: String(account.balance?.available || 0),
        currency: account.currency || 'USD',
        isActive: true,
        externalAccountId: account.id,
        connectionId: account.enrollment_id,
        institutionId: account.institution?.id,
        accessToken: enrollmentId, // Store enrollment ID as token
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    logger.info("Teller accounts connected", { 
      userId, 
      metadata: { count: accounts.length }
    });
    
    res.json({ 
      success: true,
      accounts: accounts.length,
      message: "Bank accounts connected successfully"
    });
    
  } catch (error: any) {
    logger.error("Teller exchange error", { error: error.message });
    res.status(500).json({ 
      message: "Failed to connect bank accounts",
      error: error.message
    });
  }
});

/**
 * DELETE /api/connections/:id
 * Removes a connection
 */
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const connectionId = parseInt(req.params.id);
    
    // Get the account to verify ownership
    const account = await storage.getConnectedAccount(connectionId);
    
    if (!account || account.userId !== userId) {
      return res.status(404).json({ 
        message: "Connection not found" 
      });
    }
    
    // Delete the connection
    await storage.deleteConnectedAccount(userId, account.provider, String(account.id));
    
    logger.info("Connection deleted", { 
      userId, 
      metadata: { connectionId, provider: account.provider }
    });
    
    res.json({ 
      success: true,
      message: "Connection removed successfully"
    });
    
  } catch (error) {
    logger.error("Error deleting connection", { error: error as Error });
    res.status(500).json({ 
      message: "Failed to delete connection" 
    });
  }
});

export default router;