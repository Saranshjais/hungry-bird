"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, MapPin, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { adminFetch, slugify } from "../lib/api";
import { useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, Loading, PageHeader, ReadOnlyNote } from "../components/ui";

const EMPTY = { name: "", slug: "", state: "", country: "India", lat: "", lng: "" };

export default function AdminCities() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("cities");

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/cities");
      setCities(data.cities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setSlugTouched(false);
    setForm({ ...EMPTY });
  };

  const openEdit = (c) => {
    setSlugTouched(true);
    setForm({
      id: c.id,
      name: c.name || "",
      slug: c.slug || "",
      state: c.state || "",
      country: c.country || "",
      lat: c.lat ?? "",
      lng: c.lng ?? "",
    });
  };

  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: slugify(form.slug) || slugify(form.name),
        state: form.state,
        country: form.country,
        lat: form.lat === "" ? null : form.lat,
        lng: form.lng === "" ? null : form.lng,
      };
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

  const remove = async (c) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message:
        c.vendor_count > 0
          ? `${c.name} still has ${c.vendor_count} vendors. The server will refuse to delete a city that has vendors or submissions - move or delete them first.`
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

  return (
    <div>
      <PageHeader title="Cities" subtitle={`${cities.length} cit${cities.length === 1 ? "y" : "ies"} · ${totalVendors.toLocaleString("en-IN")} vendors in total`}>
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
            <Plus size={15} /> Add city
          </button>
        )}
      </PageHeader>

      <ReadOnlyNote area="cities" />
      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Loading label="Loading cities..." />
      ) : cities.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={MapPin} title="No cities yet" message="Add the first city so vendors can be listed in it." />
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Slug</th>
                <th>State / Country</th>
                <th>Coordinates</th>
                <th className="num">Vendors</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>
                    <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{c.slug}</code>
                  </td>
                  <td className="text-neutral-600">{[c.state, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="text-neutral-600 text-xs tabular-nums">
                    {c.lat != null && c.lng != null ? (
                      <a href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-amber-700">Not set</span>
                    )}
                  </td>
                  <td className="num font-semibold">{(c.vendor_count || 0).toLocaleString("en-IN")}</td>
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
            <Field label="Slug" hint={form.id ? "Changing it changes the city's URL on the website." : "Generated from the name - used in URLs."}>
              <input
                className="admin-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") });
                }}
              />
            </Field>
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
          </form>
        )}
      </Modal>
    </div>
  );
}
