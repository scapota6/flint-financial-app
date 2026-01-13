import { Request, Response, NextFunction } from 'express';

const TRADING_WHITELIST_EMAILS = [
  'scapota@flint-investing.com'
];

export function tradingFeatureGate(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authentication required' 
      } 
    });
  }
  
  const email = user.claims?.email?.toLowerCase();
  
  if (!email || !TRADING_WHITELIST_EMAILS.includes(email)) {
    return res.status(403).json({ 
      error: { 
        code: 'TRADING_NOT_ENABLED', 
        message: 'Trading is not available for your account yet. Contact support for early access.' 
      } 
    });
  }
  
  next();
}

export function checkTradingEnabled(email: string | undefined): boolean {
  if (!email) return false;
  return TRADING_WHITELIST_EMAILS.includes(email.toLowerCase());
}
