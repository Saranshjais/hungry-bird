import { Send } from 'lucide-react';
import ContactForm from './ContactForm';
import ContactDetails from './ContactDetails';

export const metadata = {
  title: 'Contact Us | HungryBird',
  description: 'Get in touch with the HungryBird team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] pt-28 pb-20 px-4 relative overflow-hidden">
      
      <div className="max-w-[1100px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 relative">
          <p className="font-kalam text-brand-500 text-2xl mb-1 drop-shadow-sm">We'd love to hear from you!</p>
          <div className="flex justify-center items-center gap-6 mb-4 relative inline-flex">
             {/* Decorative marks */}
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[-25deg] hidden sm:block absolute -left-12 -top-2"></div>
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[15deg] hidden sm:block absolute -left-10 top-4"></div>
             
             <h1 className="text-4xl md:text-6xl font-black text-stone-900 tracking-tight drop-shadow-sm">CONTACT US</h1>
             
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[25deg] hidden sm:block absolute -right-12 -top-2"></div>
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[-15deg] hidden sm:block absolute -right-10 top-4"></div>
          </div>
          <p className="text-stone-500 max-w-lg mx-auto font-medium text-lg mt-2">
            Have a question or feedback?<br/>We're here for you.
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-brand-400 to-amber-400 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          
          {/* Left Column - Form */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 relative h-max">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 text-white shrink-0">
                <Send size={22} className="-ml-0.5 mt-0.5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 mb-1">Send us a message</h2>
                <p className="text-stone-500 text-sm font-medium">Questions, feedback or a problem with a listing — tell us.</p>
              </div>
            </div>

            <ContactForm />
          </div>

          {/* Right Column - Contact Info (from the admin config) */}
          <ContactDetails />
        </div>



      </div>
    </div>
  );
}
