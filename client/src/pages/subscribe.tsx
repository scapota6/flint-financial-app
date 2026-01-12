import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { SUBSCRIPTION_TIERS } from "@/lib/stripe";
import { Check, Crown, Star, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EmbeddedCheckoutModal } from "@/components/EmbeddedCheckoutModal";

export default function Subscribe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutTier, setCheckoutTier] = useState<'basic' | 'pro'>('basic');
  const [checkoutBillingPeriod, setCheckoutBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Fetch user data to check current subscription
  const { data: userData, error } = useQuery<{ subscriptionTier?: string; subscriptionStatus?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Note: Whop SDK loaded via script tag in index.html

  // Handle Stripe checkout return (success/canceled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (success === 'true') {
      toast({
        title: "Success!",
        description: "Your subscription has been activated. Welcome to Flint!",
      });
      // Clear URL params
      window.history.replaceState({}, '', '/subscribe');
    } else if (canceled === 'true') {
      toast({
        title: "Checkout Canceled",
        description: "You can subscribe anytime.",
        variant: "default",
      });
      // Clear URL params
      window.history.replaceState({}, '', '/subscribe');
    }
  }, [toast]);

  // Check if user is authenticated - don't auto-redirect, just track the state
  const isAuthenticated = !error || !isUnauthorizedError(error as Error);

  const handleSelectTier = (tier: 'basic' | 'pro', billingPeriod: 'monthly' | 'yearly' = 'monthly') => {
    // Set tier, billing period, and user email
    setCheckoutTier(tier);
    setCheckoutBillingPeriod(billingPeriod);
    setCheckoutEmail((user as any)?.email || '');
    
    // Open embedded checkout modal
    setCheckoutModalOpen(true);
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'free':
        return <Check className="h-6 w-6" />;
      case 'basic':
        return <Star className="h-6 w-6" />;
      case 'pro':
        return <Zap className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'free':
        return 'text-gray-500';
      case 'basic':
        return 'text-blue-500';
      case 'pro':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const currentTier = userData?.subscriptionTier;
  const subscriptionStatus = userData?.subscriptionStatus;

  return (
    <div className={`min-h-screen ${isAuthenticated ? 'bg-[#F4F2ED]' : 'bg-black'} ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-8 text-center space-y-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose your <span className="text-blue-500">plan</span>
            </h2>
            <p className={`text-lg ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Unlock the full potential of Flint with our premium features</p>
          </div>
          
          {/* Monthly/Yearly Toggle - Disabled until production Price IDs are added */}
          <div className="flex items-center justify-center space-x-4 opacity-50 cursor-not-allowed">
            <span className={`text-lg ${!isAnnual ? (isAuthenticated ? 'text-gray-900 font-semibold' : 'text-white font-semibold') : (isAuthenticated ? 'text-gray-500' : 'text-gray-400')}`}>
              Monthly
            </span>
            <Switch 
              checked={isAnnual} 
              onCheckedChange={() => {}} // Disabled
              disabled
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-400 border-2 border-gray-400"
              data-testid="switch-billing-toggle"
            />
            <span className={`text-lg ${isAnnual ? (isAuthenticated ? 'text-gray-900 font-semibold' : 'text-white font-semibold') : (isAuthenticated ? 'text-gray-500' : 'text-gray-400')}`}>
              Yearly
            </span>
            <Badge className={isAuthenticated ? 'bg-gray-300 text-gray-600' : 'bg-gray-600 text-gray-400'}>Coming Soon</Badge>
          </div>
        </div>

        {/* Login Required Banner for Unauthenticated Users */}
        {!isAuthenticated && (
          <div className="mb-8">
            <Card className="bg-blue-900/20 border-blue-600/50">
              <CardContent className="p-6 text-center space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Log in to subscribe
                  </h3>
                  <p className="text-gray-300">
                    Please log in to your Flint account to manage your subscription
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-login-to-subscribe"
                >
                  Log In
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Subscription Status */}
        {isAuthenticated && currentTier && (
          <div className="mb-8">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${getTierColor(currentTier)}`}>
                      {getTierIcon(currentTier)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                      </h3>
                      <p className="text-gray-600">
                        Status: {subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={subscriptionStatus === 'active' ? 'default' : 'destructive'}>
                    {subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const tierDescriptions = {
              free: "Get started with essential financial tracking features.",
              basic: "Best for individuals who just want to see everything in one place.",
              pro: "Best for individuals who want to manage money and simplify payments."
            };
            
            const cardBg = isAuthenticated
              ? (tier.id === 'pro' ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200')
              : (tier.id === 'pro' ? 'bg-blue-900 border-blue-600' : 'bg-gray-800 border-gray-700');
            
            return (
              <Card 
                key={tier.id}
                className={`relative ${cardBg}`}
                data-testid={`card-pricing-${tier.id}`}
              >
                {tier.id === 'pro' && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className={`text-center space-y-4 ${tier.id === 'pro' ? 'pt-8' : ''}`}>
                  <CardTitle className={`text-2xl ${isAuthenticated ? 'text-gray-900' : ''}`}>{tier.name}</CardTitle>
                  <div className="space-y-2">
                    <div className={`text-4xl font-bold ${isAuthenticated ? 'text-gray-900' : ''}`} data-testid={`text-price-${tier.id}`}>
                      ${isAnnual ? (tier.annualPrice / 12).toFixed(2) : tier.monthlyPrice.toFixed(2)}
                    </div>
                    <div className={isAuthenticated ? 'text-gray-600' : 'text-gray-400'}>
                      {isAnnual ? '/mo (billed yearly)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className={isAuthenticated ? 'text-gray-600' : 'text-gray-300'}>
                    {tierDescriptions[tier.id as keyof typeof tierDescriptions]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = "/api/login";
                        return;
                      }
                      if (tier.id === 'basic' || tier.id === 'pro') {
                        handleSelectTier(tier.id as 'basic' | 'pro', isAnnual ? 'yearly' : 'monthly');
                      }
                    }}
                    disabled={(isAuthenticated && currentTier === tier.id) || tier.id === 'free' || tier.id === 'pro'}
                    className={`w-full ${
                      tier.id === 'pro'
                        ? 'bg-gray-400 cursor-not-allowed opacity-50 text-white'
                        : tier.id === 'free'
                        ? (isAuthenticated ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-gray-600 cursor-not-allowed text-white')
                        : (isAuthenticated ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white')
                    }`}
                    data-testid={`button-select-${tier.id}`}
                  >
                    {tier.id === 'free' ? (
                      'Free Forever'
                    ) : tier.id === 'pro' ? (
                      'Coming Soon'
                    ) : !isAuthenticated ? (
                      'Log In to Subscribe'
                    ) : currentTier === tier.id ? (
                      'Current Plan'
                    ) : (
                      `Choose ${tier.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-center space-y-2 mb-8">
          <Badge variant="outline" className={isAuthenticated ? 'border-yellow-600 text-yellow-700' : 'border-yellow-500 text-yellow-400'}>
            Founding Member Pricing — lock this in before new features launch
          </Badge>
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <Card className={isAuthenticated ? 'bg-white border-gray-200' : 'trade-card'}>
            <CardHeader>
              <CardTitle className={`text-2xl font-semibold text-center ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>
                Feature Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-700'}>
                      <th className={`text-left py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Feature</th>
                      <th className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Free</th>
                      <th className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>FlintBasic</th>
                      <th className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Account Connections</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>4</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Unlimited</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-600' : 'text-gray-400'}`}>Unlimited</td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Money In/Out Flow</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Dashboard & Transaction History</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Recurring Subscription Tracking</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Credit Card Management</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Stock Charts (Coming Soon)</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Transfer Funds (Coming Soon)</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className={isAuthenticated ? 'border-b border-gray-200' : 'border-b border-gray-800'}>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Trading (Coming Soon)</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-3 ${isAuthenticated ? 'text-gray-900' : 'text-white'}`}>Priority Support</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className={`text-center py-3 ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Embedded Checkout Modal */}
      <EmbeddedCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={(open) => {
          setCheckoutModalOpen(open);
          if (!open) {
            setCheckoutEmail('');
          }
        }}
        email={checkoutEmail}
        tier={checkoutTier}
        billingPeriod={checkoutBillingPeriod}
      />
    </div>
  );
}
