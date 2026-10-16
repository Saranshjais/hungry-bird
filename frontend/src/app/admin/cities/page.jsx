"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Info, MapPin, Pencil, Plus, Save, Trash2, TriangleAlert } from "lucide-react";
import { adminFetch, slugify } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, Switch, Thumb } from "../components/ui";

const EMPTY = { name: "", slug: "", state: "", country: "India", lat: "", lng: "", description: "", image_url: "", is_active: true, sort_order: "" };

/** Full city payload, so toggles never depend on partial-update support. */
function toBody(f) {
  return {
    name: String(f.name || "").trim(),
    slug: slugify(f.slug) || slugify(f.name),
    state: f.state || "",
    country: f.country || "",
    lat: f.lat === "" || f.lat === null || f.lat === undefined ? null : f.lat,
    lng: f.lng === "" || f.lng === null || f.lng === undefined ? null : f.lng,
    description: String(f.description || "").trim(),
    image_url: String(f.image_url || "").trim(),
    is_active: f.is_active !== false,
    sort_order: f.sort_order === "" || f.sort_order === null || f.sort_order === undefined ? 0 : Number(f.sort_order),
  };
}

export default function AdminCities() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("cities");

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/cities");
      setCities(data.cities || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same order the website and app use: sort order, then name.
  const sorted = useMemo(
    () => [...cities].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name))),
    [cities]
  );

  const openCreate = () => {
    setSlugTouched(false);
    setForm({ ...EMPTY, sort_order: String(cities.length) });
  };

  const openEdit = (c) => {
    setSlugTouched(true);
    setForm({
      id: c.id,
      originalSlug: c.slug || "",
      name: c.name || "",
      slug: c.slug || "",
      state: c.state || "",
      country: c.country || "",
      lat: c.lat ?? "",
      lng: c.lng ?? "",
      description: c.description || "",
      image_url: c.image_url || "",
      is_active: c.is_active !== false,
      sort_order: c.sort_order != null ? String(c.sort_order) : "0",
    });
  };

  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const newSlug = form ? slugify(form.slug) || slugify(form.name) : "";
  const slugChanged = !!form?.id && !!form.originalSlug && newSlug !== form.originalSlug;

  const save = async (e) => {
    e.preventDefault();
    if (slugChanged) {
      const ok = await confirm({
        title: "Change this city's URL?",
        message: `The public address changes from /city/${form.originalSlug} to /city/${newSlug}.\n\nOld links, bookmarks, search results and shared links to /city/${form.originalSlug} will stop working. Also check anything that refers to the old slug: the app's default city (App Settings) and notifications targeted at this city.`,
        confirmLabel: "Change URL",
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const body = toBody(form);
      const res = form.id ? await adminFetch(`/cities/${form.id}`, { method: "PUT", body }) : await adminFetch("/cities", { method: "POST", body });
      toast.success(res.message || "City saved");
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c, value) => {
    if (!value) {
      const ok = await confirm({
        title: `Hide ${c.name}?`,
        message: `${c.name} disappears from the city list on the website and in the app. Its vendors are not deleted, and people who already have it selected may still see it until they switch cities.`,
        confirmLabel: "Hide city",
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(c.id);
    setCities((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: value } : x)));
    try {
      await adminFetch(`/cities/${c.id}`, { method: "PUT", body: toBody({ ...c, is_active: value }) });
      toast.success(value ? `${c.name} is now listed` : `${c.name} hidden from the city list`);
    } catch (err) {
      setCities((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: !value } : x)));
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message:
        c.vendor_count > 0
          ? `${c.name} still has ${c.vendor_count} vendors. The server will refuse to delete a city that has vendors or submissions - move or delete them first, or just switch the city off.`
          : `${c.name} will be removed from the city list on the website and app.`,
      confirmLabel: "Delete city",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/cities/${c.id}`, { method: "DELETE" });
      toast.success(res.message || "City deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totalVendors = cities.reduce((s, c) => s + (c.vendor_count || 0), 0);
  const activeCount = cities.filter((c) => c.is_active !== false).length;

  return (
    <div>
      <PageHeader
        title="Cities"
        subtitle={`${cities.length} cit${cities.length === 1 ? "y" : "ies"} (${activeCount} listed) · ${totalVendors.toLocaleString("en-IN")} vendors in total`}
      >
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
            <Plus size={15} /> Add city
          </button>
        )}
      </PageHeader>

      <div className="admin-note info">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>Only listed (active) cities appear on the website and in the app, in the order below. The description and photo are shown on the city page; without a photo the app uses its own artwork or a neutral placeholder.</span>
      </div>
      <ReadOnlyNote area="cities" />
      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Loading label="Loading cities..." />
      ) : cities.length === 0 ? (
        !error && (
          <div className="admin-card">
            <EmptyState icon={MapPin} title="No cities yet" message="Add the first city so vendors can be listed in it." />
          </div>
        )
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="num" style={{ width: 60 }}>
                  Order
                </th>
                <th>City</th>
                <th>Slug</th>
                <th>State / Country</th>
                <th>Coordinates</th>
                <th className="num">Vendors</th>
                <th>Listed</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} style={{ opacity: c.is_active === false ? 0.6 : busyId === c.id ? 0.5 : 1 }}>
                  <td className="num text-neutral-500">{c.sort_order ?? 0}</td>
                  <td style={{ minWidth: 200 }}>
                    <div className="flex items-center gap-3">
                      <Thumb src={c.image_url} alt={c.name} size={40} />
                      <div className="min-w-0">
                        <div className="font-semibold">{c.name}</div>
                        {c.description ? <div className="text-xs text-neutral-500 line-clamp-1 max-w-[260px]">{c.description}</div> : <div className="text-[11px] text-amber-700">No description</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{c.slug}</code>
                  </td>
                  <td className="text-neutral-600">{[c.state, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="text-neutral-600 text-xs tabular-nums">
                    {c.lat != null && c.lng != null ? (
                      <a href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                        {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-amber-700">Not set</span>
                    )}
                  </td>
                  <td className="num font-semibold">{(c.vendor_count || 0).toLocaleString("en-IN")}</td>
                  <td>
                    <Switch checked={c.is_active !== false} disabled={!canWrite || busyId === c.id} onChange={(v) => toggleActive(c, v)} label={c.is_active !== false ? "Listed" : "Hidden"} />
                  </td>
                  <td className="actions">
                    <div className="admin-actions">
                      <a href={`/city/${c.slug}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn-ghost admin-icon-btn" title="View on site">
                        <ExternalLink size={15} />
                      </a>
                      {canWrite && (
                        <>
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" onClick={() => openEdit(c)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" onClick={() => remove(c)}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
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
        size="lg"
        title={form?.id ? `Edit ${form.name || "city"}` : "Add city"}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="city-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save city"}
            </button>
          </>
        }
      >
        {form && (
          <form id="city-form" className="admin-form-grid" onSubmit={save}>
            <Field label="Name" required>
              <input className="admin-input" required maxLength={100} value={form.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jaipur" />
            </Field>
            <Field label="Slug" hint={form.id ? `Public URL: /city/${newSlug || "…"}` : "Generated from the name - used in URLs."}>
              <input
                className="admin-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") });
                }}
              />
            </Field>
            {slugChanged && (
              <div className="admin-note span-all !mb-0">
                <TriangleAlert size={16} className="shrink-0 mt-0.5" />
                <span>
                  Changing the slug changes this city&apos;s public URLs: <code>/city/{form.originalSlug}</code> becomes <code>/city/{newSlug}</code>. Existing links and bookmarks will break, and the app&apos;s default city or city-targeted notifications that use the old slug need updating.
                </span>
              </div>
            )}
            <Field label="State">
              <input className="admin-input" maxLength={100} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Rajasthan" />
            </Field>
            <Field label="Country">
              <input className="admin-input" maxLength={100} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="Latitude" hint="City centre, used to centre maps">
              <input className="admin-input" type="number" step="any" min={-90} max={90} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </Field>
            <Field label="Longitude">
              <input className="admin-input" type="number" step="any" min={-180} max={180} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </Field>
            <Field label="Description" className="span-all" hint="A sentence or two about the city's food scene, shown on its city page.">
              <textarea className="admin-textarea" rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. From pyaaz kachori at dawn to late-night kulfi, Jaipur's old city is a street-food walk of its own." />
            </Field>
            <Field label="Image URL" className="span-all">
              <input className="admin-input" type="url" maxLength={500} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </Field>
            <div className="span-all">
              <ImagePreview src={form.image_url} height={140} />
            </div>
            <Field label="Sort order" hint="Lower numbers are listed first">
              <input className="admin-input" type="number" step={1} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="admin-check">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Listed (shown on the website and in the app)
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
