import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { getCsrfToken, invalidateCsrf } from './csrf';
import { requestJSON } from './http';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const base = '';
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const headers: any = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Add Content-Type header when sending JSON body
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')) {
    const csrfToken = await getCsrfToken();
    headers['x-csrf-token'] = csrfToken; // csurf reads from this header by default
  }

  // For GET requests or when the caller expects a Response object, return the Response
  if (!options.method || options.method === 'GET') {
    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      credentials: 'include', // keep cookies/session
      ...options,
    });

    // Handle CSRF mismatch - refresh token and caller can retry
    if (resp.status === 403) {
      invalidateCsrf();
    }

    return resp; // callers can do resp.ok / resp.json()
  }

  // For state-changing requests, use defensive JSON parsing
  try {
    return await requestJSON(url, {
      ...options,
      headers,
    });
  } catch (error: any) {
    // Handle CSRF token expiry
    if (error.message?.includes('403') || error.message?.includes('CSRF')) {
      invalidateCsrf();
      // Get new token and retry once
      const newToken = await getCsrfToken();
      headers['x-csrf-token'] = newToken;
      
      return await requestJSON(url, {
        ...options,
        headers,
      });
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // First element is the URL path, subsequent elements are query params (if objects)
    const [url, ...rest] = queryKey;
    let finalUrl = url as string;
    
    // If there are additional elements and they're objects, convert to query string
    if (rest.length > 0 && typeof rest[0] === 'object' && rest[0] !== null) {
      const params = new URLSearchParams();
      Object.entries(rest[0] as Record<string, any>).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${url}?${queryString}`;
      }
    }
    
    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Optimized staleTime based on data volatility
      staleTime: 60 * 1000, // Default 1 minute for most data
      gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes (was cacheTime)
      // Optimized refetch settings to minimize unnecessary requests
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab (reduces bandwidth)
      refetchOnReconnect: false, // Don't refetch when connection restored (reduces server load)
      refetchInterval: false, // No automatic polling by default
      retry: (failureCount: number, error: any) => {
        // Don't retry beyond 3 attempts
        if (failureCount >= 3) return false;
        
        // Only retry on specific error codes (429 rate limit, 502/503/504 server errors)
        const status = error?.response?.status || error?.status;
        return status === 429 || status === 502 || status === 503 || status === 504;
      },
      retryDelay: (attemptIndex: number) => {
        // Exponential backoff with jitter: baseDelay * 2^attempt + random jitter
        const baseDelay = 1000; // 1 second
        const maxDelay = 10000; // 10 seconds
        const jitterMax = 1000; // 1 second jitter
        
        const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
        const cappedDelay = Math.min(exponentialDelay, maxDelay);
        const jitter = Math.random() * jitterMax;
        
        return cappedDelay + jitter;
      },
    },
    mutations: {
      retry: (failureCount: number, error: any) => {
        if (failureCount >= 2) return false;
        const status = error?.response?.status || error?.status;
        return status === 429 || status === 502 || status === 503 || status === 504;
      },
    },
  },
});

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  // Only throw on non-2xx:
  if (!res.ok) {
    // Try to parse JSON error, but don't break if it's HTML
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  // Defensive JSON parse:
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // If server ever responds HTML by mistake, surface a helpful hint:
    throw new Error('Server returned non-JSON (check route order / SPA catch-all)');
  }
}
