"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleSlash, Clapperboard, ExternalLink, Flag, MessageSquareText, RotateCcw, ShieldAlert, Store, Trash2, User } from "lucide-react";
import { adminFetch, formatDate, formatDateTime } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, Loading, PageHeader, ReadOnlyNote, StatusBadge, Tabs } from "../components/ui";

const TARGETS = {
  review: { label: "Review", icon: MessageSquareText, cls: "bg-amber-50 text-amber-800" },
  vendor: { label: "Vendor", icon: Store, cls: "bg-orange-50 text-orange-800" },
  reel: { label: "Reel", icon: Clapperboard, cls: "bg-violet-50 text-violet-800" },
};

const TAKE_DOWN_TEXT = {
  review: "The review will be permanently deleted and the vendor's rating recalculated.",
  reel: "The reel will be hidden (rejected) so it no longer shows in the app.",
  vendor: "The vendor will be hidden from the app and the website (status set to rejected). You can unhide it later from Vendors.",
};

export default function AdminReports() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refreshCounts } = useAdmin();
  const canWrite = useCan("reports");

  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteFor, setNoteFor] = useState(null); // { report, status, notes }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await adminFetch(`/reports?status=${s}`);
      setReports(data.reports || []);
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

  const afterChange = () => {
    load(status, { quiet: true });
    refreshCounts();
  };

  const takeDown = async (r) => {
    const ok = await confirm({
      title: `Take down this ${TARGETS[r.target_type]?.label.toLowerCase() || "item"}?`,
      message: `${TAKE_DOWN_TEXT[r.target_type] || "The reported content will be removed."}\n\nEvery open report about the same item is marked resolved.`,
      confirmLabel: "Take down",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/reports/${r.id}/take-down`, { method: "POST" });
      toast.success(res.message || "Content taken down");
      afterChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitStatus = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await adminFetch(`/reports/${noteFor.report.id}`, { method: "PUT", body: { status: noteFor.status, admin_notes: noteFor.notes } });
      toast.success(noteFor.status === "dismissed" ? "Report dismissed" : noteFor.status === "resolved" ? "Report resolved" : res.message || "Report reopened");
      setNoteFor(null);
      afterChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reopen = async (r) => {
    try {
      await adminFetch(`/reports/${r.id}`, { method: "PUT", body: { status: "pending" } });
      toast.success("Report reopened");
      afterChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (r) => {
    const ok = await confirm({ title: "Delete report?", message: "The report record is deleted. The reported content itself is not changed.", confirmLabel: "Delete report", danger: true });
    if (!ok) return;
    try {
      const res = await adminFetch(`/reports/${r.id}`, { method: "DELETE" });
      toast.success(res.message || "Report deleted");
      afterChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const allCount = (counts.pending || 0) + (counts.resolved || 0) + (counts.dismissed || 0);
  const tabs = [
    { value: "pending", label: "Pending", count: counts.pending || 0 },
    { value: "resolved", label: "Resolved", count: counts.resolved || 0 },
    { value: "dismissed", label: "Dismissed", count: counts.dismissed || 0 },
    { value: "all", label: "All", count: allCount },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Content flagged by users on the website and app: wrong vendor details, abusive reviews, inappropriate reels." />
      <ReadOnlyNote area="reports" />
      <Tabs tabs={tabs} value={status} onChange={setStatus} />
      <ErrorBanner message={error} onRetry={() => load(status)} />

      {loading ? (
        <Loading label="Loading reports..." />
      ) : reports.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Flag} title={status === "pending" ? "No pending reports" : `No ${status === "all" ? "" : status} reports`} message={status === "pending" ? "Nothing needs moderation right now." : undefined} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => {
            const t = TARGETS[r.target_type] || { label: r.target_type, icon: ShieldAlert, cls: "bg-neutral-100 text-neutral-700" };
            const Icon = t.icon;
            return (
              <div key={r.id} className="admin-card !mb-0">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.cls}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>{t.label}</span>
                        <span className="font-semibold text-neutral-900">{r.target?.label || `#${r.target_id}`}</span>
                        {r.target && !r.target.exists && <span className="admin-badge neutral">Already removed</span>}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Report #{r.id} · {t.label} #{r.target_id} · <span title={formatDateTime(r.created_at)}>{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {r.target?.preview && (
                  <blockquote className="m-0 mb-3 pl-3 border-l-2 border-neutral-200 text-sm text-neutral-600 italic whitespace-pre-line line-clamp-4">{r.target.preview}</blockquote>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Reason</div>
                    <div className="font-semibold text-rose-700">{r.reason}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Details</div>
                    <div className="text-neutral-700 whitespace-pre-line">{r.details || <span className="text-neutral-400">—</span>}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Reported by</div>
                    <div className="flex items-center gap-1.5 text-neutral-700">
                      <User size={13} className="text-neutral-400" /> {r.reporter_name}
                      {r.reporter_user_id && <span className="text-xs text-neutral-400">(user #{r.reporter_user_id})</span>}
                    </div>
                  </div>
                  {r.target?.vendor_id && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Vendor page</div>
                      <a href={`/vendor/${r.target.vendor_id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        Open on website <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {r.status !== "pending" && (
                    <div className={r.target?.vendor_id ? "" : "md:col-span-2"}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Admin notes</div>
                      <div className="text-neutral-700">
                        {r.admin_notes || <span className="text-neutral-400">—</span>}
                        {r.resolved_at && <span className="text-xs text-neutral-400 ml-2">({formatDate(r.resolved_at)})</span>}
                      </div>
                    </div>
                  )}
                </div>

                {canWrite && (
                  <div className="flex flex-wrap gap-2 pt-3 mt-4 border-t border-neutral-100">
                    {r.status === "pending" ? (
                      <>
                        <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" disabled={r.target && !r.target.exists} onClick={() => takeDown(r)}>
                          <ShieldAlert size={14} /> Take down
                        </button>
                        <button type="button" className="admin-btn admin-btn-success admin-btn-sm" onClick={() => setNoteFor({ report: r, status: "resolved", notes: r.admin_notes || "" })}>
                          <CircleCheck size={14} /> Resolve
                        </button>
                        <button type="button" className="admin-btn admin-btn-sm" onClick={() => setNoteFor({ report: r, status: "dismissed", notes: r.admin_notes || "" })}>
                          <CircleSlash size={14} /> Dismiss
                        </button>
                      </>
                    ) : (
                      <button type="button" className="admin-btn admin-btn-sm" onClick={() => reopen(r)}>
                        <RotateCcw size={14} /> Reopen
                      </button>
                    )}
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm ml-auto" onClick={() => remove(r)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!noteFor}
        onClose={() => setNoteFor(null)}
        busy={busy}
        size="sm"
        title={noteFor?.status === "dismissed" ? "Dismiss report" : "Resolve report"}
        subtitle={noteFor?.status === "dismissed" ? "No action needed - the content stays as it is." : "Mark as handled (e.g. you fixed the vendor details)."}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setNoteFor(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="report-note" className={`admin-btn ${noteFor?.status === "dismissed" ? "admin-btn-primary" : "admin-btn-brand"}`} disabled={busy}>
              {busy ? "Saving..." : noteFor?.status === "dismissed" ? "Dismiss" : "Resolve"}
            </button>
          </>
        }
      >
        {noteFor && (
          <form id="report-note" className="admin-form" onSubmit={submitStatus}>
            <Field label="Admin note (optional)" hint="Only visible to staff.">
              <textarea className="admin-textarea" rows={3} value={noteFor.notes} onChange={(e) => setNoteFor({ ...noteFor, notes: e.target.value })} placeholder="e.g. Updated the opening hours" />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
