import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  email?: string;
  planName: string;
  onSuccess?: (planId: string, receiptId: string) => void;
}

export function CheckoutModal({ isOpen, onClose, planId, email, planName, onSuccess }: CheckoutModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Wait for Whop loader to be available
    const initializeCheckout = () => {
      if (!containerRef.current) return;

      // Create the Whop checkout container using vanilla JS approach
      const checkoutDiv = document.createElement('div');
      checkoutDiv.setAttribute('data-whop-checkout-plan-id', planId);
      checkoutDiv.setAttribute('data-whop-checkout-skip-redirect', 'true');
      checkoutDiv.setAttribute('data-whop-checkout-theme', 'dark');
      
      if (email) {
        checkoutDiv.setAttribute('data-whop-checkout-prefill-email', email);
      }

      // Clear and append
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(checkoutDiv);

      // Manually initialize Whop checkout for dynamically added elements
      if ((window as any).WhopCheckout && (window as any).WhopCheckout.initEmbeds) {
        console.log('[Whop] Initializing checkout embed for plan:', planId);
        (window as any).WhopCheckout.initEmbeds();
      } else {
        console.warn('[Whop] WhopCheckout.initEmbeds not available yet');
      }
    };

    // Listen for Whop checkout events
    const handleCheckoutComplete = (event: CustomEvent) => {
      const { plan_id, receipt_id } = event.detail || {};
      
      if (plan_id && receipt_id) {
        console.log('[Whop] Checkout completed:', { plan_id, receipt_id });
        
        // Call the backend to activate subscription
        fetch('/api/whop/activate-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: plan_id,
            receiptId: receipt_id,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              toast({
                title: "Success!",
                description: "Your subscription has been activated.",
              });
              
              if (onSuccess) {
                onSuccess(plan_id, receipt_id);
              }
              
              onClose();
            } else {
              toast({
                title: "Error",
                description: data.error || "Failed to activate subscription",
                variant: "destructive",
              });
            }
          })
          .catch(error => {
            console.error('Activation error:', error);
            toast({
              title: "Error",
              description: "Failed to activate subscription",
              variant: "destructive",
            });
          });
      }
    };

    // Add event listener for checkout completion
    window.addEventListener('whop-checkout-complete' as any, handleCheckoutComplete);

    // Wait for Whop loader if not ready yet
    if ((window as any).WhopCheckout) {
      initializeCheckout();
    } else {
      // Poll for WhopCheckout to be available (loader is async)
      const checkWhopReady = setInterval(() => {
        if ((window as any).WhopCheckout) {
          clearInterval(checkWhopReady);
          initializeCheckout();
        }
      }, 100);

      // Cleanup interval if modal closes
      return () => {
        clearInterval(checkWhopReady);
        window.removeEventListener('whop-checkout-complete' as any, handleCheckoutComplete);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    }

    // Cleanup
    return () => {
      window.removeEventListener('whop-checkout-complete' as any, handleCheckoutComplete);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, planId, email, onClose, onSuccess, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-transparent border-none">
        <VisuallyHidden>
          <DialogTitle>{planName} Checkout</DialogTitle>
        </VisuallyHidden>
        
        <div 
          ref={containerRef}
          className="w-full h-[600px] rounded-lg overflow-hidden bg-white dark:bg-gray-900"
          data-testid="whop-checkout-container"
        />
      </DialogContent>
    </Dialog>
  );
}
