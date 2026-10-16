'use client';

import { useEffect, useState } from 'react';
import { Mail, Send, User, AtSign } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const SUBJECTS = { support: 'Support', feedback: 'Feedback' };

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [feedback, setFeedback] = useState('');
  const { user } = useAuth();

  // Prefill for logged-in users (they can still edit both fields).
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name || '', email: f.email || user.email || '' }));
  }, [user]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setFeedback('');
    try {
      const data = await api('/api/contact', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: SUBJECTS[form.subject] || '',
          message: form.message.trim(),
          source: 'web',
        },
      });
      setStatus('sent');
      setFeedback(data.message || "Thanks! Our team will get back to you soon.");
      setForm({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      setFeedback(
        err.code === 'NETWORK' || err.code === 'TIMEOUT'
          ? 'We could not reach our server. Please try again in a moment or email us directly.'
          : errorMessage(err)
      );
    }
  };

  const sending = status === 'sending';

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
            <User size={14} className="text-stone-400" /> Your Name
          </label>
          <input type="text" name="name" required maxLength={100} value={form.name} onChange={update('name')} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 text-sm" placeholder="Enter your full name" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
            <Mail size={14} className="text-stone-400" /> Email Address
          </label>
          <input type="email" name="email" required maxLength={150} value={form.email} onChange={update('email')} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 text-sm" placeholder="Enter your email" />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
          <AtSign size={14} className="text-stone-400" /> Subject
        </label>
        <select name="subject" value={form.subject} onChange={update('subject')} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 bg-white text-sm">
          <option value="">Select a subject</option>
          <option value="support">Support</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
          <Send size={14} className="text-stone-400" /> Message
        </label>
        <textarea rows={4} name="message" required maxLength={5000} value={form.message} onChange={update('message')} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none font-medium text-stone-800 text-sm" placeholder="How can we help you?" />
      </div>

      <button type="submit" disabled={sending} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0">
        {sending ? 'Sending...' : 'Send Message'} <Send size={16} />
      </button>

      {feedback && (
        <p role="status" className={`text-sm font-medium text-center ${status === 'sent' ? 'text-emerald-600' : 'text-red-500'}`}>
          {feedback}
        </p>
      )}
    </form>
  );
}
