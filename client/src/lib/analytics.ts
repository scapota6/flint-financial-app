
import { usePostHog } from 'posthog-js/react';

// Export hook for components to use PostHog
export { usePostHog };

// UTM Parameter interface
interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  gclid?: string; // Google Click ID
  fbclid?: string; // Facebook Click ID
}

// Parse and store UTM parameters from URL
export function captureUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const utmParams: UTMParams = {};
  
  // Extract UTM params
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  utmKeys.forEach(key => {
    const value = params.get(key);
    if (value) {
      utmParams[key as keyof UTMParams] = value;
    }
  });
  
  // Capture referrer
  if (document.referrer) {
    utmParams.referrer = document.referrer;
  }
  
  // Capture landing page
  utmParams.landing_page = window.location.pathname;
  
  // Store in sessionStorage for persistence across page navigations
  if (Object.keys(utmParams).length > 0) {
    const existing = sessionStorage.getItem('flint_utm_params');
    if (!existing) {
      sessionStorage.setItem('flint_utm_params', JSON.stringify(utmParams));
      sessionStorage.setItem('flint_first_touch', new Date().toISOString());
    }
  }
  
  return utmParams;
}

// Get stored UTM params
export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = sessionStorage.getItem('flint_utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Parse referrer to get source info
export function parseReferrer(referrer: string): { source: string; isOrganic: boolean } {
  if (!referrer) return { source: 'direct', isOrganic: false };
  
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    // Search engines (organic traffic)
    const searchEngines: Record<string, string> = {
      'google': 'google',
      'bing': 'bing', 
      'yahoo': 'yahoo',
      'duckduckgo': 'duckduckgo',
      'baidu': 'baidu',
      'yandex': 'yandex',
      'ecosia': 'ecosia'
    };
    
    for (const [key, source] of Object.entries(searchEngines)) {
      if (hostname.includes(key)) {
        return { source, isOrganic: true };
      }
    }
    
    // Social media
    const socialNetworks: Record<string, string> = {
      'facebook': 'facebook',
      'instagram': 'instagram',
      'twitter': 'twitter',
      'x.com': 'twitter',
      'linkedin': 'linkedin',
      'tiktok': 'tiktok',
      'youtube': 'youtube',
      'reddit': 'reddit',
      'pinterest': 'pinterest'
    };
    
    for (const [key, source] of Object.entries(socialNetworks)) {
      if (hostname.includes(key)) {
        return { source, isOrganic: false };
      }
    }
    
    return { source: hostname, isOrganic: false };
  } catch {
    return { source: 'unknown', isOrganic: false };
  }
}

// Initialize analytics on app load - call this once on app mount
export function initializeAnalytics() {
  if (typeof window === 'undefined') return;
  
  const utmParams = captureUTMParams();
  const referrerInfo = parseReferrer(document.referrer);
  
  // Track page view with full attribution data
  trackEvent('page_view_with_attribution', {
    ...utmParams,
    referrer_source: referrerInfo.source,
    is_organic_search: referrerInfo.isOrganic,
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  });
  
  // Set user properties for segmentation in PostHog
  if (window.posthog && Object.keys(utmParams).length > 0) {
    window.posthog.setPersonProperties({
      initial_utm_source: utmParams.utm_source,
      initial_utm_medium: utmParams.utm_medium,
      initial_utm_campaign: utmParams.utm_campaign,
      initial_referrer: utmParams.referrer,
      initial_landing_page: utmParams.landing_page,
    });
  }
}

// Helper function for non-hook contexts
export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;

  // Include stored UTM params with every event for attribution
  const utmParams = getStoredUTMParams();
  
  const event = {
    ...properties,
    ...utmParams,
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

// ============================================
// CONVERSION FUNNEL EVENTS
// Track user journey from landing to conversion
// ============================================

export const ConversionEvents = {
  // Landing & Engagement
  LANDING_PAGE_VIEW: 'landing_page_view',
  CTA_CLICKED: 'cta_clicked',
  PRICING_VIEWED: 'pricing_viewed',
  FAQ_EXPANDED: 'faq_expanded',
  
  // Lead Capture
  EMAIL_CAPTURED: 'email_captured',
  WAITLIST_JOINED: 'waitlist_joined',
  
  // Authentication Funnel
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',
  
  // Onboarding
  ACCOUNT_CONNECTED: 'account_connected',
  FIRST_ACCOUNT_CONNECTED: 'first_account_connected',
  
  // Subscription
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_COMPLETED: 'subscription_completed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_STARTED: 'checkout_started',
  PAYMENT_COMPLETED: 'payment_completed',
} as const;

// Landing page tracking
export function trackLandingPageView(pageName: string = 'home') {
  trackEvent(ConversionEvents.LANDING_PAGE_VIEW, {
    page_name: pageName,
  });
}

export function trackCTAClicked(ctaName: string, ctaLocation: string) {
  trackEvent(ConversionEvents.CTA_CLICKED, {
    cta_name: ctaName,
    cta_location: ctaLocation,
  });
}

export function trackPricingViewed(source: string) {
  trackEvent(ConversionEvents.PRICING_VIEWED, {
    source,
  });
}

// Lead capture tracking
export function trackEmailCaptured(source: string) {
  trackEvent(ConversionEvents.EMAIL_CAPTURED, {
    source,
    conversion_type: 'lead',
  });
}

export function trackWaitlistJoined(source: string) {
  trackEvent(ConversionEvents.WAITLIST_JOINED, {
    source,
    conversion_type: 'waitlist',
  });
}

// Auth funnel tracking
export function trackSignupStarted(method: string = 'email') {
  trackEvent(ConversionEvents.SIGNUP_STARTED, {
    method,
  });
}

export function trackSignupCompleted(method: string = 'email') {
  trackEvent(ConversionEvents.SIGNUP_COMPLETED, {
    method,
    conversion_type: 'signup',
  });
}

export function trackLoginCompleted(method: string = 'email') {
  trackEvent(ConversionEvents.LOGIN_COMPLETED, {
    method,
  });
}

// Onboarding tracking
export function trackAccountConnected(provider: string, accountType: string) {
  trackEvent(ConversionEvents.ACCOUNT_CONNECTED, {
    provider,
    account_type: accountType,
  });
}

export function trackFirstAccountConnected(provider: string, accountType: string) {
  trackEvent(ConversionEvents.FIRST_ACCOUNT_CONNECTED, {
    provider,
    account_type: accountType,
    conversion_type: 'first_connection',
  });
}

// Subscription tracking
export function trackPlanSelected(planName: string, planPrice: number) {
  trackEvent(ConversionEvents.PLAN_SELECTED, {
    plan_name: planName,
    plan_price: planPrice,
  });
}

export function trackCheckoutStarted(planName: string, planPrice: number) {
  trackEvent(ConversionEvents.CHECKOUT_STARTED, {
    plan_name: planName,
    plan_price: planPrice,
  });
}

export function trackPaymentCompleted(planName: string, planPrice: number, paymentMethod: string = 'stripe') {
  trackEvent(ConversionEvents.PAYMENT_COMPLETED, {
    plan_name: planName,
    plan_price: planPrice,
    payment_method: paymentMethod,
    conversion_type: 'purchase',
    revenue: planPrice,
  });
}

// ============================================
// SESSION ID UTILITIES
// For server-side event correlation
// ============================================

// Get the current PostHog session ID for server-side tracking
export function getSessionId(): string | null {
  if (typeof window === 'undefined' || !window.posthog) return null;
  
  try {
    return window.posthog.get_session_id?.() || null;
  } catch {
    return null;
  }
}

// Get the current PostHog distinct ID
export function getDistinctId(): string | null {
  if (typeof window === 'undefined' || !window.posthog) return null;
  
  try {
    return window.posthog.get_distinct_id?.() || null;
  } catch {
    return null;
  }
}

// Helper to add PostHog session tracking headers to fetch requests
export function getPostHogHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  const sessionId = getSessionId();
  if (sessionId) {
    headers['X-POSTHOG-SESSION-ID'] = sessionId;
  }
  
  const distinctId = getDistinctId();
  if (distinctId) {
    headers['X-POSTHOG-DISTINCT-ID'] = distinctId;
  }
  
  return headers;
}

// Declare global type for PostHog
declare global {
  interface Window {
    posthog?: any;
  }
}
