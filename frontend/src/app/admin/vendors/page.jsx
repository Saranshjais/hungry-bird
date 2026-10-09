"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudUpload, Crown, Download, ExternalLink, Eye, EyeOff, FileSpreadsheet, Gem, Pencil, Plus, Save, Store, Trash2, X,
} from "lucide-react";
import { adminFetch, downloadFile, formatDate, qs, saveBlob } from "../lib/api";
import { useCan, useDebounce, usePageFor } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import {
  EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, Pagination, ReadOnlyNote, SearchInput, Spinner, Stars, Thumb,
} from "../components/ui";

const PER_PAGE = 25;

const TEMPLATE_HEADERS = [
  "name", "city", "cuisine_type", "food_category", "specialty_dish", "description", "opening_hours",
  "price_level", "address", "area", "lat", "lng", "phone", "image_url", "is_hidden_gem",
];

const STATUS_LABEL = { verified: "Live", pending: "Pending", rejected: "Hidden" };

const EMPTY_VENDOR = {
  name: "", city_id: "", cuisine_type: "", food_category: "", specialty_dish: "", description: "",
  opening_hours: "", closed_days: "", price_level: "", price_min: "", price_max: "",
  address_text: "", area: "", landmark: "", lat: "", lng: "",
  phone: "", website: "", instagram: "", image_url: "",
  is_hidden_gem: false, is_famous: false, verified_status: "verified",
};

const STRING_FIELDS = [
  "name", "cuisine_type", "food_category", "specialty_dish", "description", "opening_hours", "closed_days",
  "price_level", "address_text", "area", "landmark", "phone", "website", "instagram", "image_url",
];
const NUMBER_FIELDS = ["price_min", "price_max", "lat", "lng"];

function toForm(v) {
  const f = { ...EMPTY_VENDOR };
  Object.keys(EMPTY_VENDOR).forEach((k) => {
    if (v[k] !== null && v[k] !== undefined) f[k] = v[k];
  });
  f.city_id = v.city_id ? String(v.city_id) : "";
  f.verified_status = v.verified_status || "verified";
  return f;
}

function toPayload(f) {
  const body = {};
  STRING_FIELDS.forEach((k) => (body[k] = typeof f[k] === "string" ? f[k].trim() : f[k]));
  NUMBER_FIELDS.forEach((k) => (body[k] = f[k] === "" || f[k] === null ? null : f[k]));
  body.city_id = f.city_id ? Number(f.city_id) : null;
  body.is_hidden_gem = !!f.is_hidden_gem;
  body.is_famous = !!f.is_famous;
  body.verified_status = f.verified_status;
  return body;
}

export default function AdminVendors() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("vendors");

  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [cityId, setCityId] = useState("");
  const [status, setStatus] = useState("");
  const [flag, setFlag] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = usePageFor([q, cityId, status, flag, sort].join("|"));

  const [data, setData] = useState({ vendors: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(null); // { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/vendors${qs({ q, city_id: cityId, status, flag, sort, page, per_page: PER_PAGE })}`);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, cityId, status, flag, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch("/cities").then((d) => setCities(d.cities || [])).catch(() => {});
    adminFetch("/categories").then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  // Dashboard "Add a vendor" quick action links here with ?new=1.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      window.history.replaceState(null, "", "/admin/vendors");
      if (canWrite) setForm({ ...EMPTY_VENDOR });
    }
  }, [canWrite]);

  const filtersActive = search || cityId || status || flag || sort !== "newest";
  const clearFilters = () => {
    setSearch("");
    setCityId("");
    setStatus("");
    setFlag("");
    setSort("newest");
  };

  const openCreate = () => {
    setForm({ ...EMPTY_VENDOR, city_id: cityId || (cities.length === 1 ? String(cities[0].id) : "") });
  };

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Vendor name is required.");
    if (!form.city_id) return toast.error("Please choose a city.");
    setSaving(true);
    try {
      const body = toPayload(form);
      const res = form.id
        ? await adminFetch(`/vendors/${form.id}`, { method: "PUT", body })
        : await adminFetch("/vendors", { method: "POST", body });
      toast.success(res.message || "Vendor saved");
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const quickUpdate = async (vendor, patch, successMsg) => {
    setRowBusy(vendor.id);
    try {
      const res = await adminFetch(`/vendors/${vendor.id}`, { method: "PUT", body: patch });
      setData((d) => ({ ...d, vendors: d.vendors.map((v) => (v.id === vendor.id ? res.vendor || { ...v, ...patch } : v)) }));
      toast.success(successMsg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRowBusy(null);
    }
  };

  const remove = async (vendor) => {
    const ok = await confirm({
      title: "Delete vendor?",
      message: `"${vendor.name}" and its reviews will be permanently deleted from the app and website. To only hide it, use "Hide" instead.`,
      confirmLabel: "Delete vendor",
      danger: true,
    });
    if (!ok) return;
    setRowBusy(vendor.id);
    try {
      const res = await adminFetch(`/vendors/${vendor.id}`, { method: "DELETE" });
      toast.success(res.message || "Vendor deleted");
      if (data.vendors.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRowBusy(null);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await adminFetch("/vendors/bulk-upload", { method: "POST", body: fd, isForm: true });
      setUploadResult({ ...res, filename: file.name });
      if (res.imported) load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = `${TEMPLATE_HEADERS.join(",")}\r\n`;
    saveBlob(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }), "hungrybird-vendor-template.csv");
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile("/vendors/export", `hungrybird-vendors-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.slug.replace(/-/g, "_"), label: c.name }));

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={
          filtersActive
            ? `${data.total.toLocaleString("en-IN")} vendor${data.total === 1 ? "" : "s"} match your filters.`
            : `${data.total.toLocaleString("en-IN")} vendors across ${cities.length} cit${cities.length === 1 ? "y" : "ies"}.`
        }
      >
        <button type="button" className="admin-btn" onClick={exportCsv} disabled={exporting}>
          {exporting ? <Spinner small /> : <Download size={15} />} Export CSV
        </button>
        {canWrite && (
          <>
            <input type="file" accept=".csv,.xlsx" ref={fileRef} onChange={handleUpload} className="hidden" />
            <button type="button" className="admin-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner small /> : <CloudUpload size={15} />} {uploading ? "Uploading..." : "Bulk upload"}
            </button>
            <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
              <Plus size={15} /> Add vendor
            </button>
          </>
        )}
      </PageHeader>

      <ReadOnlyNote area="vendors" />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, area, cuisine, address, dish..." />
        <select className="admin-select" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="verified">Live (verified)</option>
          <option value="pending">Pending</option>
          <option value="rejected">Hidden (rejected)</option>
        </select>
        <select className="admin-select" value={flag} onChange={(e) => setFlag(e.target.value)} aria-label="Flag">
          <option value="">All vendors</option>
          <option value="hidden_gem">Hidden gems</option>
          <option value="famous">Famous</option>
          <option value="missing_location">Missing location</option>
          <option value="missing_details">Missing description</option>
        </select>
        <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Highest rated</option>
        </select>
        {filtersActive && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={clearFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading && data.vendors.length === 0 ? (
        <Loading label="Loading vendors..." />
      ) : data.vendors.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Store} title={filtersActive ? "No vendors match these filters" : "No vendors yet"} message={filtersActive ? "Try a different search or clear the filters." : "Add a vendor or bulk upload a spreadsheet to get started."}>
            {filtersActive && (
              <button type="button" className="admin-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="admin-table-container" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Vendor</th>
                  <th>City / Area</th>
                  <th>Rating</th>
                  <th>Badges</th>
                  <th>Status</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.vendors.map((v) => {
                  const hidden = v.verified_status === "rejected";
                  const busy = rowBusy === v.id;
                  return (
                    <tr key={v.id} style={{ opacity: busy ? 0.5 : 1 }}>
                      <td>
                        <Thumb src={v.image_url} alt={v.name} />
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <div className="font-semibold text-neutral-900">{v.name}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {[v.specialty_dish, v.cuisine_type].filter(Boolean).join(" · ") || "—"}
                        </div>
                        {(v.lat == null || v.lng == null) && <div className="text-[11px] text-amber-700 font-medium mt-0.5">No map location</div>}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="text-neutral-800">{v.city_name || "—"}</div>
                        <div className="text-xs text-neutral-500 truncate max-w-[200px]">{v.area || ""}</div>
                      </td>
                      <td>
                        <Stars value={v.avg_rating} />
                        <div className="text-xs text-neutral-400">{v.total_ratings || 0} reviews</div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {v.is_hidden_gem && (
                            <span className="admin-badge gem">
                              <Gem size={11} /> Hidden Gem
                            </span>
                          )}
                          {v.is_famous && (
                            <span className="admin-badge famous">
                              <Crown size={11} /> Famous
                            </span>
                          )}
                          {!v.is_hidden_gem && !v.is_famous && <span className="text-neutral-300">—</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${v.verified_status || "verified"}`} title={`verified_status: ${v.verified_status || "verified"} · added ${formatDate(v.created_at)}`}>
                          {STATUS_LABEL[v.verified_status] || "Live"}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="admin-actions">
                          <a href={`/vendor/${v.id}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn-ghost admin-icon-btn" title="View on site">
                            <ExternalLink size={15} />
                          </a>
                          {canWrite && (
                            <>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-icon-btn"
                                title={v.is_hidden_gem ? "Remove Hidden Gem badge" : "Mark as Hidden Gem"}
                                disabled={busy}
                                onClick={() => quickUpdate(v, { is_hidden_gem: !v.is_hidden_gem }, v.is_hidden_gem ? "Hidden Gem badge removed" : "Marked as Hidden Gem")}
                              >
                                <Gem size={15} className={v.is_hidden_gem ? "text-brand-500" : ""} />
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-icon-btn"
                                title={hidden ? "Unhide (make live again)" : "Hide from app & website"}
                                disabled={busy}
                                onClick={() => quickUpdate(v, { verified_status: hidden ? "verified" : "rejected" }, hidden ? "Vendor is live again" : "Vendor hidden from app & website")}
                              >
                                {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                              </button>
                              <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" disabled={busy} onClick={() => setForm({ id: v.id, ...toForm(v) })}>
                                <Pencil size={15} />
                              </button>
                              <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" disabled={busy} onClick={() => remove(v)}>
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page || PER_PAGE} onChange={setPage} noun="vendors" />
        </>
      )}

      {canWrite && (
        <div className="admin-card mt-6 flex flex-wrap items-center gap-4">
          <FileSpreadsheet size={28} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-sm text-neutral-900">Bulk upload vendors</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Upload a .csv or .xlsx file. Required columns: <code>name</code> and <code>city</code>. New cities are created automatically and duplicates (same name in the same city) are skipped.
            </div>
          </div>
          <button type="button" className="admin-btn" onClick={downloadTemplate}>
            <Download size={15} /> Download template
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner small /> : <CloudUpload size={15} />} Upload file
          </button>
        </div>
      )}

      {/* Add / edit vendor */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        busy={saving}
        size="xl"
        title={form?.id ? `Edit vendor` : "Add vendor"}
        subtitle={form?.id ? `#${form.id} · ${form.name}` : "Fields marked * are required. Everything else can be filled in later."}
        footer={
          <>
            {form?.id && (
              <a href={`/vendor/${form.id}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn-ghost mr-auto">
                <ExternalLink size={15} /> View on site
              </a>
            )}
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="vendor-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : form?.id ? "Save changes" : "Create vendor"}
            </button>
          </>
        }
      >
        {form && (
          <form id="vendor-form" className="admin-form-grid three" onSubmit={save}>
            <div className="admin-form-section">Basics</div>
            <Field label="Name" required className="span-2">
              <input className="admin-input" required maxLength={200} value={form.name} onChange={(e) => setF({ name: e.target.value })} />
            </Field>
            <Field label="City" required>
              <select className="admin-select full" required value={form.city_id} onChange={(e) => setF({ city_id: e.target.value })}>
                <option value="">Choose a city</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cuisine type">
              <input className="admin-input" maxLength={200} value={form.cuisine_type} onChange={(e) => setF({ cuisine_type: e.target.value })} placeholder="e.g. Chaat" />
            </Field>
            <Field label="Food category" hint="Used for category chips in the app">
              <input className="admin-input" list="vendor-categories" maxLength={80} value={form.food_category} onChange={(e) => setF({ food_category: e.target.value })} placeholder="e.g. street_food" />
            </Field>
            <Field label="Specialty dish">
              <input className="admin-input" maxLength={150} value={form.specialty_dish} onChange={(e) => setF({ specialty_dish: e.target.value })} placeholder="e.g. Pyaaz Kachori" />
            </Field>
            <Field label="Description" className="span-all">
              <textarea className="admin-textarea" rows={3} value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="What makes this place special?" />
            </Field>

            <div className="admin-form-section">Timing & price</div>
            <Field label="Opening hours">
              <input className="admin-input" maxLength={150} value={form.opening_hours} onChange={(e) => setF({ opening_hours: e.target.value })} placeholder="e.g. 8 AM – 10 PM" />
            </Field>
            <Field label="Closed days">
              <input className="admin-input" maxLength={60} value={form.closed_days} onChange={(e) => setF({ closed_days: e.target.value })} placeholder="e.g. Monday" />
            </Field>
            <Field label="Price level" hint="₹ budget · ₹₹ mid · ₹₹₹ premium, or free text">
              <input className="admin-input" list="vendor-price-levels" maxLength={20} value={form.price_level} onChange={(e) => setF({ price_level: e.target.value })} />
            </Field>
            <Field label="Min price (₹)">
              <input className="admin-input" type="number" min={0} step="any" value={form.price_min} onChange={(e) => setF({ price_min: e.target.value })} />
            </Field>
            <Field label="Max price (₹)">
              <input className="admin-input" type="number" min={0} step="any" value={form.price_max} onChange={(e) => setF({ price_max: e.target.value })} />
            </Field>
            <div />

            <div className="admin-form-section">Location</div>
            <Field label="Address" className="span-all">
              <input className="admin-input" maxLength={300} value={form.address_text} onChange={(e) => setF({ address_text: e.target.value })} />
            </Field>
            <Field label="Area / locality">
              <input className="admin-input" maxLength={150} value={form.area} onChange={(e) => setF({ area: e.target.value })} />
            </Field>
            <Field label="Landmark">
              <input className="admin-input" maxLength={150} value={form.landmark} onChange={(e) => setF({ landmark: e.target.value })} />
            </Field>
            <div />
            <Field label="Latitude">
              <input className="admin-input" type="number" step="any" min={-90} max={90} value={form.lat} onChange={(e) => setF({ lat: e.target.value })} placeholder="26.9124" />
            </Field>
            <Field label="Longitude">
              <input className="admin-input" type="number" step="any" min={-180} max={180} value={form.lng} onChange={(e) => setF({ lng: e.target.value })} placeholder="75.7873" />
            </Field>
            <div className="flex items-end pb-2">
              {form.lat !== "" && form.lng !== "" ? (
                <a href={`https://www.google.com/maps?q=${form.lat},${form.lng}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                  Check on Google Maps <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-xs text-amber-700">Without coordinates the vendor won&apos;t appear on maps.</span>
              )}
            </div>

            <div className="admin-form-section">Contact</div>
            <Field label="Phone">
              <input className="admin-input" maxLength={50} value={form.phone} onChange={(e) => setF({ phone: e.target.value })} />
            </Field>
            <Field label="Website">
              <input className="admin-input" maxLength={300} value={form.website} onChange={(e) => setF({ website: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Instagram">
              <input className="admin-input" maxLength={150} value={form.instagram} onChange={(e) => setF({ instagram: e.target.value })} placeholder="@handle or URL" />
            </Field>

            <div className="admin-form-section">Photo & visibility</div>
            <div className="span-2 flex flex-col gap-3">
              <Field label="Image URL">
                <input className="admin-input" type="url" maxLength={500} value={form.image_url} onChange={(e) => setF({ image_url: e.target.value })} placeholder="https://..." />
              </Field>
              <ImagePreview src={form.image_url} height={150} />
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Status">
                <select className="admin-select full" value={form.verified_status} onChange={(e) => setF({ verified_status: e.target.value })}>
                  <option value="verified">Live (verified)</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Hidden (rejected)</option>
                </select>
              </Field>
              <label className="admin-check">
                <input type="checkbox" checked={!!form.is_hidden_gem} onChange={(e) => setF({ is_hidden_gem: e.target.checked })} />
                <Gem size={14} className="text-brand-500" /> Hidden Gem
              </label>
              <label className="admin-check">
                <input type="checkbox" checked={!!form.is_famous} onChange={(e) => setF({ is_famous: e.target.checked })} />
                <Crown size={14} className="text-amber-600" /> Famous
              </label>
            </div>

            <datalist id="vendor-price-levels">
              <option value="₹" />
              <option value="₹₹" />
              <option value="₹₹₹" />
            </datalist>
            <datalist id="vendor-categories">
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </datalist>
          </form>
        )}
      </Modal>

      {/* Bulk upload result */}
      <Modal
        open={!!uploadResult}
        onClose={() => setUploadResult(null)}
        title="Bulk upload finished"
        subtitle={uploadResult?.filename}
        footer={
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setUploadResult(null)}>
            Done
          </button>
        }
      >
        {uploadResult && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-2xl font-bold text-emerald-700">{uploadResult.imported ?? 0}</div>
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Imported</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="text-2xl font-bold text-amber-700">{uploadResult.skipped ?? 0}</div>
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Skipped</div>
              </div>
            </div>
            {uploadResult.message && <p className="text-sm text-neutral-600 m-0">{uploadResult.message}</p>}
            {uploadResult.errors?.length > 0 && (
              <div>
                <div className="admin-label">Rows that were skipped</div>
                <ul className="max-h-60 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100 text-xs text-neutral-700 m-0 p-0 list-none">
                  {uploadResult.errors.map((err, i) => (
                    <li key={i} className="px-3 py-2">
                      {err}
                    </li>
                  ))}
                </ul>
                {uploadResult.skipped > uploadResult.errors.length && <div className="admin-hint">Only the first {uploadResult.errors.length} problems are listed.</div>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
