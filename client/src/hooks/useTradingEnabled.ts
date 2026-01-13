import { useAuth } from './useAuth';

const TRADING_WHITELIST_EMAILS = [
  'scapota@flint-investing.com'
];

export function useTradingEnabled(): boolean {
  const { user } = useAuth();
  
  if (!user?.email) return false;
  
  return TRADING_WHITELIST_EMAILS.includes(user.email.toLowerCase());
}
