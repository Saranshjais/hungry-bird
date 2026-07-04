export const metadata = {
  title: 'Cookie Policy | HungryBird',
};

export default function CookiePage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">Cookie Policy</h1>
        <p className="text-stone-500 mb-8 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored 
              in your web browser and allows the Service or a third-party to recognize you and make your next visit easier 
              and the Service more useful to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">2. How HungryBird Uses Cookies</h2>
            <p>
              When you use and access our Service, we may place a number of cookies files in your web browser. 
              We use cookies for the following purposes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>To enable certain functions of the Service</li>
              <li>To provide analytics</li>
              <li>To store your preferences (such as Admin login sessions)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">3. Third-Party Cookies</h2>
            <p>
              In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the 
              Service, deliver advertisements on and through the Service, and so on. Specifically, we use mapping services 
              (such as OpenStreetMap/Leaflet or Google Maps) which may utilize cookies to enhance map rendering and analytics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-3">4. Your Choices Regarding Cookies</h2>
            <p>
              If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help 
              pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might 
              not be able to use all of the features we offer, you may not be able to store your preferences, and some of our 
              pages might not display properly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
