
import { usePostHog } from 'posthog-js/react';

// Export hook for components to use PostHog
export { usePostHog };

// Helper function for non-hook contexts
export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;

  const event = {
    ...properties,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };

  if (import.meta.env.DEV) {
    console.log('📊 Analytics:', eventName, event);
  }

  try {
    // PostHog is available globally after provider initialization
    if (window.posthog) {
      window.posthog.capture(eventName, event);
    }
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
}

// Identify user for PostHog
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  try {
    if (window.posthog) {
      window.posthog.identify(userId, traits);
    }
  } catch (error) {
    console.warn('User identification failed:', error);
  }
}

// Reset user identity (for logout)
export function resetUser() {
  if (typeof window === 'undefined') return;
  
  try {
    if (window.posthog) {
      window.posthog.reset();
    }
  } catch (error) {
    console.warn('User reset failed:', error);
  }
}

// Connection health specific events
export const ConnectionHealthEvents = {
  ACCOUNT_DISCONNECTED_SHOWN: 'account_disconnected_shown',
  RECONNECT_CLICKED: 'reconnect_clicked', 
  RECONNECT_SUCCESS: 'reconnect_success',
  RECONNECT_FAILED: 'reconnect_failed'
} as const;

export function trackAccountDisconnectedShown(accountId: string, provider: string) {
  trackEvent(ConnectionHealthEvents.ACCOUNT_DISCONNECTED_SHOWN, {
    account_id: accountId,
    provider
  });
}

export function trackReconnectClicked(accountId: string, provider: string) {
  trackEvent(ConnectionHealthEvents.RECONNECT_CLICKED, {
    account_id: accountId,
    provider
  });
}

export function trackReconnectSuccess(accountId: string, provider: string) {
  trackEvent(ConnectionHealthEvents.RECONNECT_SUCCESS, {
    account_id: accountId,
    provider
  });
}

export function trackReconnectFailed(accountId: string, provider: string, error: string) {
  trackEvent(ConnectionHealthEvents.RECONNECT_FAILED, {
    account_id: accountId,
    provider,
    error
  });
}

// Declare global type for PostHog
declare global {
  interface Window {
    posthog?: any;
  }
}
