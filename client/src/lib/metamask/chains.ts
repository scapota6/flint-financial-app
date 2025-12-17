/**
 * MetaMask Chain Switching
 * Helpers for switching networks and adding new chains
 */

import type { MetaMaskProvider } from "./events";
import { getErrorMessage, isUserRejection } from "./errors";

export interface ChainConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  "0x1": {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  "0x89": {
    chainId: "0x89",
    chainName: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  "0xa86a": {
    chainId: "0xa86a",
    chainName: "Avalanche C-Chain",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io"],
  },
  "0xa4b1": {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  "0xa": {
    chainId: "0xa",
    chainName: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  "0x38": {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  "0xaa36a7": {
    chainId: "0xaa36a7",
    chainName: "Sepolia Testnet",
    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

export function getChainName(chainId: string | undefined): string {
  if (!chainId) return "Unknown Network";
  return SUPPORTED_CHAINS[chainId]?.chainName || `Chain ${chainId}`;
}

export function getBlockExplorerUrl(chainId: string | undefined): string | null {
  if (!chainId) return null;
  const urls = SUPPORTED_CHAINS[chainId]?.blockExplorerUrls;
  return urls?.[0] || null;
}

export function getBlockExplorerTxUrl(chainId: string | undefined, txHash: string): string | null {
  const baseUrl = getBlockExplorerUrl(chainId);
  if (!baseUrl) return null;
  return `${baseUrl}/tx/${txHash}`;
}

export function getBlockExplorerAddressUrl(chainId: string | undefined, address: string): string | null {
  const baseUrl = getBlockExplorerUrl(chainId);
  if (!baseUrl) return null;
  return `${baseUrl}/address/${address}`;
}

export interface SwitchChainResult {
  success: boolean;
  error?: string;
  userRejected?: boolean;
}

export async function switchChain(
  provider: MetaMaskProvider,
  targetChainId: string
): Promise<SwitchChainResult> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
    return { success: true };
  } catch (error: any) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true, error: "You declined the network switch" };
    }
    
    if (error.code === 4902) {
      const chainConfig = SUPPORTED_CHAINS[targetChainId];
      if (chainConfig) {
        return addChain(provider, chainConfig);
      }
      return { success: false, error: "This network is not configured" };
    }
    
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function addChain(
  provider: MetaMaskProvider,
  chainConfig: ChainConfig
): Promise<SwitchChainResult> {
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [chainConfig],
    });
    return { success: true };
  } catch (error) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true, error: "You declined adding the network" };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function ensureChain(
  provider: MetaMaskProvider,
  currentChainId: string | undefined,
  requiredChainId: string
): Promise<SwitchChainResult> {
  if (currentChainId === requiredChainId) {
    return { success: true };
  }
  return switchChain(provider, requiredChainId);
}
