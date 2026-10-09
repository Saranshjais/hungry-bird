"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleX, Clapperboard, Eye, Trash2, User } from "lucide-react";
import { adminFetch, formatDate, formatDateTime } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Loading, PageHeader, ReadOnlyNote, StatusBadge, Tabs } from "../components/ui";

export default function AdminReels() {
  const toast = useToast();
  const confirm = useConfirm();
  const { counts, refreshCounts } = useAdmin();
  const canWrite = useCan("reels");

  const [status, setStatus] = useState("pending");
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (s, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await adminFetch(`/reels?status=${s}`);
      setReels(data.reels || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const act = async (reel, action) => {
    setBusyId(reel.id);
    try {
      await adminFetch(`/reels/${reel.id}/${action}`, { method: "POST" });
      toast.success(action === "approve" ? `"${reel.title}" approved - it is now live in the app` : `"${reel.title}" rejected`);
      load(status, { quiet: true });
      refreshCounts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (reel) => {
    const ok = await confirm({ title: "Delete reel?", message: `"${reel.title}" and its video file will be permanently deleted.`, confirmLabel: "Delete reel", danger: true });
    if (!ok) return;
    setBusyId(reel.id);
    try {
      await adminFetch(`/reels/${reel.id}`, { method: "DELETE" });
      toast.success("Reel deleted");
      load(status, { quiet: true });
      refreshCounts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { value: "pending", label: "Pending", count: counts.pending_reels ?? undefined },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
  ];

  return (
    <div>
      <PageHeader title="Video Reels" subtitle="Short food videos uploaded by users. Approved reels are shown in the app and on the website." />
      <ReadOnlyNote area="reels" />
      <Tabs tabs={tabs} value={status} onChange={setStatus} />
      <ErrorBanner message={error} onRetry={() => load(status)} />

      {loading ? (
        <Loading label="Loading reels..." />
      ) : reels.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Clapperboard} title={status === "pending" ? "No reels waiting for review" : `No ${status === "all" ? "" : status} reels`} message={status === "pending" ? "New uploads will appear here for approval." : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {reels.map((reel) => (
            <div key={reel.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ opacity: busyId === reel.id ? 0.6 : 1 }}>
              <div className="bg-neutral-900 aspect-[9/16] max-h-[460px] w-full flex items-center justify-center">
                <video src={reel.videoUrl} controls preload="metadata" playsInline className="w-full h-full object-contain" />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-neutral-900 text-sm m-0 leading-snug line-clamp-2">{reel.title || "Untitled reel"}</h3>
                  <StatusBadge status={reel.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <User size={12} /> {reel.author_name || "Anonymous"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {reel.views} views
                  </span>
                  <span title={formatDateTime(reel.created_at)}>{formatDate(reel.created_at)}</span>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2 pt-3 mt-auto border-t border-neutral-100">
                    {reel.status !== "approved" && (
                      <button type="button" className="admin-btn admin-btn-success admin-btn-sm" disabled={busyId === reel.id} onClick={() => act(reel, "approve")}>
                        <CircleCheck size={14} /> Approve
                      </button>
                    )}
                    {reel.status !== "rejected" && (
                      <button type="button" className="admin-btn admin-btn-danger-soft admin-btn-sm" disabled={busyId === reel.id} onClick={() => act(reel, "reject")}>
                        <CircleX size={14} /> Reject
                      </button>
                    )}
                    <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn ml-auto !text-rose-600" title="Delete" disabled={busyId === reel.id} onClick={() => remove(reel)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
