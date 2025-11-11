/**
 * Connection Limits Service
 * 
 * Handles account connection limit calculations and counting across providers.
 * Decoupled from Express routing to avoid circular dependencies.
 */

/**
 * Get account connection limit based on subscription tier.
 * 
 * @param tier - User's subscription tier (free, basic, pro, premium)
 * @param isAdmin - Whether user has admin privileges (unlimited connections)
 * @returns Connection limit (number) or null for unlimited
 */
export function getAccountLimit(tier: string, isAdmin?: boolean): number | null {
  // Admin users have unlimited connections
  if (isAdmin === true) {
    return null;
  }
  
  switch (tier) {
    case 'free': return 4;
    case 'basic': return null; // Unlimited
    case 'pro': return null; // Unlimited
    case 'premium': return null; // Unlimited
    default: return 4;
  }
}

/**
 * Counts connections properly by provider:
 * - Teller: Each account counts as 1 connection
 * - SnapTrade: Each authorization (brokerage login) counts as 1 connection (may have multiple accounts)
 * 
 * @param userId - Flint user ID
 * @returns Total connection count across all providers
 */
export async function getConnectionCount(userId: string): Promise<number> {
  const { db } = await import('../db');
  const { connectedAccounts, snaptradeConnections } = await import('@shared/schema');
  const { eq, and } = await import('drizzle-orm');
  
  // Count Teller accounts individually (each account = 1 connection)
  const tellerAccounts = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.userId, userId),
        eq(connectedAccounts.provider, 'teller')
      )
    );
  
  // Count SnapTrade authorizations (each authorization = 1 connection, regardless of # of accounts)
  const snaptradeAuths = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.flintUserId, userId));
  
  return tellerAccounts.length + snaptradeAuths.length;
}
