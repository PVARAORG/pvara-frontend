import React, { createContext, useContext, useState, useEffect } from 'react';

const ToastCtx = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== t.id));
      }, t.duration || 4000)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [toasts]);

  function addToast(message, opts = {}) {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast = { id, message, type: opts.type || 'info', duration: opts.duration || 4000 };
    setToasts((s) => [toast, ...s]);
    return id;
  }

  function removeToast(id) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  return (
    <ToastCtx.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex" role="status" aria-live="polite">
            <div
              className={
                `min-w-[220px] px-3 py-2 rounded shadow-md text-slate-900 flex items-start justify-between gap-2 ` +
                (t.type === 'error' ? 'bg-red-100' : t.type === 'success' ? 'bg-green-50' : 'bg-sky-50')
              }
            >
              <div className="flex-1 text-sm">{t.message}</div>
              <button className="ml-2 text-sm text-slate-600" onClick={() => removeToast(t.id)} aria-label="dismiss">×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

export default ToastCtx;
