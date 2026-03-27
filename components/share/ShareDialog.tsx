"use client";

import React, { useEffect, useMemo, useState } from "react";

type Collaborator = {
  user_id: string;
  role: "viewer" | "editor";
  created_at: string;
  updated_at: string;
};

type AccessRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
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
}: {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
  isOwner: boolean;
}) {
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    const ok = window.confirm("Remove collaborator access?");
    if (!ok) return;
    const res = await fetch(`/api/pipelines/${pipelineId}/collaborators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", userId }),
    });
    if (res.ok) await load();
  };

  const actOnRequest = async (requestId: string, action: "approve" | "deny") => {
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
          height: "min(640px, 86vh)",
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
          <div className="flex-1" />
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

        <div className="p-5 overflow-auto h-[calc(100%-48px)]">
          {!canManage ? (
            <div className="text-sm text-slate-400">
              Only the owner can create invites.
            </div>
          ) : (
            <>
              <div className="rounded-xl p-4" style={{ border: "1px solid #1e2330", background: "#0b0d12" }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  Invite Link (Reusable)
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value === "editor" ? "editor" : "viewer")
                    }
                    className="h-9 px-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: "#161b27", border: "1px solid #2a3347" }}
                  >
                    <option value="viewer">Viewer (read-only)</option>
                    <option value="editor">Editor (can save)</option>
                  </select>
                  <button
                    onClick={createInvite}
                    disabled={busy}
                    className="h-9 px-4 rounded-lg text-sm font-semibold disabled:opacity-60"
                    style={{ background: "#6366f1", color: "white" }}
                  >
                    {busy ? "Creating…" : "Create invite"}
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-300 mt-3">{error}</p>
                )}

                {inviteUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">Copy this link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteUrl}
                        className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none font-mono"
                        style={{ background: "#161b27", border: "1px solid #2a3347" }}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(inviteUrl)}
                        className="h-9 px-3 rounded-lg text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      This link is only shown once. Create a new one if you lose it.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl p-4" style={{ border: "1px solid #1e2330", background: "#0b0d12" }}>
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
                          style={{ border: "1px solid #1e2330", background: "#0d0f14" }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-slate-300 truncate">
                              {r.user_id}
                            </p>
                            <p className="text-xs text-slate-600">
                              {r.status} · {formatDate(r.updated_at)}
                            </p>
                          </div>
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => actOnRequest(r.id, "approve")}
                                className="h-8 px-3 rounded-md text-xs font-semibold text-white"
                                style={{ background: "#22c55e" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => actOnRequest(r.id, "deny")}
                                className="h-8 px-3 rounded-md text-xs font-semibold text-white"
                                style={{ background: "#ef4444" }}
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

                <div className="rounded-xl p-4" style={{ border: "1px solid #1e2330", background: "#0b0d12" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Collaborators
                  </p>
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-slate-500">No collaborators yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {collaborators.map((c) => (
                        <div
                          key={c.user_id}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{ border: "1px solid #1e2330", background: "#0d0f14" }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-slate-300 truncate">
                              {c.user_id}
                            </p>
                            <p className="text-xs text-slate-600">
                              {c.role} · {formatDate(c.updated_at)}
                            </p>
                          </div>
                          <select
                            value={c.role}
                            onChange={(e) =>
                              updateRole(
                                c.user_id,
                                e.target.value === "editor" ? "editor" : "viewer",
                              )
                            }
                            className="h-8 px-2 rounded-md text-xs text-white outline-none"
                            style={{ background: "#161b27", border: "1px solid #2a3347" }}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                          </select>
                          <button
                            onClick={() => removeCollaborator(c.user_id)}
                            className="h-8 px-3 rounded-md text-xs font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
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

