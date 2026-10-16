"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/api';

// Page shell shared by login / register / verify / forgot / reset (same look as the original login page).
export function AuthLayout({ title, subtitle, children, below }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-28 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <Link href="/" className="flex justify-center mb-6">
          <span className="text-4xl font-extrabold text-stone-900 tracking-tight">
            Hungry<span className="text-brand-500">Bird</span>
          </span>
        </Link>
        <h1 className="text-center text-3xl font-extrabold text-stone-900 mb-2 leading-tight">{title}</h1>
        {subtitle && <div className="text-center text-sm text-stone-600 break-words">{subtitle}</div>}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-3xl sm:px-10 border border-stone-100">
          {children}
        </div>
        {below && <div className="mt-6 text-center text-sm text-stone-600 px-4">{below}</div>}
      </motion.div>
    </div>
  );
}

const TONES = {
  error: { box: 'bg-red-50 text-red-600 border-red-100', Icon: AlertCircle },
  success: { box: 'bg-emerald-50 text-emerald-700 border-emerald-100', Icon: CheckCircle2 },
  info: { box: 'bg-brand-50 text-brand-700 border-brand-100', Icon: Info },
  warning: { box: 'bg-amber-50 text-amber-800 border-amber-200', Icon: AlertCircle },
};

export function Alert({ tone = 'error', children, className = '' }) {
  if (!children) return null;
  const { box, Icon } = TONES[tone] || TONES.error;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 p-3 rounded-xl text-sm font-medium border ${box} ${className}`}>
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

const inputCls =
  'block w-full pr-3 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-all bg-white text-stone-900 disabled:bg-stone-50 disabled:text-stone-500';

export function Field({ label, icon: Icon, hint, id, className = '', inputClassName = '', ...props }) {
  const fieldId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-bold text-stone-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-stone-400" />
          </div>
        )}
        <input id={fieldId} className={`${inputCls} ${Icon ? 'pl-10' : 'pl-3'} ${inputClassName}`} {...props} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function PasswordField({ label, icon: Icon, id, className = '', ...props }) {
  const [show, setShow] = useState(false);
  const fieldId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-bold text-stone-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-stone-400" />
          </div>
        )}
        <input id={fieldId} type={show ? 'text' : 'password'} className={`${inputCls} ${Icon ? 'pl-10' : 'pl-3'} !pr-12`} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-stone-400 hover:text-stone-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function PasswordRules({ value }) {
  return (
    <ul className="mt-2 grid grid-cols-1 gap-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value || '');
        return (
          <li key={r.id} className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-stone-500'}`}>
            {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

// Single field for a 6-digit code: works with paste, SMS/email autofill and every screen width.
export function CodeInput({ value, onChange, id = 'code', autoFocus = false, disabled = false, label = '6-digit code' }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-stone-700 mb-2">
        {label}
      </label>
      <input
        id={id}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        className="block w-full text-center font-mono font-bold text-2xl tracking-[0.4em] sm:tracking-[0.6em] py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-all"
      />
    </div>
  );
}

export function SubmitButton({ loading, children, disabled, className = '', ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  );
}

export function PageSpinner({ label = 'Loading' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50" role="status" aria-label={label}>
      <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
