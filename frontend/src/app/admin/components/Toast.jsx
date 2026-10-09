"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CircleCheck, error: CircleX, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, duration) => {
      if (!message) return;
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-4), { id, type, message: String(message) }]);
      setTimeout(() => dismiss(id), duration ?? (type === "error" ? 6000 : 3500));
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (msg, ms) => push("success", msg, ms),
      error: (msg, ms) => push("error", msg?.message || msg, ms),
      info: (msg, ms) => push("info", msg, ms),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="admin-toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`admin-toast ${t.type}`}>
              <Icon size={18} className="shrink-0 mt-px" />
              <span className="admin-toast-msg">{t.message}</span>
              <button className="admin-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

const noop = () => {};
const fallback = { success: noop, error: noop, info: noop };

export function useToast() {
  return useContext(ToastContext) || fallback;
}
