import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  planId?: string;
  email?: string;
  planName: string;
  onSuccess?: (planId: string, receiptId: string) => void;
}

export function CheckoutModal({ isOpen, onClose, sessionId, planId, email, planName, onSuccess }: CheckoutModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleComplete = async (completedPlanId: string, receiptId?: string) => {
    console.log('[Whop] Checkout completed:', { sessionId, completedPlanId, receiptId });
    
    if (!receiptId) {
      console.error('[Whop] No receipt ID received');
      toast({
        title: "Error",
        description: "No receipt ID received from Whop",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Call the backend to activate subscription
      const response = await fetch('/api/whop/activate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.cookie
            .split('; ')
            .find((row) => row.startsWith('flint_csrf='))
            ?.split('=')[1] || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: completedPlanId,
          receiptId: receiptId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: "Your subscription has been activated.",
        });
        
        if (onSuccess) {
          onSuccess(completedPlanId, receiptId);
        }
        
        onClose();
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          setLocation('/dashboard');
        }, 500);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to activate subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: "Error",
        description: "Failed to activate subscription",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  // DEBUG: Log sessionId details to diagnose prop name issue
  console.log('[Whop Debug] CheckoutModal rendering with:', {
    sessionId,
    sessionIdType: typeof sessionId,
    sessionIdLength: sessionId?.length,
    sessionIdFormat: sessionId?.startsWith('ch_') ? 'valid (ch_*)' : 'INVALID FORMAT',
    planId,
    planName,
    email
  });

  // Safety check - ensure sessionId exists and has correct format
  if (!sessionId || !sessionId.startsWith('ch_')) {
    console.error('[Whop Error] Invalid or missing sessionId:', sessionId);
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            Invalid checkout session. Please try again.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-transparent border-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{planName} Checkout</DialogTitle>
          <DialogDescription>
            Complete your purchase for {planName}
          </DialogDescription>
        </VisuallyHidden>
        
        <div 
          className="w-full h-[600px] rounded-lg overflow-hidden"
          data-testid="whop-checkout-container"
        >
          <WhopCheckoutEmbed
            sessionId={sessionId}
            sessionKey={sessionId}
            planId={planId || ''}
            theme="dark"
            skipRedirect={true}
            onComplete={handleComplete}
            prefill={email ? { email } : undefined}
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-gray-400">Loading checkout...</p>
                </div>
              </div>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
