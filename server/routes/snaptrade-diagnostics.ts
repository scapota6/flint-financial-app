import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { db } from '../db';
import { users, snaptradeUsers, snaptradeConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { listBrokerageAuthorizations } from '../lib/snaptrade';

const router = Router();

/**
 * GET /api/snaptrade/diagnostics/check-sync
 * Check if SnapTrade has authorizations that aren't synced to our database
 * This is a diagnostic endpoint to troubleshoot sync issues
 */
router.get('/check-sync', isAuthenticated, async (req: any, res) => {
  try {
    const email = req.user?.claims?.email?.toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get Flint user
    const [flintUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!flintUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get SnapTrade credentials
    const [snaptradeUser] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUser.id))
      .limit(1);

    if (!snaptradeUser) {
      return res.json({
        registered: false,
        message: 'User not registered with SnapTrade'
      });
    }

    // Get authorizations from SnapTrade API  
    // Note: In the current implementation, flintUserId is used as the SnapTrade userId
    console.log('[Diagnostics] Fetching authorizations from SnapTrade for user:', flintUser.id);
    const snaptradeAuthorizations = await listBrokerageAuthorizations(
      flintUser.id,
      snaptradeUser.userSecret
    );

    // Get connections from our database
    const dbConnections = await db
      .select()
      .from(snaptradeConnections)
      .where(eq(snaptradeConnections.flintUserId, flintUser.id));

    // Compare
    const snaptradeAuthIds = new Set((snaptradeAuthorizations || []).map((auth: any) => auth.id));
    const dbAuthIds = new Set(dbConnections.map(conn => conn.brokerageAuthorizationId));

    const inSnaptradeOnly = (snaptradeAuthorizations || [])
      .filter((auth: any) => !dbAuthIds.has(auth.id))
      .map((auth: any) => ({
        id: auth.id,
        name: auth.name,
        type: auth.type,
        disabled: auth.disabled,
        created: auth.created,
        updated: auth.updated
      }));

    const inDatabaseOnly = dbConnections
      .filter(conn => !snaptradeAuthIds.has(conn.brokerageAuthorizationId))
      .map(conn => ({
        id: conn.brokerageAuthorizationId,
        name: conn.brokerageName,
        disabled: conn.disabled
      }));

    res.json({
      registered: true,
      user: {
        flintUserId: flintUser.id,
        email: flintUser.email,
        snaptradeUserId: flintUser.id, // flintUserId is used as SnapTrade userId
        hasUserSecret: !!snaptradeUser.userSecret
      },
      snaptradeAuthorizations: {
        count: snaptradeAuthorizations?.length || 0,
        authorizations: (snaptradeAuthorizations || []).map((auth: any) => ({
          id: auth.id,
          name: auth.name,
          type: auth.type,
          disabled: auth.disabled,
          created: auth.created,
          updated: auth.updated
        }))
      },
      databaseConnections: {
        count: dbConnections.length,
        connections: dbConnections.map(conn => ({
          id: conn.brokerageAuthorizationId,
          name: conn.brokerageName,
          type: conn.brokerageType,
          disabled: conn.disabled,
          status: conn.status
        }))
      },
      sync: {
        inSnaptradeOnly: {
          count: inSnaptradeOnly.length,
          items: inSnaptradeOnly
        },
        inDatabaseOnly: {
          count: inDatabaseOnly.length,
          items: inDatabaseOnly
        },
        synced: {
          count: snaptradeAuthIds.size - inSnaptradeOnly.length
        }
      }
    });

  } catch (error: any) {
    console.error('[Diagnostics] Error checking sync:', error);
    res.status(500).json({
      error: 'Failed to check sync',
      message: error.message,
      details: error.response?.data || error.stack
    });
  }
});

/**
 * POST /api/snaptrade/diagnostics/force-sync
 * Force sync all SnapTrade authorizations to database
 */
router.post('/force-sync', isAuthenticated, async (req: any, res) => {
  try {
    const email = req.user?.claims?.email?.toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get Flint user
    const [flintUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!flintUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get SnapTrade credentials
    const [snaptradeUser] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUser.id))
      .limit(1);

    if (!snaptradeUser) {
      return res.status(400).json({ error: 'User not registered with SnapTrade' });
    }

    // Get authorizations from SnapTrade API
    // Note: In the current implementation, flintUserId is used as the SnapTrade userId
    console.log('[Diagnostics] Force syncing authorizations for user:', flintUser.id);
    const connections = await listBrokerageAuthorizations(
      flintUser.id,
      snaptradeUser.userSecret
    ) || [];

    // Sync to database
    const synced = [];
    for (const connection of connections) {
      await db
        .insert(snaptradeConnections)
        .values({
          flintUserId: flintUser.id,
          brokerageAuthorizationId: connection.id!,
          brokerageName: connection.name || 'Unknown',
          brokerageType: connection.type || null,
          status: connection.disabled ? 'disabled' : 'active',
          disabled: !!connection.disabled,
          updatedAt: new Date(),
          lastRefreshedAt: connection.updated ? new Date(connection.updated) : null
        })
        .onConflictDoUpdate({
          target: snaptradeConnections.brokerageAuthorizationId,
          set: {
            brokerageName: connection.name || 'Unknown',
            brokerageType: connection.type || null,
            status: connection.disabled ? 'disabled' : 'active',
            disabled: !!connection.disabled,
            updatedAt: new Date(),
            lastRefreshedAt: connection.updated ? new Date(connection.updated) : null
          }
        });
      
      synced.push({
        id: connection.id,
        name: connection.name,
        type: connection.type
      });
    }

    console.log('[Diagnostics] Synced', connections.length, 'connections');

    res.json({
      success: true,
      synced: {
        count: synced.length,
        connections: synced
      }
    });

  } catch (error: any) {
    console.error('[Diagnostics] Error force syncing:', error);
    res.status(500).json({
      error: 'Failed to force sync',
      message: error.message,
      details: error.response?.data || error.stack
    });
  }
});

export default router;
