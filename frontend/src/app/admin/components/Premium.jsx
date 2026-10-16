"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CircleCheck, CircleX, Crown, KeyRound, Lock, LockOpen, ShieldOff, TriangleAlert } from "lucide-react";
import { adminFetch, formatDate, formatDateTime, formatPaise, parseDate } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "./Toast";
import Modal, { useConfirm } from "./Modal";
import { ErrorBanner, Field, Spinner, Switch } from "./ui";

// Read-only service flags the backend adds to GET /api/admin/app-settings (CONTRACT §8).
export const SERVICE_KEYS = ["payments_available", "email_available", "push_available"];
// Settings owned by the Premium section (saved from there, never from App Settings).
export const PREMIUM_SETTING_KEYS = ["premium_enabled", "payment_methods", "premium_benefits"];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm, BHIM… (recommended)" },
  { value: "card", label: "Debit / credit cards", hint: "Higher fees; Indian cards need 3-D Secure" },
  { value: "netbanking", label: "Netbanking", hint: "All major Indian banks" },
];

/** Service flags may sit at the top level, under `services`/`status`, or inside `settings`. null = unknown. */
export function readServices(data) {
  const s = data?.settings || {};
  const out = {};
  SERVICE_KEYS.forEach((k) => {
    const v = data?.[k] ?? data?.services?.[k] ?? data?.status?.[k] ?? s[k];
    out[k] = v === undefined || v === null ? null : !!v;
  });
  return out;
}

export function asStringList(value, fallback = []) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter((v) => v.trim() !== "");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
    }
  }
  return fallback;
}

/** Premium settings + service flags from GET /api/admin/app-settings. */
export function usePremiumConfig() {
  const [state, setState] = useState({ loading: true, error: null, settings: null, services: {} });

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await adminFetch("/app-settings");
      setState({ loading: false, error: null, settings: data.settings || {}, services: readServices(data) });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const settings = state.settings || {};
  return {
    ...state,
    reload: load,
    premiumEnabled: !!settings.premium_enabled,
    paymentMethods: asStringList(settings.payment_methods, ["upi"]),
    benefits: asStringList(settings.premium_benefits, []),
    /** Optimistically patch local settings after a successful save. */
    patch: (patch) => setState((s) => ({ ...s, settings: { ...(s.settings || {}), ...patch } })),
  };
}

function StatusPill({ ok, unknown, okText, badText, unknownText = "Unknown" }) {
  const cls = unknown ? "bg-neutral-50 text-neutral-600 border-neutral-200" : ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200";
  const dot = unknown ? "bg-neutral-300" : ok ? "bg-emerald-500" : "bg-rose-500";
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${cls}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {unknown ? unknownText : ok ? okText : badText}
    </span>
  );
}

/**
 * The status strip shown on every Premium page: is premium switched on, can people pay?
 * With `toggle`, staff with premium write access can switch `premium_enabled` (confirm first).
 */
export function PremiumStatusBanner({ config, toggle = false, compact = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  // premium_enabled is saved through PUT /app-settings (area "app"), so both are needed.
  const canPremium = useCan("premium");
  const canApp = useCan("app");
  const canWrite = canPremium && canApp;
  const [saving, setSaving] = useState(false);
  const { premiumEnabled, services, loading, error } = config;
  const payments = services?.payments_available;

  if (loading && !config.settings) {
    return (
      <div className="admin-card !py-4 flex items-center gap-2 text-sm text-neutral-500">
        <Spinner small /> Checking premium status...
      </div>
    );
  }
  if (error && !config.settings) return <ErrorBanner message={error} onRetry={() => config.reload()} />;

  const setEnabled = async (next) => {
    const ok = await confirm(
      next
        ? {
            title: "Switch Premium on?",
            message:
              "Hidden gems marked Premium and premium food trails become locked previews for free users on the website and the app (no name, address or directions). People with an active subscription keep full access." +
              (payments === false ? "\n\nPayments are NOT configured yet, so nobody can buy Premium - free users will only see locked content until the Razorpay keys are set." : "") +
              "\n\nThe iOS app never sells Premium; it only shows a \"Premium\" label.",
            confirmLabel: "Switch Premium on",
            danger: payments === false,
          }
        : {
            title: "Switch Premium off?",
            message: "Nothing is locked any more and every purchase option is hidden on the website and in the app. Existing subscribers keep their premium dates for when you switch it back on.",
            confirmLabel: "Switch Premium off",
            danger: true,
          }
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await adminFetch("/app-settings", { method: "PUT", body: { settings: { premium_enabled: next } } });
      config.patch({ premium_enabled: res.settings?.premium_enabled ?? next });
      toast.success(next ? "Premium is on - premium content is now locked for free users" : "Premium is off - nothing is locked");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Slim one-line version for Plans / Subscribers / Payments; the full explanation lives on the overview.
  if (compact) {
    return (
      <div className={`admin-premium-banner compact ${premiumEnabled ? "on" : "off"}`}>
        <StatusPill ok={premiumEnabled} okText="Premium on" badText="Premium off" />
        <StatusPill ok={payments === true} unknown={payments === null || payments === undefined} okText="Payments configured" badText="Payments not configured" unknownText="Payments: unknown" />
        {(payments === false || !premiumEnabled) && (
          <Link href="/admin/premium" className="text-xs font-semibold text-blue-600 hover:underline">
            {payments === false ? "How to set up payments" : "Switch Premium on"} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`admin-card admin-premium-banner ${premiumEnabled ? "on" : "off"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${premiumEnabled ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>
            {premiumEnabled ? <Lock size={18} /> : <LockOpen size={18} />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900">{premiumEnabled ? "Premium is switched on" : "Premium is switched off"}</div>
            <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              {premiumEnabled
                ? "Premium hidden gems and premium trails are locked for free users; subscribers see everything."
                : "Nothing is locked and no purchase options are shown anywhere. Plans, grants and subscribers can be prepared in the meantime."}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill ok={premiumEnabled} okText="Premium on" badText="Premium off" />
          <StatusPill ok={payments === true} unknown={payments === null || payments === undefined} okText="Payments configured" badText="Payments not configured" unknownText="Payments: unknown" />
          {toggle && canWrite && (
            <span className="inline-flex items-center gap-2 pl-1">
              {saving && <Spinner small />}
              <Switch checked={premiumEnabled} disabled={saving} onChange={setEnabled} label={premiumEnabled ? "Switch Premium off" : "Switch Premium on"} />
              <span className="text-xs font-semibold text-neutral-600">{premiumEnabled ? "On" : "Off"}</span>
            </span>
          )}
        </div>
      </div>

      {payments === false && (
        <div className="admin-note !mb-0 mt-4">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Payments are not configured</strong>, so nobody can buy Premium yet (manual grants still work). Set{" "}
            <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code> and <code>RAZORPAY_WEBHOOK_SECRET</code> in the backend server&apos;s environment and restart it.
            {premiumEnabled && " Premium is already on, so free users currently see locked content with no way to unlock it."}
          </span>
        </div>
      )}
    </div>
  );
}

/** Is the user's premium active right now? (`is_premium` from the API, else premium_until > now) */
export function premiumInfo(user) {
  const until = parseDate(user?.premium_until);
  const active = typeof user?.is_premium === "boolean" ? user.is_premium : !!until && until.getTime() > Date.now();
  return { active, until };
}

export function PremiumBadge({ user, showExpired = true }) {
  const { active, until } = premiumInfo(user);
  if (active) {
    return (
      <span className="admin-badge premium normal-case" title={until ? `Premium until ${formatDateTime(until)}` : "Premium"}>
        <Crown size={11} /> Premium{until ? ` · until ${formatDate(until)}` : ""}
      </span>
    );
  }
  if (until && showExpired) {
    return (
      <span className="admin-badge neutral normal-case" title={`Premium ended ${formatDateTime(until)}`}>
        Expired {formatDate(until)}
      </span>
    );
  }
  return null;
}

const QUICK_DAYS = [7, 30, 90, 365];

/**
 * Grant / extend / revoke premium for one user -> POST /api/admin/users/<id>/premium
 *   { action: "grant" | "extend", days, note }   or   { action: "revoke", note }
 * `target` = { user: {id, name, email, premium_until, is_premium}, action }
 */
export function PremiumActionModal({ target, onClose, onDone }) {
  const toast = useToast();
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = target?.user?.id ?? target?.user?.user_id;
  const openKey = target ? `${userId}|${target.action}` : "";

  // Fresh form each time the modal opens (not on every parent re-render).
  useEffect(() => {
    if (openKey) {
      setDays("30");
      setNote("");
      setError("");
    }
  }, [openKey]);

  if (!target) return null;
  const { user, action } = target;
  const { active, until } = premiumInfo(user);
  const revoke = action === "revoke";
  const who = user.name || user.email || `User #${userId}`;
  const n = Number(days);
  const base = active && until ? until : new Date();
  const newEnd = Number.isFinite(n) && n > 0 ? new Date(base.getTime() + n * 86400000) : null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!revoke && (!Number.isInteger(n) || n < 1 || n > 3650)) return setError("Enter a whole number of days between 1 and 3650.");
    if (revoke && !note.trim()) return setError("Add a short note so the team knows why premium was revoked.");
    setBusy(true);
    try {
      const body = revoke ? { action: "revoke", note: note.trim() } : { action, days: n, note: note.trim() };
      const res = await adminFetch(`/users/${userId}/premium`, { method: "POST", body });
      toast.success(
        res.message ||
          (revoke ? `Premium revoked for ${who}` : `${action === "extend" ? "Extended" : "Granted"} ${n} day${n === 1 ? "" : "s"} of Premium for ${who}`)
      );
      onDone?.(res, body);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {revoke ? <ShieldOff size={18} className="text-rose-600 shrink-0" /> : <Crown size={18} className="text-amber-600 shrink-0" />}
          {revoke ? "Revoke Premium" : action === "extend" ? "Extend Premium" : "Grant Premium"}
        </span>
      }
      subtitle={`${who}${user.email && user.name ? ` · ${user.email}` : ""}`}
      footer={
        <>
          <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="premium-action-form" className={`admin-btn ${revoke ? "admin-btn-danger" : "admin-btn-brand"}`} disabled={busy}>
            {busy ? <Spinner small /> : revoke ? <ShieldOff size={15} /> : <CalendarPlus size={15} />}
            {busy ? "Saving..." : revoke ? "Revoke premium now" : action === "extend" ? "Extend premium" : "Grant premium"}
          </button>
        </>
      }
    >
      <form id="premium-action-form" className="admin-form" onSubmit={submit}>
        <div className="text-sm text-neutral-600 leading-relaxed">
          {active ? (
            <>
              Premium is active until <strong className="text-neutral-900">{formatDateTime(until)}</strong>.
            </>
          ) : until ? (
            <>Premium ended on {formatDateTime(until)}.</>
          ) : (
            <>This user has never had Premium.</>
          )}
        </div>
        {revoke ? (
          <div className="admin-note !mb-0">
            <TriangleAlert size={16} className="shrink-0 mt-0.5" />
            <span>Access ends immediately (premium_until is set to now). Payments are not refunded here - refunds are made from the Razorpay dashboard.</span>
          </div>
        ) : (
          <Field label="Days to add" required hint={newEnd ? `New end date: ${formatDateTime(newEnd)} (days are added to ${active ? "the current end date" : "today"})` : undefined}>
            <div className="flex flex-wrap gap-2 items-center">
              <input className="admin-input" style={{ maxWidth: 110 }} type="number" min={1} max={3650} step={1} required value={days} onChange={(e) => setDays(e.target.value)} />
              <div className="flex flex-wrap gap-1">
                {QUICK_DAYS.map((d) => (
                  <button key={d} type="button" className={`admin-btn admin-btn-sm ${String(d) === days ? "!border-brand-300 !bg-brand-50 !text-brand-700" : ""}`} onClick={() => setDays(String(d))}>
                    {d === 365 ? "1 year" : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        )}
        <Field label={revoke ? "Reason" : "Note (optional)"} required={revoke} hint="Saved in the subscription history with your name. Not shown to the user.">
          <textarea className="admin-textarea" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={revoke ? "e.g. Chargeback / abuse / granted by mistake" : "e.g. Compensation for a failed payment"} />
        </Field>
        {error && <div className="admin-error !mb-0">{error}</div>}
      </form>
    </Modal>
  );
}

const EVENT_STYLE = {
  purchase: { label: "Purchase", cls: "approved" },
  payment: { label: "Purchase", cls: "approved" },
  grant: { label: "Granted", cls: "premium" },
  extend: { label: "Extended", cls: "premium" },
  revoke: { label: "Revoked", cls: "rejected" },
  expire: { label: "Expired", cls: "neutral" },
};

/** GET /api/admin/users/<id> includes `subscription_events` for roles that can read premium. */
export function eventsFrom(data) {
  if (!data) return null;
  const list = data.subscription_events ?? data.history ?? data.events ?? data.premium_history;
  return Array.isArray(list) ? list : null;
}

const byNewest = (list) => [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")) || (b.id || 0) - (a.id || 0));

/**
 * Subscription event history for one user, from GET /api/admin/users/<id> -> subscription_events.
 * Pass `initial` (events already loaded with the user detail) to skip the first request;
 * bump `refreshKey` after a grant/extend/revoke to reload.
 */
export function PremiumHistory({ userId, refreshKey = 0, initial = null }) {
  const [events, setEvents] = useState(initial ? byNewest(initial) : null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(byNewest(eventsFrom(await adminFetch(`/users/${userId}`)) || []));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && (refreshKey > 0 || !initial)) load();
    // `initial` only seeds the first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey, load]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Spinner small /> Loading subscription history...
      </div>
    );
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!events?.length) return <p className="text-sm text-neutral-500 m-0">No subscription events yet.</p>;

  return (
    <ol className="list-none m-0 p-0 flex flex-col gap-2">
      {events.map((ev, i) => {
        const kind = String(ev.kind || ev.type || ev.action || "event").toLowerCase();
        const style = EVENT_STYLE[kind] || { label: kind, cls: "neutral" };
        const by = ev.staff_name || ev.admin_name || ev.created_by_name || ev.by || ev.staff?.name;
        const plan = ev.plan_name || ev.plan?.name || (typeof ev.plan === "string" ? ev.plan : null);
        return (
          <li key={ev.id ?? `${kind}-${ev.created_at}-${i}`} className="rounded-lg border border-neutral-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`admin-badge ${style.cls}`}>{style.label}</span>
                {ev.days ? <span className="text-sm font-semibold text-neutral-800">+{ev.days} days</span> : null}
                {ev.amount_paise != null && <span className="text-sm text-neutral-700">{formatPaise(ev.amount_paise)}</span>}
                {plan && <span className="text-xs text-neutral-500 truncate">{plan}</span>}
              </span>
              <span className="text-[11px] text-neutral-400 whitespace-nowrap" title={formatDateTime(ev.created_at)}>
                {formatDateTime(ev.created_at)}
              </span>
            </div>
            <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {ev.ends_at && <span>{kind === "revoke" ? "Ended" : "Now ends"} {formatDateTime(ev.ends_at)}</span>}
              {ev.previous_until && <span>was {formatDateTime(ev.previous_until)}</span>}
              {by ? <span>by {by}</span> : kind === "purchase" ? <span>paid by the user</span> : null}
            </div>
            {ev.note && <p className="text-xs text-neutral-700 mt-1 mb-0 whitespace-pre-line">{ev.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Small inline status for a service flag (true / false / null = unknown). */
export function ServiceStatus({ value, okText, badText, unknownText = "Not reported by the server" }) {
  if (value === null || value === undefined)
    return (
      <span className="admin-badge neutral normal-case">
        <KeyRound size={11} /> {unknownText}
      </span>
    );
  return value ? (
    <span className="admin-badge active normal-case">
      <CircleCheck size={11} /> {okText}
    </span>
  ) : (
    <span className="admin-badge danger normal-case">
      <CircleX size={11} /> {badText}
    </span>
  );
}

const PREMIUM_PAGES = [
  { href: "/admin/premium", label: "Overview" },
  { href: "/admin/premium/plans", label: "Plans" },
  { href: "/admin/premium/subscribers", label: "Subscribers" },
  { href: "/admin/premium/payments", label: "Payments" },
];

/** Tab-style links between the Premium pages (handy on phones where the sidebar is hidden). */
export function PremiumTabs({ current }) {
  return (
    <div className="admin-tabs" role="tablist">
      {PREMIUM_PAGES.map((p) => (
        <Link key={p.href} href={p.href} role="tab" aria-selected={current === p.href} className={`admin-tab no-underline ${current === p.href ? "active" : ""}`}>
          {p.label}
        </Link>
      ))}
    </div>
  );
}
