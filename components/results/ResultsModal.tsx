"use client";

import React, { useEffect, useMemo } from "react";
import { useExecutionStore } from "@/store/executionStore";
import { useGraphStore } from "@/store/graphStore";
import { isExecutionError } from "@/types";
import { VisualiseChart } from "@/components/nodes/VisualiseChart";
import type { DataTable } from "@/types";
import { LuX } from "react-icons/lu";

function DataTablePreview({ data }: { data: DataTable }) {
  const maxRows = 25;
  const rows = data.rows.slice(0, maxRows);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {data.rows.length} rows · {data.columns.length} columns
        </p>
        {data.rows.length > maxRows && (
          <p className="text-xs text-slate-600">Showing first {maxRows}</p>
        )}
      </div>
      <div
        className="overflow-auto rounded-lg"
        style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
      >
        <table className="min-w-full text-xs">
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: "#0d0f14",
              borderBottom: "1px solid #1e2330",
            }}
          >
            <tr>
              {data.columns.map((c) => (
                <th
                  key={c}
                  className="text-left font-semibold text-slate-300 px-3 py-2 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #111827",
                }}
              >
                {data.columns.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 text-slate-200 whitespace-nowrap"
                  >
                    {String(r[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-6 text-center text-slate-600"
                  colSpan={data.columns.length || 1}
                >
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResultsModal() {
  const resultsModalNodeId = useExecutionStore((s) => s.resultsModalNodeId);
  const close = useExecutionStore((s) => s.closeResultsModal);
  const result = useExecutionStore((s) =>
    resultsModalNodeId ? s.results[resultsModalNodeId] : undefined,
  );

  const node = useGraphStore((s) =>
    resultsModalNodeId ? s.nodes.find((n) => n.id === resultsModalNodeId) : undefined,
  );

  const canShow = Boolean(resultsModalNodeId && node && result);

  useEffect(() => {
    if (!resultsModalNodeId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resultsModalNodeId, close]);

  const title = useMemo(() => {
    if (!node) return "Results";
    return `${node.data.label ?? node.data.type} — Results`;
  }, [node]);

  if (!canShow) return null;

  const isError = result && isExecutionError(result as any);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: "min(1100px, 92vw)",
          height: "min(720px, 85vh)",
          background: "#0d0f14",
          border: "1px solid #1e2330",
          boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 h-12"
          style={{ borderBottom: "1px solid #1e2330" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {title}
            </p>
          </div>
          <button
            onClick={close}
            className="text-slate-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-48px)]">
          <div className="flex-1 p-5 overflow-auto">
            {isError ? (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <p className="text-sm font-semibold text-red-400">Error</p>
                <p className="text-sm text-slate-200 mt-1">
                  {(result as any).message}
                </p>
              </div>
            ) : (
              <>
                {node?.data.type === "Visualise" && (
                  <div className="mb-4">
                    <div className="h-[340px]">
                      <VisualiseChart
                        data={result as any}
                        config={node.data.config ?? {}}
                      />
                    </div>
                  </div>
                )}
                <DataTablePreview data={result as any} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
