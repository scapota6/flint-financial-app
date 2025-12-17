/**
 * MetaMask Event Handling
 * Setup and cleanup for provider events (accountsChanged, chainChanged, etc.)
 */

export type AccountsChangedHandler = (accounts: string[]) => void;
export type ChainChangedHandler = (chainId: string) => void;
export type ConnectHandler = (connectInfo: { chainId: string }) => void;
export type DisconnectHandler = (error: { code: number; message: string }) => void;

export interface MetaMaskEventHandlers {
  onAccountsChanged?: AccountsChangedHandler;
  onChainChanged?: ChainChangedHandler;
  onConnect?: ConnectHandler;
  onDisconnect?: DisconnectHandler;
}

export interface MetaMaskProvider {
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isConnected?: () => boolean;
}

export function setupEventListeners(
  provider: MetaMaskProvider | null | undefined,
  handlers: MetaMaskEventHandlers
): () => void {
  if (!provider) {
    return () => {};
  }

  const { onAccountsChanged, onChainChanged, onConnect, onDisconnect } = handlers;

  if (onAccountsChanged) {
    provider.on("accountsChanged", onAccountsChanged);
  }
  if (onChainChanged) {
    provider.on("chainChanged", onChainChanged);
  }
  if (onConnect) {
    provider.on("connect", onConnect);
  }
  if (onDisconnect) {
    provider.on("disconnect", onDisconnect);
  }

  return () => {
    if (onAccountsChanged) {
      provider.removeListener("accountsChanged", onAccountsChanged);
    }
    if (onChainChanged) {
      provider.removeListener("chainChanged", onChainChanged);
    }
    if (onConnect) {
      provider.removeListener("connect", onConnect);
    }
    if (onDisconnect) {
      provider.removeListener("disconnect", onDisconnect);
    }
  };
}
