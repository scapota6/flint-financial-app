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

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">3. No Financial or Investment Advice</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint is not a financial advisor and provides no guarantees regarding the accuracy or timeliness of displayed data.
                All information presented is for informational purposes only and should not be construed as:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>Financial advice</li>
                <li>Investment recommendations</li>
                <li>Tax or legal guidance</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                You acknowledge that any reliance on Flint's data or insights is entirely at your own discretion and risk. Always consult a qualified professional before making financial or investment decisions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Third-Party Services and Integrations</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint connects with external services including Teller.io, SnapTrade, Resend, Lemon Squeezy, and Replit for hosting and functionality.
                You understand and agree that:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>Flint has no control over the accuracy, reliability, or availability of third-party APIs or services.</li>
                <li>Your use of those integrations may be governed by their own terms and privacy policies.</li>
                <li>Flint disclaims any and all responsibility for service interruptions, data delays, or inaccuracies caused by third-party providers.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">5. Account Registration and Security</h2>
              <p className="text-gray-300 leading-relaxed">
                Users may create accounts to access advanced features. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>Provide accurate information;</li>
                <li>Maintain the confidentiality of your credentials;</li>
                <li>Notify us immediately of unauthorized access or suspicious activity.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Flint reserves the right to suspend or terminate accounts that violate these Terms or engage in abusive, fraudulent, or unlawful conduct.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">6. Payments, Subscriptions, and Refunds</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint's paid plans and subscriptions are managed via Lemon Squeezy.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                <strong className="text-white">All sales are final. No refunds, chargebacks, or partial credits will be issued under any circumstances.</strong>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>You authorize Lemon Squeezy to process payments on your behalf for recurring plans until canceled.</li>
                <li>It is your responsibility to review your plan and cancel prior to renewal if you do not wish to continue.</li>
                <li>By purchasing a subscription, you agree to Lemon Squeezy's billing terms and policies.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Data Accuracy and Availability</h2>
              <p className="text-gray-300 leading-relaxed">
                Financial data displayed through the Services is aggregated from third-party APIs and may not be complete or accurate.
                Flint makes no guarantees regarding:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>Accuracy or timeliness of account balances or transactions</li>
                <li>Continuity or uptime of integrations</li>
                <li>Absence of errors, bugs, or delays</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Use of this information is at your sole discretion and risk.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Intellectual Property Rights</h2>
              <p className="text-gray-300 leading-relaxed">
                All content, software, UI/UX design, graphics, code, and documentation related to Flint are the intellectual property of Flint LLC and its licensors.
                You may not copy, modify, distribute, reverse engineer, or commercially exploit any part of the Services without express written consent.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                To the fullest extent permitted by law, Flint LLC, its employees, partners, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or special damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-3 ml-4">
                <li>Financial loss or investment decisions based on displayed data</li>
                <li>Data inaccuracies or service interruptions</li>
                <li>Unauthorized access or breaches via third-party providers</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                In no event shall Flint's total liability exceed the total amount paid by you for the Services within the past twelve (12) months.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">10. Indemnification</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify and hold harmless Flint LLC, its affiliates, officers, and contractors from all claims, damages, liabilities, and expenses arising out of your use of the Services, your violation of these Terms, or your violation of any law or third-party rights.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">11. Modifications and Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint may modify, suspend, or discontinue the Services at any time without prior notice. We may also revise these Terms at any time by posting an updated version on our site. Continued use after any change constitutes acceptance.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                You may discontinue use at any time by closing your account.
              </p>
            </div>

            {/* More sections will be added as you provide them */}
          </div>
        </div>
      </div>
    </div>
  );
}
