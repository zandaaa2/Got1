import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import BackButton from '@/components/shared/BackButton'

export default async function MakeAClaimPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/welcome')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={null}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <BackButton fallbackUrl="/settings" className="mb-4 text-sm font-medium text-gray-600 hover:text-black transition-colors" />
            <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
              Make a Claim
            </h1>
            <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
              <p className="text-gray-600 mb-6">
                If you're not satisfied with an evaluation you received, please submit a claim below. We'll review your case and work to resolve the issue, including refunds when appropriate.
              </p>
              <form className="space-y-6">
                <div>
                  <label htmlFor="evaluation-id" className="block text-sm font-medium text-gray-700 mb-2">
                    Evaluation ID
                  </label>
                  <input
                    type="text"
                    id="evaluation-id"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter the evaluation ID"
                  />
                </div>
                <div>
                  <label htmlFor="claim-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Claim
                  </label>
                  <textarea
                    id="claim-description"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Please describe why you're making this claim and what resolution you're seeking..."
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Submit Claim
                </button>
              </form>
            </div>
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}










