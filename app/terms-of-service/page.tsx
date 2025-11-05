import Sidebar from '@/components/layout/Sidebar'

/**
 * Terms of Service page displaying the platform's terms and conditions.
 */
export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <div className="flex-1 ml-64">
        <main className="pt-20 px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-black mb-8">Terms of Service</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">1. Acceptance of Terms</h2>
                <p className="text-black mb-4">
                  By accessing and using Got1, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">2. Use License</h2>
                <p className="text-black mb-4">
                  Permission is granted to temporarily use Got1 for personal, non-commercial transitory viewing only. 
                  This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 text-black mb-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to decompile or reverse engineer any software contained on Got1</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">3. User Accounts</h2>
                <p className="text-black mb-4">
                  You are responsible for maintaining the confidentiality of your account and password. 
                  You agree to accept responsibility for all activities that occur under your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">4. Payment Terms</h2>
                <p className="text-black mb-4">
                  All payments for evaluations are processed through Stripe. By making a purchase, 
                  you agree to the terms and conditions of our payment processor. Refunds are subject 
                  to our refund policy as outlined in your purchase agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">5. Limitation of Liability</h2>
                <p className="text-black mb-4">
                  In no event shall Got1 or its suppliers be liable for any damages (including, 
                  without limitation, damages for loss of data or profit, or due to business interruption) 
                  arising out of the use or inability to use Got1.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">6. Modifications</h2>
                <p className="text-black mb-4">
                  Got1 may revise these terms of service at any time without notice. By using 
                  this website you are agreeing to be bound by the then current version of these 
                  terms of service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">7. Contact Information</h2>
                <p className="text-black mb-4">
                  If you have any questions about these Terms of Service, please contact us through 
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

