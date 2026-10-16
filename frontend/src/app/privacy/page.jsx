import Link from 'next/link';
import SupportEmail from '../../components/SupportEmail';
import { LEGAL_LAST_UPDATED } from '../../lib/site';

export const metadata = {
  title: 'Privacy Policy | HungryBird',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">Privacy Policy</h1>
        <p className="text-stone-500 mb-8 font-medium">Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="prose prose-stone max-w-none text-stone-600 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">1. Information We Collect</h2>
            <p>
              When you create an account, submit a street food vendor or leave a review, we may ask you to provide certain
              personally identifiable information that can be used to contact or identify you, such as your name, email address and
              (optionally) phone number. We also automatically collect information like your IP address when you interact with our
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Send one-time codes by email to verify your email address or reset your password</li>
              <li>Verify the authenticity of submitted vendors and reviews</li>
              <li>Communicate with you regarding your submissions</li>
              <li>Monitor the usage of our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">3. Location</h2>
            <p>
              If you use &ldquo;Near me&rdquo; or &ldquo;Detect location&rdquo;, your browser shares your location with the page so we can sort
              stalls by distance or pick your nearest city. On the website this happens in your browser and is not stored on our
              servers. When you add a stall, the map pin you place for the stall is saved with your submission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">4. Payments</h2>
            <p>
              If you buy HungryBird Premium, the payment is processed by Razorpay. We receive the payment status, amount and
              Razorpay&apos;s order and payment IDs so we can activate your pass. We never see or store your UPI PIN, card or bank
              details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal identification information to others. We share data only with the
              service providers we need to run HungryBird (for example hosting, email delivery and payment processing), and only
              for that purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">6. Security</h2>
            <p>
              The security of your Personal Information is important to us, but remember that no method of transmission over the
              Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to
              protect your Personal Information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">7. Deleting Your Account</h2>
            <p>
              You can delete your account and the personal data linked to it at any time on our{' '}
              <Link href="/account/delete" className="font-bold text-brand-600">account deletion page</Link>, which also explains
              what is removed and what is kept.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <SupportEmail />.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
