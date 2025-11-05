import Sidebar from '@/components/layout/Sidebar'

/**
 * Privacy Policy page displaying the platform's privacy practices and data handling.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <div className="flex-1 ml-64">
        <main className="pt-20 px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">1. Information We Collect</h2>
                <p className="text-black mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-black mb-4">
                  <li>Name, email address, and profile information</li>
                  <li>Payment information (processed securely through Stripe)</li>
                  <li>Profile pictures and biographical information</li>
                  <li>Evaluation requests and related communications</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">2. How We Use Your Information</h2>
                <p className="text-black mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-black mb-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze trends and usage</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">3. Information Sharing</h2>
                <p className="text-black mb-4">
                  We do not sell, trade, or rent your personal information to third parties. 
                  We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-black mb-4">
                  <li>With your consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With service providers who assist us in operating our platform</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">4. Data Security</h2>
                <p className="text-black mb-4">
                  We implement appropriate security measures to protect your personal information. 
                  However, no method of transmission over the Internet is 100% secure, and we cannot 
                  guarantee absolute security.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">5. Your Rights</h2>
                <p className="text-black mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 text-black mb-4">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of certain communications</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">6. Cookies and Tracking</h2>
                <p className="text-black mb-4">
                  We use cookies and similar tracking technologies to track activity on our platform 
                  and hold certain information. You can instruct your browser to refuse all cookies 
                  or to indicate when a cookie is being sent.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">7. Changes to This Policy</h2>
                <p className="text-black mb-4">
                  We may update our Privacy Policy from time to time. We will notify you of any 
                  changes by posting the new Privacy Policy on this page and updating the "Last 
                  updated" date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">8. Contact Us</h2>
                <p className="text-black mb-4">
                  If you have any questions about this Privacy Policy, please contact us through 
                  the platform.
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

