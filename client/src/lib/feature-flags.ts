/**
 * Feature Flags Configuration
 * 
 * Use environment variables to toggle features on/off between development and production.
 * Features default to OFF in production for safety.
 * 
 * Some features can be restricted to internal testers only.
 * 
 * Usage:
 * - Set VITE_FEATURE_X=true in .env for development
 * - Leave unset or set to false for production
 * - Use canAccessFeature(featureName, userEmail) for user-restricted features
 * 
 * Example:
 *   if (canAccessFeature('metamask', user?.email)) { ... }
 */

const isDevelopment = import.meta.env.DEV;

// Internal testers who can access experimental features
const INTERNAL_TESTERS = [
  'scapota@flint-investing.com',
  'seba.rod136@gmail.com',
];

interface FeatureConfig {
  enabled: boolean;
  internalOnly: boolean;
}

interface FeatureFlags {
  metamask: FeatureConfig;
}

function parseFlag(envValue: string | undefined, defaultValue: boolean = false): boolean {
  if (envValue === undefined || envValue === '') {
    return defaultValue;
  }
  return envValue.toLowerCase() === 'true' || envValue === '1';
}

export const featureFlags: FeatureFlags = {
  // MetaMask wallet integration - available to all users
  metamask: {
    enabled: true,
    internalOnly: false,
  },
};

/**
 * Check if a user can access a specific feature
 * @param feature - The feature name to check
 * @param userEmail - The current user's email (optional)
 * @returns true if the user can access the feature
 */
export function canAccessFeature(feature: keyof FeatureFlags, userEmail?: string | null): boolean {
  const config = featureFlags[feature];
  
  // Feature must be enabled first
  if (!config.enabled) {
    return false;
  }
  
  // If not internal-only, anyone can access
  if (!config.internalOnly) {
    return true;
  }
  
  // For internal-only features, check if user is an internal tester
  if (!userEmail) {
    return false;
  }
  
  return INTERNAL_TESTERS.includes(userEmail.toLowerCase());
}

/**
 * Check if a user is an internal tester
 */
export function isInternalTester(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return INTERNAL_TESTERS.includes(userEmail.toLowerCase());
}

// Helper to check if any experimental features are enabled
export const hasExperimentalFeatures = Object.values(featureFlags).some(f => f.enabled);

// Debug logging in development
if (isDevelopment) {
  console.log('[Feature Flags]', featureFlags);
  console.log('[Internal Testers]', INTERNAL_TESTERS);
}
