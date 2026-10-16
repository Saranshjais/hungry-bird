"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Save, Ticket, Trash2 } from "lucide-react";
import { adminFetch, formatPaise, paiseToRupeesInput, rupeesToPaise } from "../../lib/api";
import { useCan } from "../../lib/hooks";
import { useToast } from "../../components/Toast";
import Modal, { useConfirm } from "../../components/Modal";
import { EmptyState, ErrorBanner, Field, Loading, PageHeader, ReadOnlyNote, Switch } from "../../components/ui";
import { PremiumStatusBanner, PremiumTabs, usePremiumConfig } from "../../components/Premium";

const EMPTY = { name: "", description: "", price: "", duration_days: "30", is_active: true, sort_order: "" };

function plansFrom(data) {
  if (Array.isArray(data)) return data;
  return data?.plans || data?.items || [];
}

/** Full plan payload (PUT always sends every field so partial-update support isn't assumed). */
function toBody(p) {
  return {
    name: p.name,
    description: p.description || "",
    price_paise: p.price_paise,
    duration_days: p.duration_days,
    is_active: !!p.is_active,
    sort_order: Number(p.sort_order) || 0,
  };
}

export default function PremiumPlans() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("premium");
  const config = usePremiumConfig();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/plans");
      const list = plansFrom(data);
      setPlans([...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name))));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setForm({ ...EMPTY, sort_order: String(plans.length) });
  const openEdit = (p) =>
    setForm({
      id: p.id,
      name: p.name || "",
      description: p.description || "",
      price: paiseToRupeesInput(p.price_paise),
      duration_days: p.duration_days != null ? String(p.duration_days) : "",
      is_active: p.is_active !== false,
      sort_order: p.sort_order != null ? String(p.sort_order) : "0",
    });

  const price = form ? rupeesToPaise(form.price) : null;
  const days = form ? Number(form.duration_days) : NaN;

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Plan name is required.");
    if (price === null || price < 100) return toast.error("Price must be at least ₹1.");
    if (!Number.isInteger(days) || days < 1 || days > 3650) return toast.error("Duration must be a whole number of days (1 - 3650).");
    setSaving(true);
    try {
      const body = toBody({ ...form, name: form.name.trim(), description: form.description.trim(), price_paise: price, duration_days: days });
      const res = form.id ? await adminFetch(`/plans/${form.id}`, { method: "PUT", body }) : await adminFetch("/plans", { method: "POST", body });
      toast.success(res.message || (form.id ? "Plan updated" : "Plan created"));
      setForm(null);
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p, value) => {
    setBusyId(p.id);
    setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: value } : x)));
    try {
      await adminFetch(`/plans/${p.id}`, { method: "PUT", body: toBody({ ...p, is_active: value }) });
      toast.success(value ? `${p.name} is on sale again` : `${p.name} deactivated - no longer offered`);
    } catch (err) {
      setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: !value } : x)));
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p) => {
    const hasPayments = (p.payments_count ?? p.payment_count ?? 0) > 0;
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      message: hasPayments
        ? "This plan already has payments, so it will be deactivated instead of deleted (payment history keeps pointing at it). It is no longer offered to users."
        : "The plan is removed and no longer offered. If it turns out to have payments, the server deactivates it instead.",
      confirmLabel: hasPayments ? "Deactivate plan" : "Delete plan",
      danger: true,
    });
    if (!ok) return;
    setBusyId(p.id);
    try {
      const res = await adminFetch(`/plans/${p.id}`, { method: "DELETE" });
      toast.success(res.message || "Plan removed");
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = plans.filter((p) => p.is_active !== false).length;

  return (
    <div>
      <PageHeader title="Premium plans" subtitle={`${plans.length} plan${plans.length === 1 ? "" : "s"} · ${activeCount} on sale. Each plan is a one-time pass that adds its days to the buyer's Premium.`}>
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
            <Plus size={15} /> Add plan
          </button>
        )}
      </PageHeader>
      <PremiumTabs current="/admin/premium/plans" />
      <ReadOnlyNote area="premium" />
      <PremiumStatusBanner config={config} compact />
      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <Loading label="Loading plans..." />
      ) : plans.length === 0 ? (
        !error && (
          <div className="admin-card">
            <EmptyState icon={Ticket} title="No plans yet" message="Add a plan (e.g. Monthly pass, ₹49 for 30 days) so users have something to buy once Premium is on." />
          </div>
        )
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th className="num">Price</th>
                <th className="num">Duration</th>
                <th className="num">Order</th>
                <th className="num">Payments</th>
                <th>On sale</th>
                {canWrite && <th className="actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} style={{ opacity: p.is_active === false ? 0.6 : busyId === p.id ? 0.5 : 1 }}>
                  <td style={{ minWidth: 220 }}>
                    <div className="font-semibold text-neutral-900">{p.name}</div>
                    {p.description && <div className="text-xs text-neutral-500 line-clamp-2">{p.description}</div>}
                  </td>
                  <td className="num font-semibold whitespace-nowrap">{p.price_display || formatPaise(p.price_paise)}</td>
                  <td className="num whitespace-nowrap">{p.duration_days} days</td>
                  <td className="num">{p.sort_order ?? 0}</td>
                  <td className="num">{p.payments_count ?? p.payment_count ?? "—"}</td>
                  <td>
                    <Switch checked={p.is_active !== false} disabled={!canWrite || busyId === p.id} onChange={(v) => toggleActive(p, v)} label={p.is_active !== false ? "On sale" : "Not offered"} />
                  </td>
                  {canWrite && (
                    <td className="actions">
                      <div className="admin-actions">
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" onClick={() => openEdit(p)}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete or deactivate" disabled={busyId === p.id} onClick={() => remove(p)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        busy={saving}
        title={form?.id ? `Edit ${form.name || "plan"}` : "Add plan"}
        subtitle="Price is charged once; the plan's days are added to the buyer's Premium end date."
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="plan-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save plan"}
            </button>
          </>
        }
      >
        {form && (
          <form id="plan-form" className="admin-form-grid" onSubmit={save}>
            <Field label="Name" required className="span-all">
              <input className="admin-input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly pass" />
            </Field>
            <Field label="Description" className="span-all" hint="Shown under the plan name on the purchase screen.">
              <textarea className="admin-textarea" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 30 days of every hidden gem and food trail" />
            </Field>
            <Field label="Price (₹)" required hint={price !== null && price >= 100 ? `Charged as ${formatPaise(price)} (${price.toLocaleString("en-IN")} paise)` : "In rupees, e.g. 49 or 49.50"}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">₹</span>
                <input className="admin-input !pl-7" type="number" inputMode="decimal" required min={1} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="49" />
              </div>
            </Field>
            <Field label="Duration (days)" required hint="Added to the buyer's Premium end date.">
              <input className="admin-input" type="number" inputMode="numeric" required min={1} max={3650} step={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
            </Field>
            <Field label="Sort order" hint="Lower numbers are listed first">
              <input className="admin-input" type="number" step={1} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="admin-check">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                On sale (offered to users)
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
