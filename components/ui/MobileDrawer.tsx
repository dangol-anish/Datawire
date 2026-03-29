"use client";

import React, { useEffect } from "react";

export function MobileDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl overflow-hidden"
        style={{
          height: "min(78vh, 720px)",
          background: "#0d0f14",
          borderTop: "1px solid #1e2330",
          boxShadow: "0 -30px 90px rgba(0,0,0,0.75)",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 h-12"
          style={{ borderBottom: "1px solid #1e2330" }}
        >
          <div className="w-10 flex items-center justify-start">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4L4 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <div className="flex-1" />
          <div className="w-10" />
        </div>
        <div className="h-[calc(100%-48px)] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

