import { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side tracking
export const posthog = new PostHog(
  'phc_ucEZRx85Wj0m5hW2b8BEpf0C9GfwoFzWCXs1R2tUyyJ',
  {
    host: 'https://us.i.posthog.com',
    // Enable debug mode in development
    flushAt: process.env.NODE_ENV === 'production' ? 20 : 1,
    flushInterval: process.env.NODE_ENV === 'production' ? 10000 : 1000,
  }
);

// Helper functions for server-side tracking
export function captureEvent(distinctId: string, event: string, properties?: Record<string, any>) {
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }
  });
}

export function identifyUser(distinctId: string, properties?: Record<string, any>) {
  posthog.identify({
    distinctId,
    properties
  });
}

export function capturePageView(distinctId: string, path: string, properties?: Record<string, any>) {
  posthog.capture({
    distinctId,
    event: '$pageview',
    properties: {
      ...properties,
      $current_url: path,
    }
  });
}

// Graceful shutdown - flush events before exit
export async function shutdownPostHog() {
  console.log('[PostHog] Flushing events before shutdown...');
  await posthog.shutdown();
  console.log('[PostHog] Shutdown complete');
}
