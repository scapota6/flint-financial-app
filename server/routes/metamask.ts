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
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const userEmail = req.user?.claims?.email;
    
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
          isActive: true,
          lastSynced: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, existing[0].id))
        .returning();
      
      console.log('[MetaMask] Wallet updated:', { userId, walletAddress: walletAddress.toLowerCase(), accountId: updated[0].id });
      
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
    
    console.log('[MetaMask] Wallet connected:', { userId, walletAddress: walletAddress.toLowerCase(), accountId: newAccount[0].id });
    
    return res.json({ 
      success: true, 
      account: newAccount[0],
      message: 'Wallet connected successfully'
    });
    
  } catch (error: any) {
    console.error('[MetaMask] Failed to connect wallet:', error.message);
    return res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

/**
 * Sync MetaMask holdings
 * POST /api/connections/metamask/sync
 */
router.post('/sync', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const userEmail = req.user?.claims?.email;
    
    if (!userId || !isInternalTester(userEmail)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { walletAddress, ethBalance, ethPrice, tokens } = req.body;
    
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
    
    // Update account balance and ensure active status
    await db.update(connectedAccounts)
      .set({
        balance: ethBalance?.toString() || '0',
        status: 'connected',
        isActive: true,
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
      // Use real ETH price from Ethplorer API (passed by frontend)
      const ethPriceNum = parseFloat(ethPrice) || 0;
      const marketValue = ethBalanceNum * ethPriceNum;
      
      await db.insert(holdings).values({
        userId,
        accountId,
        symbol: 'ETH',
        name: 'Ethereum',
        assetType: 'crypto',
        quantity: ethBalanceNum.toString(),
        averagePrice: '0', // Cost basis unknown from wallet
        currentPrice: ethPriceNum.toString(),
        marketValue: marketValue.toString(),
        gainLoss: '0', // Unknown without cost basis
        gainLossPercentage: '0',
      });
    }
    
    // Spam token filter - common patterns used by airdrop scams
    const isSpamToken = (symbol: string, name: string, usdValue: number, quantity: number) => {
      const combined = `${symbol} ${name}`.toLowerCase();
      const spamPatterns = [
        // URL patterns
        'visit', 'website', '.org', '.com', '.fund', '.io', '.net', '.xyz',
        'https://', 'http://', 'www.',
        // Scam keywords
        'claim', 'reward', 'airdrop', 'free', 'bonus', 'ticket', 'holder',
        // Known spam tokens
        'catcoin', 'floki', '$cat', 'aicc', 'ai chain', 'gainuni', 'shiba',
        // Other suspicious patterns
        'voucher', 'prize', 'win', 'gift', 'earn'
      ];
      // Filter tokens with zero USD value but very large quantities (classic airdrop spam)
      const isLargeQuantityNoValue = usdValue < 0.01 && quantity > 10000;
      return spamPatterns.some(pattern => combined.includes(pattern)) || isLargeQuantityNoValue;
    };
    
    // Add token holdings with USD values from Ethplorer
    if (tokens && Array.isArray(tokens)) {
      for (const token of tokens) {
        const tokenBalance = parseFloat(token.balance) || 0;
        if (tokenBalance > 0) {
          const usdPrice = token.usdPrice || 0;
          const usdValue = token.usdValue || (tokenBalance * usdPrice);
          
          // Skip spam tokens
          if (isSpamToken(token.symbol || '', token.name || '', usdValue, tokenBalance)) {
            console.log('[MetaMask] Filtered spam token:', token.symbol);
            continue;
          }
          
          await db.insert(holdings).values({
            userId,
            accountId,
            symbol: token.symbol,
            name: token.name || token.symbol,
            assetType: 'crypto',
            quantity: tokenBalance.toString(),
            averagePrice: '0', // Cost basis unknown
            currentPrice: usdPrice.toString(),
            marketValue: usdValue.toString(),
            gainLoss: '0', // Unknown without cost basis
            gainLossPercentage: '0',
          });
        }
      }
    }
    
    console.log('[MetaMask] Holdings synced:', { userId, walletAddress: walletAddress.toLowerCase(), ethBalance: ethBalanceNum, tokenCount: tokens?.length || 0 });
    
    return res.json({ 
      success: true, 
      message: 'Holdings synced successfully'
    });
    
  } catch (error: any) {
    console.error('[MetaMask] Failed to sync holdings:', error.message);
    return res.status(500).json({ error: 'Failed to sync holdings' });
  }
});

/**
 * Disconnect MetaMask wallet
 * DELETE /api/connections/metamask/:walletAddress
 */
router.delete('/:walletAddress', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const userEmail = req.user?.claims?.email;
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
    
    console.log('[MetaMask] Wallet disconnected:', { userId, walletAddress: walletAddress.toLowerCase() });
    
    return res.json({ 
      success: true, 
      message: 'Wallet disconnected successfully'
    });
    
  } catch (error: any) {
    console.error('[MetaMask] Failed to disconnect wallet:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

/**
 * Proxy Ethplorer API request (avoids CSP issues in browser)
 * GET /api/connections/metamask/ethplorer/:walletAddress
 */
router.get('/ethplorer/:walletAddress', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const userEmail = req.user?.claims?.email;
    
    if (!userId || !isInternalTester(userEmail)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { walletAddress } = req.params;
    
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Fetch from Ethplorer API (free tier)
    const response = await fetch(
      `https://api.ethplorer.io/getAddressInfo/${walletAddress}?apiKey=freekey`
    );
    
    if (!response.ok) {
      throw new Error(`Ethplorer API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[MetaMask] Ethplorer proxy response:', { 
      wallet: walletAddress.slice(0, 10) + '...', 
      ethBalance: data.ETH?.balance,
      tokenCount: data.tokens?.length || 0 
    });
    
    return res.json(data);
    
  } catch (error: any) {
    console.error('[MetaMask] Ethplorer proxy failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch wallet data' });
  }
});

export default router;
