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
  Wallet, 
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
  
  // Send transaction state
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Only show for internal testers
  if (!canAccessFeature('metamask', user?.email)) {
    return null;
  }

  // Don't render if not connected
  if (!connected || !account) {
    return null;
  }

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

  // Fetch balance on mount and when account changes
  useEffect(() => {
    if (connected && account && provider) {
      fetchBalance();
    }
  }, [connected, account, provider, fetchBalance]);

  // Copy address to clipboard
  const copyAddress = async () => {
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
  };

  // Send ETH transaction
  const sendTransaction = async () => {
    if (!provider || !account || !sendTo || !sendAmount) return;
    
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }
    
    // Validate amount
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
      // Convert ETH to wei (hex)
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
        description: (
          <div className="flex items-center gap-2">
            <span>TX: {shortenAddress(txHash as string)}</span>
            <a 
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      });
      
      // Reset form
      setSendTo('');
      setSendAmount('');
      setShowSendForm(false);
      
      // Refresh balance after a short delay
      setTimeout(fetchBalance, 3000);
      
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
  };

  // Disconnect wallet
  const disconnect = async () => {
    try {
      await sdk?.terminate();
      toast({
        title: "Wallet Disconnected",
        description: "Your MetaMask wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const chainName = chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : 'Unknown';

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-[#F6851B] flex items-center justify-center">
          <img 
            src="https://cdn.brandfetch.io/metamask.io" 
            alt="MetaMask" 
            className="w-5 h-5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
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
              <img 
                src="https://cdn.brandfetch.io/metamask.io" 
                alt="MetaMask" 
                className="w-6 h-6"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
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
            onClick={fetchBalance}
            disabled={isLoadingBalance}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
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
