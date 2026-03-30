"use client";

import React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LuArrowLeft, LuLogOut, LuUser } from "react-icons/lu";

export function AccountClient({
  user,
}: {
  user: { id?: string; name?: string | null; email?: string | null };
}) {
  return (
    <main className="min-h-screen bg-canvas text-white">
      <div
        className="sticky top-0 z-40"
        style={{ background: "#0d0f14", borderBottom: "1px solid #1e2330" }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-14 flex items-center gap-3">
            <Link
              href="/"
              className="h-9 w-9 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-colors flex items-center justify-center"
              title="Back to home"
            >
              <LuArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <LuUser size={18} className="text-indigo-300" />
              <div className="text-sm font-semibold text-white">Account</div>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="h-9 px-3 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center gap-2"
            >
              <LuLogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-xs text-slate-500">Name</div>
          <div className="text-base font-semibold text-white mt-1">
            {user.name || "—"}
          </div>

          <div className="mt-5 text-xs text-slate-500">Email</div>
          <div className="text-base font-semibold text-white mt-1">
            {user.email || "—"}
          </div>

          <div className="mt-5 text-xs text-slate-500">User ID</div>
          <div className="text-sm font-mono text-slate-300 mt-1 break-all">
            {user.id || "—"}
          </div>
        </div>
      </div>
    </main>
  );
}

