import { useState, useEffect } from 'react';
import { AlertCircle, X, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface ConnectionLimitAlertProps {
  accepted: number;
  rejected: number;
  tier: string;
  brokerages?: string;
}

export default function ConnectionLimitAlert({ 
  accepted, 
  rejected, 
  tier,
  brokerages 
}: ConnectionLimitAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if user has dismissed this specific alert
  useEffect(() => {
    const dismissKey = `snaptrade-limit-dismissed-${accepted}-${rejected}-${tier}`;
    const wasDismissed = localStorage.getItem(dismissKey) === 'true';
    setIsDismissed(wasDismissed);
  }, [accepted, rejected, tier]);
  
  const handleDismiss = () => {
    const dismissKey = `snaptrade-limit-dismissed-${accepted}-${rejected}-${tier}`;
    localStorage.setItem(dismissKey, 'true');
    setIsDismissed(true);
  };
  
  if (isDismissed) {
    return null;
  }
  
  // Parse brokerages list - guard against missing/empty brokerages param
  const rejectedBrokeragesList = (brokerages && brokerages.trim()) 
    ? brokerages.split(',').filter(b => b && b.trim()) 
    : [];
  const total = accepted + rejected;
  
  // Get tier limit dynamically
  const getTierLimit = (tierName: string): number | null => {
    const normalizedTier = tierName.toLowerCase();
    if (normalizedTier === 'free') return 4;
    if (normalizedTier === 'basic' || normalizedTier === 'pro') return null; // unlimited
    return 4; // default to free limit
  };
  
  const tierLimit = getTierLimit(tier);
  const isUnlimited = tierLimit === null;
  const limitText = isUnlimited ? 'unlimited connections' : `up to ${tierLimit} connections`;
  
  // Determine alert state and messaging
  let variant: 'default' | 'destructive' = 'default';
  let icon: React.ReactNode;
  let title: string;
  let description: string;
  let borderColor: string;
  let bgColor: string;
  
  if (rejected > 0 && accepted === 0) {
    // Zero accepted - complete failure due to limit
    variant = 'destructive';
    icon = <AlertCircle className="h-5 w-5" />;
    title = 'Connection Limit Reached';
    borderColor = 'border-red-500/50';
    bgColor = 'bg-red-500/10';
    
    if (rejectedBrokeragesList.length > 0) {
      const brokerageNames = rejectedBrokeragesList.slice(0, 3).join(', ');
      const andMore = rejectedBrokeragesList.length > 3 ? ` and ${rejectedBrokeragesList.length - 3} more` : '';
      description = `Unable to connect ${rejected} brokerage${rejected > 1 ? 's' : ''} (${brokerageNames}${andMore}). Your ${tier} plan allows ${limitText} and you've reached the limit.`;
    } else {
      description = `Unable to connect ${rejected} brokerage${rejected > 1 ? 's' : ''}. Your ${tier} plan allows ${limitText} and you've reached the limit.`;
    }
  } else if (rejected > 0 && accepted > 0) {
    // Partial acceptance - some succeeded, some failed
    icon = <AlertTriangle className="h-5 w-5" />;
    title = 'Partial Connection - Limit Reached';
    borderColor = 'border-orange-500/50';
    bgColor = 'bg-orange-500/10';
    
    if (rejectedBrokeragesList.length > 0) {
      const brokerageNames = rejectedBrokeragesList.slice(0, 3).join(', ');
      const andMore = rejectedBrokeragesList.length > 3 ? ` and ${rejectedBrokeragesList.length - 3} more` : '';
      description = `Connected ${accepted} of ${total} brokerages. Unable to connect ${rejected} additional brokerage${rejected > 1 ? 's' : ''} (${brokerageNames}${andMore}) due to your ${tier} plan limit of ${limitText}.`;
    } else {
      description = `Connected ${accepted} of ${total} brokerages. Unable to connect ${rejected} additional brokerage${rejected > 1 ? 's' : ''} due to your ${tier} plan limit of ${limitText}.`;
    }
  } else {
    // This shouldn't render, but just in case
    return null;
  }
  
  return (
    <Alert 
      className={`mb-6 ${borderColor} ${bgColor} relative`}
      data-testid="alert-connection-limit"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 space-y-3">
            <div>
              <AlertTitle className="text-base font-semibold mb-2">
                {title}
              </AlertTitle>
              <AlertDescription className="text-sm">
                <p className="mb-3">{description}</p>
                
                {/* Upgrade CTA - only show for Free tier */}
                {tier.toLowerCase() === 'free' && (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Link href="/subscribe">
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-upgrade-plan"
                      >
                        Upgrade to Basic for Unlimited Connections
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <p className="text-xs text-gray-400">
                      Basic plan starts at $19.99/month
                    </p>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </div>
        
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-4 h-6 w-6 p-0 hover:bg-white/10"
          data-testid="button-dismiss-alert"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}
