import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function CheckoutSuccess() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-500/20 p-6">
            <CheckCircle className="w-16 h-16 text-blue-500" data-testid="icon-success" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white" data-testid="text-success-title">
            Welcome to Flint!
          </h1>
          <p className="text-gray-400 text-lg" data-testid="text-success-message">
            Your subscription has been activated successfully.
          </p>
        </div>

        {/* Email Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex justify-center">
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Check Your Email</h2>
          <p className="text-gray-400 text-sm">
            We've sent you a welcome email with a link to set up your password and access your account.
          </p>
          <p className="text-gray-500 text-xs">
            The link expires in 24 hours. If you don't see the email, check your spam folder.
          </p>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">What happens next:</p>
          <ol className="text-left text-gray-400 text-sm space-y-2 list-decimal list-inside">
            <li>Check your email inbox</li>
            <li>Click the "Set Up Your Account" link</li>
            <li>Create a secure password</li>
            <li>Log in and start managing your finances</li>
          </ol>
        </div>

        {/* Back to Home */}
        <Link href="/">
          <Button variant="outline" className="w-full" data-testid="button-back-home">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
