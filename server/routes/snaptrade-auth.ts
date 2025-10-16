/**
 * SnapTrade Authentication endpoints for admin/support operations
 * Handles user management operations like listing, deleting, and resetting user secrets
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { requireAuth } from '../middleware/jwt-auth';
import { requireAdmin } from '../middleware/admin';
import { authApi } from '../lib/snaptrade';
import { extractSnapTradeRequestId, createApiError } from '../lib/validation';
import type { ErrorResponse } from '@shared/types';

const router = Router();

/**
 * GET /api/snaptrade/admin/users
 * List all SnapTrade users (Admin operation)
 */
router.get('/admin/users', requireAuth, requireAdmin(), async (req: any, res) => {
  try {
    console.log('[SnapTrade Auth] Listing all SnapTrade users (admin operation)');
    
    // List all SnapTrade users
    const response = await authApi.listSnapTradeUsers();
    
    const requestId = extractSnapTradeRequestId(response);
    console.log('[SnapTrade Auth] Listed SnapTrade users:', {
      count: response.data?.length || 0,
      requestId
    });
    
    // Transform to normalized DTO format
    const users = (response.data || []).map((user: any) => ({
      userId: user.userId || null,
      userSecret: user.userSecret ? '[REDACTED]' : null,
      createdDate: user.createdDate || null,
      lastSync: user.lastSync || null,
      status: user.status || 'active'
    }));
    
    res.json({
      users,
      metadata: {
        totalCount: users.length,
        fetchedAt: new Date().toISOString(),
        requestId
      }
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Auth] Error listing users:', {
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to list SnapTrade users',
      error.response?.data?.code || 'LIST_USERS_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * DELETE /api/snaptrade/admin/users/:userId
 * Delete a SnapTrade user (Danger operation)
 */
router.delete('/admin/users/:userId', requireAuth, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;
    
    console.log('[SnapTrade Auth] Deleting SnapTrade user (danger operation):', { userId });
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          requestId: null
        }
      });
    }
    
    // Delete the SnapTrade user
    const response = await authApi.deleteSnapTradeUser({ userId });
    
    const requestId = extractSnapTradeRequestId(response);
    console.log('[SnapTrade Auth] Deleted SnapTrade user:', {
      userId,
      requestId
    });
    
    res.json({
      success: true,
      message: `User ${userId} deleted successfully`,
      requestId
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Auth] Error deleting user:', {
      userId: req.params.userId,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to delete SnapTrade user',
      error.response?.data?.code || 'DELETE_USER_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

/**
 * POST /api/snaptrade/admin/users/:userId/reset-secret
 * Reset a SnapTrade user's secret (Fix broken user)
 */
router.post('/admin/users/:userId/reset-secret', requireAuth, requireAdmin(), async (req: any, res) => {
  try {
    const { userId } = req.params;
    
    console.log('[SnapTrade Auth] Resetting SnapTrade user secret:', { userId });
    
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          requestId: null
        }
      });
    }
    
    // Reset the user's secret
    const response = await authApi.resetSnapTradeUserSecret({
      userId,
      userSecret: req.body.userSecret || undefined
    });
    
    const requestId = extractSnapTradeRequestId(response);
    console.log('[SnapTrade Auth] Reset user secret:', {
      userId,
      newSecret: response.data?.userSecret ? '[REDACTED]' : null,
      requestId
    });
    
    res.json({
      success: true,
      userId: response.data?.userId || userId,
      userSecret: response.data?.userSecret || null,
      message: 'User secret reset successfully',
      requestId
    });
    
  } catch (error: any) {
    const requestId = extractSnapTradeRequestId(error.response);
    
    console.error('[SnapTrade Auth] Error resetting user secret:', {
      userId: req.params.userId,
      responseData: error.response?.data,
      status: error.response?.status,
      message: error.message,
      snaptradeRequestId: requestId
    });
    
    const status = error.response?.status || 500;
    const apiError = createApiError(
      error.message || 'Failed to reset user secret',
      error.response?.data?.code || 'RESET_SECRET_ERROR',
      status,
      requestId
    );
    
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId: apiError.requestId || null
      }
    };
    
    res.status(status).json(errorResponse);
  }
});

export default router;