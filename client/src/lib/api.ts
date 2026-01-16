import { getCsrf, resetCsrf } from './csrf';
import { isMobileApp } from './platform';

export async function postJson(url: string, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (isMobileApp()) {
    headers['X-Requested-From'] = 'mobile-app';
  }
  
  const doCall = async (token: string) => {
    headers['x-csrf-token'] = token;
    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  };
  
  let token: string;
  try {
    token = await getCsrf();
  } catch (csrfError) {
    console.error('[API] CSRF token fetch failed:', csrfError);
    throw new Error('Session expired. Please refresh the page and try again.');
  }
  
  let resp = await doCall(token);
  
  if (resp.status === 403) {
    console.log('[API] 403 received, retrying with fresh CSRF token');
    resetCsrf();
    try {
      token = await getCsrf();
    } catch (csrfError) {
      console.error('[API] CSRF token refresh failed:', csrfError);
      throw new Error('Session expired. Please refresh the page and try again.');
    }
    resp = await doCall(token);
  }
  
  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({}));
    const errorMessage = errorBody.message || `Request failed (${resp.status})`;
    console.error('[API] Request failed:', { url, status: resp.status, error: errorMessage });
    throw new Error(errorMessage);
  }
  
  return resp.json();
}