import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
      <Helmet>
        <title>Page Not Found | Flint</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to Flint's homepage to explore our financial dashboard." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="max-w-lg mx-auto px-6 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-blue-400">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" data-testid="button-go-home">
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800"
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/banking" className="text-blue-400 hover:text-blue-300 transition-colors">
              Bank Tracker
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/investing" className="text-blue-400 hover:text-blue-300 transition-colors">
              Investment Tracker
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/crypto" className="text-blue-400 hover:text-blue-300 transition-colors">
              Crypto Tracker
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/blog" className="text-blue-400 hover:text-blue-300 transition-colors">
              Blog
            </Link>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Need help? <a href="mailto:support@flint-investing.com" className="text-blue-400 hover:text-blue-300">Contact support</a></p>
        </div>
      </div>
    </div>
  );
}
