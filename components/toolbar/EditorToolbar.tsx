"use client";

import React from "react";
import { useGraphStore } from "@/store/graphStore";
import { useExecutionStore } from "@/store/executionStore";

interface ToolbarProps {
  pipelineName: string;
  onRun: () => void;
  onSave: () => void;
  onRename?: (nextName: string) => Promise<void>;
  canRename?: boolean;
  onDeleteSelected: () => void;
  onClear: () => void;
  onShare?: () => void;
  saveState?: "saved" | "saving" | "dirty" | "error";
  collabState?: "disabled" | "connecting" | "connected" | "reconnecting" | "error";
  pendingRequestsCount?: number;
  className?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorToolbar({
  pipelineName,
  onRun,
  onSave,
  onRename,
  canRename,
  onDeleteSelected,
  onClear,
  onShare,
  saveState,
  collabState,
  pendingRequestsCount,
  className,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const { undo, redo, history, future } = useGraphStore();
  const status = useExecutionStore((s) => s.pipelineStatus);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(pipelineName);
  const [renaming, setRenaming] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const blurCommitInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (!editingName) setDraftName(pipelineName);
  }, [pipelineName, editingName]);

  React.useEffect(() => {
    if (!editingName) return;
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [editingName]);

  const isRunning = status === "running";
  const saveText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Unsaved";

  const collabText =
    collabState === "connected"
      ? "Live"
      : collabState === "reconnecting"
        ? "Reconnecting…"
        : collabState === "connecting"
          ? "Connecting…"
          : collabState === "error"
            ? "Offline"
            : null;

  return (
    <div
      className={`flex items-center gap-2 px-4 h-12 flex-shrink-0 ${className ?? ""}`}
      style={{
        background: "#0d0f14",
        borderBottom: "1px solid #1e2330",
      }}
    >
      {/* Logo / name */}
      <div className="flex items-center gap-2 mr-4">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: "#6366f1" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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
        {!editingName && (
          <span
            className={`text-sm font-semibold text-slate-200 ${canRename && onRename ? "cursor-text" : ""}`}
            onDoubleClick={() => {
              if (!canRename || !onRename) return;
              setEditingName(true);
            }}
            title={canRename && onRename ? "Double-click to rename" : undefined}
          >
            {pipelineName}
          </span>
        )}
        {editingName && (
          <input
            ref={nameInputRef}
            value={draftName}
            disabled={renaming}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDraftName(pipelineName);
                setEditingName(false);
                return;
              }

              if (e.key === "Enter") {
                e.preventDefault();
                if (!onRename) {
                  setEditingName(false);
                  return;
                }
                const next = draftName.trim();
                if (!next) {
                  window.alert("Pipeline name cannot be empty.");
                  return;
                }
                if (next === pipelineName) {
                  setEditingName(false);
                  return;
                }
                setRenaming(true);
                try {
                  blurCommitInFlightRef.current = true;
                  await onRename(next);
                  setEditingName(false);
                } catch (err: any) {
                  window.alert(
                    typeof err?.message === "string" ? err.message : "Rename failed",
                  );
                } finally {
                  setRenaming(false);
                  window.setTimeout(() => {
                    blurCommitInFlightRef.current = false;
                  }, 0);
                }
              }
            }}
            onBlur={async () => {
              if (!onRename) {
                setEditingName(false);
                return;
              }
              if (blurCommitInFlightRef.current) return;

              const next = draftName.trim();
              if (!next) {
                setDraftName(pipelineName);
                setEditingName(false);
                return;
              }
              if (next === pipelineName) {
                setEditingName(false);
                return;
              }

              setRenaming(true);
              try {
                await onRename(next);
                setEditingName(false);
              } catch (err: any) {
                window.alert(
                  typeof err?.message === "string" ? err.message : "Rename failed",
                );
                // Keep editing so the user can fix it.
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
              } finally {
                setRenaming(false);
              }
            }}
            className="h-8 px-2 rounded-md text-sm font-semibold text-slate-200 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[240px]"
          />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {collabText && (
        <div
          className="hidden lg:flex items-center gap-2 px-2 h-7 rounded-md text-xs"
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            color: "#cbd5e1",
          }}
          title="Realtime collaboration status"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background:
                collabState === "connected"
                  ? "#22c55e"
                  : collabState === "error"
                    ? "#ef4444"
                    : "#6366f1",
            }}
          />
          {collabText}
        </div>
      )}

      {/* Undo / Redo */}
      <button
        onClick={onUndo ?? undo}
        disabled={typeof canUndo === "boolean" ? !canUndo : history.length === 0}
        className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 disabled:opacity-30 hover:text-slate-200 hover:bg-white/5 transition-colors"
        title="Undo (Ctrl+Z)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 5h5a4 4 0 0 1 0 8H4" strokeLinecap="round" />
          <path
            d="M2 5l2.5-2.5M2 5l2.5 2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        onClick={onRedo ?? redo}
        disabled={typeof canRedo === "boolean" ? !canRedo : future.length === 0}
        className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 disabled:opacity-30 hover:text-slate-200 hover:bg-white/5 transition-colors"
        title="Redo"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 5H7a4 4 0 0 0 0 8h3" strokeLinecap="round" />
          <path
            d="M12 5l-2.5-2.5M12 5l-2.5 2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Share */}
      {onShare && (
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          title="Share / Invite"
        >
          <span>Share</span>
          {(pendingRequestsCount ?? 0) > 0 && (
            <span
              className="ml-1 text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(239,68,68,0.18)",
                color: "#fecaca",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              title={`${pendingRequestsCount} pending access request(s)`}
            >
              {pendingRequestsCount}
            </span>
          )}
        </button>
      )}

      {/* Save */}
      <button
        onClick={onSave}
        className="flex items-center gap-2 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 1h6.5L10 2.5V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V1z" />
          <path d="M4 1v3h4V1M3 6h6" strokeLinecap="round" />
        </svg>
        <span>Save</span>
        {saveState && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              background:
                saveState === "saved"
                  ? "rgba(34,197,94,0.15)"
                  : saveState === "saving"
                    ? "rgba(99,102,241,0.18)"
                    : saveState === "error"
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(148,163,184,0.12)",
              color:
                saveState === "saved"
                  ? "#86efac"
                  : saveState === "saving"
                    ? "#c7d2fe"
                    : saveState === "error"
                      ? "#fecaca"
                      : "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            title={saveText}
          >
            {saveText}
          </span>
        )}
      </button>

      {/* Delete node */}
      <button
        onClick={onDeleteSelected}
        disabled={!selectedNodeId}
        className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
        title="Delete selected node"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 3h8" strokeLinecap="round" />
          <path d="M4.5 3V2.2A1.2 1.2 0 0 1 5.7 1h.6a1.2 1.2 0 0 1 1.2 1.2V3" />
          <path d="M3.3 3.2l.4 7.5A1 1 0 0 0 4.7 11h2.6a1 1 0 0 0 1-.9l.4-7.5" />
        </svg>
        Delete
      </button>

      {/* Clear board */}
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        title="Clear all nodes and edges"
      >
        Clear
      </button>

      {/* Run */}
      <button
        onClick={onRun}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-semibold transition-all disabled:opacity-60"
        style={{
          background: isRunning ? "#4338ca" : "#6366f1",
          color: "white",
          boxShadow: isRunning ? "none" : "0 0 12px #6366f140",
        }}
      >
        {isRunning ? (
          <>
            <svg
              className="animate-spin"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="7 14"
              />
            </svg>
            Running…
          </>
        ) : (
          <>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
              <path d="M1 1l8 5-8 5V1z" />
            </svg>
            Run
          </>
        )}
      </button>
    </div>
  );
}
