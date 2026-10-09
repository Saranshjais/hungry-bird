"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";

/**
 * Generic modal. Renders into document.body so parent transforms never clip it.
 *   <Modal open title="Edit" onClose={...} footer={<buttons/>} size="sm|md|lg|xl" drawer>
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, size = "md", drawer = false, busy = false }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`admin-modal-backdrop ${drawer ? "admin-drawer-backdrop" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className={`admin-modal ${size} ${drawer ? "admin-drawer" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        {(title || onClose) && (
          <div className="admin-modal-header">
            <div className="min-w-0">
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---------- Confirm dialog ----------

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: "Are you sure?",
        message: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        danger: false,
        ...options,
      });
    });
  }, []);

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        size="sm"
        onClose={() => close(false)}
        title={
          state && (
            <span className="flex items-center gap-2">
              {state.danger && <TriangleAlert size={18} className="text-rose-600 shrink-0" />}
              {state.title}
            </span>
          )
        }
        footer={
          state && (
            <>
              <button type="button" className="admin-btn" onClick={() => close(false)}>
                {state.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                className={`admin-btn ${state.danger ? "admin-btn-danger" : "admin-btn-primary"}`}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </>
          )
        }
      >
        {state?.message && <div className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{state.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** const confirm = useConfirm(); if (!(await confirm({ title, message, danger: true }))) return; */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx || ((opts) => Promise.resolve(typeof window !== "undefined" ? window.confirm(opts?.message || opts?.title || "Are you sure?") : false));
}
