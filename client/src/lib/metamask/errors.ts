/**
 * MetaMask Error Handling
 * Maps MetaMask error codes to user-friendly messages
 */

export interface MetaMaskError {
  code: number;
  message: string;
  data?: unknown;
}

export const ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  RESOURCE_UNAVAILABLE: -32002,
  TRANSACTION_REJECTED: -32003,
} as const;

const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.USER_REJECTED]: "You declined the request in MetaMask",
  [ERROR_CODES.UNAUTHORIZED]: "MetaMask is not authorized for this action",
  [ERROR_CODES.UNSUPPORTED_METHOD]: "This action is not supported by MetaMask",
  [ERROR_CODES.DISCONNECTED]: "MetaMask is disconnected. Please reconnect your wallet",
  [ERROR_CODES.CHAIN_DISCONNECTED]: "MetaMask is disconnected from this network",
  [ERROR_CODES.INVALID_PARAMS]: "Invalid request parameters",
  [ERROR_CODES.INTERNAL_ERROR]: "MetaMask encountered an internal error",
  [ERROR_CODES.INVALID_REQUEST]: "Invalid request format",
  [ERROR_CODES.METHOD_NOT_FOUND]: "This method is not available",
  [ERROR_CODES.RESOURCE_UNAVAILABLE]: "Resource not available. Please try again",
  [ERROR_CODES.TRANSACTION_REJECTED]: "Transaction was rejected",
};

export function getErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred";

  if (typeof error === "object" && error !== null) {
    const err = error as MetaMaskError;
    
    if (err.code && ERROR_MESSAGES[err.code]) {
      return ERROR_MESSAGES[err.code];
    }
    
    if (err.message) {
      if (err.message.includes("User rejected") || err.message.includes("user rejected")) {
        return "You declined the request in MetaMask";
      }
      if (err.message.includes("insufficient funds")) {
        return "Insufficient funds for this transaction";
      }
      if (err.message.includes("gas")) {
        return "Unable to estimate gas. The transaction may fail";
      }
      if (err.message.includes("nonce")) {
        return "Transaction nonce issue. Please try again";
      }
      return err.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

export function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as MetaMaskError;
  return err.code === ERROR_CODES.USER_REJECTED || 
         (err.message?.includes("User rejected") ?? false) ||
         (err.message?.includes("user rejected") ?? false) ||
         (err.message?.includes("denied") ?? false);
}

export function isChainError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as MetaMaskError;
  return err.code === ERROR_CODES.CHAIN_DISCONNECTED ||
         (err.message?.includes("chain") ?? false) ||
         (err.message?.includes("network") ?? false);
}

export function isInsufficientFundsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as MetaMaskError;
  return (err.message?.includes("insufficient funds") ?? false) ||
         (err.message?.includes("Insufficient") ?? false);
}
