"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Construction, Image as ImageIcon, Megaphone, Pencil, Plus, RotateCcw, Save, Send, Settings, Smartphone, Trash2 } from "lucide-react";
import { adminFetch, formatDateTime, timeAgo } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, Spinner, Switch, Tabs, Thumb } from "../components/ui";

const LINK_TYPES = [
  { value: "none", label: "No link" },
  { value: "vendor", label: "Vendor" },
  { value: "city", label: "City" },
  { value: "category", label: "Category" },
  { value: "url", label: "Web URL" },
];

function describeLink(type, value, cities, categories) {
  if (!type || type === "none") return "No link";
  if (type === "city") return `City: ${cities.find((c) => c.slug === value)?.name || value || "?"}`;
  if (type === "category") return `Category: ${categories.find((c) => c.slug === value)?.name || value || "?"}`;
  if (type === "vendor") return `Vendor #${value || "?"}`;
  return value || "URL";
}

/** link_type + link_value inputs shared by banners and notifications. */
function LinkFields({ type, value, onChange, cities, categories, disabled }) {
  return (
    <>
      <Field label="Tap action">
        <select className="admin-select full" disabled={disabled} value={type || "none"} onChange={(e) => onChange({ link_type: e.target.value, link_value: "" })}>
          {LINK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Link target"
        hint={type === "vendor" ? "The vendor's ID (shown in the Vendors list / URL /vendor/<id>)" : type === "url" ? "Opens in the browser" : type === "none" || !type ? "Nothing happens when tapped" : undefined}
      >
        {type === "city" ? (
          <select className="admin-select full" disabled={disabled} value={value || ""} onChange={(e) => onChange({ link_value: e.target.value })}>
            <option value="">Choose a city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        ) : type === "category" ? (
          <select className="admin-select full" disabled={disabled} value={value || ""} onChange={(e) => onChange({ link_value: e.target.value })}>
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="admin-input"
            disabled={disabled || !type || type === "none"}
            type={type === "vendor" ? "number" : type === "url" ? "url" : "text"}
            min={type === "vendor" ? 1 : undefined}
            value={value || ""}
            onChange={(e) => onChange({ link_value: e.target.value })}
            placeholder={type === "vendor" ? "e.g. 42" : type === "url" ? "https://..." : "—"}
          />
        )}
      </Field>
    </>
  );
}

export default function AppSettings() {
  const [tab, setTab] = useState("banners");
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState("");

  const loadBanners = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setBannersLoading(true);
    setBannersError("");
    try {
      const data = await adminFetch("/banners");
      setBanners(data.banners || []);
    } catch (err) {
      setBannersError(err.message);
    } finally {
      setBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
    adminFetch("/cities").then((d) => setCities(d.cities || [])).catch(() => {});
    adminFetch("/categories").then((d) => setCategories(d.categories || [])).catch(() => {});
  }, [loadBanners]);

  return (
    <div>
      <PageHeader title="Mobile App Settings" subtitle="Home banners, broadcast notifications and remote configuration for the HungryBird app." />
      <ReadOnlyNote area="app" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "banners", label: "Home banners", icon: ImageIcon, count: banners.length || undefined },
          { value: "notifications", label: "Notifications", icon: Bell },
          { value: "config", label: "Configuration", icon: Settings },
        ]}
      />
      {tab === "banners" && (
        <BannersTab banners={banners} loading={bannersLoading} error={bannersError} reload={loadBanners} setBanners={setBanners} cities={cities} categories={categories} />
      )}
      {tab === "notifications" && <NotificationsTab cities={cities} categories={categories} />}
      {tab === "config" && <ConfigTab cities={cities} banners={banners} />}
    </div>
  );
}

// ==================== BANNERS ====================

const EMPTY_BANNER = { title: "", subtitle: "", image_url: "", link_type: "none", link_value: "", sort_order: "", is_active: true };

function BannersTab({ banners, loading, error, reload, setBanners, cities, categories }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("app");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.image_url.trim()) return toast.error("Title and image URL are required.");
    setSaving(true);
    const body = {
      title: form.title.trim(),
      subtitle: form.subtitle,
      image_url: form.image_url.trim(),
      link_type: form.link_type || "none",
      link_value: form.link_type === "none" ? "" : String(form.link_value || ""),
      sort_order: form.sort_order === "" ? 0 : Number(form.sort_order),
      is_active: form.is_active,
    };
    try {
      const res = form.id ? await adminFetch(`/banners/${form.id}`, { method: "PUT", body }) : await adminFetch("/banners", { method: "POST", body });
      toast.success(res.message || "Banner saved");
      setForm(null);
      reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b, value) => {
    setBanners((list) => list.map((x) => (x.id === b.id ? { ...x, is_active: value } : x)));
    try {
      await adminFetch(`/banners/${b.id}`, { method: "PUT", body: { is_active: value } });
      toast.success(value ? "Banner is live in the app" : "Banner hidden");
    } catch (err) {
      setBanners((list) => list.map((x) => (x.id === b.id ? { ...x, is_active: !value } : x)));
      toast.error(err.message);
    }
  };

  const remove = async (b) => {
    const ok = await confirm({ title: "Delete banner?", message: `"${b.title}" will be removed from the app's home carousel.`, confirmLabel: "Delete banner", danger: true });
    if (!ok) return;
    try {
      const res = await adminFetch(`/banners/${b.id}`, { method: "DELETE" });
      toast.success(res.message || "Banner deleted");
      reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-neutral-500 m-0">Active banners rotate in the carousel at the top of the app&apos;s home screen, lowest sort order first. Recommended image size 1200×500.</p>
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={() => setForm({ ...EMPTY_BANNER, sort_order: banners.length })}>
            <Plus size={15} /> Add banner
          </button>
        )}
      </div>
      <ErrorBanner message={error} onRetry={() => reload()} />
      {loading ? (
        <Loading label="Loading banners..." />
      ) : banners.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={ImageIcon} title="No banners yet" message="Add a banner to promote vendors, cities or campaigns on the app home screen." />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap sm:flex-nowrap gap-4 items-center shadow-sm" style={{ opacity: b.is_active ? 1 : 0.65 }}>
              <Thumb src={b.image_url} alt={b.title} size={96} className="!w-40 !h-[72px] !rounded-lg" />
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-neutral-900">{b.title}</div>
                {b.subtitle && <div className="text-sm text-neutral-600">{b.subtitle}</div>}
                <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-3">
                  <span>{describeLink(b.link_type, b.link_value, cities, categories)}</span>
                  <span>Sort order {b.sort_order}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${b.is_active ? "text-emerald-600" : "text-neutral-400"}`}>{b.is_active ? "Live" : "Hidden"}</span>
                <Switch checked={b.is_active} disabled={!canWrite} onChange={(v) => toggle(b, v)} label="Active" />
              </div>
              {canWrite && (
                <div className="admin-actions">
                  <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" onClick={() => setForm({ ...EMPTY_BANNER, ...b, subtitle: b.subtitle || "", link_value: b.link_value || "" })}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" onClick={() => remove(b)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        busy={saving}
        size="lg"
        title={form?.id ? "Edit banner" : "Add banner"}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="banner-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save banner"}
            </button>
          </>
        }
      >
        {form && (
          <form id="banner-form" className="admin-form-grid" onSubmit={save}>
            <Field label="Title" required>
              <input className="admin-input" required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monsoon chaat trail" />
            </Field>
            <Field label="Subtitle">
              <input className="admin-input" maxLength={250} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </Field>
            <Field label="Image URL" required className="span-all">
              <input className="admin-input" type="url" required maxLength={500} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </Field>
            <div className="span-all">
              <ImagePreview src={form.image_url} height={150} />
            </div>
            <LinkFields type={form.link_type} value={form.link_value} cities={cities} categories={categories} onChange={(patch) => setForm({ ...form, ...patch })} />
            <Field label="Sort order" hint="Lower numbers show first">
              <input className="admin-input" type="number" step={1} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="admin-check">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (show in the app)
              </label>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

// ==================== NOTIFICATIONS ====================

const EMPTY_NOTE = { title: "", body: "", target: "all", link_type: "none", link_value: "", send_push: true };

function NotificationsTab({ cities, categories }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("app");
  const [form, setForm] = useState(EMPTY_NOTE);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/notifications");
      setHistory(data.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const targetLabel = (target) => {
    if (!target || target === "all") return "All users";
    const slug = target.split(":").slice(1).join(":");
    return `${cities.find((c) => c.slug === slug)?.name || slug} users`;
  };

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required.");
    const ok = await confirm({
      title: "Publish notification?",
      message: `"${form.title.trim()}" will appear in the app's notification inbox for ${targetLabel(form.target).toLowerCase()}.${form.send_push ? "\n\nA push notification will also be sent to devices that allow notifications." : ""}`,
      confirmLabel: form.send_push ? "Publish & push" : "Publish",
    });
    if (!ok) return;
    setSending(true);
    try {
      const res = await adminFetch("/notifications", {
        method: "POST",
        body: {
          title: form.title.trim(),
          body: form.body.trim(),
          target: form.target,
          link_type: form.link_type,
          link_value: form.link_type === "none" ? "" : String(form.link_value || ""),
          send_push: form.send_push,
        },
      });
      const pushed = res.notification?.push_sent_count;
      toast.success(`${res.message || "Notification published"}${form.send_push ? ` · push sent to ${pushed ?? 0} device${pushed === 1 ? "" : "s"}` : ""}`);
      setForm(EMPTY_NOTE);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (n) => {
    const ok = await confirm({ title: "Delete notification?", message: `"${n.title}" will be removed from the app's notification inbox. Push messages already delivered can't be recalled.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      const res = await adminFetch(`/notifications/${n.id}`, { method: "DELETE" });
      toast.success(res.message || "Notification deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-2">
        <div className="admin-card">
          <h3 className="admin-card-title">
            <Send size={17} className="text-blue-500" /> Compose broadcast
          </h3>
          <form className="admin-form" onSubmit={send}>
            <Field label="Audience">
              <select className="admin-select full" disabled={!canWrite} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="all">All users</option>
                {cities.map((c) => (
                  <option key={c.id} value={`city:${c.slug}`}>
                    Users in {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" required>
              <input className="admin-input" disabled={!canWrite} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New hidden gems in Jaipur!" />
            </Field>
            <Field label="Message" required hint={`${form.body.length} characters - keep it short for lock screens.`}>
              <textarea className="admin-textarea" disabled={!canWrite} rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="What do you want to tell your users?" />
            </Field>
            <div className="admin-form-grid">
              <LinkFields type={form.link_type} value={form.link_value} disabled={!canWrite} cities={cities} categories={categories} onChange={(patch) => setForm({ ...form, ...patch })} />
            </div>
            <label className="admin-check">
              <input type="checkbox" disabled={!canWrite} checked={form.send_push} onChange={(e) => setForm({ ...form, send_push: e.target.checked })} />
              Also send a device push notification
            </label>
            {canWrite && (
              <button type="submit" className="admin-btn admin-btn-brand self-start" disabled={sending}>
                {sending ? <Spinner small /> : <Send size={15} />} {sending ? "Publishing..." : "Publish notification"}
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="xl:col-span-3 min-w-0">
        <h3 className="admin-card-title">
          <Megaphone size={17} className="text-brand-500" /> Sent notifications
        </h3>
        <ErrorBanner message={error} onRetry={load} />
        {loading ? (
          <Loading label="Loading history..." />
        ) : history.length === 0 ? (
          <div className="admin-card">
            <EmptyState icon={Bell} title="Nothing sent yet" message="Published notifications are listed here and in the app's notification inbox." />
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Audience</th>
                  <th className="num">Pushed</th>
                  <th>Sent</th>
                  {canWrite && <th className="actions"></th>}
                </tr>
              </thead>
              <tbody>
                {history.map((n) => (
                  <tr key={n.id}>
                    <td style={{ minWidth: 220 }}>
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-xs text-neutral-500 line-clamp-2">{n.body}</div>
                      {n.link_type && n.link_type !== "none" && <div className="text-[11px] text-blue-600 mt-0.5">→ {describeLink(n.link_type, n.link_value, cities, categories)}</div>}
                    </td>
                    <td className="text-xs whitespace-nowrap">{targetLabel(n.target)}</td>
                    <td className="num">{n.push_sent_count}</td>
                    <td className="text-xs text-neutral-500 whitespace-nowrap" title={formatDateTime(n.created_at)}>
                      {timeAgo(n.created_at)}
                      {n.sent_by && <div className="text-neutral-400">by {n.sent_by}</div>}
                    </td>
                    {canWrite && (
                      <td className="actions">
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" onClick={() => remove(n)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== CONFIGURATION ====================

function PhonePreview({ settings, banners }) {
  const banner = banners.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order)[0];
  return (
    <div className="mx-auto" style={{ width: 250 }}>
      <div className="rounded-[2.2rem] border-[10px] border-neutral-900 bg-neutral-50 overflow-hidden shadow-xl relative" style={{ height: 500 }}>
        <div className="h-6 bg-white flex items-center justify-between px-5 text-[9px] font-semibold text-neutral-700">
          <span>9:41</span>
          <span className="w-16 h-3.5 bg-neutral-900 rounded-full" />
          <span>100%</span>
        </div>
        <div className="bg-white px-4 pt-2 pb-3 border-b border-neutral-100">
          <div className="text-[13px] font-extrabold text-neutral-900">
            Hungry<span className="text-brand-500">Bird</span>
          </div>
          <div className="text-[10px] text-neutral-500">📍 {settings.default_city || "jaipur"}</div>
        </div>
        {settings.announcement?.trim() && (
          <div className="bg-brand-500 text-white text-[10px] font-semibold px-3 py-1.5 flex items-center gap-1.5">
            <Megaphone size={11} className="shrink-0" />
            <span className="line-clamp-2">{settings.announcement}</span>
          </div>
        )}
        <div className="p-3 flex flex-col gap-2.5">
          <div className="rounded-xl overflow-hidden bg-neutral-200 h-24 relative">
            {banner?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white">
              <div className="text-[11px] font-bold leading-tight">{banner?.title || "No active banner"}</div>
              {banner?.subtitle && <div className="text-[9px] opacity-90">{banner.subtitle}</div>}
            </div>
          </div>
          <div className="flex gap-1.5">
            {["🌮", "☕", "🍬", "🍔"].map((e) => (
              <span key={e} className="bg-white border border-neutral-200 rounded-full px-2 py-0.5 text-[10px]">
                {e}
              </span>
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-neutral-100 p-2 flex gap-2">
              <div className="w-10 h-10 rounded-md bg-neutral-200" />
              <div className="flex-1 flex flex-col gap-1 justify-center">
                <div className="h-2 bg-neutral-200 rounded w-3/4" />
                <div className="h-2 bg-neutral-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        {settings.maintenance_mode && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Construction size={22} />
            </div>
            <div className="text-sm font-bold text-neutral-900">Under maintenance</div>
            <div className="text-[11px] text-neutral-600 leading-snug">{settings.maintenance_message || "We'll be back shortly."}</div>
          </div>
        )}
      </div>
      <div className="text-center text-xs text-neutral-500 mt-3">Live preview of the app home screen</div>
    </div>
  );
}

function ConfigTab({ cities, banners }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("app");
  const [saved, setSaved] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/app-settings");
      setSaved(data.settings || {});
      setSettings(data.settings || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => settings && saved && JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    if (settings.maintenance_mode && !saved.maintenance_mode) {
      const ok = await confirm({
        title: "Turn on maintenance mode?",
        message: "Everyone using the app will see the maintenance screen instead of the app until you switch it off.",
        confirmLabel: "Enable maintenance",
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/app-settings", { method: "PUT", body: { settings } });
      setSaved(res.settings || settings);
      setSettings(res.settings || settings);
      toast.success(res.message || "App configuration saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading configuration..." />;
  if (!settings) return <ErrorBanner message={error || "Could not load settings"} onRetry={load} />;

  const ro = !canWrite;
  const cityOptions = cities.some((c) => c.slug === settings.default_city) || !settings.default_city ? cities : [{ id: "current", slug: settings.default_city, name: settings.default_city }, ...cities];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <form className="xl:col-span-2 flex flex-col gap-5" onSubmit={save}>
        <div className={`admin-card !mb-0 ${settings.maintenance_mode ? "!border-amber-300" : ""}`}>
          <h3 className="admin-card-title">
            <Construction size={17} className="text-amber-500" /> Maintenance
          </h3>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="font-semibold text-sm text-neutral-900">Maintenance mode</div>
              <div className="text-xs text-neutral-500">When on, the app shows the message below instead of its normal screens.</div>
            </div>
            <Switch checked={!!settings.maintenance_mode} disabled={ro} onChange={(v) => set({ maintenance_mode: v })} label="Maintenance mode" />
          </div>
          <Field label="Maintenance message">
            <textarea className="admin-textarea" rows={2} disabled={ro} value={settings.maintenance_message || ""} onChange={(e) => set({ maintenance_message: e.target.value })} />
          </Field>
        </div>

        <div className="admin-card !mb-0">
          <h3 className="admin-card-title">
            <Smartphone size={17} className="text-blue-500" /> App versions
          </h3>
          <div className="admin-form-grid">
            <Field label="Minimum supported version" hint="Older app versions are asked to update before continuing.">
              <input className="admin-input" disabled={ro} value={settings.min_app_version || ""} onChange={(e) => set({ min_app_version: e.target.value })} placeholder="1.0.0" />
            </Field>
            <Field label="Latest version" hint="Users below this see an optional update prompt.">
              <input className="admin-input" disabled={ro} value={settings.latest_app_version || ""} onChange={(e) => set({ latest_app_version: e.target.value })} placeholder="1.0.0" />
            </Field>
            <Field label="Force-update message" className="span-all">
              <input className="admin-input" disabled={ro} value={settings.force_update_message || ""} onChange={(e) => set({ force_update_message: e.target.value })} />
            </Field>
            <Field label="Play Store URL">
              <input className="admin-input" type="url" disabled={ro} value={settings.play_store_url || ""} onChange={(e) => set({ play_store_url: e.target.value })} placeholder="https://play.google.com/store/apps/details?id=..." />
            </Field>
            <Field label="App Store URL">
              <input className="admin-input" type="url" disabled={ro} value={settings.app_store_url || ""} onChange={(e) => set({ app_store_url: e.target.value })} placeholder="https://apps.apple.com/..." />
            </Field>
          </div>
        </div>

        <div className="admin-card !mb-0">
          <h3 className="admin-card-title">
            <Megaphone size={17} className="text-brand-500" /> Home & general
          </h3>
          <div className="admin-form-grid">
            <Field label="Announcement strip" className="span-all" hint="Shown as a strip on the app home screen. Leave empty to hide it.">
              <input className="admin-input" disabled={ro} maxLength={200} value={settings.announcement || ""} onChange={(e) => set({ announcement: e.target.value })} placeholder="e.g. 20 new hidden gems added in Jaipur this week!" />
            </Field>
            <Field label="Default city" hint="Selected for users who haven't picked a city.">
              <select className="admin-select full" disabled={ro} value={settings.default_city || ""} onChange={(e) => set({ default_city: e.target.value })}>
                <option value="">None</option>
                {cityOptions.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Support email">
              <input className="admin-input" type="email" disabled={ro} value={settings.support_email || ""} onChange={(e) => set({ support_email: e.target.value })} />
            </Field>
            <Field label="Website URL" className="span-all">
              <input className="admin-input" type="url" disabled={ro} value={settings.website_url || ""} onChange={(e) => set({ website_url: e.target.value })} />
            </Field>
            <div className="span-all flex items-start justify-between gap-4 pt-1">
              <div>
                <div className="font-semibold text-sm text-neutral-900">Allow guest reviews</div>
                <div className="text-xs text-neutral-500">Let people rate vendors without signing in.</div>
              </div>
              <Switch checked={!!settings.allow_guest_reviews} disabled={ro} onChange={(v) => set({ allow_guest_reviews: v })} label="Allow guest reviews" />
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-[#fafafa]/90 backdrop-blur py-3 border-t border-neutral-200">
            <button type="submit" className="admin-btn admin-btn-brand" disabled={saving || !dirty}>
              {saving ? <Spinner small /> : <Save size={15} />} {saving ? "Saving..." : "Save configuration"}
            </button>
            {dirty && (
              <button type="button" className="admin-btn" onClick={() => setSettings(saved)} disabled={saving}>
                <RotateCcw size={15} /> Discard changes
              </button>
            )}
            <span className="text-xs text-neutral-500">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
          </div>
        )}
      </form>

      <div className="xl:sticky xl:top-6 self-start w-full">
        <div className="admin-card">
          <PhonePreview settings={settings} banners={banners} />
          <div className="mt-4 text-xs text-neutral-500 flex flex-col gap-1">
            <div>
              Min version <strong className="text-neutral-800">{settings.min_app_version || "—"}</strong> · Latest <strong className="text-neutral-800">{settings.latest_app_version || "—"}</strong>
            </div>
            <div>Guest reviews {settings.allow_guest_reviews ? "allowed" : "disabled"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
