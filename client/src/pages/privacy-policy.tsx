import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | Flint';
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-4">Flint LLC – Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: October 11, 2025</p>

          <div className="space-y-8">
            <div>
              <p className="text-gray-300 leading-relaxed">
                Flint LLC ("Flint," "we," "us," or "our") values your privacy. This Privacy Policy explains how we collect, use, share, and protect personal data through our websites and services, including flint-investing.com, updates.flint-investing.com, and related applications.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By using our Services, you agree to the terms of this Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may collect the following categories of information:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">a. Account Information:</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Email, name, and authentication credentials used for login and access control.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">b. Financial Data (Read-Only):</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Through third-party integrations such as Teller.io and SnapTrade, we access aggregated, read-only financial data such as balances, transactions, and holdings.
                    We never store raw banking credentials, API keys, or trading passwords.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">c. Payment Information:</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Handled exclusively by Lemon Squeezy. We do not store full payment card data on our servers.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">d. Communication Data:</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Emails, support requests, and transactional notifications sent through Resend.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">e. Technical Data:</h3>
                  <p className="text-gray-300 leading-relaxed">
                    IP address, browser type, device identifiers, and usage logs (via Replit hosting and analytics tools).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                We use your data to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Provide and maintain the Services;</li>
                <li>Authenticate users and secure access;</li>
                <li>Display aggregated financial information;</li>
                <li>Process payments and manage subscriptions;</li>
                <li>Send account-related notifications or updates;</li>
                <li>Improve product functionality and user experience;</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                <strong className="text-white">We do not sell your data to third parties.</strong>
              </p>
            </div>

            {/* More sections will be added as you provide them */}
          </div>
        </div>
      </div>
    </div>
  );
}
