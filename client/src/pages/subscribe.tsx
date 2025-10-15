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
import { CheckoutModal } from "@/components/checkout-modal";

export default function Subscribe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  // Fetch user data to check current subscription
  const { data: userData, error } = useQuery<{ subscriptionTier?: string; subscriptionStatus?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Note: Whop SDK loaded via script tag in index.html

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Session Expired",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);
    }
  }, [error, toast]);

  const handleSelectTier = async (tierId: string) => {
    setIsProcessing(true);

    try {
      // Map tier IDs to CTA IDs for the checkout endpoint
      const ctaId = isAnnual ? `${tierId}-yearly` : `${tierId}-monthly`;
      
      // Get checkout URL from backend (using Whop now)
      const userEmail = (user as any)?.email;
      const response = await fetch(`/api/whop/checkout/${ctaId}${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`);
      const data = await response.json();
      
      if (data.planId) {
        // Open checkout in modal with Whop embed
        setCheckoutPlanId(data.planId);
      } else {
        toast({
          title: "Error",
          description: "Failed to get checkout. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to open checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'plus':
        return <Star className="h-6 w-6" />;
      case 'pro':
        return <Zap className="h-6 w-6" />;
      case 'unlimited':
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'plus':
        return 'text-blue-500';
      case 'pro':
        return 'text-purple-500';
      case 'unlimited':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const currentTier = userData?.subscriptionTier;
  const subscriptionStatus = userData?.subscriptionStatus;

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-8 text-center space-y-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose your <span className="text-purple-400">plan</span>
            </h2>
            <p className="text-gray-400 text-lg">Unlock the full potential of Flint with our premium features</p>
          </div>
          
          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-lg ${!isAnnual ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Monthly
            </span>
            <Switch 
              checked={isAnnual} 
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-600 border-2 border-gray-500"
              data-testid="switch-billing-toggle"
            />
            <span className={`text-lg ${isAnnual ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Yearly
            </span>
            {isAnnual && (
              <Badge className="bg-green-600 text-white">2 months free</Badge>
            )}
          </div>
        </div>

        {/* Current Subscription Status */}
        {currentTier && (
          <div className="mb-8">
            <Card className="trade-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${getTierColor(currentTier)}`}>
                      {getTierIcon(currentTier)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                      </h3>
                      <p className="text-gray-400">
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
              plus: "Best for individuals who just want to see everything in one place.",
              pro: "Best for individuals who want to manage money and simplify payments.",
              unlimited: "Best for individuals who want complete control and future features."
            };
            
            return (
              <Card 
                key={tier.id}
                className={`relative ${
                  tier.id === 'unlimited' ? 'bg-purple-900 border-purple-600' : 'bg-gray-800 border-gray-700'
                }`}
                data-testid={`card-pricing-${tier.id}`}
              >
                {tier.id === 'unlimited' && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black">
                    ⭐ Most Popular
                  </Badge>
                )}
                <CardHeader className={`text-center space-y-4 ${tier.id === 'unlimited' ? 'pt-8' : ''}`}>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold" data-testid={`text-price-${tier.id}`}>
                      ${isAnnual ? (tier.annualPrice / 12).toFixed(2) : tier.monthlyPrice.toFixed(2)}
                    </div>
                    <div className={tier.id === 'unlimited' ? 'text-gray-300' : 'text-gray-400'}>
                      {isAnnual ? '/mo (billed yearly)' : '/month'}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300">
                    {tierDescriptions[tier.id as keyof typeof tierDescriptions]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    onClick={() => handleSelectTier(tier.id)}
                    disabled={isProcessing || currentTier === tier.id}
                    className={`w-full ${
                      tier.id === 'unlimited' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : tier.id === 'pro'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                    data-testid={`button-select-${tier.id}`}
                  >
                    {isProcessing ? (
                      'Processing...'
                    ) : currentTier === tier.id ? (
                      'Current Plan'
                    ) : (
                      `Choose ${tier.name} ${isAnnual ? 'Yearly' : 'Monthly'}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-center space-y-2 mb-8">
          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
            Founding Member Pricing — lock this in before new features launch
          </Badge>
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <Card className="trade-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white text-center">
                Feature Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 text-gray-400">Feature</th>
                      <th className="text-center py-3 text-gray-400">Plus</th>
                      <th className="text-center py-3 text-gray-400">Pro</th>
                      <th className="text-center py-3 text-gray-400">Unlimited</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white">Account Connections</td>
                      <td className="text-center py-3 text-gray-400">3</td>
                      <td className="text-center py-3 text-gray-400">5</td>
                      <td className="text-center py-3 text-gray-400">Unlimited</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white">Recurring Subscription Management</td>
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
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white">Transfer Funds (Coming Soon)</td>
                      <td className="text-center py-3 text-gray-600">-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 text-white">Trading (Coming Soon)</td>
                      <td className="text-center py-3 text-gray-600">-</td>
                      <td className="text-center py-3 text-gray-600">-</td>
                      <td className="text-center py-3">
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-white">Priority Support</td>
                      <td className="text-center py-3 text-gray-600">-</td>
                      <td className="text-center py-3 text-gray-600">-</td>
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
      
      {/* Checkout Modal */}
      <CheckoutModal 
        planId={checkoutPlanId} 
        onClose={() => setCheckoutPlanId(null)} 
      />
    </div>
  );
}
