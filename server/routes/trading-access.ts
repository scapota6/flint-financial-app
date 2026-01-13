import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { checkTradingEnabled } from '../middleware/tradingFeatureGate';

const router = Router();

router.get('/trading-enabled', isAuthenticated, (req: any, res) => {
  const email = req.user?.claims?.email;
  const enabled = checkTradingEnabled(email);
  
  res.json({ enabled });
});

export { router as tradingAccessRouter };
