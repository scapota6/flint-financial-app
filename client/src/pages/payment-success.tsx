/**
 * Payment Success Page
 * Route: /payment-success?email=user@example.com
 * Displays a celebration modal after successful payment
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

// Analytics tracking
const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
  console.log('Analytics Event:', eventName, properties);
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }
};

export default function PaymentSuccessPage() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(true);
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const email = urlParams.get('email') || '';

  useEffect(() => {
    trackEvent('payment_success_viewed', { email });
  }, [email]);

  // Handle modal close - redirect to landing page
  useEffect(() => {
    if (!open) {
      setLocation('/');
    }
  }, [open, setLocation]);

  const handleContinue = () => {
    trackEvent('payment_success_continue_clicked', { email });
    // Redirect to setup password or dashboard using wouter navigation
    setLocation('/setup-password' + (email ? `?email=${encodeURIComponent(email)}` : ''));
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-w-md bg-gray-900 border-gray-700 text-white"
          data-testid="modal-payment-success"
        >
          {/* Success Icon with Animation */}
          <div className="flex justify-center mb-6">
            <div 
              className="relative"
              data-testid="icon-success-checkmark"
            >
              <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-2xl animate-pulse" />
              <CheckCircle2 
                className="h-20 w-20 text-purple-500 relative z-10" 
                strokeWidth={2}
              />
            </div>
          </div>

          <DialogHeader className="space-y-4 text-center">
            <DialogTitle 
              className="text-3xl font-bold text-white"
              data-testid="heading-payment-successful"
            >
              Payment Successful!
            </DialogTitle>
            
            <DialogDescription 
              className="text-gray-300 text-base"
              data-testid="text-email-instructions"
            >
              Check your email to set up your account and get started
            </DialogDescription>
          </DialogHeader>

          {/* Email Display */}
          {email && (
            <div 
              className="mt-6 p-4 bg-gray-800/50 border border-purple-600/30 rounded-lg"
              data-testid="container-email-display"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Setup link sent to:</p>
                  <p 
                    className="text-white font-medium truncate"
                    data-testid="text-user-email"
                  >
                    {email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8 space-y-3">
            <Button
              onClick={handleContinue}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold"
              data-testid="button-continue-setup"
            >
              Continue to Account Setup
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Didn't receive the email?{' '}
              <button 
                className="text-purple-400 hover:text-purple-300 underline"
                onClick={() => trackEvent('resend_email_clicked', { email })}
                data-testid="button-resend-email"
              >
                Resend
              </button>
            </p>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Need help? Contact{' '}
              <a 
                href="mailto:support@flint.com" 
                className="text-purple-400 hover:text-purple-300"
                data-testid="link-support-email"
              >
                support@flint.com
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
