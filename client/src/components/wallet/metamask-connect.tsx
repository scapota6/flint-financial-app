/**
 * MetaMask Wallet Connection Component
 * 
 * Allows users to connect their MetaMask wallet for crypto functionality.
 * Protected by feature flag - only shows for internal testers
 */

import { useState, useCallback } from "react";
import { MetaMaskSDK } from "@metamask/sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ExternalLink, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canAccessFeature } from "@/lib/feature-flags";

interface MetaMaskConnectProps {
  onConnect?: (account: string) => void;
  onDisconnect?: () => void;
  compact?: boolean;
}

export function MetaMaskConnect({ onConnect, onDisconnect, compact = false }: MetaMaskConnectProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Only show for internal testers when feature flag is enabled
  if (!canAccessFeature('metamask', user?.email)) {
    return null;
  }

  const infuraApiKey = import.meta.env.VITE_INFURA_API_KEY;

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const MMSDK = new MetaMaskSDK({
        dappMetadata: {
          name: "Flint",
          url: window.location.href,
        },
        ...(infuraApiKey && { infuraAPIKey: infuraApiKey }),
      });

      const accounts = await MMSDK.connect();
      
      if (accounts && accounts.length > 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        onConnect?.(connectedAccount);
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${shortenAddress(connectedAccount)}`,
        });
      }
    } catch (err: any) {
      console.error("MetaMask connection failed", err);
      const errorMessage = err?.message || "Failed to connect wallet";
      setError(errorMessage);
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [infuraApiKey, onConnect, toast]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    onDisconnect?.();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  }, [onDisconnect, toast]);

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
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  }, [account, toast]);

  // Compact version for header/nav
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {account ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="font-mono text-xs"
              data-testid="button-copy-address"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {shortenAddress(account)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectWallet}
              data-testid="button-disconnect-wallet"
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            size="sm"
            data-testid="button-connect-metamask"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4 mr-2" />
            )}
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    );
  }

  // Full card version
  return (
    <Card className="w-full max-w-md" data-testid="card-metamask-connect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          MetaMask Wallet
        </CardTitle>
        <CardDescription>
          Connect your MetaMask wallet to manage crypto assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {account ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Connected Address</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm break-all" data-testid="text-wallet-address">
                  {account}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  data-testid="button-copy-full-address"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
                data-testid="button-view-etherscan"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Etherscan
              </Button>
              <Button
                variant="destructive"
                onClick={disconnectWallet}
                data-testid="button-disconnect-full"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={connectWallet}
            disabled={isConnecting}
            data-testid="button-connect-full"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4 mr-2" />
            )}
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default MetaMaskConnect;
