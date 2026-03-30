"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import type { PipelineTemplate } from "@/lib/pipelineTemplates";

type PipelineRow = {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
};

type SharedPipelineRow = PipelineRow & {
  role: "viewer" | "editor";
  user_id?: string;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function HomeClient({
  pipelines,
  sharedPipelines,
  templates,
  user,
}: {
  pipelines: PipelineRow[];
  sharedPipelines: SharedPipelineRow[];
  templates: PipelineTemplate[];
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [templateBusy, setTemplateBusy] = useState<string | null>(null);

  const headerLabel = useMemo(() => {
    return user?.name || user?.email || "Account";
  }, [user?.name, user?.email]);

  const createPipeline = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/pipelines", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to create pipeline");
      }
      router.push(`/editor/${body.id}`);
    } finally {
      setCreating(false);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    if (templateBusy) return;
    setTemplateBusy(templateId);
    try {
      const res = await fetch(`/api/pipelines/templates/${templateId}`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to create pipeline");
      router.push(`/editor/${body.id}`);
    } finally {
      setTemplateBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#6366f1" }}
            >
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <circle cx="3" cy="7" r="2" fill="white" />
                <circle cx="11" cy="3" r="2" fill="white" />
                <circle cx="11" cy="11" r="2" fill="white" />
                <line
                  x1="5"
                  y1="6.5"
                  x2="9"
                  y2="3.5"
                  stroke="white"
                  strokeWidth="1.2"
                />
                <line
                  x1="5"
                  y1="7.5"
                  x2="9"
                  y2="10.5"
                  stroke="white"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">Datawire</h1>
              <p className="text-xs text-slate-400 truncate">
                Pipelines for {headerLabel}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          <button
            onClick={createPipeline}
            className={clsx(
              "h-9 px-4 rounded-lg text-sm font-semibold transition-colors",
              creating
                ? "bg-indigo-700/70 text-white/90 cursor-not-allowed"
                : "bg-accent hover:bg-indigo-500 text-white",
            )}
            disabled={creating}
            title="Create a new pipeline"
          >
            {creating ? "Creating…" : "New pipeline"}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-9 px-4 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            title="Sign out"
          >
            Sign out
          </button>
        </header>

        {templates.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Example pipelines
              </h2>
              <p className="text-xs text-slate-500">
                Start from a working graph and tweak it.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mt-1 justify-between gap-2">
                    <span className="text-[11px] text-slate-600">
                      {t.graph_json.nodes.length} nodes
                    </span>
                    <button
                      onClick={() => createFromTemplate(t.id)}
                      disabled={templateBusy !== null}
                      className={clsx(
                        "h-8 px-3 rounded-md text-xs font-semibold transition-colors border",
                        templateBusy === t.id
                          ? "bg-emerald-600/60 border-emerald-500/40 text-white/90 cursor-not-allowed"
                          : "bg-emerald-600 border-emerald-500/40 hover:bg-emerald-500 text-white",
                      )}
                    >
                      {templateBusy === t.id ? "Creating…" : "Use template"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200">Your pipelines</h2>
        </div>

        {pipelines.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10">
            <h2 className="text-lg font-semibold">No pipelines yet</h2>
            <p className="text-sm text-slate-400 mt-1">
              Create your first pipeline, then open it in the editor.
            </p>
            <div className="mt-6">
              <button
                onClick={createPipeline}
                className="h-10 px-5 rounded-lg bg-accent hover:bg-indigo-500 text-white font-semibold transition-colors"
                disabled={creating}
              >
                {creating ? "Creating…" : "Create pipeline"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pipelines.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Updated {formatDate(p.updated_at ?? p.created_at)}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0 text-slate-400"
                    title={
                      p.is_public
                        ? "Anyone with the link can view"
                        : "Only invited collaborators can view"
                    }
                  >
                    {p.is_public ? "Public" : "Private"}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 mt-2 ">
                  <Link
                    href={`/p/${p.id}`}
                    className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                    title="Open share view (requires pipeline to be public)"
                  >
                    Shared view
                  </Link>

                  <Link
                    href={`/editor/${p.id}`}
                    className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                  >
                    Open editor
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {sharedPipelines.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Shared with you
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sharedPipelines.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Updated {formatDate(p.updated_at ?? p.created_at)}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0 text-slate-400"
                      title={
                        p.role === "editor"
                          ? "You can edit this pipeline"
                          : "Read-only access"
                      }
                    >
                      {p.role === "editor" ? "Editor" : "Viewer"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Link
                      href={`/p/${p.id}`}
                      className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                    >
                      Shared view
                    </Link>

                    <Link
                      href={
                        p.role === "editor" ? `/editor/${p.id}` : `/p/${p.id}`
                      }
                      className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                    >
                      {p.role === "editor" ? "Open editor" : "Open"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
