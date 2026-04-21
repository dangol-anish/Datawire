"use client";

import React, { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LuChrome,
  LuGithub,
  LuKeyRound,
  LuLock,
  LuMail,
  LuShieldCheck,
  LuSparkles,
  LuUser,
  LuWorkflow,
} from "react-icons/lu";
import { useToast } from "./ToastProvider";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function friendlyAuthError(code: string | null) {
  if (!code) return null;
  switch (code) {
    case "CredentialsSignin":
      return "Invalid email or password.";
    case "OAuthAccountNotLinked":
      return "This email is already linked to a different sign-in method.";
    case "AccessDenied":
      return "Access denied. Please try another account.";
    case "Configuration":
      return "Authentication is misconfigured. Contact an admin.";
    default:
      return "Sign in failed. Please try again.";
  }
}

export function AuthPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  const allowSignup = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_SIGNUP === "true";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    const msg = friendlyAuthError(errorParam);
    if (msg) setError(msg);
    // Consume the URL error param so it doesn't persist across refreshes.
    if (errorParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [errorParam, pathname, router, searchParams]);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (mode === "signup" && password.length < 8) return false;
    return true;
  }, [email, password, mode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    if (mode === "signup" && !allowSignup) {
      setError("Email/password signup is disabled.");
      return;
    }

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
        redirect: false,
      });

      if ((resp as any)?.error) {
        const msg = friendlyAuthError((resp as any)?.error) ?? (resp as any).error;
        throw new Error(msg);
      }

      // Show success toast
      if (mode === "signup") {
        toast.success("Account created successfully! Welcome to Datawire.");
      } else {
        toast.success("Welcome back! You're now signed in.");
      }

      // Avoid a flash of the logged-out marketing landing page by doing a hard
      // navigation after the session cookie is set.
      window.location.assign(callbackUrl);
    } catch (err: any) {
      setError(typeof err?.message === "string" ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="w-[980px] max-w-[94vw] overflow-hidden rounded-2xl"
      style={{
        border: "1px solid #1e2330",
        background: "rgba(13,15,20,0.88)",
        boxShadow: "0 30px 120px rgba(0,0,0,0.65)",
      }}
    >
      <div className="grid lg:grid-cols-2">
        {/* Brand / value prop */}
        <div
          className="hidden lg:flex flex-col justify-between p-10"
          style={{
            background:
              "radial-gradient(900px 420px at 0% 0%, rgba(99,102,241,0.25) 0%, rgba(13,15,20,0) 60%), radial-gradient(700px 420px at 80% 30%, rgba(34,197,94,0.12) 0%, rgba(13,15,20,0) 60%)",
            borderRight: "1px solid #1e2330",
          }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#6366f1" }}
              >
                <LuWorkflow size={18} color="white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Datawire</p>
                <p className="text-xs text-slate-400">
                  Visual data pipelines in your browser
                </p>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <div className="flex items-start gap-3">
                <LuSparkles className="text-indigo-300 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Build pipelines visually
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload or fetch data, transform it, and chart it with nodes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LuKeyRound className="text-emerald-300 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Share & collaborate
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Public views, invites, access requests, and live editing.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LuShieldCheck className="text-slate-300 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Safe by default
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    URL fetches are proxied with SSRF protections and size limits.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Tip: Use the `CSV → Chart` template to get started fast.
          </p>
        </div>

        {/* Auth form */}
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#6366f1" }}
            >
              <LuWorkflow size={18} color="white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Datawire</p>
              <p className="text-xs text-slate-400">
                Visual data pipelines in your browser
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {mode === "signup" ? "Create your account" : "Sign in"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {mode === "signup"
                  ? "Start building pipelines in minutes."
                  : "Welcome back — pick a method below."}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
            {/* Keep consistent layout height between Sign in / Sign up */}
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-opacity ${
                mode === "signup" ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ background: "#0d0f14", border: "1px solid #2a3347" }}
              aria-hidden={mode !== "signup"}
            >
              <LuUser size={16} className="text-slate-500" aria-hidden="true" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full bg-transparent text-sm text-white outline-none"
                autoComplete="name"
                disabled={mode !== "signup"}
                tabIndex={mode === "signup" ? 0 : -1}
              />
            </div>

            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "#0d0f14", border: "1px solid #2a3347" }}
            >
              <LuMail size={16} className="text-slate-500" aria-hidden="true" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="w-full bg-transparent text-sm text-white outline-none"
                autoComplete="email"
                required
              />
            </div>

            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "#0d0f14", border: "1px solid #2a3347" }}
            >
              <LuLock size={16} className="text-slate-500" aria-hidden="true" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Password (min 8 chars)" : "Password"}
                type="password"
                className="w-full bg-transparent text-sm text-white outline-none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>

            {/* Reserve space so the layout doesn't jump when an error appears */}
            <div className="min-h-[44px]">
              <div
                aria-live="polite"
                className={`text-sm px-3 py-2 rounded-lg transition-opacity ${
                  error ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#fecaca",
                }}
              >
                {error ?? " "}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              style={{
                background: busy || !canSubmit ? "#1f2937" : "#6366f1",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {busy ? (
                "Please wait…"
              ) : mode === "signup" ? (
                <>
                  <LuKeyRound size={16} aria-hidden="true" />
                  Create account
                </>
              ) : (
                <>
                  <LuKeyRound size={16} aria-hidden="true" />
                  Sign in
                </>
              )}
            </button>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {mode === "signup"
                  ? "Already have an account?"
                  : "New to Datawire?"}
              </p>
              {allowSignup ? (
                <button
                  type="button"
                  onClick={() =>
                    setMode((m) => (m === "signup" ? "signin" : "signup"))
                  }
                  className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                  title={
                    mode === "signup" ? "Switch to sign in" : "Switch to sign up"
                  }
                >
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              ) : mode === "signin" ? (
                <span
                  className="text-xs text-slate-600"
                  title="Email/password signup is disabled"
                >
                  Sign up disabled
                </span>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-sm"
            >
              <LuChrome size={18} aria-hidden="true" />
              Google
            </button>
            <button
              onClick={() => signIn("github", { callbackUrl })}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-sm"
            >
              <LuGithub size={18} aria-hidden="true" />
              GitHub
            </button>
          </div>

          <p className="text-[11px] text-slate-600 mt-6">
            By continuing, you agree to your organization’s policies.
          </p>
        </div>
      </div>
    </div>
  );
}
