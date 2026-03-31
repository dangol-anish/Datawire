"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import type { PipelineTemplate } from "@/lib/pipelineTemplates";
import {
  LuChevronDown,
  LuEllipsisVertical,
  LuLogOut,
  LuPlus,
  LuSearch,
  LuStar,
  LuTrash2,
  LuUser,
  LuWorkflow,
  LuX,
} from "react-icons/lu";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  clearRecentPipelines,
  readPinnedPipelineIds,
  readRecentPipelines,
  removePinnedPipeline,
  removeRecentPipeline,
  recordRecentPipeline,
  setPinnedPipelineIds,
} from "@/lib/homeUiState";

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
type SortMode = "updated" | "name";

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
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [templateBusy, setTemplateBusy] = useState<string | null>(null);
  const PAGE_SIZE = 8;
  const [newOpen, setNewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recent, setRecent] = useState<
    Array<{ id: string; name: string; href: string; accessedAt: number }>
  >([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<HomeTab>(() => {
    if (pipelines.length > 0) return "your";
    if (sharedPipelines.length > 0) return "shared";
    return "your";
  });
  const [yourPage, setYourPage] = useState(1);
  const [sharedPage, setSharedPage] = useState(1);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const headerLabel = useMemo(() => {
    return user?.name || user?.email || "Account";
  }, [user?.name, user?.email]);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const togglePinned = (pipelineId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(pipelineId)
        ? prev.filter((id) => id !== pipelineId)
        : [pipelineId, ...prev];
      setPinnedPipelineIds(user.id, next);
      return next;
    });
  };

  const deletePipeline = async (pipelineId: string, pipelineName: string) => {
    if (deletingId) return;
    const ok = await confirm({
      title: "Delete pipeline?",
      description: `Delete “${pipelineName}”? This cannot be undone.`,
      confirmText: "Delete",
      dangerous: true,
    });
    if (!ok) return;

    setDeletingId(pipelineId);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body && typeof body.error === "string" && body.error) ||
            `Delete failed (${res.status})`,
        );
      }

      setRecent((prev) => {
        const next = prev.filter((p) => p.id !== pipelineId);
        try {
          return removeRecentPipeline(user.id, pipelineId);
        } catch {
          return next;
        }
      });
      setPinnedIds((prev) => {
        const next = prev.filter((id) => id !== pipelineId);
        try {
          return removePinnedPipeline(user.id, pipelineId);
        } catch {
          setPinnedPipelineIds(user.id, next);
          return next;
        }
      });

      router.refresh();
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const getUpdatedIso = (row: { updated_at?: string; created_at: string }) =>
    row.updated_at ?? row.created_at;

  const getUpdatedMs = (iso?: string) => {
    if (!iso) return 0;
    const d = new Date(iso);
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const cleanedQuery = query.trim().toLowerCase();

  const preparedOwned = useMemo(() => {
    const filtered = cleanedQuery
      ? pipelines.filter((p) => p.name.toLowerCase().includes(cleanedQuery))
      : pipelines.slice();

    filtered.sort((a, b) => {
      const ap = pinnedSet.has(a.id) ? 1 : 0;
      const bp = pinnedSet.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;

      if (sortMode === "name") return a.name.localeCompare(b.name);

      const at = getUpdatedMs(getUpdatedIso(a));
      const bt = getUpdatedMs(getUpdatedIso(b));
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [cleanedQuery, pinnedSet, pipelines, sortMode]);

  const preparedShared = useMemo(() => {
    const filtered = cleanedQuery
      ? sharedPipelines.filter((p) =>
          p.name.toLowerCase().includes(cleanedQuery),
        )
      : sharedPipelines.slice();

    filtered.sort((a, b) => {
      const ap = pinnedSet.has(a.id) ? 1 : 0;
      const bp = pinnedSet.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;

      if (sortMode === "name") return a.name.localeCompare(b.name);

      const at = getUpdatedMs(getUpdatedIso(a));
      const bt = getUpdatedMs(getUpdatedIso(b));
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [cleanedQuery, pinnedSet, sharedPipelines, sortMode]);

  const totalYourPages = Math.max(
    1,
    Math.ceil(preparedOwned.length / PAGE_SIZE),
  );
  const totalSharedPages = Math.max(
    1,
    Math.ceil(preparedShared.length / PAGE_SIZE),
  );

  const yourPageClamped = Math.min(Math.max(1, yourPage), totalYourPages);
  const sharedPageClamped = Math.min(Math.max(1, sharedPage), totalSharedPages);

  const yourPipelinesPage = useMemo(() => {
    const start = (yourPageClamped - 1) * PAGE_SIZE;
    return preparedOwned.slice(start, start + PAGE_SIZE);
  }, [preparedOwned, yourPageClamped]);

  const sharedPipelinesPage = useMemo(() => {
    const start = (sharedPageClamped - 1) * PAGE_SIZE;
    return preparedShared.slice(start, start + PAGE_SIZE);
  }, [preparedShared, sharedPageClamped]);

  const stats = useMemo(() => {
    const publicCount = pipelines.filter((p) => p.is_public).length;
    const all = [...pipelines, ...sharedPipelines];
    let newestIso: string | null = null;
    let newestMs = 0;
    for (const row of all) {
      const iso = getUpdatedIso(row);
      const t = getUpdatedMs(iso);
      if (t > newestMs) {
        newestMs = t;
        newestIso = iso;
      }
    }
    return {
      yourCount: pipelines.length,
      sharedCount: sharedPipelines.length,
      publicCount,
      newestIso,
    };
  }, [pipelines, sharedPipelines]);

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
    setPinnedIds(readPinnedPipelineIds(user.id));
    setRecent(readRecentPipelines(user.id));

    const refresh = () => setRecent(readRecentPipelines(user.id));
    window.addEventListener("focus", refresh);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user.id]);

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

  useEffect(() => {
    // When the query or sort changes, snap back to the first page.
    setYourPage(1);
    setSharedPage(1);
  }, [cleanedQuery, sortMode]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target))
        setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [menuOpen]);

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
                <LuWorkflow size={18} color="white" />
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
              <div
                className={clsx(
                  "h-9 rounded-xl border bg-surface overflow-hidden flex items-center transition-[width,border-color] duration-200",
                  "hover:border-white/20",
                  searchOpen ? "w-64" : "w-9",
                  query.trim().length > 0
                    ? "border-indigo-500/40"
                    : "border-white/10",
                )}
                role="search"
                aria-label="Search pipelines"
                onMouseDown={(e) => {
                  // Keep it feeling like a single expanding component.
                  // Prevent the container click from stealing focus from the input.
                  if (searchOpen && e.target instanceof HTMLElement) {
                    if (e.target.tagName.toLowerCase() === "input") return;
                  }
                  e.preventDefault();
                  setSearchOpen(true);
                }}
                title={searchOpen ? undefined : "Search"}
              >
                <button
                  type="button"
                  className={clsx(
                    "h-9 w-9 flex items-center justify-center transition-colors",
                    query.trim().length > 0
                      ? "text-indigo-300"
                      : "text-slate-300",
                    "hover:bg-white/5 hover:text-white",
                  )}
                  onClick={() => {
                    setSearchOpen(true);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Open search"
                >
                  <LuSearch size={16} />
                </button>

                {searchOpen && (
                  <>
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search…"
                      className="h-9 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setSearchOpen(false);
                        }
                      }}
                    />

                    {query.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <LuX size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSearchOpen(false)}
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Close search"
                        aria-label="Close search"
                      >
                        <LuX size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => setNewOpen(true)}
                className={clsx(
                  "h-9 w-9 rounded-xl text-sm font-semibold text-white hover:brightness-110 transition-all flex items-center justify-center",
                  creating
                    ? "bg-indigo-700/70 text-white/90 cursor-not-allowed"
                    : "",
                )}
                style={
                  creating
                    ? undefined
                    : {
                        background: "linear-gradient(90deg, #a3a6ff, #8387ff)",
                      }
                }
                disabled={creating}
                title="Create a new pipeline"
              >
                {creating ? (
                  <span className="text-xs">…</span>
                ) : (
                  <LuPlus size={18} />
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-9 w-9 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-colors flex items-center justify-center"
                  title="Menu"
                  aria-label="Menu"
                >
                  <LuEllipsisVertical size={18} />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden"
                    style={{
                      background: "#0d0f14",
                      border: "1px solid #1e2330",
                      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                    }}
                  >
                    <div className="px-3 py-3 border-b border-[#1e2330]">
                      <div className="text-xs text-slate-500">Signed in as</div>
                      <div className="text-sm font-semibold text-white truncate mt-0.5">
                        {user?.name || "Account"}
                      </div>
                      {user?.email && (
                        <div className="text-xs text-slate-500 truncate">
                          {user.email}
                        </div>
                      )}
                    </div>

                    <div className="p-1">
                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-slate-200 hover:bg-white/5 transition-colors"
                      >
                        <LuUser size={16} />
                        Account
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          void signOut({ callbackUrl: "/login" });
                        }}
                        className="w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-slate-200 hover:bg-white/5 transition-colors"
                      >
                        <LuLogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-slate-500">Your pipelines</div>
            <div className="text-xl font-semibold text-white mt-1">
              {stats.yourCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-slate-500">Shared with you</div>
            <div className="text-xl font-semibold text-white mt-1">
              {stats.sharedCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-slate-500">Public</div>
            <div className="text-xl font-semibold text-white mt-1">
              {stats.publicCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-slate-500">Last updated</div>
            <div className="text-sm font-semibold text-white mt-1 truncate">
              {stats.newestIso ? formatDate(stats.newestIso) : "—"}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setTab("your")}
              className={clsx(
                "px-2 h-7 rounded-lg text-sm  transition-colors",
                tab === "your"
                  ? "bg-white/10 text-white font-semibold"
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
                "px-3 h-9 rounded-lg text-sm  transition-colors",
                tab === "shared"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-white/5",
              )}
            >
              Shared with you{" "}
              <span className="ml-1 text-xs text-slate-400">
                {sharedPipelines.length}
              </span>
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 justify-end">
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-11 pl-3 pr-9 rounded-xl bg-surface border border-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
              >
                <option value="updated">Last updated</option>
                <option value="name">Name</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <LuChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Recently opened
              </h3>
              <button
                type="button"
                onClick={() => {
                  clearRecentPipelines(user.id);
                  setRecent([]);
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent
                .slice()
                .sort((a, b) => b.accessedAt - a.accessedAt)
                .map((r) => (
                  <Link
                    key={r.id}
                    href={r.href}
                    onClick={() => {
                      const next = recordRecentPipeline({
                        scope: user.id,
                        id: r.id,
                        name: r.name,
                        href: r.href,
                      });
                      setRecent(next);
                    }}
                    className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    {/* <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#6366f1" }}
                    /> */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {r.name}
                      </div>
                      {/* <div className="text-xs text-slate-500 truncate">
                        {r.href}
                      </div> */}
                    </div>
                    <span className="text-xs text-slate-400 hover:text-accent">
                      Open
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {tab === "your" &&
          (preparedOwned.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex  justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {query.trim().length > 0
                      ? "No matches"
                      : "No pipelines yet"}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {query.trim().length > 0
                      ? "Try a different search term."
                      : "Create your first pipeline, then open it in the editor."}
                  </p>
                </div>
                <div className="mt-1">
                  <button
                    onClick={createPipeline}
                    className={clsx(
                      "h-8 px-3 rounded-lg text-white text-sm font-semibold transition-all",
                      creating
                        ? "bg-indigo-700/70 text-white/90 cursor-not-allowed"
                        : "hover:brightness-110",
                    )}
                    style={
                      creating
                        ? undefined
                        : {
                            background:
                              "linear-gradient(90deg, #a3a6ff, #8387ff)",
                          }
                    }
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create pipeline"}
                  </button>
                </div>
              </div>

              {query.trim().length === 0 && templates.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-200">
                      Start from a template
                    </h3>
                    <button
                      type="button"
                      onClick={() => setNewOpen(true)}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Browse all
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {templates.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => void createFromTemplate(t.id)}
                        disabled={templateBusy !== null}
                        className="text-left rounded-2xl border border-border bg-[#0b0d12] p-4 hover:bg-white/5 transition-colors disabled:opacity-60"
                      >
                        <div className="text-sm font-semibold text-white truncate">
                          {t.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {t.description}
                        </div>
                        <div className="mt-3 text-[11px] text-slate-600">
                          {t.graph_json.nodes.length} nodes
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePinned(p.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                        title={
                          pinnedSet.has(p.id)
                            ? "Unpin pipeline"
                            : "Pin pipeline"
                        }
                        aria-label={
                          pinnedSet.has(p.id)
                            ? "Unpin pipeline"
                            : "Pin pipeline"
                        }
                      >
                        <LuStar
                          size={16}
                          color={
                            pinnedSet.has(p.id) ? "#6366F1" : "currentColor"
                          }
                          fill={pinnedSet.has(p.id) ? "#6366F1" : "none"}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePipeline(p.id, p.name)}
                        disabled={deletingId === p.id}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-300 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
                        title="Delete pipeline"
                        aria-label="Delete pipeline"
                      >
                        <LuTrash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className=" flex justify-between ">
                    <span
                      className="text-xs font-medium  py-1 rounded-md text-slate-400 flex items-end"
                      title={
                        p.is_public
                          ? "Anyone with the link can view"
                          : "Only invited collaborators can view"
                      }
                    >
                      {p.is_public ? "Public" : "Private"}
                    </span>
                    <div className="flex items-center justify-end gap-2 mt-2 ">
                      <Link
                        href={`/p/${p.id}`}
                        onClick={() => {
                          const next = recordRecentPipeline({
                            scope: user.id,
                            id: p.id,
                            name: p.name,
                            href: `/p/${p.id}`,
                          });
                          setRecent(next);
                        }}
                        className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                        title="Open share view (requires pipeline to be public)"
                      >
                        Shared view
                      </Link>

                      <Link
                        href={`/editor/${p.id}`}
                        onClick={() => {
                          const next = recordRecentPipeline({
                            scope: user.id,
                            id: p.id,
                            name: p.name,
                            href: `/editor/${p.id}`,
                          });
                          setRecent(next);
                        }}
                        className="h-8 px-3 rounded-md text-xs font-semibold text-white hover:brightness-110 transition-all flex items-center"
                        style={{
                          background:
                            "linear-gradient(90deg, #a3a6ff, #8387ff)",
                        }}
                      >
                        Open editor
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {tab === "your" && preparedOwned.length > 0 && totalYourPages > 1 && (
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
          (preparedShared.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10">
              <h2 className="text-lg font-semibold">
                {query.trim().length > 0 ? "No matches" : "No shared pipelines"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {query.trim().length > 0
                  ? "Try a different search term."
                  : "Pipelines others share with you will show up here."}
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePinned(p.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                          title={
                            pinnedSet.has(p.id)
                              ? "Unpin pipeline"
                              : "Pin pipeline"
                          }
                          aria-label={
                            pinnedSet.has(p.id)
                              ? "Unpin pipeline"
                              : "Pin pipeline"
                          }
                        >
                          <LuStar
                            size={16}
                            color={
                              pinnedSet.has(p.id) ? "#6366F1" : "currentColor"
                            }
                            fill={pinnedSet.has(p.id) ? "#6366F1" : "none"}
                          />
                        </button>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-md text-slate-400 "
                          title={
                            p.role === "editor"
                              ? "You can edit this pipeline"
                              : "Read-only access"
                          }
                        >
                          {p.role === "editor" ? "Editor" : "Viewer"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Link
                        href={`/p/${p.id}`}
                        onClick={() => {
                          const next = recordRecentPipeline({
                            scope: user.id,
                            id: p.id,
                            name: p.name,
                            href: `/p/${p.id}`,
                          });
                          setRecent(next);
                        }}
                        className="h-8 px-3 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors flex items-center"
                      >
                        Shared view
                      </Link>

                      <Link
                        href={
                          p.role === "editor" ? `/editor/${p.id}` : `/p/${p.id}`
                        }
                        onClick={() => {
                          const href =
                            p.role === "editor"
                              ? `/editor/${p.id}`
                              : `/p/${p.id}`;
                          const next = recordRecentPipeline({
                            scope: user.id,
                            id: p.id,
                            name: p.name,
                            href,
                          });
                          setRecent(next);
                        }}
                        className={clsx(
                          "h-8 px-3 rounded-md text-xs transition-all flex items-center",
                          p.role === "editor"
                            ? "font-semibold text-white hover:brightness-110"
                            : "font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors",
                        )}
                        style={
                          p.role === "editor"
                            ? {
                                background:
                                  "linear-gradient(90deg, #a3a6ff, #8387ff)",
                              }
                            : undefined
                        }
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
          preparedShared.length > 0 &&
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
                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
                  onClick={() => setNewOpen(false)}
                  title="Close"
                >
                  <LuX size={16} />
                </button>
              </div>

              <div className="p-4">
                {templates.length > 0 && (
                  <div className="">
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

                    <div className="flex items-center justify-end gap-3 mt-6">
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
