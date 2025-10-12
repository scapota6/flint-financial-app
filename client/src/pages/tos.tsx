import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service | Flint';
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </a>
        </Link>

        <div className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-4">Flint LLC – Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last Updated: October 11, 2025</p>

          <div className="space-y-8">
            <div>
              <p className="text-gray-300 leading-relaxed">
                Welcome to Flint LLC ("Flint," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our websites, software applications, and any related services, features, or content (collectively, the "Services"), including but not limited to flint-investing.com, updates.flint-investing.com, and all associated dashboards and applications.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you may not use the Services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By using Flint, you represent that you are at least 18 years old, capable of forming a legally binding contract, and will comply with all applicable laws and regulations. Continued use constitutes acceptance of these Terms and any future modifications.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">2. Description of Services</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint provides a financial aggregation and insight platform. Through integrations with Teller.io, SnapTrade, and other third-party APIs, users can link financial accounts to view aggregated, read-only data such as balances, transactions, investments, and portfolio performance.
                Flint may also provide communications and notifications via Resend, and manage subscription payments through Lemon Squeezy.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                Flint operates as an informational tool only. We are not a brokerage, financial institution, investment advisor, or fiduciary. All data is provided "as-is" and may be incomplete or inaccurate.
              </p>
            </div>

            {/* More sections will be added as you provide them */}
          </div>
        </div>
      </div>
    </div>
  );
}
