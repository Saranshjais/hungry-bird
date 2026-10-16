"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Info, Pencil, Plus, Save, Tags, Trash2 } from "lucide-react";
import { adminFetch, slugify } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, Switch } from "../components/ui";

const EMPTY = { name: "", slug: "", icon: "", image_url: "", keywords: "", sort_order: "", is_active: true };

/** keywords come back as a list (or a comma string from older APIs); the form edits them as "tea, chai". */
const keywordText = (k) => (Array.isArray(k) ? k.join(", ") : String(k || ""));
const keywordList = (text) =>
  [...new Set(String(text || "").split(",").map((w) => w.trim()).filter(Boolean))];
const ICON_SUGGESTIONS = ["🌮", "🥟", "☕", "🥛", "🍬", "🍦", "🍔", "🍛", "🍕", "🍜", "🥘", "🍢", "🌯", "🍩", "🥤", "🧁"];

export default function AdminCategories() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("categories");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/categories");
      setCategories(data.categories || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setSlugTouched(false);
    setForm({ ...EMPTY, sort_order: categories.length });
  };

  const openEdit = (c) => {
    setSlugTouched(true);
    setForm({ id: c.id, name: c.name || "", slug: c.slug || "", icon: c.icon || "", image_url: c.image_url || "", keywords: keywordText(c.keywords), sort_order: c.sort_order ?? 0, is_active: !!c.is_active });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: slugify(form.slug) || slugify(form.name),
        icon: form.icon,
        image_url: form.image_url,
        keywords: keywordList(form.keywords),
        sort_order: form.sort_order === "" ? 0 : Number(form.sort_order),
        is_active: form.is_active,
      };
      const res = form.id ? await adminFetch(`/categories/${form.id}`, { method: "PUT", body }) : await adminFetch("/categories", { method: "POST", body });
      toast.success(res.message || "Category saved");
      setForm(null);
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c, value) => {
    setBusyId(c.id);
    setCategories((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: value } : x)));
    try {
      await adminFetch(`/categories/${c.id}`, { method: "PUT", body: { is_active: value } });
      toast.success(`${c.name} ${value ? "is now visible in the app" : "hidden from the app"}`);
    } catch (err) {
      setCategories((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: !value } : x)));
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    const updates = next.map((c, i) => ({ c, order: i })).filter(({ c, order }) => c.sort_order !== order);
    setCategories(next.map((c, i) => ({ ...c, sort_order: i })));
    try {
      await Promise.all(updates.map(({ c, order }) => adminFetch(`/categories/${c.id}`, { method: "PUT", body: { sort_order: order } })));
    } catch (err) {
      toast.error(err.message);
      load({ quiet: true });
    }
  };

  const remove = async (c) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      message: "The category chip disappears from the app. Vendors are not deleted - only this filter goes away.",
      confirmLabel: "Delete category",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/categories/${c.id}`, { method: "DELETE" });
      toast.success(res.message || "Category deleted");
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const active = categories.filter((c) => c.is_active);

  return (
    <div>
      <PageHeader title="Categories" subtitle="Food categories used to filter vendors.">
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
            <Plus size={15} /> Add category
          </button>
        )}
      </PageHeader>

      <div className="admin-note info">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Categories appear as filter chips in the mobile app, in the order shown below. Inactive categories are hidden from the app. A vendor shows under a chip when the
          category&apos;s name, slug or one of its <strong>keywords</strong> appears in the vendor&apos;s food category or cuisine - vendors that match no keyword don&apos;t show
          under any chip, so add the words your vendor data actually uses (e.g. &ldquo;tea, chai, tea store&rdquo;).
        </span>
      </div>

      <ReadOnlyNote area="categories" />
      <ErrorBanner message={error} onRetry={() => load()} />

      {active.length > 0 && (
        <div className="admin-card !py-4">
          <div className="admin-label !mb-2">App preview</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {active.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-700 whitespace-nowrap shadow-sm">
                <span>{c.icon || "🍽️"}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <Loading label="Loading categories..." />
      ) : categories.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Tags} title="No categories yet" message="Add categories like Street Food, Chai or Sweets to help users filter vendors." />
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Order</th>
                <th>Category</th>
                <th>Slug</th>
                <th className="num">Vendors</th>
                <th>Active</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.6 }}>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-neutral-500 tabular-nums">{c.sort_order}</span>
                      {canWrite && (
                        <>
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" style={{ width: 24, height: 24, padding: 2 }} disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" style={{ width: 24, height: 24, padding: 2 }} disabled={i === categories.length - 1} onClick={() => move(i, 1)} title="Move down">
                            <ArrowDown size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-lg shrink-0">{c.icon || "🍽️"}</span>
                      <div className="min-w-0">
                        <div className="font-semibold">{c.name}</div>
                        {keywordText(c.keywords) ? (
                          <div className="text-xs text-neutral-500 max-w-[280px] line-clamp-2" title="Keywords matched against vendor category / cuisine">
                            {keywordText(c.keywords)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700">No keywords</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{c.slug}</code>
                  </td>
                  <td className="num">{c.vendor_count ?? 0}</td>
                  <td>
                    <Switch checked={c.is_active} disabled={!canWrite || busyId === c.id} onChange={(v) => toggleActive(c, v)} label={c.is_active ? "Active" : "Inactive"} />
                  </td>
                  <td className="actions">
                    {canWrite ? (
                      <div className="admin-actions">
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" onClick={() => openEdit(c)}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" onClick={() => remove(c)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
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
        title={form?.id ? `Edit ${form.name || "category"}` : "Add category"}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="category-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save category"}
            </button>
          </>
        }
      >
        {form && (
          <form id="category-form" className="admin-form-grid" onSubmit={save}>
            <Field label="Name" required>
              <input className="admin-input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })} placeholder="e.g. Street Food" />
            </Field>
            <Field label="Slug" hint="Lower-case, used by the app's filters">
              <input
                className="admin-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") });
                }}
              />
            </Field>
            <Field label="Icon (emoji)" className="span-all">
              <div className="flex items-center gap-3">
                <input className="admin-input text-center !text-xl" style={{ width: 64 }} maxLength={8} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🍽️" />
                <div className="flex flex-wrap gap-1">
                  {ICON_SUGGESTIONS.map((emoji) => (
                    <button key={emoji} type="button" className={`w-8 h-8 rounded-md text-lg hover:bg-neutral-100 ${form.icon === emoji ? "bg-brand-50 ring-1 ring-brand-300" : ""}`} onClick={() => setForm({ ...form, icon: emoji })}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field
              label="Keywords (matched against vendor category/cuisine)"
              className="span-all"
              hint="Comma-separated, e.g. tea, chai, tea store. A vendor shows under this chip when one of these words appears in its food category or cuisine (the name and slug always count)."
            >
              <input className="admin-input" maxLength={500} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="e.g. chaat, pani puri, golgappa, street food" />
            </Field>
            <Field label="Image URL (optional)" className="span-all">
              <input className="admin-input" type="url" maxLength={500} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </Field>
            {form.image_url && (
              <div className="span-all">
                <ImagePreview src={form.image_url} height={110} />
              </div>
            )}
            <Field label="Sort order" hint="Lower numbers appear first">
              <input className="admin-input" type="number" step={1} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="admin-check">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (visible in the app)
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
