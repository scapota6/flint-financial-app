import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  sessionId: string;
  planName: string;
}

export function CheckoutModal({ isOpen, onClose, planId, sessionId, planName }: CheckoutModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-transparent border-none">
        <VisuallyHidden>
          <DialogTitle>{planName} Checkout</DialogTitle>
        </VisuallyHidden>
        
        <div className="w-full h-[600px] rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <WhopCheckoutEmbed
            planId={planId}
            sessionId={sessionId}
            theme="dark"
            skipRedirect={true}
            onComplete={(plan_id, receipt_id) => {
              console.log('Payment successful', { plan_id, receipt_id });
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
