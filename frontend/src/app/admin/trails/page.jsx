"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Crown, Info, Link2, Pencil, Plus, Route, Save, Search, Store, Trash2, Unlink, X } from "lucide-react";
import { adminFetch, qs } from "../lib/api";
import { useCan, useCanRead, useDebounce } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, SearchInput, Spinner, Switch, Thumb } from "../components/ui";

const EMPTY_STOP = { name: "", vendor_id: null, vendor_name: "", note: "" };
const EMPTY = {
  city_id: "", title: "", description: "", image_url: "", duration_text: "", price_text: "",
  stops: [{ ...EMPTY_STOP }], is_premium: true, is_active: true, sort_order: "",
};

function trailsFrom(data) {
  if (Array.isArray(data)) return data;
  return data?.trails || data?.items || [];
}

function toForm(t) {
  return {
    id: t.id,
    city_id: t.city_id ? String(t.city_id) : "",
    title: t.title || "",
    description: t.description || "",
    image_url: t.image_url || "",
    duration_text: t.duration_text || "",
    price_text: t.price_text || "",
    stops: (t.stops || []).map((s) => ({
      name: s.name || "",
      vendor_id: s.vendor_id ?? null,
      vendor_name: s.vendor_name || s.vendor?.name || "",
      note: s.note || "",
    })),
    is_premium: t.is_premium !== false,
    is_active: t.is_active !== false,
    sort_order: t.sort_order != null ? String(t.sort_order) : "0",
  };
}

function toBody(f) {
  return {
    city_id: f.city_id ? Number(f.city_id) : null,
    title: f.title.trim(),
    description: f.description.trim(),
    image_url: f.image_url.trim(),
    duration_text: f.duration_text.trim(),
    price_text: f.price_text.trim(),
    stops: f.stops
      .filter((s) => s.name.trim() || s.vendor_id)
      .map((s) => ({ name: s.name.trim(), vendor_id: s.vendor_id ? Number(s.vendor_id) : null, note: s.note.trim() })),
    is_premium: !!f.is_premium,
    is_active: !!f.is_active,
    sort_order: f.sort_order === "" ? 0 : Number(f.sort_order),
  };
}

export default function AdminTrails() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("content");
  const canReadCities = useCanRead("cities");

  const [trails, setTrails] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(`/trails${qs({ city_id: cityId })}`);
      setTrails(trailsFrom(data));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canReadCities) adminFetch("/cities").then((d) => setCities(d.cities || [])).catch(() => {});
  }, [canReadCities]);

  const cityName = useCallback((t) => t.city_name || cities.find((c) => c.id === t.city_id)?.name || (t.city_id ? `City #${t.city_id}` : "—"), [cities]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trails
      .filter((t) => !cityId || String(t.city_id) === String(cityId))
      .filter((t) => !term || [t.title, t.description, cityName(t)].filter(Boolean).some((v) => v.toLowerCase().includes(term)))
      .sort((a, b) => cityName(a).localeCompare(cityName(b)) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.title).localeCompare(String(b.title)));
  }, [trails, search, cityId, cityName]);

  const openCreate = () => setForm({ ...EMPTY, stops: [{ ...EMPTY_STOP }], city_id: cityId || (cities.length === 1 ? String(cities[0].id) : ""), sort_order: String(trails.filter((t) => !cityId || String(t.city_id) === String(cityId)).length) });

  const save = async (e) => {
    e.preventDefault();
    const body = toBody(form);
    if (!body.title) return toast.error("Trail title is required.");
    if (!body.city_id) return toast.error("Choose the city this trail is in.");
    if (body.stops.length === 0) return toast.error("Add at least one stop.");
    if (body.stops.some((s) => !s.name)) return toast.error("Every stop needs a name.");
    setSaving(true);
    try {
      const res = form.id ? await adminFetch(`/trails/${form.id}`, { method: "PUT", body }) : await adminFetch("/trails", { method: "POST", body });
      toast.success(res.message || (form.id ? "Trail updated" : "Trail created"));
      setForm(null);
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t, value) => {
    setBusyId(t.id);
    setTrails((list) => list.map((x) => (x.id === t.id ? { ...x, is_active: value } : x)));
    // Send the whole trail when we have its stops, so a non-partial PUT never wipes them.
    const body = Array.isArray(t.stops) ? toBody({ ...toForm(t), is_active: value }) : { is_active: value };
    try {
      await adminFetch(`/trails/${t.id}`, { method: "PUT", body });
      toast.success(value ? `"${t.title}" is live` : `"${t.title}" hidden from the app and website`);
    } catch (err) {
      setTrails((list) => list.map((x) => (x.id === t.id ? { ...x, is_active: !value } : x)));
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t) => {
    const ok = await confirm({
      title: `Delete "${t.title}"?`,
      message: "The trail and its stops are removed from the app and website. Linked vendors are not changed. To only take it offline, switch it off instead.",
      confirmLabel: "Delete trail",
      danger: true,
    });
    if (!ok) return;
    setBusyId(t.id);
    try {
      const res = await adminFetch(`/trails/${t.id}`, { method: "DELETE" });
      toast.success(res.message || "Trail deleted");
      load({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtersActive = search || cityId;

  return (
    <div>
      <PageHeader title="Food Trails" subtitle={`${trails.length} trail${trails.length === 1 ? "" : "s"} · curated walks through a city's best street food, shown in the app and on the website.`}>
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={openCreate}>
            <Plus size={15} /> Add trail
          </button>
        )}
      </PageHeader>

      <div className="admin-note info">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Each city shows its own active trails, lowest sort order first. <strong>Premium</strong> trails are locked for free users while Premium is switched on - they see the title, photo, description and number of stops, but not the stops themselves.
        </span>
      </div>
      <ReadOnlyNote area="content" />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search trails..." />
        {cities.length > 0 && (
          <select className="admin-select" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="City">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {filtersActive && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => {
              setSearch("");
              setCityId("");
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <Loading label="Loading trails..." />
      ) : visible.length === 0 ? (
        !error && (
          <div className="admin-card">
            <EmptyState icon={Route} title={filtersActive ? "No trails match" : "No food trails yet"} message={filtersActive ? "Try a different search or city." : "Create a trail - e.g. \"Old city breakfast walk\" with 4-6 stops."} />
          </div>
        )
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Trail</th>
                <th>City</th>
                <th className="num">Stops</th>
                <th>Duration / price</th>
                <th>Access</th>
                <th className="num">Order</th>
                <th>Live</th>
                {canWrite && <th className="actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} style={{ opacity: t.is_active === false ? 0.6 : busyId === t.id ? 0.5 : 1 }}>
                  <td>
                    <Thumb src={t.image_url} alt={t.title} />
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <div className="font-semibold text-neutral-900">{t.title}</div>
                    {t.description && <div className="text-xs text-neutral-500 line-clamp-2 max-w-[360px]">{t.description}</div>}
                  </td>
                  <td className="whitespace-nowrap">{cityName(t)}</td>
                  <td className="num">{Array.isArray(t.stops) ? t.stops.length : t.stop_count ?? "—"}</td>
                  <td className="text-xs text-neutral-600" style={{ minWidth: 120 }}>
                    <div>{t.duration_text || "—"}</div>
                    <div className="text-neutral-400">{t.price_text || ""}</div>
                  </td>
                  <td>
                    {t.is_premium !== false ? (
                      <span className="admin-badge premium normal-case">
                        <Crown size={11} /> Premium
                      </span>
                    ) : (
                      <span className="admin-badge neutral normal-case">Free</span>
                    )}
                  </td>
                  <td className="num">{t.sort_order ?? 0}</td>
                  <td>
                    <Switch checked={t.is_active !== false} disabled={!canWrite || busyId === t.id} onChange={(v) => toggleActive(t, v)} label={t.is_active !== false ? "Live" : "Hidden"} />
                  </td>
                  {canWrite && (
                    <td className="actions">
                      <div className="admin-actions">
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit" onClick={() => setForm(toForm(t))}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete" disabled={busyId === t.id} onClick={() => remove(t)}>
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
        size="xl"
        title={form?.id ? "Edit trail" : "Add food trail"}
        subtitle={form?.id ? `#${form.id} · ${form.title}` : "Fields marked * are required."}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="trail-form" className="admin-btn admin-btn-brand" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : form?.id ? "Save changes" : "Create trail"}
            </button>
          </>
        }
      >
        {form && <TrailForm form={form} setForm={setForm} cities={cities} onSubmit={save} />}
      </Modal>
    </div>
  );
}

// Stops only store vendor_id; names for the "linked vendor" chips are looked up once per vendor.
const vendorNames = new Map();

function TrailForm({ form, setForm, cities, onSubmit }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canReadVendors = useCanRead("vendors");
  const missingIds = [...new Set(form.stops.filter((s) => s.vendor_id && !s.vendor_name).map((s) => Number(s.vendor_id)))].join(",");

  useEffect(() => {
    if (!missingIds || !canReadVendors) return undefined;
    let cancelled = false;
    const ids = missingIds.split(",").map(Number);
    Promise.all(
      ids.map((id) =>
        vendorNames.has(id)
          ? Promise.resolve([id, vendorNames.get(id)])
          : adminFetch(`/vendors/${id}`).then(
              (d) => [id, d.vendor?.name || null],
              () => [id, null]
            )
      )
    ).then((pairs) => {
      if (cancelled) return;
      const found = Object.fromEntries(pairs.filter(([, name]) => name));
      Object.entries(found).forEach(([id, name]) => vendorNames.set(Number(id), name));
      if (Object.keys(found).length) {
        setForm((f) => ({ ...f, stops: f.stops.map((s) => (s.vendor_id && !s.vendor_name && found[s.vendor_id] ? { ...s, vendor_name: found[s.vendor_id] } : s)) }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [missingIds, canReadVendors, setForm]);
  const setStop = (i, patch) => setForm((f) => ({ ...f, stops: f.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveStop = (i, dir) =>
    setForm((f) => {
      const t = i + dir;
      if (t < 0 || t >= f.stops.length) return f;
      const stops = [...f.stops];
      [stops[i], stops[t]] = [stops[t], stops[i]];
      return { ...f, stops };
    });
  const removeStop = (i) => setForm((f) => ({ ...f, stops: f.stops.filter((_, j) => j !== i) }));
  const addStop = () => setForm((f) => ({ ...f, stops: [...f.stops, { ...EMPTY_STOP }] }));
  const cityKnown = !form.city_id || cities.some((c) => String(c.id) === String(form.city_id));

  return (
    <form id="trail-form" className="admin-form-grid" onSubmit={onSubmit}>
      <div className="admin-form-section">Trail</div>
      <Field label="Title" required>
        <input className="admin-input" required maxLength={150} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Old city breakfast walk" />
      </Field>
      <Field label="City" required>
        {cities.length > 0 ? (
          <select className="admin-select full" required value={form.city_id} onChange={(e) => set({ city_id: e.target.value })}>
            <option value="">Choose a city</option>
            {!cityKnown && <option value={form.city_id}>City #{form.city_id}</option>}
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input className="admin-input" type="number" min={1} required value={form.city_id} onChange={(e) => set({ city_id: e.target.value })} placeholder="City id" />
        )}
      </Field>
      <Field label="Description" className="span-all">
        <textarea className="admin-textarea" rows={3} maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What will people eat and see on this walk?" />
      </Field>
      <Field label="Duration" hint="Free text, e.g. 2-3 hours">
        <input className="admin-input" maxLength={60} value={form.duration_text} onChange={(e) => set({ duration_text: e.target.value })} placeholder="2-3 hours" />
      </Field>
      <Field label="Price" hint="Free text, e.g. ₹300-400 per person">
        <input className="admin-input" maxLength={60} value={form.price_text} onChange={(e) => set({ price_text: e.target.value })} placeholder="₹300-400 per person" />
      </Field>
      <div className="span-all grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Image URL">
          <input className="admin-input" type="url" maxLength={500} value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://..." />
        </Field>
        <ImagePreview src={form.image_url} height={110} />
      </div>

      <div className="admin-form-section">Stops (in walking order)</div>
      <div className="span-all admin-list-editor">
        {form.stops.map((s, i) => (
          <StopRow
            key={i}
            index={i}
            stop={s}
            cityId={form.city_id}
            count={form.stops.length}
            onChange={(patch) => setStop(i, patch)}
            onMove={(dir) => moveStop(i, dir)}
            onRemove={() => removeStop(i)}
          />
        ))}
        <button type="button" className="admin-btn admin-btn-sm self-start" onClick={addStop}>
          <Plus size={14} /> Add stop
        </button>
      </div>

      <div className="admin-form-section">Access & visibility</div>
      <label className="admin-check !items-start span-all">
        <input type="checkbox" className="mt-0.5" checked={form.is_premium} onChange={(e) => set({ is_premium: e.target.checked })} />
        <span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Crown size={14} className="text-amber-600" /> Premium - locked for free users
          </span>
          <span className="block text-xs text-neutral-500 font-normal">Only applies while Premium is switched on. Untick to make this trail free for everyone.</span>
        </span>
      </label>
      <Field label="Sort order" hint="Lower numbers show first within the city">
        <input className="admin-input" type="number" step={1} value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
      </Field>
      <div className="flex items-end pb-2">
        <label className="admin-check">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
          Live (shown in the app and on the website)
        </label>
      </div>
    </form>
  );
}

function StopRow({ index, stop, cityId, count, onChange, onMove, onRemove }) {
  const canSearchVendors = useCanRead("vendors");
  const [picking, setPicking] = useState(false);

  return (
    <div className="admin-list-row">
      <span className="admin-list-row-index">{index + 1}</span>
      <div className="admin-list-row-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className="admin-input" maxLength={150} value={stop.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Stop name, e.g. Rawat Mishthan Bhandar" aria-label={`Stop ${index + 1} name`} />
          <div className="flex items-center gap-2 min-w-0">
            {stop.vendor_id && canSearchVendors ? (
              <span className="admin-badge brand normal-case !justify-start min-w-0 max-w-full" title="Linked vendor - tapping the stop opens this vendor">
                <Store size={11} className="shrink-0" />
                <span className="truncate">{stop.vendor_name || `Vendor #${stop.vendor_id}`}</span>
                <button type="button" className="ml-1 flex shrink-0" onClick={() => onChange({ vendor_id: null, vendor_name: "" })} aria-label="Unlink vendor" title="Unlink vendor">
                  <Unlink size={12} />
                </button>
              </span>
            ) : canSearchVendors ? (
              <button type="button" className="admin-btn admin-btn-sm" onClick={() => setPicking((p) => !p)}>
                <Link2 size={13} /> {picking ? "Close search" : "Link a vendor (optional)"}
              </button>
            ) : (
              <input
                className="admin-input"
                type="number"
                min={1}
                value={stop.vendor_id ?? ""}
                onChange={(e) => onChange({ vendor_id: e.target.value ? Number(e.target.value) : null })}
                placeholder="Vendor id (optional)"
                aria-label={`Stop ${index + 1} vendor id`}
              />
            )}
          </div>
        </div>
        {picking && !stop.vendor_id && (
          <VendorPicker
            cityId={cityId}
            onPick={(v) => {
              vendorNames.set(v.id, v.name);
              onChange({ vendor_id: v.id, vendor_name: v.name, name: stop.name.trim() ? stop.name : v.name });
              setPicking(false);
            }}
          />
        )}
        <input className="admin-input" maxLength={300} value={stop.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="Note (optional), e.g. Try the mawa kachori" aria-label={`Stop ${index + 1} note`} />
      </div>
      <div className="admin-list-row-tools">
        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" disabled={index === 0} onClick={() => onMove(-1)} title="Move up" aria-label="Move stop up">
          <ArrowUp size={14} />
        </button>
        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" disabled={index === count - 1} onClick={() => onMove(1)} title="Move down" aria-label="Move stop down">
          <ArrowDown size={14} />
        </button>
        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" disabled={count === 1} onClick={onRemove} title="Remove stop" aria-label="Remove stop">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/** Search vendors in the trail's city: GET /api/admin/vendors?q=&city_id=&per_page=8 */
function VendorPicker({ cityId, onPick }) {
  const [term, setTerm] = useState("");
  const q = useDebounce(term, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminFetch(`/vendors${qs({ q: q.trim(), city_id: cityId, per_page: 8, sort: "name" })}`)
      .then((d) => !cancelled && setResults(d.vendors || []))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q, cityId]);

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200">
      <div className="admin-search !min-w-0">
        <Search size={16} />
        <input type="search" className="admin-input" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={cityId ? "Search vendors in this city..." : "Search vendors (choose a city to narrow down)"} />
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500 px-1">
          <Spinner small /> Searching...
        </div>
      ) : results.length > 0 ? (
        <div className="admin-picker">
          {results.map((v) => (
            <button key={v.id} type="button" onClick={() => onPick(v)}>
              <Thumb src={v.image_url} alt="" size={30} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold truncate">{v.name}</span>
                <span className="block text-xs text-neutral-500 truncate">{[v.area, v.city_name].filter(Boolean).join(", ") || `#${v.id}`}</span>
              </span>
              {v.verified_status === "rejected" && <span className="admin-badge rejected">Hidden</span>}
            </button>
          ))}
        </div>
      ) : q.trim().length >= 2 ? (
        <p className="text-xs text-neutral-500 m-0 px-1">No vendors found{cityId ? " in this city" : ""}.</p>
      ) : (
        <p className="text-xs text-neutral-400 m-0 px-1">Type at least 2 letters.</p>
      )}
    </div>
  );
}
