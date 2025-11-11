export interface ClassifiedError {
  isTransient: boolean;
  shouldRetry: boolean;
  shouldMarkDisconnected: boolean;
  userMessage: string;
  errorCode: string;
}

export function classifySnapTradeError(error: any): ClassifiedError {
  const status = error.response?.status || error.statusCode || 500;
  const errorBody = error.response?.data || {};
  const errorCode = errorBody.error_code || errorBody.code || 'UNKNOWN';
  
  // Transient errors - retry without marking disconnected
  if (
    status === 408 || // Request timeout
    status === 429 || // Rate limit
    status === 503 || // Service unavailable
    status === 504 || // Gateway timeout
    errorCode === 'SNAPTRADE_TEMPORARY_ERROR' ||
    errorCode === 'TIMEOUT' ||
    errorCode === 'RATE_LIMIT'
  ) {
    return {
      isTransient: true,
      shouldRetry: true,
      shouldMarkDisconnected: false,
      userMessage: 'Service temporarily unavailable. Please try again in a moment.',
      errorCode: 'TEMPORARY_ERROR'
    };
  }
  
  // Permanent auth failures - mark disconnected
  if (
    status === 401 || 
    status === 403 || 
    errorCode === 'INVALID_CREDENTIALS' ||
    errorCode === 'ACCESS_REVOKED' ||
    errorCode === 'AUTHORIZATION_EXPIRED'
  ) {
    return {
      isTransient: false,
      shouldRetry: false,
      shouldMarkDisconnected: true,
      userMessage: 'Account authorization expired. Please reconnect your account.',
      errorCode: 'AUTH_EXPIRED'
    };
  }
  
  // 404 could be transient or permanent - treat as transient initially
  if (status === 404) {
    return {
      isTransient: true,
      shouldRetry: true,
      shouldMarkDisconnected: false,
      userMessage: 'Account data temporarily unavailable. Please try again.',
      errorCode: 'TEMPORARY_UNAVAILABLE'
    };
  }
  
  // Unknown errors - don't mark disconnected, allow retry
  return {
    isTransient: false,
    shouldRetry: true,
    shouldMarkDisconnected: false,
    userMessage: 'Failed to load account details. Please try again.',
    errorCode: 'FETCH_FAILED'
  };
}
