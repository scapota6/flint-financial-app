import { Preferences } from '@capacitor/preferences';
import { isMobileApp } from '@/lib/platform';

const METAMASK_CONNECTION_KEY = 'metamask_connection';

export interface MetaMaskConnectionState {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  connectedAt: string | null;
}

const defaultState: MetaMaskConnectionState = {
  isConnected: false,
  account: null,
  chainId: null,
  connectedAt: null,
};

export const getStoredConnection = async (): Promise<MetaMaskConnectionState> => {
  try {
    if (isMobileApp()) {
      const { value } = await Preferences.get({ key: METAMASK_CONNECTION_KEY });
      if (value) {
        return JSON.parse(value);
      }
    } else {
      const stored = localStorage.getItem(METAMASK_CONNECTION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('[MetaMask Store] Error reading connection state:', error);
  }
  return defaultState;
};

export const setStoredConnection = async (state: MetaMaskConnectionState): Promise<void> => {
  try {
    const value = JSON.stringify(state);
    
    if (isMobileApp()) {
      await Preferences.set({ key: METAMASK_CONNECTION_KEY, value });
    } else {
      localStorage.setItem(METAMASK_CONNECTION_KEY, value);
    }
    
    console.log('[MetaMask Store] Connection state saved:', {
      isConnected: state.isConnected,
      account: state.account ? `${state.account.slice(0, 6)}...` : null,
    });
  } catch (error) {
    console.error('[MetaMask Store] Error saving connection state:', error);
  }
};

export const clearStoredConnection = async (): Promise<void> => {
  try {
    if (isMobileApp()) {
      await Preferences.remove({ key: METAMASK_CONNECTION_KEY });
    } else {
      localStorage.removeItem(METAMASK_CONNECTION_KEY);
    }
    console.log('[MetaMask Store] Connection state cleared');
  } catch (error) {
    console.error('[MetaMask Store] Error clearing connection state:', error);
  }
};

export const updateConnectionAccount = async (account: string, chainId?: string): Promise<void> => {
  await setStoredConnection({
    isConnected: true,
    account,
    chainId: chainId || null,
    connectedAt: new Date().toISOString(),
  });
};

export const disconnectConnection = async (): Promise<void> => {
  await clearStoredConnection();
};
