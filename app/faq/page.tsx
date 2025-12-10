import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <WelcomeNavbar showBecomeScout={true} variant="visible" />
      <main className="pt-12 pb-12">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16">
          <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
            Frequently Asked Questions
          </h1>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                What is Got1?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Got1 is a platform that connects high school football players and parents with verified national college scouts for professional film evaluations on demand.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                How does the evaluation process work?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Players submit their game film through the platform. Verified scouts review the film and provide detailed, professional evaluations with actionable feedback to help advance your recruiting journey.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                Are the scouts verified?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Yes, all scouts on Got1 go through a verification process to ensure they have legitimate connections with college programs and can provide quality evaluations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                How much does an evaluation cost?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Evaluation prices vary by scout. Each scout sets their own pricing based on their expertise and turnaround time. You can view pricing on each scout's profile before requesting an evaluation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                What happens if I'm not satisfied with my evaluation?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We guarantee quality evaluations. If you're not satisfied, you can make a claim through our platform and we'll work to resolve the issue, including refunds when appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal text-black mb-3">
                Can parents use the platform?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! Got1 is designed for both high school football players and their parents. Parents can create accounts and manage evaluations on behalf of their children.
              </p>
            </section>
          </div>
        </div>
      </main>
      <WelcomeFooter />
    </div>
  )
}
