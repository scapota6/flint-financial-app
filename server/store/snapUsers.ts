/**
 * SnapTrade User Store - Database-backed
 * 
 * Migrated from file storage to database for better reliability and duplicate prevention.
 * The snaptradeUsers table has a PRIMARY KEY on flintUserId, which prevents duplicate registrations.
 */

import { db } from '../db';
import { snaptradeUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

type Rec = { userId: string; userSecret: string };

/**
 * Get SnapTrade user by Flint user ID
 * Returns user registration data (userId, userSecret) or null if not found
 */
export async function getSnapUser(flintUserId: string): Promise<Rec | null> {
  try {
    const [user] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUserId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Return in the format expected by existing code
    return {
      userId: flintUserId, // SnapTrade userId equals flintUserId in our system
      userSecret: user.userSecret
    };
  } catch (error) {
    console.error('[SnapUser Store] Error getting user:', error);
    return null;
  }
}

/**
 * Save SnapTrade user credentials
 * Primary key constraint on flintUserId prevents duplicates
 */
export async function saveSnapUser(rec: Rec & { flintUserId?: string }): Promise<void> {
  try {
    const flintUserId = rec.flintUserId || rec.userId;

    // Check if user already exists
    const existing = await getSnapUser(flintUserId);
    
    if (existing) {
      // Update existing user
      await db
        .update(snaptradeUsers)
        .set({
          snaptradeUserId: flintUserId,
          userSecret: rec.userSecret,
          rotatedAt: new Date()
        })
        .where(eq(snaptradeUsers.flintUserId, flintUserId));
    } else {
      // Insert new user
      await db.insert(snaptradeUsers).values({
        flintUserId: flintUserId,
        snaptradeUserId: flintUserId,
        userSecret: rec.userSecret,
        createdAt: new Date(),
        rotatedAt: null
      });
    }
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      console.error('[SnapUser Store] Duplicate user - prevented by database constraint');
      throw new Error('SnapTrade user already exists');
    }
    console.error('[SnapUser Store] Error saving user:', error);
    throw error;
  }
}

/**
 * Delete SnapTrade user credentials
 */
export async function deleteSnapUser(flintUserId: string): Promise<void> {
  try {
    await db
      .delete(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUserId));
  } catch (error) {
    console.error('[SnapUser Store] Error deleting user:', error);
    throw error;
  }
}

/**
 * Get all SnapTrade users
 * Returns a map of flintUserId → user data for backwards compatibility
 */
export async function getAllSnapUsers(): Promise<Record<string, Rec>> {
  try {
    const users = await db.select().from(snaptradeUsers);

    const result: Record<string, Rec> = {};
    for (const user of users) {
      result[user.flintUserId] = {
        userId: user.flintUserId, // SnapTrade userId equals flintUserId
        userSecret: user.userSecret
      };
    }

    return result;
  } catch (error) {
    console.error('[SnapUser Store] Error getting all users:', error);
    return {};
  }
}
