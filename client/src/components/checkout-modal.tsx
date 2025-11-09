import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
}

export function CheckoutModal({ isOpen, onClose, planId, planName }: CheckoutModalProps) {
  const { toast } = useToast();

  const handleComplete = (completedPlanId: string, receiptId?: string) => {
    console.log('Checkout completed:', { completedPlanId, receiptId });
    
    toast({
      title: "Payment Successful!",
      description: "Check your email for account setup instructions. You can now close this window.",
      variant: "default"
    });

    // Close modal after short delay to show success message
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0B0D11]/95 backdrop-blur-xl border-white/10"
        onInteractOutside={(e) => {
          // Prevent modal from closing when clicking inside the iframe
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent ESC key from closing during checkout
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#F2F4F6]">
            Complete Your Purchase - {planName}
          </DialogTitle>
          <DialogDescription className="text-[#A7ADBA]">
            Enter your payment details to complete your subscription
          </DialogDescription>
        </DialogHeader>
        
        <div className="w-full min-h-[600px]">
          <WhopCheckoutEmbed
            planId={planId}
            theme="dark"
            skipRedirect={true}
            onComplete={handleComplete}
            fallback={
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-[#A7ADBA]">Loading checkout...</div>
              </div>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
