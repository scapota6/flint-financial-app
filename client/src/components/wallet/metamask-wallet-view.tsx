/**
 * MetaMask Wallet View Component
 * 
 * Displays wallet balance, token holdings, and transaction capability.
 * Only visible to internal testers when MetaMask is connected.
 * 
 * Features:
 * - Event-driven updates (accountsChanged, chainChanged)
 * - Network awareness with chain switching
 * - ETH and ERC-20 token transfers
 * - Transaction lifecycle tracking
 * - User-friendly error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSDK } from "@metamask/sdk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCw, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canAccessFeature } from "@/lib/feature-flags";
import { Crown } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  setupEventListeners,
  getChainName,
  getBlockExplorerTxUrl,
  getBlockExplorerAddressUrl,
  switchChain,
  SUPPORTED_CHAINS,
  sendETH,
  sendERC20,
  pollTransactionStatus,
  getErrorMessage,
  isUserRejection,
  type TransactionState,
  type MetaMaskProvider,
} from "@/lib/metamask";

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: number;
  decimals: number;
  usdValue?: number;
  usdPrice?: number;
  contractAddress?: string;
}

function formatEther(wei: string): string {
  const etherValue = parseInt(wei, 16) / 1e18;
  return etherValue.toFixed(4);
}

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
  
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [ethBalanceMainnet, setEthBalanceMainnet] = useState<number>(0);
  
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [selectedToken, setSelectedToken] = useState<string>('ETH');
  
  const [pendingTxs, setPendingTxs] = useState<TransactionState[]>([]);
  
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  
  const pollCleanupRefs = useRef<Map<string, () => void>>(new Map());

  const hasAccess = canAccessFeature('metamask', user?.email);
  const isConnected = connected && account;

  // Check subscription tier for Pro features (sending tokens)
  // Use the user object from useAuth() which already includes subscriptionTier
  const userTier = (user as any)?.subscriptionTier || 'free';
  const isProTier = userTier === 'pro' || userTier === 'premium';
  
  useEffect(() => {
    return () => {
      pollCleanupRefs.current.forEach((cleanup) => cleanup());
      pollCleanupRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!provider || !isConnected) return;

    const cleanup = setupEventListeners(provider as unknown as MetaMaskProvider, {
      onAccountsChanged: (accounts) => {
        console.log('[MetaMask] Accounts changed:', accounts);
        if (accounts.length === 0) {
          toast({
            title: "Wallet Disconnected",
            description: "Your MetaMask wallet was disconnected",
          });
        } else {
          toast({
            title: "Account Changed",
            description: `Now using ${shortenAddress(accounts[0])}`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
          queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        }
      },
      onChainChanged: (newChainId) => {
        console.log('[MetaMask] Chain changed:', newChainId);
        const chainName = getChainName(newChainId);
        toast({
          title: "Network Changed",
          description: `Switched to ${chainName}`,
        });
      },
      onDisconnect: (error) => {
        console.log('[MetaMask] Disconnected:', error);
        toast({
          title: "Connection Lost",
          description: "MetaMask connection was lost. Please reconnect.",
          variant: "destructive",
        });
      },
    });

    return cleanup;
  }, [provider, isConnected, toast]);

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
        title: "Balance Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoadingBalance(false);
    }
  }, [provider, account, toast]);

  useEffect(() => {
    const doFetch = async () => {
      if (!account) {
        console.log('[MetaMask] No account, skipping fetch');
        return;
      }
      
      console.log('[MetaMask] Wallet connected, fetching from Ethplorer via backend...');
      
      try {
        const response = await fetch(`/api/connections/metamask/ethplorer/${account}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Ethplorer proxy error');
        }
        
        const data = await response.json();
        console.log('[MetaMask] Ethplorer data received:', {
          ethBalance: data.ETH?.balance,
          ethPrice: data.ETH?.price?.rate,
          tokenCount: data.tokens?.length || 0,
        });
        
        if (data.ETH?.price?.rate) {
          setEthPrice(data.ETH.price.rate);
        }
        if (data.ETH?.balance !== undefined) {
          setEthBalanceMainnet(parseFloat(data.ETH.balance) || 0);
        }
        
        const tokens: TokenBalance[] = [];
        if (data.tokens && Array.isArray(data.tokens)) {
          for (const token of data.tokens) {
            const decimals = parseInt(token.tokenInfo?.decimals || '18');
            const rawBalance = parseFloat(token.balance || '0');
            const actualBalance = rawBalance / Math.pow(10, decimals);
            
            if (actualBalance > 0) {
              const usdPrice = token.tokenInfo?.price?.rate || 0;
              const usdValue = actualBalance * usdPrice;
              
              tokens.push({
                symbol: token.tokenInfo?.symbol || 'UNKNOWN',
                name: token.tokenInfo?.name || 'Unknown Token',
                balance: actualBalance < 0.0001 ? '<0.0001' : actualBalance.toFixed(4),
                balanceRaw: actualBalance,
                decimals,
                usdPrice,
                usdValue,
                contractAddress: token.tokenInfo?.address,
              });
            }
          }
        }
        
        tokens.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
        console.log('[MetaMask] Processed tokens:', tokens.length);
        setTokenBalances(tokens);
        
      } catch (error) {
        console.error('[MetaMask] Ethplorer fetch failed:', error);
      } finally {
        setIsLoadingTokens(false);
      }
    };
    
    doFetch();
  }, [account]);

  useEffect(() => {
    if (provider && account) {
      console.log('[MetaMask] Provider ready, fetching ETH balance...');
      fetchBalance();
    }
  }, [provider, account, fetchBalance]);

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
        
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/snaptrade/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        
      } catch (error) {
        console.error('Failed to register wallet with backend:', error);
      }
    };
    
    if (balance !== null) {
      registerWallet();
    }
  }, [connected, account, chainId, balance, hasAccess]);

  useEffect(() => {
    const syncHoldings = async () => {
      if (!connected || !account || !hasAccess) return;
      
      const ethBalanceToSync = ethBalanceMainnet;
      
      console.log('[MetaMask] Syncing holdings:', {
        ethBalanceMainnet,
        ethPrice,
        tokenCount: tokenBalances.length,
      });
      
      try {
        await apiRequest('/api/connections/metamask/sync', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: account,
            ethBalance: ethBalanceToSync.toString(),
            ethPrice: ethPrice,
            tokens: tokenBalances.map(t => ({
              symbol: t.symbol,
              name: t.name,
              balance: t.balanceRaw.toString(),
              usdPrice: t.usdPrice || 0,
              usdValue: t.usdValue || 0,
            })),
          }),
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio-holdings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        
      } catch (error) {
        console.error('Failed to sync holdings:', error);
      }
    };
    
    if (!isLoadingTokens && ethPrice > 0) {
      syncHoldings();
    }
  }, [connected, account, ethBalanceMainnet, tokenBalances, isLoadingTokens, hasAccess, ethPrice]);

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

  const handleSwitchToMainnet = useCallback(async () => {
    if (!provider) return;
    
    setIsSwitchingChain(true);
    try {
      const result = await switchChain(provider as unknown as MetaMaskProvider, '0x1');
      if (!result.success && !result.userRejected) {
        toast({
          title: "Network Switch Failed",
          description: result.error || "Could not switch network",
          variant: "destructive",
        });
      }
    } finally {
      setIsSwitchingChain(false);
    }
  }, [provider, toast]);

  const sendTransaction = useCallback(async () => {
    if (!provider || !account || !sendTo || !sendAmount) return;
    
    setIsSending(true);
    try {
      let result;
      
      if (selectedToken === 'ETH') {
        result = await sendETH(
          provider as unknown as MetaMaskProvider,
          account,
          sendTo,
          sendAmount
        );
      } else {
        const token = tokenBalances.find(t => t.symbol === selectedToken);
        if (!token?.contractAddress) {
          toast({
            title: "Token Error",
            description: "Token contract address not found",
            variant: "destructive",
          });
          return;
        }
        
        result = await sendERC20(
          provider as unknown as MetaMaskProvider,
          account,
          sendTo,
          token.contractAddress,
          sendAmount,
          token.decimals
        );
      }
      
      if (result.userRejected) {
        return;
      }
      
      if (!result.success) {
        toast({
          title: "Transaction Failed",
          description: result.error || "Could not send transaction",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Transaction Sent",
        description: `TX: ${shortenAddress(result.txHash!)}`,
      });
      
      const txHash = result.txHash!;
      const newTx: TransactionState = {
        txHash,
        status: 'pending',
      };
      setPendingTxs(prev => [...prev, newTx]);
      
      const cancelPoll = pollTransactionStatus(
        provider as unknown as MetaMaskProvider,
        txHash,
        (state) => {
          setPendingTxs(prev => 
            prev.map(tx => tx.txHash === state.txHash ? state : tx)
          );
          
          if (state.status === 'confirmed') {
            toast({
              title: "Transaction Confirmed",
              description: `TX ${shortenAddress(state.txHash)} confirmed!`,
            });
            fetchBalance();
            pollCleanupRefs.current.delete(state.txHash);
          } else if (state.status === 'failed') {
            toast({
              title: "Transaction Failed",
              description: `TX ${shortenAddress(state.txHash)} failed`,
              variant: "destructive",
            });
            pollCleanupRefs.current.delete(state.txHash);
          }
        }
      );
      
      pollCleanupRefs.current.set(txHash, cancelPoll);
      
      setSendTo('');
      setSendAmount('');
      setShowSendForm(false);
      setSelectedToken('ETH');
      
    } catch (error: any) {
      console.error('Transaction failed:', error);
      if (!isUserRejection(error)) {
        toast({
          title: "Transaction Failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [provider, account, sendTo, sendAmount, selectedToken, tokenBalances, toast, fetchBalance]);

  const disconnect = useCallback(async () => {
    try {
      if (account) {
        try {
          await apiRequest(`/api/connections/metamask/${account}`, {
            method: 'DELETE',
          });
          
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

  const clearCompletedTxs = useCallback(() => {
    setPendingTxs(prev => prev.filter(tx => tx.status === 'pending'));
  }, []);

  if (!hasAccess) {
    return null;
  }

  if (!isConnected) {
    return null;
  }

  const chainName = getChainName(chainId);
  const explorerUrl = getBlockExplorerAddressUrl(chainId, account);
  const isMainnet = chainId === '0x1';

  const getSelectedTokenBalance = () => {
    if (selectedToken === 'ETH') {
      return balance || '0';
    }
    const token = tokenBalances.find(t => t.symbol === selectedToken);
    return token?.balance || '0';
  };

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
            onClick={() => { fetchBalance(); }}
            disabled={isLoadingBalance || isLoadingTokens}
          >
            <RefreshCw className={`h-4 w-4 ${(isLoadingBalance || isLoadingTokens) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
              {explorerUrl && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => window.open(explorerUrl, '_blank')}
                  data-testid="button-view-etherscan"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

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
                {ethPrice > 0 && balance && (
                  <span className="text-sm text-gray-500">
                    (${(parseFloat(balance) * ethPrice).toFixed(2)})
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Token Holdings (Mainnet)</p>
            {isLoadingTokens && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
          
          {tokenBalances.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
                  <div className="text-right">
                    <span className="text-sm font-mono text-white">{token.balance}</span>
                    {token.usdValue && token.usdValue > 0 && (
                      <p className="text-xs text-gray-400">${token.usdValue.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoadingTokens ? (
            <p className="text-xs text-gray-500 text-center py-2">No token balances found</p>
          ) : null}
        </div>

        {!isMainnet && (
          <div className="p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Switch to Mainnet for live balances
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchToMainnet}
                disabled={isSwitchingChain}
                className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                data-testid="button-switch-mainnet"
              >
                {isSwitchingChain ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    Switch
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {pendingTxs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Recent Transactions</p>
              {pendingTxs.some(tx => tx.status !== 'pending') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCompletedTxs}
                  className="text-xs text-gray-500 h-5 px-1"
                >
                  Clear
                </Button>
              )}
            </div>
            {pendingTxs.slice(-3).reverse().map((tx) => {
              const txUrl = getBlockExplorerTxUrl(chainId, tx.txHash);
              return (
                <div 
                  key={tx.txHash}
                  className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {tx.status === 'pending' && <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />}
                    {tx.status === 'confirmed' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                    {tx.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="font-mono text-xs text-gray-300">
                      {shortenAddress(tx.txHash)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        tx.status === 'pending' ? 'text-yellow-400 border-yellow-400/30' :
                        tx.status === 'confirmed' ? 'text-green-400 border-green-400/30' :
                        'text-red-400 border-red-400/30'
                      }`}
                    >
                      {tx.status}
                    </Badge>
                    {txUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => window.open(txUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator className="bg-gray-700" />

        {isProTier ? (
          showSendForm ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="tokenSelect" className="text-gray-300">Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-token">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="ETH" className="text-white hover:bg-gray-700">
                      ETH (Balance: {balance || '0'})
                    </SelectItem>
                    {tokenBalances.map((token) => (
                      <SelectItem 
                        key={token.symbol} 
                        value={token.symbol}
                        className="text-white hover:bg-gray-700"
                      >
                        {token.symbol} (Balance: {token.balance})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="sendAmount" className="text-gray-300">
                  Amount ({selectedToken})
                  <span className="text-gray-500 ml-2 font-normal">
                    Available: {getSelectedTokenBalance()}
                  </span>
                </Label>
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
                      Send {selectedToken}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSendForm(false);
                    setSelectedToken('ETH');
                    setSendTo('');
                    setSendAmount('');
                  }}
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
              Send Tokens
            </Button>
          )
        ) : (
          <div className="p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg" data-testid="pro-upgrade-send">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-600/20 rounded-full">
                <Crown className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Upgrade to Pro</h4>
                <p className="text-sm text-gray-400">Send tokens with Flint Pro</p>
              </div>
            </div>
            <Link href="/subscribe">
              <Button className="w-full mt-2 bg-purple-600 hover:bg-purple-700" data-testid="button-upgrade-pro-send">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Send Tokens
              </Button>
            </Link>
          </div>
        )}

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
