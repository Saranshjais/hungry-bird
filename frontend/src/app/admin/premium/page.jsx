"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight, CreditCard, Info, ListChecks, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { adminFetch, formatPaise } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import { PageHeader, ReadOnlyNote, Spinner } from "../components/ui";
import { PAYMENT_METHOD_OPTIONS, PremiumStatusBanner, PremiumTabs, usePremiumConfig } from "../components/Premium";

const MAX_BENEFITS = 12;

export default function PremiumOverview() {
  const config = usePremiumConfig();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminFetch("/stats?days=30")
      .then((d) => setStats(d?.premium || null))
      .catch(() => setStats(null));
  }, []);

  return (
    <div>
      <PageHeader title="Premium" subtitle="Paid passes (UPI via Razorpay) that unlock premium hidden gems and food trails for a fixed number of days." />
      <PremiumTabs current="/admin/premium" />
      <ReadOnlyNote area="premium" />
      <PremiumStatusBanner config={config} toggle />

      {stats && (
        <div className="admin-stat-row mb-6">
          <div className="admin-stat">
            <div className="admin-stat-value">{(stats.active_subscribers ?? 0).toLocaleString("en-IN")}</div>
            <div className="admin-stat-label">Active subscribers</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value">{formatPaise(stats.revenue_30d_paise ?? 0)}</div>
            <div className="admin-stat-label">Revenue · last 30 days</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value">{(stats.payments_30d ?? 0).toLocaleString("en-IN")}</div>
            <div className="admin-stat-label">Payments · last 30 days</div>
          </div>
        </div>
      )}

      {config.settings && <PremiumSettingsForm config={config} />}

      <div className="admin-card">
        <h3 className="admin-card-title">
          <Info size={17} className="text-blue-500" /> How Premium works
        </h3>
        <ul className="m-0 pl-5 text-sm text-neutral-600 flex flex-col gap-1.5 leading-relaxed">
          <li>
            Premium content = vendors marked <strong>Premium</strong> (on the <Link href="/admin/vendors" className="text-blue-600 hover:underline">Vendors</Link> page) and food trails marked{" "}
            <strong>Premium</strong> (on <Link href="/admin/trails" className="text-blue-600 hover:underline">Food Trails</Link>). While Premium is on, free users see them as locked previews - area, category and rating only.
          </li>
          <li>
            A purchase is a one-time pass: paying for a plan adds its days to the user&apos;s premium end date (from today, or from the current end date if they still have Premium). There is no auto-renew.
          </li>
          <li>Buying requires a verified email. The Android app and the website sell Premium; the iOS app never shows a purchase button, it only unlocks content for accounts that already have Premium.</li>
          <li>
            You can grant, extend or revoke Premium by hand from <Link href="/admin/premium/subscribers" className="text-blue-600 hover:underline">Subscribers</Link> or the{" "}
            <Link href="/admin/users" className="text-blue-600 hover:underline">Users</Link> page. Every change is logged with your name.
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/admin/premium/plans" className="admin-btn admin-btn-sm">
            Manage plans <ArrowUpRight size={13} />
          </Link>
          <Link href="/admin/premium/subscribers" className="admin-btn admin-btn-sm">
            Subscribers <ArrowUpRight size={13} />
          </Link>
          <Link href="/admin/premium/payments" className="admin-btn admin-btn-sm">
            Payments <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PremiumSettingsForm({ config }) {
  const toast = useToast();
  // Saved through PUT /app-settings (area "app") - needs both premium and app write access.
  const canPremium = useCan("premium");
  const canApp = useCan("app");
  const canWrite = canPremium && canApp;
  const ro = !canWrite;
  const saved = useMemo(() => ({ benefits: config.benefits, methods: config.paymentMethods }), [config.benefits, config.paymentMethods]);
  const [benefits, setBenefits] = useState(saved.benefits);
  const [methods, setMethods] = useState(saved.methods);
  const [saving, setSaving] = useState(false);
  const savedKey = JSON.stringify(saved);

  // Re-sync the form when the saved settings change (first load / after saving).
  useEffect(() => {
    const s = JSON.parse(savedKey);
    setBenefits(s.benefits);
    setMethods(s.methods);
  }, [savedKey]);

  const cleanBenefits = benefits.map((b) => b.trim()).filter(Boolean);
  const dirty = JSON.stringify({ benefits: cleanBenefits, methods: [...methods].sort() }) !== JSON.stringify({ benefits: saved.benefits, methods: [...saved.methods].sort() });

  const setBenefit = (i, value) => setBenefits((list) => list.map((b, j) => (j === i ? value : b)));
  const move = (i, dir) =>
    setBenefits((list) => {
      const next = [...list];
      const t = i + dir;
      if (t < 0 || t >= next.length) return list;
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  const toggleMethod = (value, on) => setMethods((list) => (on ? [...new Set([...list, value])] : list.filter((m) => m !== value)));

  const save = async (e) => {
    e.preventDefault();
    if (!methods.length) return toast.error("Keep at least one payment method switched on (UPI is recommended).");
    setSaving(true);
    try {
      const body = { settings: { premium_benefits: cleanBenefits, payment_methods: PAYMENT_METHOD_OPTIONS.map((o) => o.value).filter((m) => methods.includes(m)) } };
      const res = await adminFetch("/app-settings", { method: "PUT", body });
      config.patch({
        premium_benefits: res.settings?.premium_benefits ?? body.settings.premium_benefits,
        payment_methods: res.settings?.payment_methods ?? body.settings.payment_methods,
      });
      toast.success("Premium settings saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-5 mb-6" onSubmit={save}>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="admin-card !mb-0 xl:col-span-3 min-w-0">
          <h3 className="admin-card-title">
            <ListChecks size={17} className="text-amber-600" /> Benefits shown to users
          </h3>
          <p className="text-xs text-neutral-500 mt-0 mb-3">Listed on the &ldquo;Unlock with Premium&rdquo; screens on the website and in the app, in this order. Keep each one short and true.</p>
          <div className="admin-list-editor">
            {benefits.length === 0 && <p className="text-sm text-neutral-500 m-0">No benefits listed yet.</p>}
            {benefits.map((b, i) => (
              <div key={i} className="admin-list-row">
                <span className="admin-list-row-index">{i + 1}</span>
                <div className="admin-list-row-body">
                  <input className="admin-input" disabled={ro} maxLength={120} value={b} onChange={(e) => setBenefit(i, e.target.value)} placeholder="e.g. Every hidden gem with address & directions" aria-label={`Benefit ${i + 1}`} />
                </div>
                {!ro && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up" aria-label="Move up">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" disabled={i === benefits.length - 1} onClick={() => move(i, 1)} title="Move down" aria-label="Move down">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" onClick={() => setBenefits((list) => list.filter((_, j) => j !== i))} title="Remove" aria-label="Remove benefit">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!ro && benefits.length < MAX_BENEFITS && (
            <button type="button" className="admin-btn admin-btn-sm mt-3" onClick={() => setBenefits((list) => [...list, ""])}>
              <Plus size={14} /> Add benefit
            </button>
          )}
        </div>

        <div className="admin-card !mb-0 xl:col-span-2 min-w-0">
          <h3 className="admin-card-title">
            <CreditCard size={17} className="text-blue-500" /> Payment methods
          </h3>
          <p className="text-xs text-neutral-500 mt-0 mb-3">Which options Razorpay Checkout offers. UPI only is the default; cards and netbanking also need to be activated on your Razorpay account.</p>
          <div className="flex flex-col gap-3">
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <label key={o.value} className="admin-check !items-start">
                <input type="checkbox" className="mt-0.5" disabled={ro} checked={methods.includes(o.value)} onChange={(e) => toggleMethod(o.value, e.target.checked)} />
                <span>
                  <span className="font-semibold">{o.label}</span>
                  <span className="block text-xs text-neutral-500 font-normal">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-[#fafafa]/90 backdrop-blur py-3 border-t border-neutral-200 z-10">
          <button type="submit" className="admin-btn admin-btn-brand" disabled={saving || !dirty}>
            {saving ? <Spinner small /> : <Save size={15} />} {saving ? "Saving..." : "Save premium settings"}
          </button>
          {dirty && (
            <button
              type="button"
              className="admin-btn"
              disabled={saving}
              onClick={() => {
                setBenefits(saved.benefits);
                setMethods(saved.methods);
              }}
            >
              <RotateCcw size={15} /> Discard changes
            </button>
          )}
          <span className="text-xs text-neutral-500">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        </div>
      )}
    </form>
  );
}
