import { createServerClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthButtons from '@/components/auth/AuthButtons'
import { TERMS_OF_SERVICE_METADATA } from '@/lib/policies'

const SECTION_HEADING = 'text-2xl font-bold text-black mb-4'
const PARAGRAPH = 'text-black mb-4 leading-relaxed'
const LIST = 'list-disc pl-6 text-black mb-4 space-y-2'

export default async function TermsOfServicePage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: profile } = session
    ? await supabase
        .from('profiles')
        .select('avatar_url, full_name, username')
        .eq('user_id', session.user.id)
        .maybeSingle()
    : { data: null }

  const headerContent = session ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile?.avatar_url}
      fullName={profile?.full_name}
      username={profile?.username}
      email={session.user.email}
    />
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">
              {TERMS_OF_SERVICE_METADATA.title}
            </h1>
            <p className="text-gray-600 mb-8">Last updated: {TERMS_OF_SERVICE_METADATA.lastUpdated}</p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-10">
                <h2 className={SECTION_HEADING}>1. Agreement to Terms</h2>
                <p className={PARAGRAPH}>
                  These Terms of Service (“Terms”) constitute a legally binding agreement between you
                  (“you,” “user,” “athlete,” or “scout”) and Got1, LLC (“Got1,” “we,” “us,” or “our”)
                  governing your access to and use of the Got1 website, mobile applications, and
                  related services (collectively, the “Platform”). By creating an account, requesting
                  an evaluation, offering evaluation services, or otherwise using the Platform, you
                  agree to be bound by these Terms, our Privacy Policy, and all additional guidelines
                  referenced herein. If you do not agree, do not access or use the Platform.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>2. Eligibility &amp; Registration</h2>
                <ul className={LIST}>
                  <li>You must be at least 16 years old to create an athlete account.</li>
                  <li>Scouts must complete the Got1 verification process and maintain an active Stripe Connect account.</li>
                  <li>You must provide accurate, current, and complete information during registration and keep it updated.</li>
                  <li>You are responsible for safeguarding your login credentials and all activities that occur under your account.</li>
                  <li>Got1 may suspend or terminate accounts for violations, fraud, or conduct that harms the community.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>3. Platform Overview</h2>
                <p className={PARAGRAPH}>
                  Got1 provides a marketplace where athletes can request third-party film evaluations
                  and where verified scouts can offer those services. Got1 is not a scout, agent,
                  coach, or recruiting service. We do not guarantee outcomes, scholarships, or
                  college placements. Scouts act as independent contractors responsible for their own
                  judgments, compliance, and deliverables.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>4. Payments &amp; Escrow</h2>
                <ul className={LIST}>
                  <li>All payments are processed via Stripe. Athletes pay upfront; funds are held in escrow until the scout accepts or denies.</li>
                  <li>If a scout declines or fails to respond within the stated timeframe, Got1 automatically refunds the athlete.</li>
                  <li>Upon completion and delivery of an evaluation, funds (minus Got1’s platform fee) are released to the scout’s Stripe Connect account.</li>
                  <li>Scouts must comply with Stripe Connect requirements and maintain accurate tax information.</li>
                  <li>Chargebacks, disputes, or fraudulent activity may result in account suspension and liability for associated fees.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>5. Scout Obligations</h2>
                <ul className={LIST}>
                  <li>Deliver objective, professional evaluations aligned with Got1 quality standards.</li>
                  <li>Respond to evaluation requests within the stated turnaround time.</li>
                  <li>Refrain from guaranteeing outcomes or making misleading claims.</li>
                  <li>Maintain confidentiality of athlete data except where disclosure is required by law.</li>
                  <li>Comply with NCAA, NAIA, NFHS, state, or conference rules applicable to your role.</li>
                  <li>Maintain updated pricing, turnaround times, and availability on your profile.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>6. Athlete Responsibilities</h2>
                <ul className={LIST}>
                  <li>Provide accurate film links and relevant context for evaluations.</li>
                  <li>Use evaluations for personal development and recruiting preparation only.</li>
                  <li>Refrain from sharing private scout contact details without consent.</li>
                  <li>Communicate respectfully with scouts and other community members.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>7. Prohibited Conduct</h2>
                <ul className={LIST}>
                  <li>Submitting false information, impersonating another person, or misrepresenting credentials.</li>
                  <li>Harassment, hate speech, threats, or defamatory statements.</li>
                  <li>Uploading malware, scraping data, or interfering with Platform operations.</li>
                  <li>Soliciting off-platform payments or circumventing Got1’s escrow system.</li>
                  <li>Using evaluations for gambling, NIL tampering, or NCAA violations.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>8. Intellectual Property</h2>
                <p className={PARAGRAPH}>
                  The Platform, Got1 name, logos, and all associated content are protected by
                  intellectual property laws. Scouts retain ownership of evaluation insights they
                  create, but grant Got1 a non-exclusive license to host, distribute, and display the
                  content within the Platform for service delivery and dispute resolution. Users may
                  not reproduce, modify, or distribute Got1 materials without permission.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>9. Feedback &amp; Testimonials</h2>
                <p className={PARAGRAPH}>
                  By submitting feedback, testimonials, or success stories, you grant Got1 a
                  perpetual, worldwide, royalty-free license to use that content for marketing,
                  case studies, and product improvement, subject to our Privacy Policy.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>10. Disclaimers</h2>
                <p className={PARAGRAPH}>
                  GOT1 PROVIDES THE PLATFORM “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY
                  KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
                  GUARANTEE ANY RECRUITING OUTCOMES OR COLLEGE OFFERS. USERS ASSUME ALL RISK FOR
                  THEIR INTERACTIONS AND DECISIONS.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>11. Limitation of Liability</h2>
                <p className={PARAGRAPH}>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, GOT1, ITS OFFICERS, DIRECTORS, EMPLOYEES,
                  AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL
                  ARISING FROM OR RELATED TO YOUR USE OF THE PLATFORM. OUR AGGREGATE LIABILITY SHALL
                  NOT EXCEED THE GREATER OF (A) THE FEES YOU PAID TO GOT1 IN THE PAST SIX MONTHS, OR
                  (B) ONE HUNDRED U.S. DOLLARS (US$100).
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>12. Indemnification</h2>
                <p className={PARAGRAPH}>
                  You agree to indemnify, defend, and hold harmless Got1 and its affiliates from and
                  against all claims, liabilities, damages, losses, and expenses (including attorney
                  fees) arising out of or related to: (a) your use of the Platform; (b) your breach of
                  these Terms; or (c) your violation of any law or the rights of a third party.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>13. Termination</h2>
                <p className={PARAGRAPH}>
                  Got1 may suspend or terminate your account, access to the Platform, or evaluation
                  privileges at any time for any reason, including suspected violations, fraud, or
                  inactivity. You may terminate your account by contacting support; outstanding
                  obligations survive termination.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>14. Governing Law &amp; Dispute Resolution</h2>
                <p className={PARAGRAPH}>
                  These Terms are governed by the laws of the State of Florida, without regard to
                  conflict-of-law principles. Any dispute arising out of or relating to these Terms
                  shall be resolved through binding arbitration administered by the American
                  Arbitration Association in Walton County, Florida, unless you opt out within 30 days
                  of accepting these Terms. Notwithstanding the foregoing, either party may seek
                  injunctive or equitable relief in court for intellectual property infringement or
                  misuse.
                </p>
                <p className={PARAGRAPH}>
                  YOU AND GOT1 WAIVE THE RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>15. Changes to Terms</h2>
                <p className={PARAGRAPH}>
                  We may modify these Terms periodically. We will post the updated Terms on the
                  Platform and update the “Last updated” date. If changes materially affect your
                  rights, we will provide additional notice (e.g., email or in-app message). Your
                  continued use after the effective date of the revised Terms constitutes acceptance.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>16. Contact Information</h2>
                <p className={PARAGRAPH}>For questions about these Terms, contact us at:</p>
                <ul className={LIST}>
                  <li>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:zander@got1.app" className="text-blue-600 hover:underline">
                      zander@got1.app
                    </a>
                  </li>
                  <li>
                    <strong>Mail:</strong> Got1 Legal, 662 Harbor Blvd, Unit 550, Destin, FL 32541, USA
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}
