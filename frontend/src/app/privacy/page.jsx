export const metadata = {
  title: 'Privacy Policy | HungryBird',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">Privacy Policy</h1>
        <p className="text-stone-500 mb-8 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">1. Information We Collect</h2>
            <p>
              When you use HungryBird to submit a street food vendor or leave a review, we may ask you to provide certain 
              personally identifiable information that can be used to contact or identify you, such as your name and email address. 
              We also automatically collect information like your IP address when you interact with our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Verify the authenticity of submitted vendors and reviews</li>
              <li>Communicate with you regarding your submissions</li>
              <li>Monitor the usage of our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">3. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated 
              demographic information not linked to any personal identification information regarding visitors and users with our 
              business partners, trusted affiliates, and advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">4. Security</h2>
            <p>
              The security of your Personal Information is important to us, but remember that no method of transmission over the 
              Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to 
              protect your Personal Information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at hungrybird733@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
