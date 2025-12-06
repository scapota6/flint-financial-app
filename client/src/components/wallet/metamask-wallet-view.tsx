/**
 * MetaMask Wallet View Component
 * 
 * Displays wallet balance, token holdings, and transaction capability.
 * Only visible to internal testers when MetaMask is connected.
 */

import { useState, useEffect, useCallback } from "react";
import { useSDK } from "@metamask/sdk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canAccessFeature } from "@/lib/feature-flags";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Chain ID to name mapping
const CHAIN_NAMES: Record<string, string> = {
  '0x1': 'Ethereum Mainnet',
  '0x5': 'Goerli Testnet',
  '0xaa36a7': 'Sepolia Testnet',
  '0x89': 'Polygon',
  '0xa86a': 'Avalanche',
  '0xa4b1': 'Arbitrum One',
  '0xa': 'Optimism',
  '0x38': 'BNB Smart Chain',
};

// Ethplorer API for discovering all tokens in wallet (free tier)
const ETHPLORER_API_KEY = 'freekey';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdValue?: number;
  usdPrice?: number;
}

// Format wei to ETH
function formatEther(wei: string): string {
  const etherValue = parseInt(wei, 16) / 1e18;
  return etherValue.toFixed(4);
}

// Format address for display
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface MetaMaskWalletViewProps {
  compact?: boolean;
}

export function MetaMaskWalletView({ compact = false }: MetaMaskWalletViewProps) {
  const { sdk, connected, account, chainId, provider } = useSDK();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Token balances state
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(0);
  
  // Send transaction state
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Check access
  const hasAccess = canAccessFeature('metamask', user?.email);
  const isConnected = connected && account;

  // Fetch ETH balance
  const fetchBalance = useCallback(async () => {
    if (!provider || !account) return;
    
    setIsLoadingBalance(true);
    try {
      const balanceHex = await provider.request({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      }) as string;
      
      setBalance(formatEther(balanceHex));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast({
        title: "Failed to fetch balance",
        description: "Could not retrieve your wallet balance",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBalance(false);
    }
  }, [provider, account, toast]);

  // Fetch ALL token balances using Ethplorer API (discovers all tokens in wallet)
  const fetchTokenBalances = useCallback(async () => {
    if (!account || chainId !== '0x1') {
      setTokenBalances([]);
      return;
    }
    
    setIsLoadingTokens(true);
    
    try {
      // Use Ethplorer to get all tokens in the wallet
      const response = await fetch(
        `https://api.ethplorer.io/getAddressInfo/${account}?apiKey=${ETHPLORER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet info from Ethplorer');
      }
      
      const data = await response.json();
      
      // Extract ETH price from Ethplorer response
      if (data.ETH?.price?.rate) {
        setEthPrice(data.ETH.price.rate);
        console.log(`[MetaMask] ETH price from Ethplorer: $${data.ETH.price.rate.toFixed(2)}`);
      }
      
      // Process token balances from Ethplorer response
      const balances: TokenBalance[] = [];
      
      if (data.tokens && Array.isArray(data.tokens)) {
        for (const token of data.tokens) {
          const decimals = parseInt(token.tokenInfo?.decimals || '18');
          const rawBalance = parseFloat(token.balance || '0');
          const actualBalance = rawBalance / Math.pow(10, decimals);
          
          // Only include tokens with non-zero balance
          if (actualBalance > 0) {
            const usdPrice = token.tokenInfo?.price?.rate || 0;
            const usdValue = actualBalance * usdPrice;
            
            balances.push({
              symbol: token.tokenInfo?.symbol || 'UNKNOWN',
              name: token.tokenInfo?.name || 'Unknown Token',
              balance: actualBalance < 0.0001 ? '<0.0001' : actualBalance.toFixed(4),
              decimals: decimals,
              usdPrice: usdPrice,
              usdValue: usdValue,
            });
          }
        }
      }
      
      // Sort by USD value (highest first)
      balances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
      
      console.log(`[MetaMask] Found ${balances.length} tokens in wallet via Ethplorer`);
      setTokenBalances(balances);
      
    } catch (error) {
      console.error('Failed to fetch token balances from Ethplorer:', error);
      setTokenBalances([]);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [account, chainId]);

  // Fetch all balances - ETH first, then tokens with delay
  const fetchAllBalances = useCallback(async () => {
    await fetchBalance();
    // Small delay before fetching tokens to avoid rate limits
    setTimeout(() => fetchTokenBalances(), 1000);
  }, [fetchBalance, fetchTokenBalances]);

  // Fetch balance on mount and when account changes
  useEffect(() => {
    if (connected && account && provider) {
      fetchAllBalances();
    }
  }, [connected, account, provider, fetchAllBalances]);

  // Register wallet with backend when connected
  useEffect(() => {
    const registerWallet = async () => {
      if (!connected || !account || !hasAccess) return;
      
      try {
        await apiRequest('/api/connections/metamask', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: account,
            chainId: chainId,
            ethBalance: balance || '0',
          }),
        });
        
        // Invalidate accounts queries to refresh the dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/snaptrade/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        
      } catch (error) {
        console.error('Failed to register wallet with backend:', error);
      }
    };
    
    // Only register after balance is fetched
    if (balance !== null) {
      registerWallet();
    }
  }, [connected, account, chainId, balance, hasAccess]);

  // Sync holdings when balances change
  useEffect(() => {
    const syncHoldings = async () => {
      if (!connected || !account || !hasAccess || balance === null) return;
      
      try {
        await apiRequest('/api/connections/metamask/sync', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: account,
            ethBalance: balance,
            ethPrice: ethPrice,
            tokens: tokenBalances.map(t => ({
              symbol: t.symbol,
              name: t.name,
              balance: t.balance,
              usdPrice: t.usdPrice || 0,
              usdValue: t.usdValue || 0,
            })),
          }),
        });
        
        // Invalidate holdings to refresh portfolio
        queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio-holdings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        
      } catch (error) {
        console.error('Failed to sync holdings:', error);
      }
    };
    
    // Debounce the sync - only sync after token balances are loaded
    if (balance !== null && !isLoadingTokens && ethPrice > 0) {
      syncHoldings();
    }
  }, [connected, account, balance, tokenBalances, isLoadingTokens, hasAccess, ethPrice]);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [account, toast]);

  // Send ETH transaction
  const sendTransaction = useCallback(async () => {
    if (!provider || !account || !sendTo || !sendAmount) return;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }
    
    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    try {
      const weiValue = BigInt(Math.floor(amountNum * 1e18));
      const hexValue = '0x' + weiValue.toString(16);
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: sendTo,
          value: hexValue,
        }],
      });
      
      toast({
        title: "Transaction Sent",
        description: `TX: ${shortenAddress(txHash as string)}`,
      });
      
      setSendTo('');
      setSendAmount('');
      setShowSendForm(false);
      
      setTimeout(fetchAllBalances, 3000);
      
    } catch (error: any) {
      console.error('Transaction failed:', error);
      if (!error?.message?.includes('User rejected') && !error?.message?.includes('denied')) {
        toast({
          title: "Transaction Failed",
          description: error?.message || "Failed to send transaction",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [provider, account, sendTo, sendAmount, toast, fetchAllBalances]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      // Remove from backend first
      if (account) {
        try {
          await apiRequest(`/api/connections/metamask/${account}`, {
            method: 'DELETE',
          });
          
          // Invalidate queries to refresh dashboard
          queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
          queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        } catch (backendError) {
          console.warn('Failed to remove wallet from backend:', backendError);
        }
      }
      
      await sdk?.terminate();
      toast({
        title: "Wallet Disconnected",
        description: "Your MetaMask wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [sdk, account, toast]);

  // Early returns AFTER all hooks
  if (!hasAccess) {
    return null;
  }

  if (!isConnected) {
    return null;
  }

  const chainName = chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : 'Unknown';

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-[#F6851B] flex items-center justify-center">
          <span className="text-white text-xs font-bold">MM</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white truncate">
              {shortenAddress(account)}
            </span>
            <Badge variant="outline" className="text-xs">
              {chainName}
            </Badge>
          </div>
          <div className="text-sm text-gray-400">
            {isLoadingBalance ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span>{balance || '0'} ETH</span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={copyAddress}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  // Full card version
  return (
    <Card className="trade-card" data-testid="card-metamask-wallet">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F6851B] flex items-center justify-center">
              <span className="text-white text-sm font-bold">MM</span>
            </div>
            <div>
              <CardTitle className="text-lg text-white">MetaMask Wallet</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{chainName}</Badge>
                <span className="text-green-400 text-xs">● Connected</span>
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchAllBalances}
            disabled={isLoadingBalance || isLoadingTokens}
          >
            <RefreshCw className={`h-4 w-4 ${(isLoadingBalance || isLoadingTokens) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
              <p className="font-mono text-sm text-white" data-testid="text-wallet-address">
                {shortenAddress(account)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={copyAddress} data-testid="button-copy-address">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
                data-testid="button-view-etherscan"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ETH Balance */}
        <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">ETH Balance</p>
          <div className="flex items-baseline gap-2">
            {isLoadingBalance ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <>
                <span className="text-2xl font-bold text-white" data-testid="text-eth-balance">
                  {balance || '0'}
                </span>
                <span className="text-gray-400">ETH</span>
              </>
            )}
          </div>
        </div>

        {/* Token Holdings */}
        {chainId === '0x1' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Token Holdings</p>
              {isLoadingTokens && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </div>
            
            {tokenBalances.length > 0 ? (
              <div className="space-y-2">
                {tokenBalances.map((token) => (
                  <div 
                    key={token.symbol}
                    className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                    data-testid={`token-${token.symbol.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-xs text-white">{token.symbol[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{token.symbol}</p>
                        <p className="text-xs text-gray-500">{token.name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-white">{token.balance}</span>
                  </div>
                ))}
              </div>
            ) : !isLoadingTokens ? (
              <p className="text-xs text-gray-500 text-center py-2">No token balances found</p>
            ) : null}
          </div>
        )}

        {chainId !== '0x1' && (
          <div className="p-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Token balances only available on Ethereum Mainnet
            </p>
          </div>
        )}

        <Separator className="bg-gray-700" />

        {/* Send Transaction */}
        {showSendForm ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="sendTo" className="text-gray-300">Recipient Address</Label>
              <Input
                id="sendTo"
                placeholder="0x..."
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white font-mono"
                data-testid="input-send-to"
              />
            </div>
            <div>
              <Label htmlFor="sendAmount" className="text-gray-300">Amount (ETH)</Label>
              <Input
                id="sendAmount"
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-send-amount"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={sendTransaction}
                disabled={isSending || !sendTo || !sendAmount}
                className="flex-1 bg-[#F6851B] hover:bg-[#E2761B]"
                data-testid="button-confirm-send"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSendForm(false)}
                className="border-gray-600"
                data-testid="button-cancel-send"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowSendForm(true)}
            variant="outline"
            className="w-full border-gray-600 hover:bg-gray-800"
            data-testid="button-show-send-form"
          >
            <Send className="h-4 w-4 mr-2" />
            Send ETH
          </Button>
        )}

        {/* Disconnect */}
        <Button
          variant="ghost"
          onClick={disconnect}
          className="w-full text-gray-400 hover:text-red-400 hover:bg-red-900/20"
          data-testid="button-disconnect-wallet"
        >
          Disconnect Wallet
        </Button>
      </CardContent>
    </Card>
  );
}

export default MetaMaskWalletView;
