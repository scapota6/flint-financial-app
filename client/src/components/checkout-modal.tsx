import { useEffect } from "react";

interface CheckoutModalProps {
  checkoutUrl: string | null;
  onClose: () => void;
}

export function CheckoutModal({ checkoutUrl, onClose }: CheckoutModalProps) {
  useEffect(() => {
    if (checkoutUrl) {
      // Open checkout in new tab (Whop blocks iframe embedding)
      const checkoutWindow = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      
      if (!checkoutWindow) {
        // Popup blocked - fallback to same window
        window.location.href = checkoutUrl;
      }
      
      // Close the modal state after opening
      onClose();
    }
  }, [checkoutUrl, onClose]);

  // This component doesn't render anything - it just handles the checkout flow
  return null;
}
