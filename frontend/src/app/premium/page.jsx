"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Crown, Check, Lock, Loader2, CheckCircle2, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/vendors';
import { BRAND_COLOR } from '../../lib/site';
import { formatDuration, loadRazorpay } from '../../lib/premium';
import { loginHref } from '../../components/RequireAuth';
import { Alert, PageSpinner } from '../../components/ui/forms';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function Unavailable() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 px-4 pt-24 pb-16 text-center">
      <Crown size={40} className="text-stone-300" />
      <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">This page isn't available</h1>
      <p className="text-stone-500 text-sm max-w-sm">Everything on HungryBird is free to explore right now.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </div>
  );
}

function SuccessView({ until, city }) {
  return (
    <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center px-4 pt-28 pb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="panel bg-white p-8 sm:p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <Crown size={38} className="text-amber-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 leading-tight mb-3">You're Premium!</h1>
        <p className="text-stone-600 mb-8">
          Every hidden gem and food trail is now unlocked{until ? ` until ${formatDate(until, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
        </p>
        <div className="flex flex-col gap-3">
          <Link href={city ? `/city/${city}` : '/'} className="btn-orange w-full">
            <Sparkles size={16} /> Explore hidden gems
          </Link>
          <Link href="/account" className="btn-ghost w-full">Go to your account</Link>
        </div>
      </motion.div>
    </div>
  );
}

function PremiumContent() {
  const config = useConfig();
  const { user, loading: authLoading, updateUser, refreshUser } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get('plan');
  const [busyPlan, setBusyPlan] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | ordering | checkout | verifying | success
  const [msg, setMsg] = useState({ tone: '', text: '' });
  const [successUntil, setSuccessUntil] = useState(null);
  const failedRef = useRef('');
  const paidRef = useRef(false);

  const premium = config.premium;
  const highlighted = wanted && premium.plans.some((p) => String(p.id) === String(wanted)) ? String(wanted) : null;

  useEffect(() => {
    if (!highlighted) return;
    const el = document.getElementById(`plan-${highlighted}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  if (!config.loaded) return <PageSpinner />;
  if (!premium.enabled) return <Unavailable />;
  if (phase === 'success') return <SuccessView until={successUntil} city={config.defaultCity} />;

  const active = !!(user && user.is_premium);
  const canPay = premium.paymentsAvailable;
  const upiOnly = premium.paymentMethods.length === 0 || (premium.paymentMethods.length === 1 && premium.paymentMethods[0] === 'upi');

  const back = (planId) => `/premium?plan=${encodeURIComponent(planId)}`;

  const confirmPayment = async (resp) => {
    paidRef.current = true;
    setPhase('verifying');
    setMsg({ tone: 'info', text: 'Confirming your payment…' });
    try {
      const data = await api('/api/payments/verify', {
        method: 'POST',
        body: {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        },
        timeout: 30000,
      });
      if (data.user) updateUser(data.user);
      else await refreshUser();
      setSuccessUntil((data.user && data.user.premium_until) || null);
      setPhase('success');
    } catch (err) {
      if (err.code !== 'PAYMENT_VERIFICATION_FAILED') {
        // Network trouble: the payment webhook may still have activated Premium.
        await wait(3000);
        try {
          const status = await api('/api/premium/status');
          if (status.is_premium) {
            await refreshUser();
            setSuccessUntil(status.premium_until || null);
            setPhase('success');
            return;
          }
        } catch {
          /* fall through */
        }
      }
      setPhase('idle');
      setBusyPlan(null);
      setMsg({
        tone: 'error',
        text:
          err.code === 'PAYMENT_VERIFICATION_FAILED'
            ? `${errorMessage(err)} Payment ID: ${resp.razorpay_payment_id}`
            : `We received your payment but couldn't confirm it yet. It is usually activated within a few minutes — refresh this page shortly. If it isn't, contact support with payment ID ${resp.razorpay_payment_id}.`,
      });
    }
  };

  const buy = async (plan) => {
    setMsg({ tone: '', text: '' });
    if (!user) {
      router.push(loginHref(back(plan.id)));
      return;
    }
    if (user.email_verified === false) {
      router.push(`/verify-email?next=${encodeURIComponent(back(plan.id))}`);
      return;
    }
    setBusyPlan(plan.id);
    setPhase('ordering');
    failedRef.current = '';
    paidRef.current = false;

    let order;
    try {
      order = await api('/api/payments/order', { method: 'POST', body: { plan_id: plan.id }, timeout: 30000 });
    } catch (err) {
      setBusyPlan(null);
      setPhase('idle');
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/verify-email?next=${encodeURIComponent(back(plan.id))}`);
        return;
      }
      if (err.status === 401) {
        router.push(loginHref(back(plan.id)));
        return;
      }
      if (err.code === 'PREMIUM_DISABLED' || err.code === 'PAYMENTS_NOT_CONFIGURED') config.reload();
      setMsg({ tone: 'error', text: errorMessage(err, { default: "We couldn't start the payment. Please try again." }) });
      return;
    }

    let Razorpay;
    try {
      Razorpay = await loadRazorpay();
    } catch {
      setBusyPlan(null);
      setPhase('idle');
      setMsg({ tone: 'error', text: "The payment window couldn't load. Check your connection (and any ad blocker) and try again." });
      return;
    }

    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount_paise,
      currency: order.currency || 'INR',
      name: order.name || 'HungryBird',
      description: order.description || plan.name,
      image: `${window.location.origin}/logo.png`,
      prefill: order.prefill || {},
      method: order.method,
      theme: { color: BRAND_COLOR },
      handler: confirmPayment,
      modal: {
        ondismiss: () => {
          if (paidRef.current) return;
          setBusyPlan(null);
          setPhase('idle');
          setMsg(
            failedRef.current
              ? { tone: 'error', text: `Payment failed: ${failedRef.current} You have not been charged.` }
              : { tone: 'info', text: 'Payment cancelled. You have not been charged.' }
          );
        },
      },
    });
    rzp.on('payment.failed', (resp) => {
      failedRef.current = (resp && resp.error && (resp.error.description || resp.error.reason)) || 'the payment did not go through.';
    });
    setPhase('checkout');
    rzp.open();
  };

  return (
    <div className="min-h-screen bg-[#FDF8EE] pt-28 pb-20 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="eyebrow mb-4 inline-flex">
            <Crown size={12} /> HungryBird Premium
          </span>
          <h1 className="text-[clamp(2.25rem,9vw,3.5rem)] font-extrabold text-stone-900 leading-[1.05] mb-4">
            Unlock every <span className="gradient-text">hidden gem</span>
          </h1>
          <p className="text-stone-600 text-base sm:text-lg">
            Get the full address, directions and reviews for premium stalls, plus every food trail.
          </p>
        </div>

        {active && (
          <div className="max-w-2xl mx-auto mb-8">
            <Alert tone="success">
              You're Premium{user.premium_until ? ` until ${formatDate(user.premium_until, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Buying another pass adds its days on top.
            </Alert>
          </div>
        )}
        {!authLoading && user && user.email_verified === false && (
          <div className="max-w-2xl mx-auto mb-8">
            <Alert tone="warning">
              Verify your email before buying.{' '}
              <Link href={`/verify-email?next=${encodeURIComponent('/premium')}`} className="font-bold underline">Verify now</Link>
            </Alert>
          </div>
        )}
        {!canPay && (
          <div className="max-w-2xl mx-auto mb-8">
            <Alert tone="warning">Payments are temporarily unavailable. Please check back soon.</Alert>
          </div>
        )}
        {msg.text && (
          <div className="max-w-2xl mx-auto mb-8" aria-live="polite">
            <Alert tone={msg.tone || 'error'}>{msg.text}</Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {premium.benefits.length > 0 && (
            <div className="lg:col-span-2 panel bg-white p-6 sm:p-8">
              <h2 className="text-lg font-extrabold text-stone-900 mb-5">What you get</h2>
              <ul className="space-y-4">
                {premium.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-stone-700 font-medium">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Check size={14} />
                    </span>
                    <span className="min-w-0 break-words pt-0.5">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={premium.benefits.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}>
            {premium.plans.length === 0 ? (
              <div className="panel bg-white p-8 text-center">
                <p className="text-stone-500 text-sm m-0">No passes are on sale right now. Please check back soon.</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${premium.plans.length > 1 ? 'sm:grid-cols-2' : ''} gap-5`}>
                {premium.plans.map((plan) => {
                  const isHi = highlighted === String(plan.id);
                  const busy = busyPlan === plan.id;
                  const duration = formatDuration(plan.duration_days);
                  return (
                    <div
                      key={plan.id}
                      id={`plan-${plan.id}`}
                      className={`panel bg-white p-6 flex flex-col ${isHi ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-[#FDF8EE]' : ''}`}
                    >
                      <h3 className="text-lg font-extrabold text-stone-900 mb-1 break-words">{plan.name}</h3>
                      {duration && <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-4">{duration} of Premium</p>}
                      <div className="flex items-end gap-1.5 mb-4">
                        <span className="text-4xl font-extrabold text-stone-900 leading-none">{plan.price_display}</span>
                        <span className="text-sm text-stone-500 font-medium pb-1">one-time</span>
                      </div>
                      {plan.description && <p className="text-sm text-stone-600 mb-6 break-words">{plan.description}</p>}
                      <button
                        type="button"
                        onClick={() => buy(plan)}
                        disabled={!canPay || busyPlan !== null}
                        className="btn-orange w-full mt-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {busy ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> {phase === 'verifying' ? 'Confirming…' : 'Opening payment…'}
                          </>
                        ) : !user ? (
                          <>
                            <Lock size={15} /> Log in to buy
                          </>
                        ) : active ? (
                          `Extend by ${duration || 'this pass'}`
                        ) : (
                          `Buy ${plan.price_display}`
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 font-medium">
              <p className="flex items-start gap-2 m-0">
                <Smartphone size={15} className="text-brand-500 flex-shrink-0" />
                {upiOnly ? 'Pay securely with any UPI app through Razorpay.' : 'Pay securely through Razorpay.'}
              </p>
              <p className="flex items-start gap-2 m-0">
                <ShieldCheck size={15} className="text-brand-500 flex-shrink-0" />
                One-time payment. No auto-renewal — your pass simply ends.
              </p>
            </div>
            <p className="mt-4 text-xs text-stone-500 m-0">
              By buying a pass you agree to our <Link href="/terms" className="font-bold text-stone-700 hover:text-brand-600">Terms of Service</Link>.
            </p>
          </div>
        </div>

        {active && (
          <p className="text-center mt-10">
            <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-brand-600 py-2">
              <CheckCircle2 size={15} /> See your Premium status and history
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PremiumContent />
    </Suspense>
  );
}
