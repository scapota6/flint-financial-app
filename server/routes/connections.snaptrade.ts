/**
 * ⚠️ DO NOT CHANGE THIS CONNECT FLOW unless the product owner says "bubble gum".
 * Post-connect work = only display/data mapping. No flow/endpoint changes.
 */

import { Router } from 'express';
import { registerUser, createLoginUrl } from '../lib/snaptrade';
import { getSnapUser, saveSnapUser } from '../store/snapUsers';

const r = Router();

// Runtime guard to warn in dev if someone edits these files without the "bubble gum" env flag
// Disabled in development to prevent breaking flows
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_CONNECT_EDITS) {
  console.warn('Connect flows are locked. Say "bubble gum" to change them.');
}

/** POST /api/connections/snaptrade/register { userId: string } */
r.post('/connections/snaptrade/register', async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId required' });

    // If first time: register → store provider-returned userSecret
    let rec = await getSnapUser(userId);
    if (!rec) {
      try {
        const created = await registerUser(userId); // version-safe wrapper
        if (!created?.data?.userSecret) throw new Error('SnapTrade did not return userSecret');
        rec = { userId: created.data.userId as string, userSecret: created.data.userSecret as string };
        await saveSnapUser({ ...rec, flintUserId: userId }); // Pass both Flint user ID and SnapTrade user ID
        console.log('[SnapTrade] Registered & stored userSecret len:', rec.userSecret.length, 'userId:', rec.userId);
      } catch (registerError: any) {
        // Handle "User already exists" error - delete and recreate
        if (registerError?.responseBody?.code === '1010') {
          console.log('[SnapTrade] User already exists (orphaned account), deleting and recreating...');
          try {
            // Import delete function
            const { deleteSnapTradeUser } = await import('../lib/snaptrade');
            
            // Delete the existing user from SnapTrade
            await deleteSnapTradeUser(userId);
            console.log('[SnapTrade] Successfully deleted orphaned user:', userId);
            
            // Retry registration
            const created = await registerUser(userId);
            if (!created?.data?.userSecret) throw new Error('SnapTrade did not return userSecret after recreation');
            rec = { userId: created.data.userId as string, userSecret: created.data.userSecret as string };
            await saveSnapUser({ ...rec, flintUserId: userId }); // Pass both Flint user ID and SnapTrade user ID
            console.log('[SnapTrade] Successfully recreated user with userSecret len:', rec.userSecret.length);
          } catch (deleteError: any) {
            console.error('[SnapTrade] Failed to delete and recreate user:', deleteError?.message || deleteError);
            throw new Error(`Failed to recover from orphaned account: ${deleteError?.message || 'Unknown error'}`);
          }
        } else {
          throw registerError;
        }
      }
    } else {
      console.log('[SnapTrade] Using stored userSecret len:', rec.userSecret.length, 'userId:', rec.userId);
    }

    // Create Connection Portal URL (expires ~5 min)
    const url = await createLoginUrl({
      userId: rec.userId,
      userSecret: rec.userSecret,
      redirect: process.env.SNAPTRADE_REDIRECT_URI!,
    });
    if (!url) throw new Error('No Connection Portal URL returned');

    return res.status(200).json({ connect: { url } });
  } catch (e: any) {
    // Get userId for logging (may not exist if early validation failed)
    const requestUserId = String(req.body?.userId || 'unknown').trim();
    
    // Enhanced error logging for production diagnostics
    const errorDetails = {
      userId: requestUserId,
      message: e?.message,
      responseBody: e?.responseBody,
      responseStatus: e?.response?.status,
      responseData: e?.response?.data,
      code: e?.responseBody?.code || e?.code,
      statusCode: e?.status || e?.statusCode,
      headers: e?.response?.headers
    };
    
    console.error('[SnapTrade Registration] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Extract error information
    const errorCode = errorDetails.code || errorDetails.responseBody?.code;
    const statusCode = errorDetails.responseStatus || errorDetails.statusCode;
    const errorMessage = errorDetails.responseBody?.message || errorDetails.responseData?.detail || e?.message;
    
    // Classify error types for better user messaging
    // 1. Rate limiting (429 or rate limit message)
    if (statusCode === 429 || errorMessage?.toLowerCase().includes('rate limit')) {
      console.error('[SnapTrade Registration] Rate limit hit');
      return res.status(429).json({ 
        message: 'Too many connection attempts. Please wait a moment and try again.',
        error: 'Rate limit exceeded',
        retryAfter: 60 // seconds
      });
    }
    
    // 2. Authentication/Authorization errors (401, 403, or auth-related codes)
    if (statusCode === 401 || statusCode === 403 || errorMessage?.toLowerCase().includes('unauthorized') || errorMessage?.toLowerCase().includes('forbidden')) {
      console.error('[SnapTrade Registration] Authentication error - check API credentials');
      return res.status(503).json({ 
        message: 'Brokerage connection service is temporarily unavailable. Our team has been notified.',
        error: 'Service authentication error'
      });
    }
    
    // 3. Orphaned account cleanup failure
    if (e?.message?.includes('orphaned account') || e?.message?.includes('Failed to recover')) {
      console.error('[SnapTrade Registration] Orphaned account cleanup failed');
      return res.status(503).json({ 
        message: 'An account conflict was detected. Please try again in a few minutes or contact support if this persists.',
        error: 'Orphaned account cleanup failed',
        suggestion: 'Wait 5 minutes and try reconnecting'
      });
    }
    
    // 4. Service unavailable / timeout
    if (statusCode === 503 || statusCode === 504 || errorMessage?.toLowerCase().includes('timeout')) {
      console.error('[SnapTrade Registration] Service unavailable or timeout');
      return res.status(503).json({ 
        message: 'Brokerage connection service is temporarily unavailable. Please try again in a few minutes.',
        error: 'Service timeout'
      });
    }
    
    // 5. Generic error with full diagnostic info
    console.error('[SnapTrade Registration] Unhandled error type:', {
      userId: requestUserId,
      errorCode,
      statusCode,
      errorMessage
    });
    
    return res.status(500).json({ 
      message: 'Unable to connect to brokerage service. Please try again or contact support if this persists.',
      error: errorMessage || 'Unknown error',
      suggestion: 'If this issue continues, please contact support@flint-investing.com'
    });
  }
});

export default r;