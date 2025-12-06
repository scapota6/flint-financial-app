/**
 * MetaMask Wallet Connection Routes
 * 
 * Handles registering MetaMask wallets as connected accounts in Flint.
 * Only available to internal testers.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/jwt-auth';
import { db } from '../db';
import { connectedAccounts, holdings } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { canAccessFeature } from '@shared/feature-flags';

const router = Router();

// Internal testers only
const INTERNAL_TESTERS = ['scapota@flint-investing.com', 'seba.rod136@gmail.com'];

function isInternalTester(email: string | undefined): boolean {
  return email ? INTERNAL_TESTERS.includes(email.toLowerCase()) : false;
}

/**
 * Connect MetaMask wallet
 * POST /api/connections/metamask
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Only allow internal testers
    if (!isInternalTester(userEmail)) {
      return res.status(403).json({ error: 'MetaMask integration not available for this account' });
    }
    
    const { walletAddress, chainId, ethBalance } = req.body;
    
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Check if this wallet is already connected for this user
    const existing = await db.select()
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, userId),
        eq(connectedAccounts.provider, 'metamask'),
        eq(connectedAccounts.externalAccountId, walletAddress.toLowerCase())
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing connection
      const updated = await db.update(connectedAccounts)
        .set({
          balance: ethBalance?.toString() || '0',
          status: 'connected',
          lastSynced: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, existing[0].id))
        .returning();
      
      logger.info({
        message: 'MetaMask wallet updated',
        userId,
        walletAddress: walletAddress.toLowerCase(),
        accountId: updated[0].id,
      });
      
      return res.json({ 
        success: true, 
        account: updated[0],
        message: 'Wallet connection updated'
      });
    }
    
    // Create new connection
    const shortenedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    
    const newAccount = await db.insert(connectedAccounts).values({
      userId,
      accountType: 'crypto',
      provider: 'metamask',
      institutionName: 'MetaMask',
      accountName: `MetaMask (${shortenedAddress})`,
      balance: ethBalance?.toString() || '0',
      currency: 'ETH',
      isActive: true,
      status: 'connected',
      externalAccountId: walletAddress.toLowerCase(),
      connectionId: `metamask-${walletAddress.toLowerCase()}`,
      lastSynced: new Date(),
    }).returning();
    
    logger.info({
      message: 'MetaMask wallet connected',
      userId,
      walletAddress: walletAddress.toLowerCase(),
      accountId: newAccount[0].id,
    });
    
    return res.json({ 
      success: true, 
      account: newAccount[0],
      message: 'Wallet connected successfully'
    });
    
  } catch (error: any) {
    logger.error({
      message: 'Failed to connect MetaMask wallet',
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

/**
 * Sync MetaMask holdings
 * POST /api/connections/metamask/sync
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!userId || !isInternalTester(userEmail)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { walletAddress, ethBalance, tokens } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Find the connected account
    const account = await db.select()
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, userId),
        eq(connectedAccounts.provider, 'metamask'),
        eq(connectedAccounts.externalAccountId, walletAddress.toLowerCase())
      ))
      .limit(1);
    
    if (account.length === 0) {
      return res.status(404).json({ error: 'Wallet not found. Please connect first.' });
    }
    
    const accountId = account[0].id;
    
    // Update account balance
    await db.update(connectedAccounts)
      .set({
        balance: ethBalance?.toString() || '0',
        lastSynced: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));
    
    // Clear old holdings for this account
    await db.delete(holdings)
      .where(eq(holdings.accountId, accountId));
    
    // Add ETH holding if balance > 0
    const ethBalanceNum = parseFloat(ethBalance) || 0;
    if (ethBalanceNum > 0) {
      // TODO: Get real ETH price from market data service
      const ethPrice = 2200; // Placeholder - should use market data service
      const marketValue = ethBalanceNum * ethPrice;
      
      await db.insert(holdings).values({
        userId,
        accountId,
        symbol: 'ETH',
        name: 'Ethereum',
        assetType: 'crypto',
        quantity: ethBalanceNum.toString(),
        averagePrice: '0', // Cost basis unknown from wallet
        currentPrice: ethPrice.toString(),
        marketValue: marketValue.toString(),
        gainLoss: '0', // Unknown without cost basis
        gainLossPercentage: '0',
      });
    }
    
    // Add token holdings
    if (tokens && Array.isArray(tokens)) {
      for (const token of tokens) {
        if (token.balance && parseFloat(token.balance) > 0) {
          // TODO: Get real token prices
          await db.insert(holdings).values({
            userId,
            accountId,
            symbol: token.symbol,
            name: token.name || token.symbol,
            assetType: 'crypto',
            quantity: token.balance,
            averagePrice: '0',
            currentPrice: '0',
            marketValue: '0',
            gainLoss: '0',
            gainLossPercentage: '0',
          });
        }
      }
    }
    
    logger.info({
      message: 'MetaMask holdings synced',
      userId,
      walletAddress: walletAddress.toLowerCase(),
      ethBalance: ethBalanceNum,
      tokenCount: tokens?.length || 0,
    });
    
    return res.json({ 
      success: true, 
      message: 'Holdings synced successfully'
    });
    
  } catch (error: any) {
    logger.error({
      message: 'Failed to sync MetaMask holdings',
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to sync holdings' });
  }
});

/**
 * Disconnect MetaMask wallet
 * DELETE /api/connections/metamask/:walletAddress
 */
router.delete('/:walletAddress', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const { walletAddress } = req.params;
    
    if (!userId || !isInternalTester(userEmail)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Find and delete the connection
    const account = await db.select()
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, userId),
        eq(connectedAccounts.provider, 'metamask'),
        eq(connectedAccounts.externalAccountId, walletAddress.toLowerCase())
      ))
      .limit(1);
    
    if (account.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Delete holdings first
    await db.delete(holdings)
      .where(eq(holdings.accountId, account[0].id));
    
    // Delete the account
    await db.delete(connectedAccounts)
      .where(eq(connectedAccounts.id, account[0].id));
    
    logger.info({
      message: 'MetaMask wallet disconnected',
      userId,
      walletAddress: walletAddress.toLowerCase(),
    });
    
    return res.json({ 
      success: true, 
      message: 'Wallet disconnected successfully'
    });
    
  } catch (error: any) {
    logger.error({
      message: 'Failed to disconnect MetaMask wallet',
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

export default router;
