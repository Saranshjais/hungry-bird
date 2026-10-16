"use client";

// "Check your email" step: 6-digit code entry plus resend with a cooldown (CONTRACT §2).
// Used after registration and on /verify-email. Needs a logged-in user (the endpoints use the token).

import { useCallback, useEffect, useRef, useState } from 'react';
import { MailCheck, RotateCw } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert, CodeInput, SubmitButton } from './ui/forms';

const DEFAULT_COOLDOWN = 60;

export default function EmailCodeVerifier({ email, codeSent = true, initialCooldown = 0, onVerified, onSent }) {
  const { updateUser, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sent, setSent] = useState(codeSent);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const lastTried = useRef('');

  useEffect(() => {
    if (codeSent) setSent(true);
  }, [codeSent]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const alreadyVerified = useCallback(async () => {
    const u = await refreshUser();
    onVerified?.(u);
  }, [refreshUser, onVerified]);

  const verify = useCallback(
    async (value) => {
      if (value.length !== 6 || verifying) return;
      lastTried.current = value;
      setVerifying(true);
      setError('');
      setInfo('');
      try {
        const data = await api('/api/auth/email/verify', { method: 'POST', body: { code: value } });
        const user = { ...(data.user || {}), email_verified: true };
        updateUser(user);
        onVerified?.(user);
      } catch (err) {
        if (err.status === 409) return alreadyVerified();
        if (err.code === 'TOO_MANY_ATTEMPTS' || err.code === 'CODE_EXPIRED') setCode('');
        setError(errorMessage(err, { default: "We couldn't check that code. Please try again." }));
      } finally {
        setVerifying(false);
      }
    },
    [verifying, updateUser, onVerified, alreadyVerified]
  );

  const resend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    setError('');
    setInfo('');
    try {
      const data = await api('/api/auth/email/send-code', { method: 'POST' });
      setSent(true);
      onSent?.();
      setCode('');
      lastTried.current = '';
      setInfo(`We sent a new code to ${email || 'your email'}.`);
      setCooldown(Number(data.resend_after) > 0 ? Number(data.resend_after) : DEFAULT_COOLDOWN);
    } catch (err) {
      if (err.status === 409) return alreadyVerified();
      if (err.code === 'RATE_LIMITED') setCooldown(Number(err.data?.resend_after || err.data?.retry_after) || DEFAULT_COOLDOWN);
      setError(errorMessage(err, { default: "We couldn't send a code right now. Please try again." }));
    } finally {
      setSending(false);
    }
  };

  const onChange = (v) => {
    setCode(v);
    setError('');
    // submit automatically once all six digits are in (but never retry the same wrong code)
    if (v.length === 6 && v !== lastTried.current) verify(v);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl p-4">
        <MailCheck size={22} className="text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-stone-700 m-0 min-w-0 break-words" style={{ color: 'inherit' }}>
          {sent ? (
            <>We emailed a 6-digit code to <strong className="text-stone-900 break-all">{email || 'your email address'}</strong>. It is valid for 10 minutes.</>
          ) : (
            <>Send a 6-digit code to <strong className="text-stone-900 break-all">{email || 'your email address'}</strong> to confirm it's yours.</>
          )}
        </p>
      </div>

      <Alert>{error}</Alert>
      <Alert tone="success">{info}</Alert>

      {sent && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            lastTried.current = '';
            verify(code);
          }}
        >
          <CodeInput value={code} onChange={onChange} autoFocus disabled={verifying} />
          <SubmitButton loading={verifying} disabled={code.length !== 6}>
            Verify email
          </SubmitButton>
        </form>
      )}

      <div className="text-center">
        {sent ? (
          <p className="text-sm text-stone-500 m-0">
            Didn't get it? Check spam, or{' '}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || sending}
              className="font-bold text-brand-500 hover:text-brand-600 disabled:text-stone-400 disabled:cursor-not-allowed inline-flex items-center gap-1 py-2"
            >
              <RotateCw size={13} className={sending ? 'animate-spin' : ''} />
              {cooldown > 0 ? `resend in ${cooldown}s` : 'send a new code'}
            </button>
          </p>
        ) : (
          <button type="button" onClick={resend} disabled={sending || cooldown > 0} className="btn-orange w-full">
            {sending ? 'Sending…' : cooldown > 0 ? `Send code (${cooldown}s)` : 'Send code'}
          </button>
        )}
      </div>
    </div>
  );
}
