import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutModalProps {
  checkoutUrl: string | null;
  onClose: () => void;
}

export function CheckoutModal({ checkoutUrl, onClose }: CheckoutModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!checkoutUrl);
  }, [checkoutUrl]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  // Listen for messages from the Whop checkout iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin is from Whop (strict validation)
      const isWhopOrigin = event.origin === 'https://whop.com' || 
                          event.origin === 'https://www.whop.com' ||
                          /^https:\/\/[a-z0-9-]+\.whop\.com$/.test(event.origin);
      
      if (isWhopOrigin) {
        // Handle checkout completion
        if (event.data?.type === 'checkout:completed' || event.data?.success || event.data === 'checkout:completed') {
          handleClose();
          window.location.href = '/payment-success';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] md:max-w-5xl p-0 overflow-hidden"
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
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 hover:bg-white"
          onClick={handleClose}
          data-testid="button-close-checkout"
        >
          <X className="h-4 w-4" />
        </Button>

        {checkoutUrl && (
          <iframe
            src={checkoutUrl}
            className="w-full h-full border-0"
            title="Whop Checkout"
            allow="payment"
            data-testid="iframe-whop-checkout"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
