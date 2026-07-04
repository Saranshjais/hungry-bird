import { Mail, MapPin, Phone } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | HungryBird',
  description: 'Get in touch with the HungryBird team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-stone-900 mb-4 text-center">Contact Us</h1>
        <p className="text-stone-500 text-center mb-12 max-w-xl mx-auto font-medium">
          Have a question, feedback, or want to partner with us? We'd love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Send us a message</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Name</label>
                <input type="text" className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Message</label>
                <textarea rows={4} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" placeholder="How can we help you?" />
              </div>
              <button type="button" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-brand-500/20">
                Send Message
              </button>
            </form>
          </div>

          <div className="flex flex-col justify-center space-y-8 p-8">
            <div className="flex items-start gap-4">
              <div className="bg-brand-50 p-3 rounded-2xl text-brand-500">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Email</h3>
                <p className="text-stone-500">hungrybird733@gmail.com</p>
                <p className="text-stone-400 text-sm mt-1">We aim to reply within 24 hours.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-500">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Office</h3>
                <p className="text-stone-500">HungryBird Infotech Pvt. Ltd.</p>
                <p className="text-stone-500">Jaipur, Rajasthan, India</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-500">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Phone</h3>
                <p className="text-stone-500">+91 98765 43210</p>
                <p className="text-stone-400 text-sm mt-1">Mon-Fri, 9am to 6pm IST</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
