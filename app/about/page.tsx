import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <WelcomeNavbar showBecomeScout={true} variant="visible" />
      <main className="pt-12 pb-12">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16">
          <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
            About Got1
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p>
              Got1 was founded to solve a fundamental problem in college football recruiting: getting your game film seen by the right people.
            </p>
            
            <p>
              We believe that every talented high school football player deserves a fair shot at getting their film evaluated by verified college scouts. That's why we built a platform that connects players and parents directly with national college scouts who provide professional evaluations on demand.
            </p>

            <p>
              Our scouts are verified professionals with real connections to college programs across all levels—from Power 4 conferences to smaller colleges. They provide detailed, actionable feedback that helps players understand their strengths, identify areas for improvement, and advance their recruiting journey.
            </p>

            <p>
              At Got1, we're committed to making recruiting accessible, transparent, and fair. We guarantee the quality of every evaluation and ensure that players get valuable feedback from scouts who are genuinely connected to college programs.
            </p>

            <p>
              Our mission is simple: connect high school football players with the right scouts, get their film watched, and help them achieve their college football dreams.
            </p>
          </div>
        </div>
      </main>
      <WelcomeFooter />
    </div>
  )
}
