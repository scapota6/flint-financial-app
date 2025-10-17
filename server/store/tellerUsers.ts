/**
 * Teller User Store - Database-backed
 * 
 * Stores one Teller enrollment per user (similar to SnapTrade users).
 * The tellerUsers table has a PRIMARY KEY on flintUserId, which prevents duplicate enrollments.
 * Access token is stored once per user, not duplicated across accounts.
 */

import { db } from '../db';
import { tellerUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

type TellerEnrollment = { 
  enrollmentId: string; 
  accessToken: string; 
  institutionName?: string;
};

/**
 * Get Teller enrollment by Flint user ID
 * Returns enrollment data or null if not found
 */
export async function getTellerUser(flintUserId: string): Promise<TellerEnrollment | null> {
  try {
    const [enrollment] = await db
      .select()
      .from(tellerUsers)
      .where(eq(tellerUsers.flintUserId, flintUserId))
      .limit(1);

    if (!enrollment) {
      return null;
    }

    return {
      enrollmentId: enrollment.enrollmentId,
      accessToken: enrollment.accessToken,
      institutionName: enrollment.institutionName || undefined
    };
  } catch (error) {
    console.error('[TellerUser Store] Error getting enrollment:', error);
    return null;
  }
}

/**
 * Save Teller enrollment credentials
 * Primary key constraint on flintUserId prevents duplicates
 */
export async function saveTellerUser(
  flintUserId: string, 
  enrollment: TellerEnrollment
): Promise<void> {
  try {
    // Check if enrollment already exists
    const existing = await getTellerUser(flintUserId);
    
    if (existing) {
      // Update existing enrollment
      await db
        .update(tellerUsers)
        .set({
          enrollmentId: enrollment.enrollmentId,
          accessToken: enrollment.accessToken,
          institutionName: enrollment.institutionName,
          updatedAt: new Date()
        })
        .where(eq(tellerUsers.flintUserId, flintUserId));
    } else {
      // Insert new enrollment
      await db.insert(tellerUsers).values({
        flintUserId,
        enrollmentId: enrollment.enrollmentId,
        accessToken: enrollment.accessToken,
        institutionName: enrollment.institutionName,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      console.error('[TellerUser Store] Duplicate enrollment - prevented by database constraint');
      throw new Error('Teller enrollment already exists for this user');
    }
    console.error('[TellerUser Store] Error saving enrollment:', error);
    throw error;
  }
}

/**
 * Delete Teller enrollment credentials
 */
export async function deleteTellerUser(flintUserId: string): Promise<void> {
  try {
    await db
      .delete(tellerUsers)
      .where(eq(tellerUsers.flintUserId, flintUserId));
  } catch (error) {
    console.error('[TellerUser Store] Error deleting enrollment:', error);
    throw error;
  }
}

/**
 * Get Teller access token for a user
 * Helper function for routes that need to make Teller API calls
 */
export async function getTellerAccessToken(flintUserId: string): Promise<string | null> {
  const enrollment = await getTellerUser(flintUserId);
  return enrollment?.accessToken || null;
}
