/**
 * SnapTrade Client Factory
 * Creates environment-specific SnapTrade SDK instances with memoization
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';

type SnapTradeEnvironment = 'development' | 'production';

// Memoized clients for each environment
const clients = new Map<SnapTradeEnvironment, Snaptrade>();

/**
 * Required environment variables validation
 */
function validateEnvironmentKeys(): void {
  const required = [
    'SNAPTRADE_CLIENT_ID_DEV',
    'SNAPTRADE_CONSUMER_KEY_DEV',
    'SNAPTRADE_CLIENT_ID_PROD',
    'SNAPTRADE_CONSUMER_KEY_PROD',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required SnapTrade environment variables: ${missing.join(', ')}\n` +
      'Please ensure both development and production API keys are configured.'
    );
  }
}

/**
 * Get environment-specific API credentials
 */
function getCredentials(environment: SnapTradeEnvironment) {
  if (environment === 'development') {
    return {
      clientId: process.env.SNAPTRADE_CLIENT_ID_DEV!,
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY_DEV!,
      environment: 'sandbox' as const,
    };
  } else {
    return {
      clientId: process.env.SNAPTRADE_CLIENT_ID_PROD!,
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY_PROD!,
      environment: 'production' as const,
    };
  }
}

/**
 * Create or retrieve memoized SnapTrade client for the given environment
 * 
 * @param environment - 'development' uses sandbox keys, 'production' uses prod keys
 * @returns SnapTrade SDK instance configured for the specified environment
 */
export function createSnapTradeClient(environment: SnapTradeEnvironment = 'production'): Snaptrade {
  // Return cached client if already created
  if (clients.has(environment)) {
    return clients.get(environment)!;
  }

  // Get environment-specific credentials
  const credentials = getCredentials(environment);

  // Create new SnapTrade client
  // Note: The environment (sandbox vs production) is determined by which API keys are used
  // DEV keys connect to sandbox, PROD keys connect to production
  const client = new Snaptrade({
    clientId: credentials.clientId,
    consumerKey: credentials.consumerKey,
  });

  console.log(`[SnapTrade Client Factory] Created ${environment} client`, {
    env: credentials.environment,
    clientIdTail: credentials.clientId.slice(-6),
    consumerKeyLen: credentials.consumerKey.length,
  });

  // Cache for reuse
  clients.set(environment, client);

  return client;
}

/**
 * Get SnapTrade client for a specific user based on their environment setting
 * 
 * @param userEnvironment - User's snaptradeEnvironment from database
 * @returns SnapTrade SDK instance configured for user's environment
 */
export function getSnapTradeClientForUser(userEnvironment?: string | null): Snaptrade {
  const environment: SnapTradeEnvironment = 
    userEnvironment === 'development' ? 'development' : 'production';
  
  return createSnapTradeClient(environment);
}

/**
 * Validate all environment keys on module load
 * This ensures fast failure if keys are missing
 */
try {
  validateEnvironmentKeys();
  console.log('[SnapTrade Client Factory] ✅ All environment keys validated');
} catch (error) {
  console.error('[SnapTrade Client Factory] ❌ Environment validation failed:', error);
  // Allow module to load but log error - will fail at runtime if keys are accessed
}

// Pre-create both clients on startup for faster first requests
// This also validates that the keys work
setTimeout(() => {
  try {
    createSnapTradeClient('development');
    createSnapTradeClient('production');
    console.log('[SnapTrade Client Factory] ✅ Both clients initialized successfully');
  } catch (error) {
    console.error('[SnapTrade Client Factory] ❌ Client initialization failed:', error);
  }
}, 100);
