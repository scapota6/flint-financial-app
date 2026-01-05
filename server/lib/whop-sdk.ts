/**
 * Whop SDK Initialization
 * Provides backend API access to Whop services
 */

import { WhopServerSdk } from '@whop/api';
import { logger } from '@shared/logger';

// Initialize Whop SDK with API key and App ID
const whopApiKey = process.env.WHOP_API_KEY;
const whopAppId = process.env.NEXT_PUBLIC_WHOP_APP_ID || 'app_lc6Q00VpEqd85o';

if (!whopApiKey) {
  logger.error('WHOP_API_KEY not configured in environment variables');
}

if (!whopAppId) {
  logger.error('WHOP_APP_ID not configured in environment variables');
}

// Create SDK instance (call as function, not constructor)
export const whopSdk = WhopServerSdk({
  appApiKey: whopApiKey || '',
  appId: whopAppId,
});

// Export helper function to fetch user details by ID
export async function getWhopUser(userId: string) {
  try {
    const user = await whopSdk.users.getUser({ userId });
    return user;
  } catch (error: any) {
    logger.error('Failed to fetch Whop user', { 
      error: error.message,
      metadata: { userId }
    });
    throw error;
  }
}
