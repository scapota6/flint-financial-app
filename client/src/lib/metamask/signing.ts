/**
 * MetaMask Message Signing
 * personal_sign, eth_signTypedData_v4 (EIP-712), and wallet auth helpers
 */

import type { MetaMaskProvider } from "./events";
import { getErrorMessage, isUserRejection } from "./errors";

export interface SigningResult {
  success: boolean;
  signature?: string;
  error?: string;
  userRejected?: boolean;
}

export interface EIP712TypedData {
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    [key: string]: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };
  message: Record<string, any>;
}

export async function personalSign(
  provider: MetaMaskProvider,
  account: string,
  message: string
): Promise<SigningResult> {
  try {
    const hexMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
    
    const signature = await provider.request({
      method: "personal_sign",
      params: [hexMessage, account],
    });

    return { success: true, signature: signature as string };
  } catch (error) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function signTypedData(
  provider: MetaMaskProvider,
  account: string,
  typedData: EIP712TypedData
): Promise<SigningResult> {
  try {
    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [account, JSON.stringify(typedData)],
    });

    return { success: true, signature: signature as string };
  } catch (error) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

export function createAuthMessage(nonce: string, domain: string = "Flint"): string {
  const timestamp = new Date().toISOString();
  return `Sign this message to authenticate with ${domain}.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

export function createEIP712AuthData(
  nonce: string,
  chainId: number,
  contractAddress?: string
): EIP712TypedData {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        ...(contractAddress ? [{ name: "verifyingContract", type: "address" }] : []),
      ],
      Authentication: [
        { name: "nonce", type: "string" },
        { name: "timestamp", type: "uint256" },
        { name: "statement", type: "string" },
      ],
    },
    primaryType: "Authentication",
    domain: {
      name: "Flint",
      version: "1",
      chainId,
      ...(contractAddress ? { verifyingContract: contractAddress } : {}),
    },
    message: {
      nonce,
      timestamp: Math.floor(Date.now() / 1000),
      statement: "Sign in to Flint with your wallet",
    },
  };
}

export async function signInWithWallet(
  provider: MetaMaskProvider,
  account: string,
  nonce: string
): Promise<SigningResult> {
  const message = createAuthMessage(nonce);
  return personalSign(provider, account, message);
}
