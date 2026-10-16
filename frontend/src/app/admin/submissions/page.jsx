"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { CircleCheck, CircleX, ClipboardList, ExternalLink, Mail, MapPin, MapPinOff, Trash2, User } from "lucide-react";
import { adminFetch, API_URL, formatDate, formatDateTime } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, ImagePreview, Loading, PageHeader, ReadOnlyNote, SearchInput, StatusBadge, Tabs } from "../components/ui";

const STATUS_TABS = ["pending", "approved", "rejected", "all"];

function mapsUrl(sub) {
  if (sub.lat != null && sub.lng != null) return `https://www.google.com/maps?q=${sub.lat},${sub.lng}`;
  return sub.google_maps_url || null;
}

/** Try to pull "lat,lng" out of a Google Maps link (…@26.9,75.8… or ?q=26.9,75.8). */
function coordsFromMapsUrl(url) {
  if (!url) return null;
  const m = String(url).match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  return m ? { lat: m[1], lng: m[2] } : null;
}

function guessPriceLevel(estimated) {
  if (!estimated) return "";
  const s = String(estimated).trim();
  if (/^₹{1,3}$/.test(s)) return s;
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return s.slice(0, 20);
  if (n <= 100) return "₹";
  if (n <= 300) return "₹₹";
  return "₹₹₹";
}

function Detail({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">{label}</div>
      <div className="text-sm text-neutral-800 break-words">{children || <span className="text-neutral-400">—</span>}</div>
    </div>
  );
}

export default function AdminSubmissions() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refreshCounts } = useAdmin();
  const canWrite = useCan("submissions");

  const [status, setStatus] = useState("pending");
  const [submissions, setSubmissions] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(null); // form state
  const [rejecting, setRejecting] = useState(null); // { sub, notes }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await adminFetch(`/submissions?status=${s}`);
      setSubmissions(data.submissions || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Live refresh when the backend announces a new submission over Socket.IO.
  useEffect(() => {
    let socket;
    try {
      socket = io(API_URL, { reconnectionAttempts: 3 });
      socket.on("new_submission", (payload) => {
        toast.info(`New submission: ${payload?.stall_name || "a new vendor"}`);
        load(statusRef.current, { quiet: true });
        refreshCounts();
      });
    } catch {
      /* realtime is optional */
    }
    return () => socket?.disconnect();
  }, [load, refreshCounts, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) =>
      [s.stall_name, s.city_name, s.cuisine_type, s.submitted_by_name, s.submitted_by_email, s.approx_address]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [submissions, search]);

  const allCount = (counts.pending || 0) + (counts.approved || 0) + (counts.rejected || 0);
  const tabs = STATUS_TABS.map((s) => ({
    value: s,
    label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1),
    count: s === "all" ? allCount : counts[s] || 0,
  }));

  const afterChange = () => {
    load(status, { quiet: true });
    refreshCounts();
  };

  const openApprove = (sub) => {
    const fromUrl = sub.lat == null || sub.lng == null ? coordsFromMapsUrl(sub.google_maps_url) : null;
    setApproving({
      sub,
      fromUrl: !!fromUrl,
      stall_name: sub.stall_name || "",
      cuisine_type: sub.cuisine_type || "",
      description: sub.description || "",
      approx_address: sub.approx_address || "",
      lat: sub.lat ?? fromUrl?.lat ?? "",
      lng: sub.lng ?? fromUrl?.lng ?? "",
      price_level: guessPriceLevel(sub.estimated_price),
      image_url: "",
      is_hidden_gem: true,
      notes: "",
    });
  };

  const submitApprove = async (e) => {
    e.preventDefault();
    const f = approving;
    if (f.lat === "" || f.lng === "") {
      toast.error("Add latitude and longitude before approving - the vendor needs a map location.");
      return;
    }
    setBusy(true);
    try {
      const data = await adminFetch(`/submissions/${f.sub.id}/approve`, {
        method: "POST",
        body: {
          stall_name: f.stall_name,
          cuisine_type: f.cuisine_type,
          description: f.description,
          approx_address: f.approx_address,
          lat: f.lat,
          lng: f.lng,
          price_level: f.price_level,
          image_url: f.image_url,
          is_hidden_gem: f.is_hidden_gem,
          notes: f.notes,
        },
      });
      toast.success(data.message || "Submission approved");
      setApproving(null);
      afterChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await adminFetch(`/submissions/${rejecting.sub.id}/reject`, { method: "POST", body: { notes: rejecting.notes } });
      toast.success(data.message || "Submission rejected");
      setRejecting(null);
      afterChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sub) => {
    const ok = await confirm({
      title: "Delete submission?",
      message: `"${sub.stall_name}" will be permanently removed. Vendors already created from it are not affected.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const data = await adminFetch(`/submissions/${sub.id}`, { method: "DELETE" });
      toast.success(data.message || "Submission deleted");
      afterChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setA = (patch) => setApproving((f) => ({ ...f, ...patch }));

  return (
    <div>
      <PageHeader title="Submissions" subtitle="Vendor suggestions sent from the website and the app. Approving one creates a live vendor." />
      <ReadOnlyNote area="submissions" />

      <Tabs tabs={tabs} value={status} onChange={setStatus} />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Filter by stall, city, cuisine or submitter..." />
      </div>

      <ErrorBanner message={error} onRetry={() => load(status)} />

      {loading ? (
        <Loading label="Loading submissions..." />
      ) : filtered.length === 0 ? (
        <div className="admin-card">
          <EmptyState
            icon={ClipboardList}
            title={search ? "No submissions match your search" : `No ${status === "all" ? "" : status} submissions`}
            message={status === "pending" && !search ? "You're all caught up. New suggestions from users will appear here." : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          {filtered.map((sub) => {
            const map = mapsUrl(sub);
            const hasCoords = sub.lat != null && sub.lng != null;
            return (
              <div key={sub.id} className="admin-card !mb-0 flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-neutral-900 m-0 leading-tight">{sub.stall_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {sub.city_name || "Unknown city"}
                      </span>
                      <span>·</span>
                      <span title={formatDateTime(sub.created_at)}>Submitted {formatDate(sub.created_at)}</span>
                      <span>·</span>
                      <span>#{sub.id}</span>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Detail label="Cuisine">{sub.cuisine_type}</Detail>
                  <Detail label="Price">{sub.estimated_price}</Detail>
                  <Detail label="Rating">{sub.rating ? <span className="text-amber-600 font-semibold">★ {sub.rating}</span> : null}</Detail>
                  <Detail label="Location">
                    {hasCoords ? (
                      <span className="tabular-nums text-xs">
                        {Number(sub.lat).toFixed(5)}, {Number(sub.lng).toFixed(5)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
                        <MapPinOff size={12} /> No coordinates
                      </span>
                    )}
                  </Detail>
                  <Detail label="Address" className="col-span-2 md:col-span-4">
                    {sub.approx_address}
                  </Detail>
                  <Detail label="Description" className="col-span-2 md:col-span-4">
                    {sub.description && <span className="whitespace-pre-line">{sub.description}</span>}
                  </Detail>
                  <Detail label="Submitted by" className="col-span-2">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={13} className="text-neutral-400" /> {sub.submitted_by_name || "Anonymous"}
                    </span>
                    {sub.submitted_by_email && (
                      <a href={`mailto:${sub.submitted_by_email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-0.5 min-w-0">
                        <Mail size={12} className="shrink-0" /> <span className="min-w-0 break-all">{sub.submitted_by_email}</span>
                      </a>
                    )}
                  </Detail>
                  <Detail label="Map" className="col-span-2">
                    {map ? (
                      <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        Open in Google Maps <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </Detail>
                  {sub.review_notes && (
                    <Detail label="Review notes" className="col-span-2 md:col-span-4">
                      <span className="italic text-neutral-600">{sub.review_notes}</span>
                    </Detail>
                  )}
                </div>

                {canWrite && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-100 mt-auto">
                    {sub.status !== "approved" && (
                      <button type="button" className="admin-btn admin-btn-success admin-btn-sm" onClick={() => openApprove(sub)}>
                        <CircleCheck size={14} /> Approve
                      </button>
                    )}
                    {sub.status === "pending" && (
                      <button type="button" className="admin-btn admin-btn-danger-soft admin-btn-sm" onClick={() => setRejecting({ sub, notes: "" })}>
                        <CircleX size={14} /> Reject
                      </button>
                    )}
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm ml-auto" onClick={() => remove(sub)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve modal */}
      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        busy={busy}
        size="lg"
        title="Approve & create vendor"
        subtitle="Check the details below - you can fix anything before the vendor goes live."
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setApproving(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="approve-form" className="admin-btn admin-btn-brand" disabled={busy}>
              <CircleCheck size={15} /> {busy ? "Approving..." : "Approve & publish"}
            </button>
          </>
        }
      >
        {approving && (
          <form id="approve-form" className="admin-form-grid" onSubmit={submitApprove}>
            <Field label="Stall name" required className="span-all">
              <input className="admin-input" required value={approving.stall_name} onChange={(e) => setA({ stall_name: e.target.value })} />
            </Field>
            <Field label="Cuisine type">
              <input className="admin-input" value={approving.cuisine_type} onChange={(e) => setA({ cuisine_type: e.target.value })} />
            </Field>
            <Field label="Price level" hint={approving.sub.estimated_price ? `Submitted: ${approving.sub.estimated_price}` : "₹ = budget, ₹₹ = mid, ₹₹₹ = premium"}>
              <input className="admin-input" list="price-levels" maxLength={20} value={approving.price_level} onChange={(e) => setA({ price_level: e.target.value })} />
            </Field>
            <Field label="Description" className="span-all">
              <textarea className="admin-textarea" rows={3} value={approving.description} onChange={(e) => setA({ description: e.target.value })} />
            </Field>
            <Field label="Address" className="span-all">
              <input className="admin-input" value={approving.approx_address} onChange={(e) => setA({ approx_address: e.target.value })} />
            </Field>
            <Field label="Latitude" required>
              <input className="admin-input" type="number" step="any" min={-90} max={90} value={approving.lat} onChange={(e) => setA({ lat: e.target.value })} placeholder="26.9124" />
            </Field>
            <Field label="Longitude" required>
              <input className="admin-input" type="number" step="any" min={-180} max={180} value={approving.lng} onChange={(e) => setA({ lng: e.target.value })} placeholder="75.7873" />
            </Field>
            <div className="span-all -mt-1 text-xs text-neutral-500 flex flex-wrap gap-x-3 gap-y-1">
              {approving.fromUrl && <span className="text-emerald-700 font-medium">Coordinates were read from the submitted Google Maps link.</span>}
              {approving.sub.google_maps_url && (
                <a href={approving.sub.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  Open submitted map link <ExternalLink size={11} />
                </a>
              )}
              {approving.lat !== "" && approving.lng !== "" && (
                <a href={`https://www.google.com/maps?q=${approving.lat},${approving.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  Check these coordinates <ExternalLink size={11} />
                </a>
              )}
            </div>
            <Field label="Image URL" className="span-all">
              <input className="admin-input" type="url" value={approving.image_url} onChange={(e) => setA({ image_url: e.target.value })} placeholder="https://..." />
            </Field>
            <div className="span-all">
              <ImagePreview src={approving.image_url} height={120} />
            </div>
            <div className="span-all">
              <label className="admin-check">
                <input type="checkbox" checked={approving.is_hidden_gem} onChange={(e) => setA({ is_hidden_gem: e.target.checked })} />
                Mark as Hidden Gem
              </label>
            </div>
            <Field label="Internal notes (optional)" className="span-all">
              <input className="admin-input" value={approving.notes} onChange={(e) => setA({ notes: e.target.value })} placeholder="e.g. Verified on call with the owner" />
            </Field>
            <datalist id="price-levels">
              <option value="₹" />
              <option value="₹₹" />
              <option value="₹₹₹" />
            </datalist>
          </form>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        busy={busy}
        size="sm"
        title="Reject submission"
        subtitle={rejecting?.sub.stall_name}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setRejecting(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="reject-form" className="admin-btn admin-btn-danger" disabled={busy}>
              {busy ? "Rejecting..." : "Reject"}
            </button>
          </>
        }
      >
        {rejecting && (
          <form id="reject-form" className="admin-form" onSubmit={submitReject}>
            <Field label="Reason / notes (optional)" hint="Kept with the submission for your team's reference.">
              <textarea className="admin-textarea" rows={3} value={rejecting.notes} onChange={(e) => setRejecting({ ...rejecting, notes: e.target.value })} placeholder="e.g. Duplicate of an existing vendor, closed permanently..." />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
