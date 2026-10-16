"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, Globe, Inbox, Mail, MailOpen, RefreshCw, Reply, Smartphone, Trash2, User } from "lucide-react";
import { adminFetch, formatDateTime, timeAgo } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Loading, PageHeader, ReadOnlyNote, SearchInput, StatusBadge, Tabs } from "../components/ui";

function SourceBadge({ source }) {
  const app = source === "app";
  return (
    <span className={`admin-badge ${app ? "app" : "web"}`}>
      {app ? <Smartphone size={11} /> : <Globe size={11} />} {app ? "App" : "Website"}
    </span>
  );
}

export default function AdminInbox() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refreshCounts } = useAdmin();
  const canWrite = useCan("inbox");

  const [status, setStatus] = useState("all");
  const [messages, setMessages] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const detailRef = useRef(null);

  const load = useCallback(async (s, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await adminFetch(`/inbox?status=${s}`);
      setMessages(data.messages || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => [m.name, m.email, m.subject, m.message].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [messages, search]);

  const selected = messages.find((m) => m.id === selectedId) || null;

  const applyStatus = (msg, next) => {
    setMessages((list) => list.map((m) => (m.id === msg.id ? { ...m, status: next } : m)));
    setCounts((c) => ({ ...c, [msg.status]: Math.max(0, (c[msg.status] || 0) - 1), [next]: (c[next] || 0) + 1 }));
  };

  const updateStatus = async (msg, next, { silent = false } = {}) => {
    if (msg.status === next) return;
    applyStatus(msg, next);
    try {
      await adminFetch(`/inbox/${msg.id}`, { method: "PUT", body: { status: next } });
      if (!silent) toast.success(next === "resolved" ? "Marked as resolved" : next === "unread" ? "Marked as unread" : "Marked as read");
      refreshCounts();
    } catch (err) {
      applyStatus({ ...msg, status: next }, msg.status);
      toast.error(err.message);
    }
  };

  const select = (msg) => {
    setSelectedId(msg.id);
    if (msg.status === "unread" && canWrite) updateStatus(msg, "read", { silent: true });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const remove = async (msg) => {
    const ok = await confirm({ title: "Delete message?", message: `The message from ${msg.name} will be permanently deleted.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      const res = await adminFetch(`/inbox/${msg.id}`, { method: "DELETE" });
      toast.success(res.message || "Message deleted");
      setSelectedId(null);
      load(status, { quiet: true });
      refreshCounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const allCount = (counts.unread || 0) + (counts.read || 0) + (counts.resolved || 0);
  const tabs = [
    { value: "all", label: "All", count: allCount },
    { value: "unread", label: "Unread", count: counts.unread || 0 },
    { value: "read", label: "Read", count: counts.read || 0 },
    { value: "resolved", label: "Resolved", count: counts.resolved || 0 },
  ];

  const replyHref = (m) => `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message to HungryBird"}`)}&body=${encodeURIComponent(`\n\n---\nOn ${formatDateTime(m.created_at)}, ${m.name} wrote:\n> ${(m.message || "").slice(0, 1200).split("\n").join("\n> ")}`)}`;

  return (
    <div>
      <PageHeader title="Support Inbox" subtitle="Messages from the website contact form and the app's help screen.">
        <button type="button" className="admin-btn" onClick={() => load(status)} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>
      <ReadOnlyNote area="inbox" />

      <Tabs tabs={tabs} value={status} onChange={(s) => { setStatus(s); setSelectedId(null); }} />

      <ErrorBanner message={error} onRetry={() => load(status)} />

      <div className="admin-split">
        <div className="admin-split-list">
          <div className="p-3 border-b border-neutral-100 sticky top-0 bg-white z-10">
            <SearchInput value={search} onChange={setSearch} placeholder="Search messages..." />
          </div>
          {loading ? (
            <Loading label="Loading messages..." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Inbox} title={search ? "No messages match" : status === "unread" ? "No unread messages" : "Inbox is empty"} message={!search && status === "unread" ? "You're all caught up." : undefined} />
          ) : (
            filtered.map((m) => (
              <button key={m.id} type="button" className={`admin-split-item ${m.status === "unread" ? "unread" : ""} ${m.id === selectedId ? "selected" : ""}`} onClick={() => select(m)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="admin-split-title flex items-center gap-2">
                    {m.status === "unread" && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                    {m.name}
                  </span>
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">{timeAgo(m.created_at)}</span>
                </div>
                <div className={`text-sm truncate mt-0.5 ${m.status === "unread" ? "text-neutral-900 font-semibold" : "text-neutral-700"}`}>{m.subject || "(no subject)"}</div>
                <div className="text-xs text-neutral-500 truncate mt-0.5">{m.message}</div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <SourceBadge source={m.source} />
                  {m.status === "resolved" && <StatusBadge status="resolved" />}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="admin-split-detail" ref={detailRef}>
          {!selected ? (
            <EmptyState icon={Mail} title="Select a message" message="Choose a message from the list to read and reply to it." />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-neutral-900 m-0 leading-snug">{selected.subject || "(no subject)"}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={selected.status} />
                    <SourceBadge source={selected.source} />
                    <span className="text-xs text-neutral-500">{formatDateTime(selected.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                <div className="admin-avatar">{(selected.name || "?").charAt(0)}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                    {selected.name}
                    {selected.user_id && (
                      <span className="admin-badge neutral" title="Sent by a signed-in user">
                        <User size={11} /> User #{selected.user_id}
                      </span>
                    )}
                  </div>
                  <a href={`mailto:${selected.email}`} className="text-xs text-blue-600 hover:underline break-all">
                    {selected.email}
                  </a>
                </div>
              </div>

              <div className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed break-words">{selected.message}</div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
                <a href={replyHref(selected)} className="admin-btn admin-btn-brand">
                  <Reply size={15} /> Reply by email
                </a>
                {canWrite && (
                  <>
                    {selected.status !== "resolved" ? (
                      <button type="button" className="admin-btn admin-btn-success" onClick={() => updateStatus(selected, "resolved")}>
                        <CircleCheck size={15} /> Mark resolved
                      </button>
                    ) : (
                      <button type="button" className="admin-btn" onClick={() => updateStatus(selected, "read")}>
                        <MailOpen size={15} /> Reopen
                      </button>
                    )}
                    {selected.status !== "unread" && (
                      <button type="button" className="admin-btn" onClick={() => updateStatus(selected, "unread")}>
                        <Mail size={15} /> Mark unread
                      </button>
                    )}
                    <button type="button" className="admin-btn admin-btn-ghost !text-rose-600 ml-auto" onClick={() => remove(selected)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
