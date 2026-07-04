export const metadata = {
  title: 'Terms of Service | HungryBird',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">Terms of Service</h1>
        <p className="text-stone-500 mb-8 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using HungryBird, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">2. User Submissions</h2>
            <p>
              By submitting a street food vendor to HungryBird, you grant us the right to use, modify, publicly perform, publicly display, 
              reproduce, and distribute such content on and through the Service. You agree that the information you provide is accurate 
              to the best of your knowledge and does not infringe upon any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">3. Disclaimer of Warranties</h2>
            <p>
              HungryBird is provided on an "as is" and "as available" basis. We do not guarantee the accuracy, completeness, or usefulness 
              of any information on the site. We are not responsible for the food quality, hygiene, or business practices of any vendor 
              listed on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">4. Limitation of Liability</h2>
            <p>
              HungryBird shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, 
              loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access 
              or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">5. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change 
              will be determined at our sole discretion.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
