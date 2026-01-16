import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { isMobileApp } from './platform';

export interface MobileBrowserOptions {
  url: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  windowName?: string;
  windowFeatures?: string;
}

let browserFinishedListener: (() => void) | null = null;
let appUrlOpenListener: (() => void) | null = null;
let pendingCallback: (() => void) | null = null;

export const openInAppBrowser = async (options: MobileBrowserOptions): Promise<void> => {
  const { url, onComplete, onError, windowName = '_blank', windowFeatures } = options;

  if (isMobileApp()) {
    try {
      pendingCallback = onComplete || null;

      if (browserFinishedListener) {
        browserFinishedListener();
        browserFinishedListener = null;
      }
      if (appUrlOpenListener) {
        appUrlOpenListener();
        appUrlOpenListener = null;
      }

      const browserHandle = await Browser.addListener('browserFinished', () => {
        console.log('[MobileBrowser] Browser finished');
        if (pendingCallback) {
          pendingCallback();
          pendingCallback = null;
        }
        cleanupListeners();
      });
      browserFinishedListener = () => browserHandle.remove();

      const appHandle = await App.addListener('appUrlOpen', (event) => {
        console.log('[MobileBrowser] Deep link received:', event.url);
        
        if (event.url.startsWith('flint://')) {
          Browser.close().catch(() => {});
          
          if (pendingCallback) {
            pendingCallback();
            pendingCallback = null;
          }
          cleanupListeners();
        }
      });
      appUrlOpenListener = () => appHandle.remove();

      await Browser.open({ 
        url,
        presentationStyle: 'popover',
        toolbarColor: '#F4F2ED'
      });

    } catch (error) {
      console.error('[MobileBrowser] Error opening browser:', error);
      if (onError) {
        onError(error as Error);
      }
      cleanupListeners();
    }
  } else {
    const popup = window.open(url, windowName, windowFeatures);
    
    if (!popup || popup.closed) {
      if (onError) {
        onError(new Error('Popup blocked. Please allow popups for this site.'));
      }
      return;
    }

    const checkInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkInterval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 500);
  }
};

const cleanupListeners = () => {
  if (browserFinishedListener) {
    browserFinishedListener();
    browserFinishedListener = null;
  }
  if (appUrlOpenListener) {
    appUrlOpenListener();
    appUrlOpenListener = null;
  }
};

export const closeBrowser = async (): Promise<void> => {
  if (isMobileApp()) {
    try {
      await Browser.close();
    } catch (error) {
      console.log('[MobileBrowser] Browser already closed or not open');
    }
  }
  cleanupListeners();
};

export const getMobileCallbackUrl = (path: string): string => {
  if (isMobileApp()) {
    return `flint://${path}`;
  }
  return `${window.location.origin}/${path}`;
};

export const getSnapTradeCallbackUrl = (): string => {
  if (isMobileApp()) {
    return 'flint://snaptrade/callback';
  }
  return `${window.location.origin}/snaptrade-callback.html`;
};

export const getTellerCallbackUrl = (): string => {
  if (isMobileApp()) {
    return 'flint://teller/callback';
  }
  return `${window.location.origin}/teller-callback`;
};
