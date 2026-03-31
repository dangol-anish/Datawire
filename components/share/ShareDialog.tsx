"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuLoaderCircle, LuX } from "react-icons/lu";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

type Collaborator = {
  user_id: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
  role: "viewer" | "editor";
  created_at?: string;
  updated_at?: string;
};

type AccessRequest = {
  id: string;
  user_id: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
  status: "pending" | "approved" | "denied";
  created_at?: string;
  updated_at?: string;
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function hashToHex(input: string) {
  // Simple deterministic hash (good enough for fake IDs).
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${hex}${hex}${hex}${hex}`.slice(0, 32);
}

function hexToUuidLike(hex32: string) {
  const h = hex32.padEnd(32, "0").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function ShareDialog({
  open,
  onClose,
  pipelineId,
  isOwner,
  pipelineName,
  isPublic,
  onPipelineUpdated,
}: {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
  isOwner: boolean;
  pipelineName: string;
  isPublic: boolean;
  onPipelineUpdated?: (next: { name?: string; is_public?: boolean }) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [draftName, setDraftName] = useState(pipelineName);
  const [savedName, setSavedName] = useState(pipelineName);
  const [draftPublic, setDraftPublic] = useState(isPublic);
  const [mockInfo, setMockInfo] = useState<{
    enabled: boolean;
    collabs: number;
    reqs: number;
  } | null>(null);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  const canManage = isOwner;

  const load = async () => {
    if (!canManage) return;
    const [collabRes, reqRes] = await Promise.all([
      fetch(`/api/pipelines/${pipelineId}/collaborators`),
      fetch(`/api/pipelines/${pipelineId}/access-requests`),
    ]);
    const collabBody = await safeJson(collabRes);
    const reqBody = await safeJson(reqRes);
    if (collabRes.ok) setCollaborators(collabBody?.collaborators ?? []);
    if (reqRes.ok) setRequests(reqBody?.requests ?? []);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInviteUrl(null);
    setDraftName(pipelineName);
    setSavedName(pipelineName);
    setDraftPublic(isPublic);
    setMockInfo(null);
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("mockShare")) {
        const collabs = clampInt(Number(params.get("collabs") ?? 25), 1, 250);
        const reqs = clampInt(Number(params.get("reqs") ?? 40), 0, 500);
        const now = Date.now();

        const nextCollaborators: Collaborator[] = Array.from(
          { length: collabs },
          (_, i) => {
            const userId = hexToUuidLike(hashToHex(`${pipelineId}:c:${i}`));
            const daysAgo = (i % 30) + 1;
            const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
            const updatedAt = new Date(
              createdAt.getTime() + ((i % 10) + 1) * 60 * 60 * 1000,
            );
            return {
              user_id: userId,
              user: {
                id: userId,
                email: `user${i + 1}@example.com`,
                name: `User ${i + 1}`,
                avatar_url: null,
              },
              role: i % 3 === 0 ? "editor" : "viewer",
              created_at: createdAt.toISOString(),
              updated_at: updatedAt.toISOString(),
            };
          },
        );

        const nextRequests: AccessRequest[] = Array.from(
          { length: reqs },
          (_, i) => {
            const id = hexToUuidLike(hashToHex(`${pipelineId}:r:${i}`));
            const userId = hexToUuidLike(hashToHex(`${pipelineId}:ru:${i}`));
            const minutesAgo = (i + 1) * 13;
            const createdAt = new Date(now - minutesAgo * 60 * 1000);
            const statusRoll = i % 10;
            const status: AccessRequest["status"] =
              statusRoll < 6 ? "pending" : statusRoll < 8 ? "approved" : "denied";
            const updatedAt =
              status === "pending"
                ? undefined
                : new Date(createdAt.getTime() + 12 * 60 * 1000).toISOString();
            return {
              id,
              user_id: userId,
              user: {
                id: userId,
                email: `requester${i + 1}@example.com`,
                name: `Requester ${i + 1}`,
                avatar_url: null,
              },
              status,
              created_at: createdAt.toISOString(),
              updated_at: updatedAt,
            };
          },
        );

        setCollaborators(nextCollaborators);
        setRequests(nextRequests);
        setMockInfo({ enabled: true, collabs, reqs });
        return;
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPublic, pipelineName]);

  const updateSettings = async (payload: {
    name?: string;
    is_public?: boolean;
  }) => {
    if (!canManage || savingSettings) return;
    setSavingSettings(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body?.error ?? "Failed to update pipeline");
      onPipelineUpdated?.(payload);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Failed");
      throw e;
    } finally {
      setSavingSettings(false);
    }
  };

  const saveName = async () => {
    const name = draftName.trim();
    if (!name) return;
    if (savingName) return;
    setSavingName(true);
    try {
      await updateSettings({ name });
      setSavedName(name);
      setDraftName(name);
    } finally {
      setSavingName(false);
    }
  };

  const togglePublic = async (next: boolean) => {
    setDraftPublic(next);
    try {
      await updateSettings({ is_public: next });
    } catch {
      // revert UI on failure
      setDraftPublic((prev) => !prev);
    }
  };

  const createInvite = async () => {
    if (!canManage || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body?.error ?? "Failed to create invite");
      setInviteUrl(body.inviteUrl);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const updateRole = async (userId: string, nextRole: "viewer" | "editor") => {
    const res = await fetch(`/api/pipelines/${pipelineId}/collaborators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setRole", userId, role: nextRole }),
    });
    if (res.ok) await load();
  };

  const removeCollaborator = async (userId: string) => {
    const ok = await confirm({
      title: "Remove collaborator?",
      description: "This user will lose access to this pipeline.",
      confirmText: "Remove",
      dangerous: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/pipelines/${pipelineId}/collaborators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", userId }),
    });
    if (res.ok) await load();
    else {
      const body = await safeJson(res);
      toast.error(body?.error ?? "Failed to remove collaborator");
    }
  };

  const actOnRequest = async (
    requestId: string,
    action: "approve" | "deny",
  ) => {
    const res = await fetch(
      `/api/pipelines/${pipelineId}/access-requests/${requestId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    if (res.ok) await load();
  };

  const title = useMemo(() => {
    return canManage ? "Share & Invite" : "Sharing";
  }, [canManage]);

  const nameDirty = useMemo(() => {
    const next = draftName.trim();
    const baseline = savedName.trim();
    return next.length > 0 && next !== baseline;
  }, [draftName, savedName]);

  const displayLabelForUser = (userId: string, user?: { name: string | null; email: string | null } | null) => {
    const name = user?.name?.trim();
    if (name) return name;
    const email = user?.email?.trim();
    if (email) return email;
    return userId;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: "min(820px, 92vw)",
          height: "min(640px, 70vh)",
          background: "#0d0f14",
          border: "1px solid #1e2330",
          boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
        }}
      >
        <div
          className="flex items-center gap-3 px-5 h-12"
          style={{ borderBottom: "1px solid #1e2330" }}
        >
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          {mockInfo?.enabled && (
            <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-slate-400 bg-white/5">
              Mock data · {mockInfo.reqs} requests · {mockInfo.collabs} collabs
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <LuX size={16} />
          </button>
        </div>

        <div className="p-5 overflow-auto h-[calc(100%-48px)]">
          {!canManage ? (
            <div className="text-sm text-slate-400">
              Only the owner can create invites.
            </div>
          ) : (
            <>
              <div
                className="rounded-xl p-4 mb-4"
                style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Pipeline Settings
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Visibility
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <div className="flex items-center gap-2">
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none"
                        style={{
                          background: "#161b27",
                          border: "1px solid #2a3347",
                        }}
                      />
                      <button
                        onClick={saveName}
                        disabled={savingSettings || savingName || !nameDirty}
                        className="h-9 px-3 rounded-lg text-sm font-semibold disabled:opacity-60 text-white border border-white/10 hover:bg-white/5 transition-colors"
                        aria-busy={savingName}
                      >
                        {savingName ? (
                          <span className="inline-flex items-center gap-2">
                            <LuLoaderCircle
                              size={14}
                              className="animate-spin"
                            />
                            Saving…
                          </span>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">
                          Public link
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Anyone with the link can view.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={draftPublic}
                        onClick={() => void togglePublic(!draftPublic)}
                        disabled={savingSettings}
                        className="relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: draftPublic ? "#6366f1" : "#161b27",
                          borderColor: draftPublic ? "#6366f1" : "#2a3347",
                        }}
                        title={draftPublic ? "Public" : "Private"}
                      >
                        <span
                          className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ease-out"
                          style={{
                            transform: draftPublic
                              ? "translateX(26px)"
                              : "translateX(4px)",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  Invite Link (Reusable)
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(
                          e.target.value === "editor" ? "editor" : "viewer",
                        )
                      }
                      className="h-9 pl-4 pr-11 rounded-lg bg-surface border border-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
                    >
                      <option value="viewer">Viewer (read-only)</option>
                      <option value="editor">Editor (can save)</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LuChevronDown size={16} />
                    </div>
                  </div>
                  <button
                    onClick={createInvite}
                    disabled={busy}
                    className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all hover:brightness-110"
                    style={{
                      background: busy
                        ? "#2a3347"
                        : "linear-gradient(90deg, #a3a6ff, #8387ff)",
                    }}
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <LuLoaderCircle size={14} className="animate-spin" />
                        Creating…
                      </span>
                    ) : (
                      "Create invite"
                    )}
                  </button>
                </div>

                {error && <p className="text-sm text-red-300 mt-3">{error}</p>}

                {inviteUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">
                      Copy this link:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteUrl}
                        className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none font-mono"
                        style={{
                          background: "#161b27",
                          border: "1px solid #2a3347",
                        }}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(inviteUrl)}
                        className="h-9 px-3 rounded-lg text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      This link is only shown once. Create a new one if you lose
                      it.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div
                  className="rounded-xl p-4"
                  style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Access Requests
                  </p>
                  {requests.length === 0 ? (
                    <p className="text-sm text-slate-500">No requests.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {requests.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{
                            border: "1px solid #1e2330",
                            background: "#0d0f14",
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">
                              {displayLabelForUser(r.user_id, r.user ?? null)}
                            </p>
                            <p className="text-xs text-slate-600 truncate">
                              <span className="font-mono">{r.user_id}</span> ·{" "}
                              {r.status} ·{" "}
                              {formatDate(r.updated_at ?? r.created_at)}
                            </p>
                          </div>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => actOnRequest(r.id, "approve")}
                                className="h-7 px-2 rounded-md text-[11px] font-semibold text-white border border-emerald-500/40 bg-emerald-600 hover:bg-emerald-500 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => actOnRequest(r.id, "deny")}
                                className="h-7 px-2 rounded-md text-[11px] font-semibold text-white border border-red-500/40 bg-red-600 hover:bg-red-500 transition-colors"
                              >
                                Deny
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Collaborators
                  </p>
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No collaborators yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {collaborators.map((c) => (
                        <div
                          key={c.user_id}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{
                            border: "1px solid #1e2330",
                            background: "#0d0f14",
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">
                              {displayLabelForUser(c.user_id, c.user ?? null)}
                            </p>
                            <p className="text-xs text-slate-600 truncate">
                              <span className="font-mono">{c.user_id}</span> ·{" "}
                              {c.role} ·{" "}
                              {formatDate(c.updated_at ?? c.created_at)}
                            </p>
                          </div>
                          <select
                            value={c.role}
                            onChange={(e) =>
                              updateRole(
                                c.user_id,
                                e.target.value === "editor"
                                  ? "editor"
                                  : "viewer",
                              )
                            }
                            className="h-8 px-2 rounded-md text-xs text-white outline-none"
                            style={{
                              background: "#161b27",
                              border: "1px solid #2a3347",
                            }}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                          </select>
                          <button
                            onClick={() => removeCollaborator(c.user_id)}
                            className="h-7 px-2 rounded-md text-[11px] font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
