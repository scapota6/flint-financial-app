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

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">3. Data Sharing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may share limited user information with the following third parties solely for operational purposes:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border border-gray-700 rounded-lg">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700">Provider</th>
                      <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="px-4 py-3 text-gray-300">Teller.io</td>
                      <td className="px-4 py-3 text-gray-300">Bank and account aggregation</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="px-4 py-3 text-gray-300">SnapTrade</td>
                      <td className="px-4 py-3 text-gray-300">Brokerage aggregation and portfolio data</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="px-4 py-3 text-gray-300">Resend</td>
                      <td className="px-4 py-3 text-gray-300">Transactional and system emails</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="px-4 py-3 text-gray-300">Lemon Squeezy</td>
                      <td className="px-4 py-3 text-gray-300">Billing, invoicing, and subscription processing</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="px-4 py-3 text-gray-300">Replit</td>
                      <td className="px-4 py-3 text-gray-300">Application hosting and infrastructure</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-300">Analytics Providers</td>
                      <td className="px-4 py-3 text-gray-300">Site usage insights (if applicable)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-gray-300 leading-relaxed mt-4">
                Each third party maintains its own privacy policy and complies with relevant data protection standards.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                We retain account data for as long as necessary to provide our Services or comply with legal obligations.
                Financial data linked via Teller.io or SnapTrade is read-only and non-persistent—we do not store raw credentials or permanent financial records after disconnection.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">5. Security</h2>
              <p className="text-gray-300 leading-relaxed">
                We implement reasonable administrative, technical, and physical safeguards to protect user data. However, no internet transmission or storage system can be guaranteed 100% secure.
                You use our Services at your own risk and acknowledge potential exposure inherent in online systems.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                Depending on your jurisdiction (e.g., GDPR, CCPA), you may have rights to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Access or export your data;</li>
                <li>Request deletion of your account;</li>
                <li>Withdraw consent for communications;</li>
                <li>Lodge a complaint with a data protection authority.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Requests may be sent to <a href="mailto:support@flint-investing.com" className="text-purple-400 hover:text-purple-300">support@flint-investing.com</a>
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Cookies and Tracking</h2>
              <p className="text-gray-300 leading-relaxed">
                We may use cookies or similar technologies for analytics, authentication, and performance optimization.
                You can disable cookies through your browser, though this may impact functionality.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint's Services are intended for users 18 and older. We do not knowingly collect personal information from minors. If you believe a minor has provided data, contact us for deletion.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                Flint may update this Privacy Policy periodically. The updated version will be posted with a new "Last Updated" date.
                Continued use of the Services after updates constitutes acceptance.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">10. Contact</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:
              </p>
              <p className="text-gray-300 leading-relaxed mt-3">
                📧 <a href="mailto:support@flint-investing.com" className="text-purple-400 hover:text-purple-300">support@flint-investing.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
