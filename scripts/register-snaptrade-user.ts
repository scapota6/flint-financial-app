/**
 * Script to register a user with SnapTrade
 * Usage: tsx scripts/register-snaptrade-user.ts <user_email>
 */

import { db } from '../server/db';
import { users, snaptradeUsers } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { authApi } from '../server/lib/snaptrade';

async function registerSnapTradeUser(userEmail: string) {
  try {
    console.log('[Register] Looking up user:', userEmail);
    
    // Find the Flint user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
      .limit(1);
    
    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }
    
    console.log('[Register] Found user:', {
      id: user.id,
      email: user.email
    });
    
    // Check if already registered
    const [existing] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, user.id))
      .limit(1);
    
    if (existing?.snaptradeUserSecret) {
      console.log('[Register] User already registered with SnapTrade');
      console.log('[Register] SnapTrade User ID:', existing.snaptradeUserId);
      return;
    }
    
    // Register with SnapTrade API
    console.log('[Register] Calling SnapTrade registration API...');
    const registration = await authApi.registerSnapTradeUser({
      userId: user.id
    });
    
    const snaptradeUserId = registration.data.userId!;
    const snaptradeUserSecret = registration.data.userSecret!;
    
    if (!snaptradeUserSecret) {
      throw new Error('SnapTrade did not return userSecret');
    }
    
    console.log('[Register] SnapTrade registration successful:', {
      snaptradeUserId,
      secretLength: snaptradeUserSecret.length
    });
    
    // Save to database
    console.log('[Register] Saving credentials to database...');
    await db
      .insert(snaptradeUsers)
      .values({
        flintUserId: user.id,
        snaptradeUserId: snaptradeUserId,
        userSecret: snaptradeUserSecret,
        createdAt: new Date(),
        rotatedAt: null
      })
      .onConflictDoUpdate({
        target: snaptradeUsers.flintUserId,
        set: {
          snaptradeUserId: snaptradeUserId,
          userSecret: snaptradeUserSecret,
          rotatedAt: new Date()
        }
      });
    
    console.log('[Register] ✅ Registration complete!');
    console.log('[Register] User can now connect brokerage accounts');
    
  } catch (error: any) {
    console.error('[Register] ❌ Registration failed:', error?.response?.data || error?.message || error);
    throw error;
  }
}

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: tsx scripts/register-snaptrade-user.ts <user_email>');
  process.exit(1);
}

registerSnapTradeUser(userEmail)
  .then(() => {
    console.log('[Register] Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Register] Fatal error:', error);
    process.exit(1);
  });
