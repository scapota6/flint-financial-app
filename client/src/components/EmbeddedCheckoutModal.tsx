import { useState, useEffect, useMemo } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Loader2 } from "lucide-react";

interface StripeCheckoutWrapperProps {
  stripePromise: Promise<Stripe | null>;
  clientSecret: string;
  onComplete: () => void;
  onError: () => void;
  onClose: () => void;
}

function StripeCheckoutWrapper({ 
  stripePromise, 
  clientSecret, 
  onComplete,
  onError,
  onClose 
}: StripeCheckoutWrapperProps) {
  const [stripeLoaded, setStripeLoaded] = useState<Stripe | null | 'loading'>('loading');

  useEffect(() => {
    stripePromise.then((stripe) => {
      setStripeLoaded(stripe);
      if (!stripe) {
        onError();
      }
    });
  }, [stripePromise, onError]);

  if (stripeLoaded === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg" data-testid="checkout-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading payment service...</p>
        </div>
      </div>
    );
  }

  if (!stripeLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-500">Payment service unavailable. Please try again later.</p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="stripe-checkout-container" className="w-full h-full">
      <EmbeddedCheckoutProvider
        stripe={stripeLoaded}
        options={{ 
          clientSecret,
          onComplete
        }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

interface EmbeddedCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string;
  tier: "basic" | "pro";
  billingPeriod?: "monthly" | "yearly";
}

export function EmbeddedCheckoutModal({
  open,
  onOpenChange,
  email,
  tier,
  billingPeriod = "monthly",
}: EmbeddedCheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Stripe with error handling for iOS WebView
  const stripePromise = useMemo(() => {
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!stripeKey) {
      console.error('Stripe public key not configured');
      return Promise.resolve(null);
    }
    return loadStripe(stripeKey).catch((err) => {
      console.error('Failed to load Stripe.js:', err);
      return null;
    });
  }, []);

  useEffect(() => {
    if (open) {
      // Always fetch fresh clientSecret when opening
      setClientSecret(null);
      fetchClientSecret();
    } else {
      // Clear state when modal closes to ensure fresh fetch next time
      setClientSecret(null);
      setLoading(false);
    }
  }, [open]);

  const fetchClientSecret = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stripe/create-embedded-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token":
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("flint_csrf="))
              ?.split("=")[1] || "",
        },
        credentials: "include",
        body: JSON.stringify({ email: email || '', tier, billingPeriod }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();
      
      if (!data.clientSecret) {
        throw new Error("No client secret returned from server");
      }
      
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      setError("Failed to load checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing during checkout unless user explicitly closes
    if (!newOpen && clientSecret && !loading) {
      // Allow closing if user clicks outside or presses escape
      onOpenChange(newOpen);
    } else if (!clientSecret || loading) {
      // Allow closing if still loading or errored
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        data-testid="embedded-checkout-modal"
        className="max-w-2xl max-h-[90vh] p-0 bg-gray-950 border-gray-800 overflow-y-auto z-[70] flex flex-col"
      >
        <VisuallyHidden>
          <DialogTitle>
            {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your purchase for the {tier} plan ({billingPeriod} billing)
          </DialogDescription>
        </VisuallyHidden>

        <div className="w-full flex-1 min-h-[600px] p-6 rounded-lg">
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchClientSecret} data-testid="button-retry-checkout">
                Retry
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          ) : loading || !clientSecret ? (
            <div
              className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg"
              data-testid="checkout-loading"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-400">Loading checkout...</p>
              </div>
            </div>
          ) : (
            <StripeCheckoutWrapper
              stripePromise={stripePromise}
              clientSecret={clientSecret}
              onComplete={() => {
                setClientSecret(null);
                setLoading(false);
                onOpenChange(false);
                window.location.href = '/checkout-success';
              }}
              onError={() => setError("Payment service unavailable. Please try again later.")}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
