/**
 * MetaMask Transaction Helpers
 * ETH transfers, ERC-20 transfers, and transaction lifecycle tracking
 */

import type { MetaMaskProvider } from "./events";
import { getErrorMessage, isUserRejection, isInsufficientFundsError } from "./errors";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  userRejected?: boolean;
  insufficientFunds?: boolean;
}

export interface TransactionState {
  txHash: string;
  status: TransactionStatus;
  confirmations?: number;
  blockNumber?: number;
}

const ERC20_TRANSFER_ABI = "0xa9059cbb";

export function encodeERC20Transfer(to: string, amount: bigint): string {
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return ERC20_TRANSFER_ABI + paddedTo + paddedAmount;
}

export function parseAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const combined = whole + paddedFraction;
  return BigInt(combined);
}

export function formatWei(wei: string | bigint, decimals: number = 18): string {
  const weiStr = typeof wei === "bigint" ? wei.toString() : wei;
  const value = BigInt(weiStr);
  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionPart = value % divisor;
  const fractionStr = fractionPart.toString().padStart(decimals, "0");
  const trimmedFraction = fractionStr.slice(0, 6).replace(/0+$/, "");
  return trimmedFraction ? `${wholePart}.${trimmedFraction}` : wholePart.toString();
}

export async function sendETH(
  provider: MetaMaskProvider,
  from: string,
  to: string,
  amountEth: string
): Promise<TransactionResult> {
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return { success: false, error: "Invalid recipient address" };
    }

    const amountNum = parseFloat(amountEth);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    const weiValue = BigInt(Math.floor(amountNum * 1e18));
    const hexValue = "0x" + weiValue.toString(16);

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to,
          value: hexValue,
        },
      ],
    });

    return { success: true, txHash: txHash as string };
  } catch (error) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true };
    }
    if (isInsufficientFundsError(error)) {
      return { success: false, insufficientFunds: true, error: "Insufficient funds" };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendERC20(
  provider: MetaMaskProvider,
  from: string,
  to: string,
  tokenAddress: string,
  amount: string,
  decimals: number = 18
): Promise<TransactionResult> {
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return { success: false, error: "Invalid recipient address" };
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return { success: false, error: "Invalid token address" };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    const amountWei = parseAmount(amount, decimals);
    const data = encodeERC20Transfer(to, amountWei);

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tokenAddress,
          data,
        },
      ],
    });

    return { success: true, txHash: txHash as string };
  } catch (error) {
    if (isUserRejection(error)) {
      return { success: false, userRejected: true };
    }
    if (isInsufficientFundsError(error)) {
      return { success: false, insufficientFunds: true, error: "Insufficient funds for gas" };
    }
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getTransactionReceipt(
  provider: MetaMaskProvider,
  txHash: string
): Promise<{ status: TransactionStatus; blockNumber?: number } | null> {
  try {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });

    if (!receipt) {
      return null;
    }

    const status = receipt.status === "0x1" ? "confirmed" : "failed";
    const blockNumber = parseInt(receipt.blockNumber, 16);

    return { status, blockNumber };
  } catch (error) {
    console.error("Failed to get transaction receipt:", error);
    return null;
  }
}

export function pollTransactionStatus(
  provider: MetaMaskProvider,
  txHash: string,
  onStatusChange: (state: TransactionState) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 60
): () => void {
  let attempts = 0;
  let cancelled = false;

  onStatusChange({ txHash, status: "pending" });

  const poll = async () => {
    if (cancelled || attempts >= maxAttempts) {
      if (attempts >= maxAttempts) {
        onStatusChange({ txHash, status: "failed" });
      }
      return;
    }

    attempts++;
    const result = await getTransactionReceipt(provider, txHash);

    if (result) {
      onStatusChange({
        txHash,
        status: result.status,
        blockNumber: result.blockNumber,
      });
      return;
    }

    setTimeout(poll, intervalMs);
  };

  setTimeout(poll, intervalMs);

  return () => {
    cancelled = true;
  };
}

export async function getBalance(
  provider: MetaMaskProvider,
  address: string
): Promise<string | null> {
  try {
    const balanceHex = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    return formatWei(BigInt(balanceHex as string));
  } catch (error) {
    console.error("Failed to get balance:", error);
    return null;
  }
}
