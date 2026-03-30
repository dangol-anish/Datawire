"use client";

import React from "react";
import clsx from "clsx";
import { LuTriangleAlert } from "react-icons/lu";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  dangerous?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const close = React.useCallback((value: boolean) => {
    setOpen(false);
    const r = resolveRef.current;
    resolveRef.current = null;
    window.setTimeout(() => {
      setOpts(null);
    }, 0);
    r?.(value);
  }, []);

  const confirm = React.useCallback((next: ConfirmOptions) => {
    setOpts(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && opts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close(false);
            }}
          />
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "#0d0f14",
              border: "1px solid #1e2330",
              boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
            }}
          >
            <div className="px-5 py-4 border-b border-[#1e2330] flex items-start gap-3">
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  opts.dangerous ? "bg-red-500/10" : "bg-indigo-500/10",
                )}
              >
                <LuTriangleAlert
                  size={18}
                  className={opts.dangerous ? "text-red-300" : "text-indigo-200"}
                />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-white">
                  {opts.title}
                </div>
                {opts.description && (
                  <div className="text-sm text-slate-400 mt-1">
                    {opts.description}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="h-9 px-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                {opts.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={clsx(
                  "h-9 px-3 rounded-xl text-sm font-semibold text-white transition-all",
                  opts.dangerous ? "hover:brightness-110" : "hover:brightness-110",
                )}
                style={{
                  background: opts.dangerous
                    ? "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.65))"
                    : "linear-gradient(90deg, #a3a6ff, #8387ff)",
                }}
              >
                {opts.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider />");
  }
  return ctx.confirm;
}

