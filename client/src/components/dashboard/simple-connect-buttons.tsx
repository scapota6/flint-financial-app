/**
 * ⚠️ DO NOT CHANGE THIS CONNECT FLOW unless the product owner says "bubble gum".
 * Post-connect work = only display/data mapping. No flow/endpoint changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, TrendingUp, ExternalLink, AlertCircle, Wallet, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TellerAPI } from "@/lib/teller-api";
import { SnapTradeAPI } from "@/lib/snaptrade-api";
import { canAccessFeature } from "@/lib/feature-flags";
import { useSDK } from "@metamask/sdk-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCsrfToken } from "@/lib/csrf";

import { CONNECT_LOCKED } from '@/utils/featureFlags';

// Runtime guard to warn in dev if someone edits these files without the "bubble gum" env flag
if (CONNECT_LOCKED) {
  console.warn('Connect flows are locked. Say "bubble gum" to change them.');
  // Only warn, don't block in development
}

interface SimpleConnectButtonsProps {
  accounts: any[];
  userTier: string;
  isAdmin?: boolean;
}

export default function SimpleConnectButtons({ accounts, userTier, isAdmin }: SimpleConnectButtonsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // MetaMask SDK hook (only used by internal testers)
  const { sdk, connected: metamaskConnected, connecting: sdkConnecting, account: metamaskAccount } = useSDK();
  const showMetamask = canAccessFeature('metamask', user?.email);
  const [localConnecting, setLocalConnecting] = useState(false);
  
  // Combined connecting state with timeout protection
  const isConnectingMetamask = localConnecting || sdkConnecting;
  
  // MetaMask connect handler with timeout
  const connectMetamask = useCallback(async () => {
    // Check if MetaMask extension is available
    const hasExtension = typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask;
    
    if (!hasExtension) {
      // No extension - show helpful message and let SDK show QR/install modal
      toast({
        title: "MetaMask Not Detected",
        description: "Install MetaMask or scan QR code with mobile app",
      });
    }
    
    setLocalConnecting(true);
    
    // Set a timeout to prevent infinite connecting state
    const timeout = setTimeout(() => {
      setLocalConnecting(false);
      if (!metamaskConnected) {
        toast({
          title: "Connection Timeout",
          description: "MetaMask didn't respond. Make sure it's installed and unlocked.",
          variant: "destructive",
        });
      }
    }, 30000); // 30 second timeout
    
    try {
      await sdk?.connect();
      clearTimeout(timeout);
      toast({
        title: "Wallet Connected",
        description: "Your MetaMask wallet is now connected",
      });
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("MetaMask connection failed", err);
      // Don't show error toast if user cancelled
      if (!err?.message?.includes('User rejected') && !err?.message?.includes('cancelled')) {
        toast({
          title: "Connection Failed",
          description: err?.message || "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } finally {
      setLocalConnecting(false);
    }
  }, [sdk, toast, metamaskConnected]);
  
  // Listen for postMessage from SnapTrade callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin === window.location.origin && 
          (event.data.snaptradeConnected || event.data.type === 'SNAPTRADE_DONE')) {
        toast({
          title: "Connection Complete",
          description: "Syncing your accounts...",
        });
        
        // Automatically sync accounts
        try {
          const syncResponse = await apiRequest('/api/snaptrade/sync', {
            method: 'POST'
          });
          const syncData = await syncResponse.json();
          
          if (syncData.success) {
            toast({
              title: "Accounts Synced",
              description: `Successfully synced ${syncData.syncedCount} account(s)`,
            });
            // Refresh dashboard - invalidate all dashboard-related queries
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          }
        } catch (error) {
          console.error('Auto-sync error:', error);
          toast({
            title: "Sync Failed", 
            description: "Please try again",
            variant: "destructive",
          });
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast, queryClient]);

  // Check account limits based on user tier
  const getAccountLimit = (tier: string, isAdmin?: boolean) => {
    // Admin users get unlimited accounts
    if (isAdmin) return Infinity;
    
    switch (tier) {
      case 'free': return 4;
      case 'basic': return Infinity;
      case 'pro': return Infinity;
      case 'premium': return Infinity;
      default: return 4;
    }
  };

  const accountLimit = getAccountLimit(userTier, isAdmin);
  const connectedAccounts = accounts.length;
  const canConnectMore = connectedAccounts < accountLimit;

  // Check if specific account types are connected
  const hasBankAccount = accounts.some(acc => acc.accountType === 'bank');
  const hasBrokerageAccount = accounts.some(acc => acc.accountType === 'brokerage' || acc.accountType === 'crypto');

  // Teller Connect mutation - Proper CSRF implementation
  const tellerConnectMutation = useMutation({
    mutationFn: async () => {
      try {
        // Get fresh CSRF token
        const tokenRes = await fetch('/api/csrf-token', { credentials: 'include' });
        const { csrfToken } = await tokenRes.json();
        
        // Get Teller application ID with CSRF protection
        let initResponse = await fetch("/api/teller/connect-init", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken
          },
          body: JSON.stringify({ mode: 'connect' })
        });
        
        // Auto-retry once with fresh token if 403 CSRF error
        if (initResponse.status === 403) {
          const t2 = await fetch('/api/csrf-token', { credentials: 'include' }).then(r => r.json());
          initResponse = await fetch("/api/teller/connect-init", {
            method: "POST",
            credentials: "include", 
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": t2.csrfToken
            },
            body: JSON.stringify({ mode: 'connect' })
          });
        }
        
        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.message || 'Failed to initialize Teller Connect');
        }
        
        const initData = await initResponse.json();
        
        const { applicationId, environment } = initData;
        
        if (!applicationId) {
          throw new Error('No application ID received from server');
        }
        
        // Check if TellerConnect SDK is available
        if (typeof (window as any).TellerConnect === 'undefined') {
          throw new Error('Teller Connect SDK not loaded. Please refresh the page.');
        }
        
        return new Promise((resolve, reject) => {
          // Initialize Teller Connect with SDK using environment from backend
          const tellerConnect = (window as any).TellerConnect.setup({
            applicationId: applicationId,
            environment: environment, // Use environment from backend (sandbox or development)
            products: ['verify', 'balance', 'transactions', 'identity'],
            selectAccount: 'multiple', // Allow multiple account selection
            skipPicker: false, // Show institution picker
            onInit: () => {
              // SDK initialized
            },
            onSuccess: async (enrollment: any) => {
              // Save the account using the access token
              try {
                
                // Get fresh CSRF token for save-account call
                const saveTokenRes = await fetch('/api/csrf-token', { credentials: 'include' });
                const { csrfToken: saveToken } = await saveTokenRes.json();
                
                const saveResponse = await fetch('/api/teller/save-account', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': saveToken
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    accessToken: enrollment.accessToken,
                    enrollmentId: enrollment.enrollment?.id,
                    institution: enrollment.enrollment?.institution?.name
                  })
                });
                
                if (!saveResponse.ok) {
                  const errorData = await saveResponse.json();
                  throw new Error(errorData.message || 'Failed to save account');
                }
                
                const saveData = await saveResponse.json();
                
                // Invalidate queries first
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/banks'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
                ]);
                
                // Wait for refetch to complete before resolving
                await queryClient.refetchQueries({ type: 'active' });
                
                // Small delay to allow UI to render, then resolve (no hard refresh needed)
                await new Promise(r => setTimeout(r, 200));
                
                resolve({ success: true });
              } catch (error) {
                console.error('🏦 Error saving account:', error);
                reject(error);
              }
            },
            onExit: () => {
              reject(new Error('Connection cancelled by user'));
            },
            onFailure: (failure: any) => {
              console.error('🏦 Teller Connect: Failure:', failure);
              reject(new Error(failure.message || 'Connection failed'));
            }
          });
          
          // Open Teller Connect modal
          tellerConnect.open();
        });
        
      } catch (error) {
        console.error('🏦 Teller Connect: Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Connected",
        description: "Your bank account has been successfully connected.",
      });
    },
    onError: (error: any) => {
      console.error('🏦 Teller Connect Error:', error);
      toast({
        title: "Connection Failed",
        description: error?.message || "Unable to connect bank account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // SnapTrade Connect mutation - simplified
  const snapTradeConnectMutation = useMutation({
    mutationFn: async () => {
      // Get user ID for SnapTrade registration
      const userResp = await apiRequest("/api/auth/user");
      if (!userResp.ok) throw new Error("Authentication required");
      const currentUser = await userResp.json();
      
      const resp = await apiRequest("/api/connections/snaptrade/register", {
        method: "POST",
        body: { userId: currentUser.id }
      });

      // Handle both Response and plain JSON from apiRequest
      const data = (typeof resp?.json === 'function') ? await resp.json() : resp;
      
      // Preserve full error response for better error handling
      if (resp?.ok === false || (resp?.status && !resp.ok)) {
        const error: any = new Error(data?.message || "Failed to start SnapTrade Connect");
        error.response = { data }; // Attach full response data
        throw error;
      }

      const url: string | undefined = data?.redirectUrl;
      if (!url) throw new Error("No SnapTrade Connect URL returned");
      
      window.location.href = url;
      return true;
    },
    onSuccess: () => {
      // Success callback
    },
    onError: (error: any) => {
      console.error('📈 SnapTrade Connect Error:', error);
      
      // Parse error response from backend
      const errorData = error?.response?.data || error;
      const userMessage = errorData?.message || (error instanceof Error ? error.message : 'Unknown error');
      const suggestion = errorData?.suggestion || '';
      
      // Display user-friendly error message
      toast({
        title: "Brokerage Connection Unavailable",
        description: (
          <div className="space-y-2">
            <p>{userMessage}</p>
            {suggestion && <p className="text-sm opacity-90">{suggestion}</p>}
          </div>
        ),
        variant: "destructive",
        duration: 10000, // Show longer for important service errors
      });
    },
  });

  const handleUpgradeNeeded = () => {
    toast({
      title: "Account Limit Reached",
      description: `Free users can only connect ${accountLimit} accounts. Upgrade to connect more.`,
      variant: "destructive",
    });
    // Redirect to subscription page
    window.location.href = '/subscribe';
  };

  return (
    <div className="mb-8">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Connect</CardTitle>
            <Badge variant="outline" className="border-gray-200 text-gray-600">
              {connectedAccounts} / {accountLimit === Infinity ? '∞' : accountLimit} connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${showMetamask ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            {/* Bank/Credit Connection */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium">Bank & Credit</h3>
                  <p className="text-gray-500 text-sm">Connect Bank Account</p>
                </div>
              </div>
              
              {hasBankAccount ? (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 text-white">Connected</Badge>
                  <span className="text-gray-500 text-sm">Bank account linked</span>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!canConnectMore) {
                      handleUpgradeNeeded();
                      return;
                    }
                    tellerConnectMutation.mutate();
                  }}
                  disabled={tellerConnectMutation.isPending}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {tellerConnectMutation.isPending ? (
                    "Connecting..."
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Bank/Credit Card
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Brokerage/Crypto Connection */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium">Brokerage & Crypto</h3>
                  <p className="text-gray-500 text-sm">Connect Brokerage</p>
                </div>
              </div>
              
              {hasBrokerageAccount ? (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 text-white">Connected</Badge>
                  <span className="text-gray-500 text-sm">Brokerage account linked</span>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!canConnectMore) {
                      handleUpgradeNeeded();
                      return;
                    }
                    snapTradeConnectMutation.mutate();
                  }}
                  disabled={snapTradeConnectMutation.isPending}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {snapTradeConnectMutation.isPending ? (
                    "Connecting..."
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Brokerage
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* MetaMask Wallet Connection - Internal Testers Only */}
            {showMetamask && (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-[#F6851B]">
                    <svg viewBox="0 0 318.6 318.6" className="w-6 h-6">
                      <polygon fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" points="274.1,35.5 174.6,109.4 193,65.8"/>
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="44.4,35.5 143.1,110.1 125.6,65.8"/>
                      <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7"/>
                      <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8"/>
                      <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1"/>
                      <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1"/>
                      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 140.6,230.9 111.4,208.1"/>
                      <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="177.9,230.9 211.8,247.4 207.1,208.1"/>
                      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="211.8,247.4 177.9,230.9 180.6,253 180.3,262.3"/>
                      <polygon fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 138.3,262.3 138.1,253 140.6,230.9"/>
                      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="138.8,193.5 110.6,185.2 130.5,176.1"/>
                      <polygon fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" points="179.7,193.5 188,176.1 208,185.2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-medium">MetaMask Wallet</h3>
                    <p className="text-gray-500 text-sm">Connect Crypto Wallet</p>
                  </div>
                </div>
                
                {metamaskConnected && metamaskAccount ? (
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-600 text-white">Connected</Badge>
                    <span className="text-gray-500 text-sm font-mono">
                      {metamaskAccount.slice(0, 6)}...{metamaskAccount.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={connectMetamask}
                    disabled={isConnectingMetamask}
                    className="w-full bg-[#F6851B] hover:bg-[#E2761B] text-white"
                    data-testid="button-connect-metamask"
                  >
                    {isConnectingMetamask ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 318.6 318.6" className="h-4 w-4 mr-2">
                          <polygon fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" points="274.1,35.5 174.6,109.4 193,65.8"/>
                          <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="44.4,35.5 143.1,110.1 125.6,65.8"/>
                          <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7"/>
                          <polygon fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8"/>
                          <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1"/>
                          <polygon fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1"/>
                          <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 140.6,230.9 111.4,208.1"/>
                          <polygon fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" points="177.9,230.9 211.8,247.4 207.1,208.1"/>
                        </svg>
                        Connect MetaMask
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Account Limit Warning */}
          {!canConnectMore && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700 text-sm">
                  Account limit reached. 
                  <button
                    onClick={handleUpgradeNeeded}
                    className="underline ml-1 hover:text-yellow-900"
                  >
                    Upgrade to connect more
                  </button>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading animations removed per user request */}
    </div>
  );
}