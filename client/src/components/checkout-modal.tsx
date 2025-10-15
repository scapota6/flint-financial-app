import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

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
      // Verify origin is from Whop
      if (event.origin === 'https://whop.com' || event.origin.includes('whop.com')) {
        // Handle checkout completion
        if (event.data?.type === 'checkout:completed' || event.data?.success) {
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
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full md:max-w-4xl md:h-[90vh] p-0 bg-transparent border-0">
        {checkoutUrl && (
          <iframe
            src={checkoutUrl}
            className="w-full h-full rounded-lg"
            style={{ border: 'none', minHeight: '600px' }}
            allow="payment"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
