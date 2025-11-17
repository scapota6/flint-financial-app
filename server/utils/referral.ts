import { nanoid } from 'nanoid';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';

/**
 * Generate a unique referral code for a user
 * Format: 6-character alphanumeric code (e.g., "X8K9Z2")
 */
export async function generateReferralCode(): Promise<string> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = nanoid(6).toUpperCase();
    const sanitized = code.split('').map(char => 
      alphabet.includes(char) ? char : alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join('');

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, sanitized))
      .limit(1);

    if (existing.length === 0) {
      return sanitized;
    }

    attempts++;
  }

  return nanoid(8).toUpperCase();
}

/**
 * Calculate waitlist position based on signup order
 * Users who signed up earlier get lower positions
 * Note: This is a simple implementation. For production with many users,
 * consider using a sequence column or cached counter with background job.
 */
export async function calculateWaitlistPosition(userId: string): Promise<number> {
  try {
    const user = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return -1;
    }

    const [result] = await db
      .select({ position: count() })
      .from(users)
      .where(sql`${users.createdAt} <= ${user[0].createdAt}`);

    return Number(result?.position) || 1;
  } catch (error) {
    console.error('Error calculating waitlist position:', error);
    return -1;
  }
}

/**
 * Process a referral - updates both the referrer and referee
 */
export async function processReferral(refereeId: string, referralCode: string): Promise<boolean> {
  try {
    const referrer = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (referrer.length === 0) {
      return false;
    }

    await db.transaction(async (tx: any) => {
      // Update referee to mark who referred them
      await tx
        .update(users)
        .set({ 
          referredBy: referrer[0].id,
        })
        .where(eq(users.id, refereeId));

      // Increment referrer's referral count
      await tx
        .update(users)
        .set({ 
          referralCount: sql`COALESCE(${users.referralCount}, 0) + 1`,
        })
        .where(eq(users.id, referrer[0].id));
    });

    return true;
  } catch (error) {
    console.error('Error processing referral:', error);
    return false;
  }
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const user = await db
    .select({
      referralCode: users.referralCode,
      referralCount: users.referralCount,
      waitlistPosition: users.waitlistPosition,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}
