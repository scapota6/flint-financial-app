/**
 * Feature Flags Configuration
 * 
 * Use environment variables to toggle features on/off between development and production.
 * Features default to OFF in production for safety.
 * 
 * Usage:
 * - Set VITE_FEATURE_X=true in .env for development
 * - Leave unset or set to false for production
 * 
 * Example:
 *   if (featureFlags.metamask) { ... }
 *   {featureFlags.metamask && <MetaMaskConnect />}
 */

const isDevelopment = import.meta.env.DEV;

interface FeatureFlags {
  metamask: boolean;
  // Add new feature flags here as needed
}

function parseFlag(envValue: string | undefined, defaultValue: boolean = false): boolean {
  if (envValue === undefined || envValue === '') {
    return defaultValue;
  }
  return envValue.toLowerCase() === 'true' || envValue === '1';
}

export const featureFlags: FeatureFlags = {
  // MetaMask wallet integration - disabled by default, enable with VITE_FEATURE_METAMASK=true
  metamask: parseFlag(import.meta.env.VITE_FEATURE_METAMASK, false),
};

// Helper to check if any experimental features are enabled
export const hasExperimentalFeatures = Object.values(featureFlags).some(Boolean);

// Debug logging in development
if (isDevelopment) {
  console.log('[Feature Flags]', featureFlags);
}
