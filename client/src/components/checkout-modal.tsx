import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface CheckoutModalProps {
  planId: string | null;
  onClose: () => void;
  email?: string;
}

export function CheckoutModal({ planId, onClose, email }: CheckoutModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!planId);
  }, [planId]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleComplete = (completedPlanId: string, receiptId?: string) => {
    console.log('Checkout complete:', completedPlanId, receiptId);
    handleClose();
    window.location.href = '/payment-success';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] md:max-w-2xl p-6 overflow-auto bg-black [&>button]:hidden"
        aria-describedby="whop-checkout-description"
      >
        <VisuallyHidden>
          <DialogTitle>Checkout</DialogTitle>
          <div id="whop-checkout-description">Complete your purchase</div>
        </VisuallyHidden>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 rounded-full bg-background/90 hover:bg-background"
          onClick={handleClose}
          data-testid="button-close-checkout"
        >
          <X className="h-4 w-4" />
        </Button>

        {planId && (
          <div className="mt-8" data-testid="whop-checkout-embed">
            <WhopCheckoutEmbed
              planId={planId}
              theme="dark"
              skipRedirect={true}
              onComplete={handleComplete}
              prefill={email ? { email } : undefined}
              fallback={
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <div className="text-muted-foreground animate-pulse">
                    Loading secure checkout...
                  </div>
                </div>
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
