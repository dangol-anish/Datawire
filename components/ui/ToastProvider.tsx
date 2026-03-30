"use client";

import React from "react";
import clsx from "clsx";
import { LuCircleCheck, LuInfo, LuTriangleAlert, LuX } from "react-icons/lu";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  createdAt: number;
  durationMs: number;
};

type ToastContextValue = {
  push: (input: Omit<Toast, "id" | "createdAt">) => void;
  success: (message: string, opts?: { title?: string; durationMs?: number }) => void;
  error: (message: string, opts?: { title?: string; durationMs?: number }) => void;
  info: (message: string, opts?: { title?: string; durationMs?: number }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function randomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback((input: Omit<Toast, "id" | "createdAt">) => {
    const id = randomId();
    const toast: Toast = {
      id,
      createdAt: Date.now(),
      ...input,
    };
    setToasts((prev) => [toast, ...prev].slice(0, 5));

    window.setTimeout(() => remove(id), toast.durationMs);
  }, [remove]);

  const api = React.useMemo<ToastContextValue>(() => {
    return {
      push,
      success: (message, opts) =>
        push({
          variant: "success",
          message,
          title: opts?.title,
          durationMs: opts?.durationMs ?? 2600,
        }),
      error: (message, opts) =>
        push({
          variant: "error",
          message,
          title: opts?.title ?? "Error",
          durationMs: opts?.durationMs ?? 4200,
        }),
      info: (message, opts) =>
        push({
          variant: "info",
          message,
          title: opts?.title,
          durationMs: opts?.durationMs ?? 3000,
        }),
    };
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const icon =
            t.variant === "success" ? (
              <LuCircleCheck size={16} className="text-emerald-300" />
            ) : t.variant === "error" ? (
              <LuTriangleAlert size={16} className="text-red-300" />
            ) : (
              <LuInfo size={16} className="text-indigo-200" />
            );

          return (
            <div
              key={t.id}
              className={clsx(
                "w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border px-4 py-3",
                "bg-[#0d0f14] border-[#1e2330] shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{icon}</div>
                <div className="min-w-0 flex-1">
                  {t.title && (
                    <div className="text-sm font-semibold text-white">
                      {t.title}
                    </div>
                  )}
                  <div className="text-sm text-slate-300 break-words">
                    {t.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
                  title="Dismiss"
                >
                  <LuX size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider />");
  }
  return ctx;
}

