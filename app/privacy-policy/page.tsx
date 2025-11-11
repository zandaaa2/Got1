import { createServerClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthButtons from '@/components/auth/AuthButtons'
import { PRIVACY_POLICY_METADATA } from '@/lib/policies'

const SECTION_HEADING = 'text-2xl font-bold text-black mb-4'
const PARAGRAPH = 'text-black mb-4 leading-relaxed'
const LIST = 'list-disc pl-6 text-black mb-4 space-y-2'

export default async function PrivacyPolicyPage() {
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
              {PRIVACY_POLICY_METADATA.title}
            </h1>
            <p className="text-gray-600 mb-8">Last updated: {PRIVACY_POLICY_METADATA.lastUpdated}</p>

            <div className="prose prose-lg max-w-none">
              <section className="mb-10">
                <h2 className={SECTION_HEADING}>Introduction</h2>
                <p className={PARAGRAPH}>
                  Got1 (“Got1,” “we,” “us,” or “our”) connects high school athletes with verified
                  scouts who provide third-party evaluations. We are committed to protecting the
                  privacy of every athlete, scout, and coach who trusts our platform. This Privacy
                  Policy explains the information we collect, how we use it, who we share it with,
                  and the choices you have regarding your personal data. By using our services, you
                  agree to the practices described here.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>1. Information We Collect</h2>
                <p className={PARAGRAPH}>
                  We collect information in three primary ways: information you provide directly,
                  information collected automatically, and information received from third parties.
                </p>
                <h3 className="text-xl font-semibold text-black mb-2">A. Information You Provide</h3>
                <ul className={LIST}>
                  <li>
                    <strong>Account &amp; Profile Data:</strong> full name, email address, phone
                    number, profile photo or gradient avatar, biography, username, organization,
                    school and graduation year, sports preferences, and other details you choose to
                    share.
                  </li>
                  <li>
                    <strong>Evaluation Content:</strong> film links, performance data, notes between
                    scouts and athletes, and any other content submitted through the evaluation
                    process.
                  </li>
                  <li>
                    <strong>Payment &amp; Tax Data:</strong> payment card details, bank routing
                    numbers, Stripe Connect onboarding information, tax identifiers, and payout
                    preferences. These are processed by Stripe and stored in accordance with their
                    security standards.
                  </li>
                  <li>
                    <strong>Communications:</strong> messages sent to Got1 support, feature requests,
                    feedback, and testimonials.
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-black mb-2">B. Information Collected Automatically</h3>
                <ul className={LIST}>
                  <li>Device identifiers, IP address, browser type, operating system, and language.</li>
                  <li>Usage data such as pages viewed, links clicked, referring URLs, and feature interactions.</li>
                  <li>Session data and diagnostics for performance, crash reporting, and fraud prevention.</li>
                  <li>Cookie and similar technologies that support authentication, preference storage, analytics, and marketing attribution.</li>
                </ul>
                <h3 className="text-xl font-semibold text-black mb-2">C. Information from Third Parties</h3>
                <ul className={LIST}>
                  <li>Stripe Connect provides onboarding status, verification requirements, payouts, and charge information.</li>
                  <li>Supabase logs supply security insights, audit trails, and authentication events.</li>
                  <li>Social networks may share basic profile information when you choose to connect your account or embed content.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>2. How We Use Information</h2>
                <p className={PARAGRAPH}>
                  We use the information we collect for legitimate business purposes, including:
                </p>
                <ul className={LIST}>
                  <li>Creating and managing user accounts, profiles, evaluation requests, and payouts.</li>
                  <li>Processing payments, refunds, dispute resolutions, and escrow services via Stripe.</li>
                  <li>Delivering notifications, receipts, product updates, and customer support responses.</li>
                  <li>Monitoring trust, safety, and compliance, including fraud detection and abuse prevention.</li>
                  <li>Analyzing how the platform is used to improve performance, features, and data accuracy.</li>
                  <li>Developing new services, such as improved scout discovery and evaluation tooling.</li>
                  <li>Complying with legal obligations, law enforcement requests, and regulatory audits.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>3. Legal Bases for Processing (GDPR)</h2>
                <p className={PARAGRAPH}>
                  For users located in the European Economic Area, the United Kingdom, or jurisdictions
                  with similar requirements, we rely on the following legal bases to process your
                  personal data:
                </p>
                <ul className={LIST}>
                  <li>
                    <strong>Contractual necessity:</strong> to provide the Got1 platform, evaluations, payments, and support.
                  </li>
                  <li>
                    <strong>Legitimate interests:</strong> to secure our services, detect fraud, improve offerings, and grow our community.
                  </li>
                  <li>
                    <strong>Consent:</strong> for optional communications, cookies, and marketing when required by law.
                  </li>
                  <li>
                    <strong>Legal obligation:</strong> to satisfy bookkeeping, tax, AML/KYC, and other statutory requirements.
                  </li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>4. Information Sharing</h2>
                <p className={PARAGRAPH}>
                  We do not sell personal information. We share data only with:
                </p>
                <ul className={LIST}>
                  <li>
                    <strong>Service providers:</strong> Stripe (payments, payouts, onboarding), Supabase (hosting, database, authentication), Resend (email delivery), and other vetted partners who help operate the platform.
                  </li>
                  <li>
                    <strong>Other users:</strong> Scouts and athletes may view profile data, evaluations, and status information consistent with platform workflows.
                  </li>
                  <li>
                    <strong>Professional advisors:</strong> lawyers, auditors, and insurers evaluating or defending legal claims.
                  </li>
                  <li>
                    <strong>Legal and compliance authorities:</strong> when required by court order, subpoena, or regulatory request, or to prevent physical harm or illegal activity.
                  </li>
                  <li>
                    <strong>Business transfers:</strong> in connection with a merger, acquisition, financing, or sale of company assets, provided the recipient agrees to respect this Privacy Policy.
                  </li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>5. Data Retention</h2>
                <p className={PARAGRAPH}>
                  We retain personal information only as long as necessary to provide services, comply
                  with our legal obligations, resolve disputes, and enforce agreements. Evaluation
                  records and financial transactions are archived to meet auditing and regulatory
                  requirements. When data is no longer needed, we securely delete or anonymize it.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>6. Security</h2>
                <p className={PARAGRAPH}>
                  We employ technical, administrative, and physical safeguards such as encryption in
                  transit, access controls, audit logging, and regular vulnerability reviews. Despite
                  these efforts, no security measure is perfect, and we cannot guarantee absolute
                  protection. You are responsible for safeguarding your login credentials and
                  reporting any suspected unauthorized access.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>7. Children’s Privacy</h2>
                <p className={PARAGRAPH}>
                  Got1 is intended for individuals who are 16 years of age or older. We do not
                  knowingly collect personal information from children under 16. If we learn that we
                  have collected data from a child, we will take steps to delete that information.
                  Parents or guardians who believe their child has provided personal data should
                  contact us at the email below.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>8. International Data Transfers</h2>
                <p className={PARAGRAPH}>
                  Got1 operates from the United States. If you access the platform from outside the
                  U.S., you consent to the transfer, storage, and processing of your information in
                  the United States and other jurisdictions where our service providers operate. We
                  take appropriate measures to ensure that such transfers comply with applicable
                  data-protection laws.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>9. Your Rights &amp; Choices</h2>
                <p className={PARAGRAPH}>
                  Depending on where you live, you may have the right to:
                </p>
                <ul className={LIST}>
                  <li>Access the personal data we hold about you.</li>
                  <li>Request corrections or updates to inaccurate information.</li>
                  <li>Request deletion of your personal data, subject to legal exceptions.</li>
                  <li>Object to or restrict certain processing activities.</li>
                  <li>Receive a portable copy of your data in a structured format.</li>
                  <li>Opt out of marketing emails at any time via unsubscribe links.</li>
                </ul>
                <p className={PARAGRAPH}>
                  California residents can request information about the categories of personal
                  information we collect, use, and disclose, and may exercise the rights described in
                  the California Consumer Privacy Act (CCPA). EU/UK residents may lodge a complaint
                  with their local supervisory authority. To exercise any rights, contact us using
                  the details below.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>10. Cookies &amp; Tracking Technologies</h2>
                <p className={PARAGRAPH}>
                  We use cookies, pixels, and similar tools for authentication, session management,
                  analytics, and personalization. You can control cookies through your browser
                  settings, but disabling cookies may affect functionality. We do not currently
                  respond to “Do Not Track” signals.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>11. Third-Party Links</h2>
                <p className={PARAGRAPH}>
                  Our platform may contain links to third-party websites or services. We are not
                  responsible for the privacy practices of those third parties. We encourage you to
                  review their privacy policies before providing personal information.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>12. Updates to This Policy</h2>
                <p className={PARAGRAPH}>
                  We may revise this Privacy Policy to reflect changes to our services, legal
                  requirements, or operational practices. When we update the policy, we will revise
                  the “Last updated” date and, where appropriate, notify you through the platform or
                  via email. Continued use of Got1 after changes become effective constitutes your
                  acceptance of the revised policy.
                </p>
              </section>

              <section className="mb-10">
                <h2 className={SECTION_HEADING}>13. Contact Us</h2>
                <p className={PARAGRAPH}>
                  If you have questions or requests concerning this Privacy Policy or our data
                  practices, please contact:
                </p>
                <ul className={LIST}>
                  <li>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:zander@got1.app" className="text-blue-600 hover:underline">
                      zander@got1.app
                    </a>
                  </li>
                  <li>
                    <strong>Mail:</strong> Got1 Privacy, 662 Harbor Blvd, Unit 550, Destin, FL
                    32541, USA
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

