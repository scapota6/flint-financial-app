import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  email?: string;
  planName: string;
  onSuccess?: (planId: string, receiptId: string) => void;
}

export function CheckoutModal({ isOpen, onClose, planId, email, planName, onSuccess }: CheckoutModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleComplete = async (completedPlanId: string, receiptId?: string) => {
    console.log('[Whop] Checkout completed:', { completedPlanId, receiptId });
    
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
            planId={planId}
            theme="dark"
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
