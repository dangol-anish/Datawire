"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useGraphStore } from "@/store/graphStore";
import { useExecutionStore } from "@/store/executionStore";
import { NODE_REGISTRY } from "@/nodes/index";
import { isExecutionError } from "@/types";
import type { ExecutionTableResult } from "@/store/executionStore";
import { LuCircleCheck, LuCircleX, LuLoaderCircle } from "react-icons/lu";

interface NodeData {
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export function PipelineNodeCard({ id, data, selected }: NodeProps<NodeData>) {
  const def = NODE_REGISTRY[data.type];
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const result = useExecutionStore((s) => s.results[id]);
  const status = useExecutionStore((s) => s.nodeStatuses[id]);
  const openResultsModal = useExecutionStore((s) => s.openResultsModal);

  const isSelected = selected || selectedNodeId === id;
  const hasError = result && isExecutionError(result as any);
  const hasResult = result && !isExecutionError(result as any);
  const tableResult: ExecutionTableResult | null =
    hasResult && (result as any)?.kind === "table" ? ((result as any) as any) : null;

  const nodeColor = def?.color ?? "#6366f1";

  const borderColor = isSelected
    ? nodeColor
    : hasError
      ? "#ef444440"
      : hasResult
        ? "#22c55e40"
        : "#2a3347";

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        minWidth: 200,
        background: "#161b27",
        border: `1.5px solid ${borderColor}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${nodeColor}30, 0 8px 32px #00000080`
          : "0 4px 16px #00000060",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Color accent bar at top */}
      <div
        className="h-1 w-full"
        style={{ background: def?.color ?? "#334155" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: def?.color ?? "#94a3b8", letterSpacing: "0.12em" }}
        >
          {data.type}
        </span>
        <div className="flex-1" />
        {status === "running" ? (
          <LuLoaderCircle
            size={16}
            className="text-amber-400 animate-spin"
            aria-label="Running"
          />
        ) : hasError ? (
          <LuCircleX size={16} className="text-red-400" aria-label="Failed" />
        ) : hasResult ? (
          <LuCircleCheck
            size={16}
            className="text-green-400"
            aria-label="Succeeded"
          />
        ) : null}
      </div>

      {/* Config summary */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-xs text-slate-500 truncate max-w-[180px]">
            {Object.entries(data.config)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
        </div>
      )}

      {/* Execution result summary */}
      {hasResult && (
        <button
          className="nodrag mx-3 mb-2 px-2 py-1 rounded-md bg-green-950/40 border border-green-900/30 w-[calc(100%-24px)] text-left hover:bg-green-950/55 transition-colors"
          onClick={() => openResultsModal(id)}
          title="Open results"
        >
          <p className="text-xs text-green-400">
            ✓ {(tableResult?.totalRows ?? 0)} rows ·{" "}
            {(tableResult?.table.columns.length ?? 0)} cols · View
          </p>
        </button>
      )}
      {hasError && (
        <button
          className="nodrag mx-3 mb-2 px-2 py-1 rounded-md bg-red-950/40 border border-red-900/30 w-[calc(100%-24px)] text-left hover:bg-red-950/55 transition-colors"
          onClick={() => openResultsModal(id)}
          title="Open error"
        >
          <p className="text-xs text-red-400 truncate">
            ✗ {(result as any).message} · View
          </p>
        </button>
      )}
      {status === "running" && (
        <div className="mx-3 mb-2 px-2 py-1 rounded-md bg-amber-950/40 border border-amber-900/30">
          <p className="text-xs text-amber-400">Running…</p>
        </div>
      )}

      {/* Input handles */}
      {Array.from({ length: def?.inputs ?? 1 }).map((_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          style={{
            top:
              def?.inputs === 1
                ? "50%"
                : `${((i + 1) / (def.inputs + 1)) * 100}%`,
            background: def?.color ?? "#6366f1",
            border: "2px solid #161b27",
            width: 10,
            height: 10,
          }}
        />
      ))}

      {/* Output handles */}
      {Array.from({ length: def?.outputs ?? 1 }).map((_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          style={{
            top:
              def?.outputs === 1
                ? "50%"
                : `${((i + 1) / (def.outputs + 1)) * 100}%`,
            background: def?.color ?? "#6366f1",
            border: "2px solid #161b27",
            width: 10,
            height: 10,
          }}
        />
      ))}
    </div>
  );
}
