"use client";

import React from "react";
import Link from "next/link";
import { useGraphStore } from "@/store/graphStore";
import { useExecutionStore } from "@/store/executionStore";
import {
  LuAlertTriangle,
  LuCheckCircle2,
  LuCircle,
  LuEraser,
  LuLoaderCircle,
  LuPlay,
  LuRedo2,
  LuSave,
  LuShare2,
  LuTrash2,
  LuUndo2,
  LuWorkflow,
} from "react-icons/lu";

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

  const saveIcon =
    saveState === "saving" ? (
      <LuLoaderCircle size={14} className="animate-spin" aria-hidden="true" />
    ) : saveState === "saved" ? (
      <LuCheckCircle2 size={14} aria-hidden="true" />
    ) : saveState === "error" ? (
      <LuAlertTriangle size={14} aria-hidden="true" />
    ) : (
      <LuCircle size={14} aria-hidden="true" />
    );

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
        <Link
          href="/"
          className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{ background: "#6366f1" }}
          title="Back to home"
        >
          <LuWorkflow size={14} color="white" />
        </Link>
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
        <LuUndo2 size={14} />
      </button>
      <button
        onClick={onRedo ?? redo}
        disabled={typeof canRedo === "boolean" ? !canRedo : future.length === 0}
        className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 disabled:opacity-30 hover:text-slate-200 hover:bg-white/5 transition-colors"
        title="Redo"
      >
        <LuRedo2 size={14} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Share */}
      {onShare && (
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          title="Share / Invite"
        >
          <LuShare2 size={14} />
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
        <LuSave size={14} />
        <span>Save</span>
        {saveState && (
          <span
            className="inline-flex items-center justify-center"
            style={{
              color:
                saveState === "saved"
                  ? "#86efac"
                  : saveState === "saving"
                    ? "#c7d2fe"
                    : saveState === "error"
                      ? "#fecaca"
                      : "#cbd5e1",
            }}
            title={saveText}
            aria-label={saveText}
          >
            {saveIcon}
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
        <LuTrash2 size={14} />
        Delete
      </button>

      {/* Clear board */}
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        title="Clear all nodes and edges"
      >
        <LuEraser size={14} />
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
            <LuLoaderCircle size={14} className="animate-spin" />
            Running…
          </>
        ) : (
          <>
            <LuPlay size={14} />
            Run
          </>
        )}
      </button>
    </div>
  );
}
