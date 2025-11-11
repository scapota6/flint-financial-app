import { Router } from 'express';
import { db } from '../db';
import { users, snaptradeUsers, snaptradeConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { WebhookEvent, WebhookAck, WebhookType, ISODate, UUID } from '@shared/types';

const router = Router();

// Helper function to find Flint user by SnapTrade user ID
async function getFlintUserBySnapTradeId(snaptradeUserId: string): Promise<string | null> {
  try {
    const snaptradeUser = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.snaptradeUserId, snaptradeUserId))
      .limit(1);
    
    if (snaptradeUser.length > 0) {
      return snaptradeUser[0].flintUserId;
    }
    
    console.warn('[SnapTrade Webhook] Flint user not found for SnapTrade user:', snaptradeUserId);
    return null;
  } catch (error) {
    console.error('[SnapTrade Webhook] Error finding Flint user:', error);
    return null;
  }
}

// Helper function to map SnapTrade webhook types to our normalized types
function mapWebhookType(snaptradeType: string): WebhookType | null {
  const typeMap: Record<string, WebhookType> = {
    // Official SnapTrade event names (from official docs at https://docs.snaptrade.com/docs/webhooks)
    'USER_REGISTERED': 'connection.attempted', // User registration
    'USER_DELETED': 'connection.deleted', // User deletion
    'CONNECTION_ATTEMPTED': 'connection.attempted',
    'CONNECTION_ADDED': 'connection.added', // Official name
    'CONNECTION_DELETED': 'connection.deleted', // Official name
    'CONNECTION_BROKEN': 'connection.broken', // Official name
    'CONNECTION_FIXED': 'connection.fixed', // Official name
    'CONNECTION_UPDATED': 'connection.updated', // Official name
    'CONNECTION_FAILED': 'connection.attempted', // Failed attempt
    'NEW_ACCOUNT_AVAILABLE': 'connection.added', // New account detected (official name)
    'ACCOUNT_HOLDINGS_UPDATED': 'connection.updated', // Holdings sync completed (critical for cache invalidation)
    'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE': 'connection.updated',
    'ACCOUNT_TRANSACTIONS_UPDATED': 'connection.updated',
    'ACCOUNT_REMOVED': 'connection.deleted',
    'TRADES_PLACED': 'connection.updated', // New trades detected
    // Possible alternate names (for compatibility)
    'BROKERAGE_CONNECTION_CREATED': 'connection.added',
    'BROKERAGE_CONNECTION_DELETED': 'connection.deleted',
    'BROKERAGE_CONNECTION_DISABLED': 'connection.broken',
    'BROKERAGE_CONNECTION_ENABLED': 'connection.fixed',
    'BROKERAGE_CONNECTION_UPDATED': 'connection.updated',
    'BROKERAGE_CONNECTION_FAILED': 'connection.attempted',
    'ACCOUNT_CREATED': 'connection.added',
    // Legacy names
    'CONNECTION_ESTABLISHED': 'connection.added',
    'BROKERAGE_AUTHORIZATION_BROKEN': 'connection.broken',
    'BROKERAGE_AUTHORIZATION_REPAIRED': 'connection.fixed',
    'BROKERAGE_AUTHORIZATION_CREATED': 'connection.added',
    // Lowercase variants
    'attempted': 'connection.attempted',
    'added': 'connection.added',
    'updated': 'connection.updated',
    'deleted': 'connection.deleted',
    'broken': 'connection.broken',
    'fixed': 'connection.fixed',
    'connection.attempted': 'connection.attempted',
    'connection.added': 'connection.added',
    'connection.updated': 'connection.updated',
    'connection.deleted': 'connection.deleted',
    'connection.broken': 'connection.broken',
    'connection.fixed': 'connection.fixed'
  };
  
  return typeMap[snaptradeType] || null;
}

/**
 * POST /api/snaptrade/webhooks
 * Handle SnapTrade webhook events with normalized response format
 */
router.post('/webhooks', async (req, res) => {
  try {
    const rawEvent = req.body;
    
    console.log('[SnapTrade Webhook] Received webhook:', {
      headers: req.headers,
      body: rawEvent
    });
    
    // Validate webhook signature if provided
    if (req.headers['x-snaptrade-signature']) {
      // TODO: Implement webhook signature validation
      // For now, we'll accept all webhooks in development
      console.log('[SnapTrade Webhook] Signature validation skipped in development');
    }
    
    // Map SnapTrade webhook type to our normalized type
    const webhookType = mapWebhookType(rawEvent.type || rawEvent.event_type);
    if (!webhookType) {
      console.warn('[SnapTrade Webhook] Unknown webhook type:', rawEvent.type || rawEvent.event_type);
      const ack: WebhookAck = { ok: true };
      return res.json(ack);
    }
    
    // Find the Flint user ID from SnapTrade user ID
    const flintUserId = await getFlintUserBySnapTradeId(rawEvent.user_id || rawEvent.userId);
    if (!flintUserId) {
      console.warn('[SnapTrade Webhook] Flint user not found for SnapTrade user:', rawEvent.user_id || rawEvent.userId);
      const ack: WebhookAck = { ok: true };
      return res.json(ack);
    }
    
    // Create normalized webhook event
    const webhookEvent: WebhookEvent = {
      id: rawEvent.id || `webhook_${Date.now()}`,
      type: webhookType,
      createdAt: rawEvent.created_at || rawEvent.createdAt || new Date().toISOString(),
      userId: flintUserId,
      authorizationId: rawEvent.brokerage_authorization_id || rawEvent.authorizationId || null,
      details: {
        snaptradeUserId: rawEvent.user_id || rawEvent.userId,
        institutionName: rawEvent.institution_name || rawEvent.institutionName,
        accountId: rawEvent.account_id || rawEvent.accountId,
        errorMessage: rawEvent.error_message || rawEvent.errorMessage,
        raw: rawEvent
      }
    };
    
    console.log('[SnapTrade Webhook] Normalized webhook event:', {
      id: webhookEvent.id,
      type: webhookEvent.type,
      userId: webhookEvent.userId,
      authorizationId: webhookEvent.authorizationId
    });
    
    // Handle specific webhook types
    switch (webhookEvent.type) {
      case 'connection.broken':
        console.log('[SnapTrade Webhook] Connection broken - marking authorization as disabled');
        if (webhookEvent.authorizationId) {
          await db
            .update(snaptradeConnections)
            .set({
              disabled: true,
              updatedAt: new Date()
            })
            .where(eq(snaptradeConnections.brokerageAuthorizationId, webhookEvent.authorizationId));
          
          console.log('[SnapTrade Webhook] Authorization disabled:', webhookEvent.authorizationId);
        }
        break;
        
      case 'connection.fixed':
        console.log('[SnapTrade Webhook] Connection fixed - marking authorization as enabled');
        if (webhookEvent.authorizationId) {
          await db
            .update(snaptradeConnections)
            .set({
              disabled: false,
              updatedAt: new Date()
            })
            .where(eq(snaptradeConnections.brokerageAuthorizationId, webhookEvent.authorizationId));
          
          console.log('[SnapTrade Webhook] Authorization enabled:', webhookEvent.authorizationId);
        }
        break;
        
      case 'connection.deleted':
        console.log('[SnapTrade Webhook] Connection deleted - removing authorization');
        if (webhookEvent.authorizationId) {
          await db
            .delete(snaptradeConnections)
            .where(eq(snaptradeConnections.brokerageAuthorizationId, webhookEvent.authorizationId));
          
          console.log('[SnapTrade Webhook] Authorization removed:', webhookEvent.authorizationId);
        }
        break;
        
      case 'connection.added':
        console.log('[SnapTrade Webhook] Connection added - marking authorization as active');
        if (webhookEvent.authorizationId) {
          await db
            .update(snaptradeConnections)
            .set({
              disabled: false,
              updatedAt: new Date()
            })
            .where(eq(snaptradeConnections.brokerageAuthorizationId, webhookEvent.authorizationId));
          
          console.log('[SnapTrade Webhook] Authorization activated:', webhookEvent.authorizationId);
        }
        break;
        
      case 'connection.updated':
        console.log('[SnapTrade Webhook] Connection updated - refreshing sync timestamp');
        if (webhookEvent.authorizationId) {
          await db
            .update(snaptradeConnections)
            .set({
              lastSyncAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(snaptradeConnections.brokerageAuthorizationId, webhookEvent.authorizationId));
          
          console.log('[SnapTrade Webhook] Authorization refreshed:', webhookEvent.authorizationId);
        }
        break;
        
      default:
        console.log('[SnapTrade Webhook] Handling webhook type:', webhookEvent.type);
    }
    
    // TODO: Store webhook event in database for audit trail
    // TODO: Emit real-time event to frontend via WebSocket
    
    // Acknowledge webhook with exact interface
    const ack: WebhookAck = { ok: true };
    res.json(ack);
    
  } catch (error: any) {
    console.error('[SnapTrade Webhook] Error processing webhook:', error);
    
    // Always acknowledge webhooks to prevent retries
    const ack: WebhookAck = { ok: true };
    res.json(ack);
  }
});

/**
 * Handle SnapTrade webhook events - exported for direct use
 */
export async function handleSnapTradeWebhook(req: any, res: any) {
  const rawEvent = req.body;
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  
  // Extract event type - official SnapTrade docs use 'eventType' (camelCase)
  const eventType = rawEvent.eventType || rawEvent.type || rawEvent.event_type;
  
  console.log(`[SnapTrade Webhook ${requestId}] Received webhook:`, {
    eventType,
    userId: rawEvent.userId || rawEvent.user_id,
    authorizationId: rawEvent.brokerageAuthorizationId || rawEvent.brokerage_authorization_id
  });
  
  // Verify webhook secret - check both header and body for compatibility
  const webhookSecretHeader = req.headers['x-snaptrade-secret'] as string;
  const webhookSecretBody = rawEvent.webhookSecret;
  const webhookSecret = webhookSecretHeader || webhookSecretBody;
  const expectedSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    console.error(`[SnapTrade Webhook ${requestId}] SNAPTRADE_WEBHOOK_SECRET not configured`);
    // Always return 200 to prevent retries
    return res.status(200).json({ ok: true, error: 'Configuration error' });
  }
  
  if (webhookSecret !== expectedSecret) {
    console.error(`[SnapTrade Webhook ${requestId}] Invalid webhook secret - header: ${webhookSecretHeader?.substring(0, 5)}, body: ${webhookSecretBody?.substring(0, 5)}`);
    // Always return 200 to prevent retries, even for auth failures
    return res.status(200).json({ ok: true, error: 'Invalid secret' });
  }
  
  console.log(`[SnapTrade Webhook ${requestId}] Secret verified successfully (source: ${webhookSecretHeader ? 'header' : 'body'})`);
  
  // Map SnapTrade webhook type to our normalized type
  const webhookType = mapWebhookType(eventType);
  if (!webhookType) {
    console.warn(`[SnapTrade Webhook ${requestId}] Unknown webhook type:`, eventType);
    // Still acknowledge the webhook to prevent retries
    const ack: WebhookAck = { ok: true };
    return res.json(ack);
  }
  
  console.log(`[SnapTrade Webhook ${requestId}] Mapped event: ${eventType} → ${webhookType}`);
  
  // Find the Flint user ID from SnapTrade user ID (official field name is 'userId')
  const snaptradeUserId = rawEvent.userId || rawEvent.user_id;
  const flintUserId = await getFlintUserBySnapTradeId(snaptradeUserId);
  if (!flintUserId) {
    console.warn(`[SnapTrade Webhook ${requestId}] Flint user not found for SnapTrade user:`, snaptradeUserId);
    // Still acknowledge the webhook
    const ack: WebhookAck = { ok: true };
    return res.json(ack);
  }
  
  // Extract authorization ID (official field name is 'brokerageAuthorizationId')
  const authorizationId = rawEvent.brokerageAuthorizationId || rawEvent.brokerage_authorization_id || null;
  
  console.log(`[SnapTrade Webhook ${requestId}] Processing for user: ${flintUserId}, authorization: ${authorizationId}`);
  
  // Handle specific webhook types
  switch (webhookType) {
    case 'connection.broken':
      console.log(`[SnapTrade Webhook ${requestId}] Connection broken - marking authorization as disabled`);
      if (authorizationId) {
        await db
          .update(snaptradeConnections)
          .set({
            disabled: true,
            updatedAt: new Date()
          })
          .where(eq(snaptradeConnections.brokerageAuthorizationId, authorizationId));
        
        console.log(`[SnapTrade Webhook ${requestId}] Authorization disabled:`, authorizationId);
      }
      break;
      
    case 'connection.fixed':
      console.log(`[SnapTrade Webhook ${requestId}] Connection fixed - marking authorization as enabled`);
      if (authorizationId) {
        await db
          .update(snaptradeConnections)
          .set({
            disabled: false,
            updatedAt: new Date()
          })
          .where(eq(snaptradeConnections.brokerageAuthorizationId, authorizationId));
        
        console.log(`[SnapTrade Webhook ${requestId}] Authorization enabled:`, authorizationId);
      }
      break;
      
    case 'connection.deleted':
      console.log(`[SnapTrade Webhook ${requestId}] Connection deleted - removing authorization`);
      if (authorizationId) {
        await db
          .delete(snaptradeConnections)
          .where(eq(snaptradeConnections.brokerageAuthorizationId, authorizationId));
        
        console.log(`[SnapTrade Webhook ${requestId}] Authorization removed:`, authorizationId);
      }
      break;
      
    case 'connection.added':
      console.log(`[SnapTrade Webhook ${requestId}] Connection added - marking authorization as active`);
      if (authorizationId) {
        await db
          .update(snaptradeConnections)
          .set({
            disabled: false,
            updatedAt: new Date()
          })
          .where(eq(snaptradeConnections.brokerageAuthorizationId, authorizationId));
        
        console.log(`[SnapTrade Webhook ${requestId}] Authorization activated:`, authorizationId);
      }
      break;
      
    case 'connection.updated':
      console.log(`[SnapTrade Webhook ${requestId}] Connection updated/holdings synced - refreshing sync timestamp`);
      if (authorizationId) {
        await db
          .update(snaptradeConnections)
          .set({
            lastSyncAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(snaptradeConnections.brokerageAuthorizationId, authorizationId));
        
        console.log(`[SnapTrade Webhook ${requestId}] Authorization refreshed:`, authorizationId);
      }
      break;
      
    default:
      console.log(`[SnapTrade Webhook ${requestId}] Unhandled webhook type: ${webhookType} (eventType: ${eventType})`);
  }
  
  // TODO: Store webhook event in database for audit trail
  // TODO: Emit real-time event to frontend via WebSocket
  
  // Acknowledge webhook with exact interface
  const ack: WebhookAck = { ok: true };
  res.json(ack);
}

export { router as snaptradeWebhooksRouter };