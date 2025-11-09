import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";

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
  const allowCloseRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      allowCloseRef.current = false;
    }
  }, [isOpen]);

  const handleClose = () => {
    allowCloseRef.current = true;
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && allowCloseRef.current) {
      allowCloseRef.current = false;
      onClose();
    }
  };

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
        
        allowCloseRef.current = true;
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-6 bg-gray-950 border-gray-800 overflow-y-auto z-[70] flex flex-col"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
          onClick={handleClose}
          data-testid="button-close-checkout"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        
        <VisuallyHidden>
          <DialogTitle>{planName} Checkout</DialogTitle>
          <DialogDescription>
            Complete your purchase for {planName}
          </DialogDescription>
        </VisuallyHidden>
        
        <div 
          className="w-full min-h-[600px] max-h-[700px] rounded-lg overflow-auto flex-1"
          data-testid="whop-checkout-container"
        >
          <WhopCheckoutEmbed
            sessionId={sessionId}
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
