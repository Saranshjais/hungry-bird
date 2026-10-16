"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Construction, Crown, Image as ImageIcon, Link2, Megaphone, Pencil, Plus, RotateCcw, Save, Send, Server, Settings, Smartphone, Trash2 } from "lucide-react";
import { adminFetch, formatDateTime, isValidUrl, timeAgo } from "../lib/api";
import { useCan, useCanRead } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, Spinner, Switch, Tabs, Thumb } from "../components/ui";
import { PREMIUM_SETTING_KEYS, readServices, SERVICE_KEYS, ServiceStatus } from "../components/Premium";

// Settings this page edits and saves (premium_* keys belong to the Premium section; service flags are read-only).
const CONFIG_KEYS = [
  "maintenance_mode", "maintenance_message", "min_app_version", "latest_app_version", "force_update_message",
  "play_store_url", "app_store_url", "announcement", "default_city", "support_email", "support_phone", "website_url",
  "instagram_url", "facebook_url", "x_url", "youtube_url", "allow_guest_reviews",
];
const URL_KEYS = ["play_store_url", "app_store_url", "website_url", "instagram_url", "facebook_url", "x_url", "youtube_url"];
const SOCIAL_FIELDS = [
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/hungrybird" },
  { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/hungrybird" },
  { key: "x_url", label: "X (Twitter)", placeholder: "https://x.com/hungrybird" },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@hungrybird" },
];

function pickConfig(settings) {
  const out = {};
  CONFIG_KEYS.forEach((k) => {
    if (settings && settings[k] !== undefined) out[k] = settings[k];
  });
  return out;
}

/** Field-level validation messages for the configuration form. */
function validateConfig(s) {
  const errors = {};
  URL_KEYS.forEach((k) => {
    if (s[k] && !isValidUrl(s[k])) errors[k] = "Enter a full link starting with https://";
  });
  if (s.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.support_email)) errors.support_email = "Enter a valid email address";
  if (s.support_phone && !/^\+?[0-9][0-9\s\-()]{5,19}$/.test(String(s.support_phone).trim())) errors.support_phone = "Use digits, spaces or dashes, e.g. +91 98290 12345";
  return errors;
}

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
  const canReadCities = useCanRead("cities");
  const canReadCategories = useCanRead("categories");
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState(null);
  // GET /app-settings: settings + read-only service flags, shared by the Notifications and Configuration tabs.
  const [config, setConfig] = useState({ loading: true, error: null, settings: null, services: {} });

  const loadBanners = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setBannersLoading(true);
    setBannersError(null);
    try {
      const data = await adminFetch("/banners");
      setBanners(data.banners || []);
    } catch (err) {
      setBannersError(err);
    } finally {
      setBannersLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    setConfig((c) => ({ ...c, loading: true, error: null }));
    try {
      const data = await adminFetch("/app-settings");
      setConfig({ loading: false, error: null, settings: data.settings || {}, services: readServices(data) });
    } catch (err) {
      setConfig((c) => ({ ...c, loading: false, error: err }));
    }
  }, []);

  useEffect(() => {
    loadBanners();
    loadConfig();
  }, [loadBanners, loadConfig]);

  useEffect(() => {
    if (canReadCities) adminFetch("/cities").then((d) => setCities(d.cities || [])).catch(() => {});
    if (canReadCategories) adminFetch("/categories").then((d) => setCategories(d.categories || [])).catch(() => {});
  }, [canReadCities, canReadCategories]);

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
      {tab === "notifications" && <NotificationsTab cities={cities} categories={categories} services={config.services} servicesLoading={config.loading} />}
      {tab === "config" && (
        <ConfigTab
          cities={cities}
          banners={banners}
          config={config}
          reload={loadConfig}
          onSaved={(settings) => setConfig((c) => ({ ...c, settings: { ...(c.settings || {}), ...settings } }))}
        />
      )}
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

const EMPTY_NOTE = { title: "", body: "", target: "all", link_type: "none", link_value: "", send_push: false };

function NotificationsTab({ cities, categories, services, servicesLoading }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("app");
  // push_available: true = the server can deliver device pushes; false = it can't; null = not reported.
  const pushAvailable = services?.push_available;
  const pushBlocked = pushAvailable === false;
  const [form, setForm] = useState(EMPTY_NOTE);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/notifications");
      setHistory(data.notifications || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Default the push checkbox to what the server can actually do.
  useEffect(() => {
    if (!servicesLoading) setForm((f) => ({ ...f, send_push: pushAvailable === true }));
  }, [pushAvailable, servicesLoading]);

  const sendPush = form.send_push && !pushBlocked;
  const cityTarget = form.target !== "all";

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
      message: `"${form.title.trim()}" will appear in the app's notification inbox for ${targetLabel(form.target).toLowerCase()}.${
        sendPush ? (cityTarget ? "\n\nCity announcements stay in the inbox only - device pushes go to \"All users\" broadcasts." : "\n\nA push notification will also be sent to devices that registered for notifications.") : ""
      }`,
      confirmLabel: sendPush && !cityTarget ? "Publish & push" : "Publish",
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
          send_push: sendPush,
        },
      });
      const pushed = res.notification?.push_sent_count;
      toast.success(`${res.message || "Notification published"}${sendPush && !cityTarget ? ` · push sent to ${pushed ?? 0} device${pushed === 1 ? "" : "s"}` : ""}`);
      setForm({ ...EMPTY_NOTE, send_push: pushAvailable === true });
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
            <div>
              <label className={`admin-check ${pushBlocked ? "!cursor-not-allowed opacity-60" : ""}`}>
                <input type="checkbox" disabled={!canWrite || pushBlocked} checked={sendPush} onChange={(e) => setForm({ ...form, send_push: e.target.checked })} />
                Also send as a device push notification
              </label>
              <div className="admin-hint flex items-start gap-1.5">
                {pushBlocked ? (
                  <>
                    <BellOff size={13} className="shrink-0 mt-0.5" />
                    <span>Push notifications aren&apos;t set up yet (no devices are registered for push), so this is switched off. The notification still appears in the app&apos;s notification inbox.</span>
                  </>
                ) : pushAvailable === null || pushAvailable === undefined ? (
                  <span>The server didn&apos;t report whether push is set up. Either way, the notification appears in the app&apos;s notification inbox.</span>
                ) : (
                  <span>{cityTarget ? "City announcements are inbox-only; pushes go out for \"All users\" broadcasts." : "Sent to devices that registered for notifications. It also appears in the app's inbox."}</span>
                )}
              </div>
            </div>
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

const SERVICE_ROWS = [
  {
    key: "payments_available",
    label: "Payments (Razorpay)",
    ok: "Configured",
    bad: "Not configured",
    help: "Needed to sell Premium. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET on the backend server.",
  },
  {
    key: "email_available",
    label: "Email (SMTP)",
    ok: "Configured",
    bad: "Not configured",
    help: "Sends sign-up verification and password-reset codes. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM (and SMTP_SECURITY) on the backend server.",
  },
  {
    key: "push_available",
    label: "Push notifications",
    ok: "Available",
    bad: "Not available",
    help: "Device pushes need the app to register for push. Until then broadcasts only appear in the app's notification inbox.",
  },
];

function ConfigTab({ cities, banners, config, reload, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("app");
  const canSeePremium = useCanRead("premium");
  const [saved, setSaved] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Only the keys this page owns are edited and saved (premium_* lives in the Premium section).
  useEffect(() => {
    if (config.settings) {
      const own = pickConfig(config.settings);
      setSaved(own);
      setSettings(own);
    }
  }, [config.settings]);

  const dirty = useMemo(() => settings && saved && JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const errors = useMemo(() => (settings ? validateConfig(settings) : {}), [settings]);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const fieldError = (key) => (showErrors || (settings?.[key] && saved?.[key] !== settings[key]) ? errors[key] : undefined);

  const save = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return toast.error("Fix the highlighted fields before saving.");
    }
    if (settings.maintenance_mode && !saved.maintenance_mode) {
      const ok = await confirm({
        title: "Turn on maintenance mode?",
        message: "Everyone opening the app will see the maintenance screen instead of the app until you switch it off.",
        confirmLabel: "Enable maintenance",
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      // Send only changed keys this page owns - never premium_* or the read-only service flags.
      const changed = {};
      Object.keys(settings).forEach((k) => {
        if (JSON.stringify(settings[k]) !== JSON.stringify(saved[k])) changed[k] = typeof settings[k] === "string" ? settings[k].trim() : settings[k];
      });
      [...SERVICE_KEYS, ...PREMIUM_SETTING_KEYS].forEach((k) => delete changed[k]);
      const res = await adminFetch("/app-settings", { method: "PUT", body: { settings: changed } });
      const next = res.settings ? pickConfig(res.settings) : { ...saved, ...changed };
      setSaved(next);
      setSettings(next);
      setShowErrors(false);
      onSaved?.(res.settings || changed);
      toast.success(res.message || "App configuration saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (config.loading && !settings) return <Loading label="Loading configuration..." />;
  if (!settings) return <ErrorBanner message={config.error || "Could not load settings"} onRetry={reload} />;

  const ro = !canWrite;
  const cityOptions = cities.some((c) => c.slug === settings.default_city) || !settings.default_city ? cities : [{ id: "current", slug: settings.default_city, name: settings.default_city }, ...cities];
  const services = config.services || {};
  const urlInput = (key, placeholder, extra = {}) => (
    <input
      className={`admin-input ${fieldError(key) ? "!border-rose-400" : ""}`}
      type="url"
      inputMode="url"
      disabled={ro}
      maxLength={300}
      value={settings[key] || ""}
      onChange={(e) => set({ [key]: e.target.value })}
      placeholder={placeholder}
      aria-invalid={!!fieldError(key)}
      {...extra}
    />
  );
  const errorHint = (key, hint) => (fieldError(key) ? <span className="text-rose-600 font-medium">{fieldError(key)}</span> : hint);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <form className="xl:col-span-2 flex flex-col gap-5 min-w-0" onSubmit={save} noValidate>
        <div className="admin-card !mb-0">
          <h3 className="admin-card-title">
            <Server size={17} className="text-neutral-500" /> Server services
          </h3>
          <p className="text-xs text-neutral-500 mt-0 mb-3">Read-only. These are switched on with environment variables on the backend server, not from this panel.</p>
          <div className="flex flex-col divide-y divide-neutral-100">
            {SERVICE_ROWS.map((row) => (
              <div key={row.key} className="py-2.5 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                  <div className="font-semibold text-sm text-neutral-900">{row.label}</div>
                  {services[row.key] !== true && <div className="text-xs text-neutral-500 leading-relaxed">{row.help}</div>}
                </div>
                <ServiceStatus value={services[row.key]} okText={row.ok} badText={row.bad} />
              </div>
            ))}
          </div>
          {canSeePremium && (
            <div className="text-xs text-neutral-500 mt-3 flex items-center gap-1.5">
              <Crown size={13} className="text-amber-600" /> Premium on/off, benefits and payment methods are managed in{" "}
              <Link href="/admin/premium" className="text-blue-600 hover:underline">
                Premium
              </Link>
              .
            </div>
          )}
        </div>

        <div className={`admin-card !mb-0 ${settings.maintenance_mode ? "!border-amber-300" : ""}`}>
          <h3 className="admin-card-title">
            <Construction size={17} className="text-amber-500" /> Maintenance
          </h3>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="font-semibold text-sm text-neutral-900">Maintenance mode</div>
              <div className="text-xs text-neutral-500">When on, the app shows the message below instead of its normal screens (checked when the app starts).</div>
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
            <Field label="Minimum supported version" hint="Older app versions are asked to update before continuing (checked when the app starts).">
              <input className="admin-input" disabled={ro} value={settings.min_app_version || ""} onChange={(e) => set({ min_app_version: e.target.value })} placeholder="1.0.0" />
            </Field>
            <Field label="Latest version" hint="Used for the optional update prompt.">
              <input className="admin-input" disabled={ro} value={settings.latest_app_version || ""} onChange={(e) => set({ latest_app_version: e.target.value })} placeholder="1.0.0" />
            </Field>
            <Field label="Force-update message" className="span-all">
              <input className="admin-input" disabled={ro} value={settings.force_update_message || ""} onChange={(e) => set({ force_update_message: e.target.value })} />
            </Field>
            <Field label="Play Store URL" hint={errorHint("play_store_url")}>
              {urlInput("play_store_url", "https://play.google.com/store/apps/details?id=...")}
            </Field>
            <Field label="App Store URL" hint={errorHint("app_store_url")}>
              {urlInput("app_store_url", "https://apps.apple.com/...")}
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
            <Field label="Website URL" hint={errorHint("website_url")}>
              {urlInput("website_url", "https://hungrybird.in")}
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

        <div className="admin-card !mb-0">
          <h3 className="admin-card-title">
            <Link2 size={17} className="text-violet-500" /> Contact & social links
          </h3>
          <p className="text-xs text-neutral-500 mt-0 mb-3">Shown wherever the app and website list ways to reach HungryBird. Leave a field empty to hide that link or number.</p>
          <div className="admin-form-grid">
            <Field label="Support email" hint={errorHint("support_email")}>
              <input
                className={`admin-input ${fieldError("support_email") ? "!border-rose-400" : ""}`}
                type="email"
                inputMode="email"
                disabled={ro}
                maxLength={150}
                value={settings.support_email || ""}
                onChange={(e) => set({ support_email: e.target.value })}
                placeholder="support@hungrybird.in"
              />
            </Field>
            <Field label="Support phone" hint={errorHint("support_phone", "Include the country code, e.g. +91 98290 12345")}>
              <input
                className={`admin-input ${fieldError("support_phone") ? "!border-rose-400" : ""}`}
                type="tel"
                inputMode="tel"
                disabled={ro}
                maxLength={20}
                value={settings.support_phone || ""}
                onChange={(e) => set({ support_phone: e.target.value })}
                placeholder="+91 98290 12345"
              />
            </Field>
            {SOCIAL_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={errorHint(f.key)}>
                {urlInput(f.key, f.placeholder)}
              </Field>
            ))}
          </div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-[#fafafa]/90 backdrop-blur py-3 border-t border-neutral-200 z-10">
            <button type="submit" className="admin-btn admin-btn-brand" disabled={saving || !dirty}>
              {saving ? <Spinner small /> : <Save size={15} />} {saving ? "Saving..." : "Save configuration"}
            </button>
            {dirty && (
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setSettings(saved);
                  setShowErrors(false);
                }}
                disabled={saving}
              >
                <RotateCcw size={15} /> Discard changes
              </button>
            )}
            <span className="text-xs text-neutral-500">
              {dirty ? (Object.keys(errors).length ? `${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? " needs" : "s need"} fixing.` : "You have unsaved changes.") : "All changes saved."}
            </span>
          </div>
        )}
      </form>

      <div className="xl:sticky xl:top-6 self-start w-full min-w-0">
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
