"use client";

import React, { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthPanel() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (mode === "signup" && password.length < 8) return false;
    return true;
  }, [email, password, mode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || null,
            email: email.trim(),
            password,
          }),
        });
        const body = await safeJson(res);
        if (!res.ok) {
          throw new Error(body?.error ?? "Sign up failed");
        }
      }

      const resp = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: true,
      });

      // If redirect=false, we'd handle errors here. With redirect=true, NextAuth navigates.
      if ((resp as any)?.error) throw new Error((resp as any).error);
    } catch (err: any) {
      setError(typeof err?.message === "string" ? err.message : "Auth failed");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-10 flex flex-col items-center gap-6 w-96 max-w-[92vw]">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Datawire</h1>
        <p className="text-sm text-gray-400 mt-1">
          Build visual data pipelines that run in your browser.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={() => setMode("signin")}
          className={`h-9 rounded-lg text-sm font-semibold border transition-colors ${
            mode === "signin"
              ? "bg-white/10 border-white/15 text-white"
              : "bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`h-9 rounded-lg text-sm font-semibold border transition-colors ${
            mode === "signup"
              ? "bg-white/10 border-white/15 text-white"
              : "bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
        {mode === "signup" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: "#0d0f14", border: "1px solid #2a2d3a" }}
            autoComplete="name"
          />
        )}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ background: "#0d0f14", border: "1px solid #2a2d3a" }}
          autoComplete="email"
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            mode === "signup" ? "Password (min 8 chars)" : "Password"
          }
          type="password"
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ background: "#0d0f14", border: "1px solid #2a2d3a" }}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="w-full bg-accent hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-slate-500">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="w-full flex flex-col gap-2">
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 border border-white/10 hover:border-white/20"
        >
          Continue with Google
        </button>
        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 border border-white/10 hover:border-white/20"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
