import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F2ED]">
      <Helmet>
        <title>Page Not Found | Flint</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to Flint's homepage to explore our financial dashboard." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="max-w-lg mx-auto px-6 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white" data-testid="button-go-home">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="pt-8 border-t border-gray-300">
          <p className="text-sm text-gray-500 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/banking" className="text-gray-700 hover:text-gray-900 transition-colors">
              Bank Tracker
            </Link>
            <span className="text-gray-400">-</span>
            <Link href="/investing" className="text-gray-700 hover:text-gray-900 transition-colors">
              Investment Tracker
            </Link>
            <span className="text-gray-400">-</span>
            <Link href="/crypto" className="text-gray-700 hover:text-gray-900 transition-colors">
              Crypto Tracker
            </Link>
            <span className="text-gray-400">-</span>
            <Link href="/blog" className="text-gray-700 hover:text-gray-900 transition-colors">
              Blog
            </Link>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Need help? <a href="mailto:support@flint-investing.com" className="text-gray-700 hover:text-gray-900 underline">Contact support</a></p>
        </div>
      </div>
    </div>
  );
}
