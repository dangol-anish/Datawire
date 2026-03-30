"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type HomeTab = "your" | "shared";

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
  const PAGE_SIZE = 8;
  const [newOpen, setNewOpen] = useState(false);
  const [tab, setTab] = useState<HomeTab>(() => {
    if (pipelines.length > 0) return "your";
    if (sharedPipelines.length > 0) return "shared";
    return "your";
  });
  const [yourPage, setYourPage] = useState(1);
  const [sharedPage, setSharedPage] = useState(1);

  const headerLabel = useMemo(() => {
    return user?.name || user?.email || "Account";
  }, [user?.name, user?.email]);

  const totalYourPages = Math.max(1, Math.ceil(pipelines.length / PAGE_SIZE));
  const totalSharedPages = Math.max(
    1,
    Math.ceil(sharedPipelines.length / PAGE_SIZE),
  );

  const yourPageClamped = Math.min(Math.max(1, yourPage), totalYourPages);
  const sharedPageClamped = Math.min(Math.max(1, sharedPage), totalSharedPages);

  const yourPipelinesPage = useMemo(() => {
    const start = (yourPageClamped - 1) * PAGE_SIZE;
    return pipelines.slice(start, start + PAGE_SIZE);
  }, [pipelines, yourPageClamped]);

  const sharedPipelinesPage = useMemo(() => {
    const start = (sharedPageClamped - 1) * PAGE_SIZE;
    return sharedPipelines.slice(start, start + PAGE_SIZE);
  }, [sharedPipelines, sharedPageClamped]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("dw_home_tab");
      if (stored === "your" || stored === "shared") {
        setTab(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("dw_home_tab", tab);
    } catch {
      // ignore
    }
  }, [tab]);

  useEffect(() => {
    if (yourPage !== yourPageClamped) setYourPage(yourPageClamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourPageClamped]);

  useEffect(() => {
    if (sharedPage !== sharedPageClamped) setSharedPage(sharedPageClamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPageClamped]);

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

  useEffect(() => {
    if (!newOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newOpen]);

  return (
    <main className="min-h-screen bg-canvas text-white">
      <div
        className="sticky top-0 z-40"
        style={{ background: "#0d0f14", borderBottom: "1px solid #1e2330" }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 sm:py-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:h-14">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#6366f1" }}
                title="Home"
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
                <div className="text-sm font-semibold text-white truncate">
                  Datawire
                </div>
                <div className="text-xs text-slate-400 truncate">
                  Pipelines for {headerLabel}
                </div>
              </div>
            </Link>

            <div className="flex-1" />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNewOpen(true)}
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-center">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setTab("your")}
              className={clsx(
                "px-3 h-9 rounded-lg text-sm font-semibold transition-colors",
                tab === "your"
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/5",
              )}
            >
              Your pipelines{" "}
              <span className="ml-1 text-xs text-slate-400">
                {pipelines.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("shared")}
              className={clsx(
                "px-3 h-9 rounded-lg text-sm font-semibold transition-colors",
                tab === "shared"
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/5",
              )}
            >
              Shared with you{" "}
              <span className="ml-1 text-xs text-slate-400">
                {sharedPipelines.length}
              </span>
            </button>
          </div>
        </div>

        {tab === "your" &&
          (pipelines.length === 0 ? (
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
              {yourPipelinesPage.map((p) => (
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
          ))}

        {tab === "your" && pipelines.length > 0 && totalYourPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setYourPage((p) => Math.max(1, p - 1))}
              disabled={yourPageClamped <= 1}
              className="h-9 px-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="text-sm text-slate-400">
              Page {yourPageClamped} of {totalYourPages}
            </div>
            <button
              type="button"
              onClick={() =>
                setYourPage((p) => Math.min(totalYourPages, p + 1))
              }
              disabled={yourPageClamped >= totalYourPages}
              className="h-9 px-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {tab === "shared" &&
          (sharedPipelines.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10">
              <h2 className="text-lg font-semibold">No shared pipelines</h2>
              <p className="text-sm text-slate-400 mt-1">
                Pipelines others share with you will show up here.
              </p>
            </div>
          ) : (
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sharedPipelinesPage.map((p) => (
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
          ))}

        {tab === "shared" &&
          sharedPipelines.length > 0 &&
          totalSharedPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSharedPage((p) => Math.max(1, p - 1))}
                disabled={sharedPageClamped <= 1}
                className="h-9 px-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="text-sm text-slate-400">
                Page {sharedPageClamped} of {totalSharedPages}
              </div>
              <button
                type="button"
                onClick={() =>
                  setSharedPage((p) => Math.min(totalSharedPages, p + 1))
                }
                disabled={sharedPageClamped >= totalSharedPages}
                className="h-9 px-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}

        {newOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setNewOpen(false);
            }}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-border bg-surface overflow-hidden"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
            >
              <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-white">
                    New pipeline
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Start from scratch or use an example template.
                  </p>
                </div>
                <button
                  type="button"
                  className="h-5 w-5  text-slate-300 hover:text-white  transition-colors"
                  onClick={() => setNewOpen(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setNewOpen(false);
                      await createPipeline();
                    }}
                    disabled={creating}
                    className={clsx(
                      "h-8 px-3 rounded-lg text-sm font-semibold transition-colors",
                      creating
                        ? "bg-indigo-700/70 text-white/90 cursor-not-allowed"
                        : "bg-accent hover:bg-indigo-700 text-white",
                    )}
                  >
                    {creating ? "Creating…" : "Create a Blank Pipeline"}
                  </button>
                </div>

                {templates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Example templates
                      </h4>
                      <span className="text-xs text-slate-500">
                        {templates.length} available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {templates.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-border bg-[#0b0d12] p-3 flex flex-col gap-3"
                        >
                          <div className="min-w-0 h-12">
                            <p className="text-sm font-semibold text-white truncate">
                              {t.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {t.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-600">
                              {t.graph_json.nodes.length} nodes
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setNewOpen(false);
                                await createFromTemplate(t.id);
                              }}
                              disabled={templateBusy !== null}
                              className={clsx(
                                "h-8 px-3 rounded-md text-xs font-semibold transition-colors border",
                                templateBusy === t.id
                                  ? "bg-emerald-600/60 border-emerald-500/40 text-white/90 cursor-not-allowed"
                                  : "bg-emerald-600 border-emerald-500/40 hover:bg-emerald-500 text-white",
                              )}
                            >
                              {templateBusy === t.id
                                ? "Creating…"
                                : "Use template"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
