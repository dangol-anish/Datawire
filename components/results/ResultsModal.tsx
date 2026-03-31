"use client";

import React, { useEffect, useMemo } from "react";
import { useExecutionStore } from "@/store/executionStore";
import { useGraphStore } from "@/store/graphStore";
import { isExecutionError } from "@/types";
import { VisualiseChart } from "@/components/nodes/VisualiseChart";
import type { DataTable } from "@/types";
import { LuX } from "react-icons/lu";
import { getWorker } from "@/worker/workerBridge";
import type { ExecutionTableResult } from "@/store/executionStore";

function DataTablePreview({
  nodeId,
  data,
  totalRows,
  isPreview,
}: {
  nodeId: string;
  data: DataTable;
  totalRows: number;
  isPreview: boolean;
}) {
  const pageSizeOptions = [25, 50, 100, 250] as const;
  const [pageSize, setPageSize] = React.useState<(typeof pageSizeOptions)[number]>(
    pageSizeOptions[0],
  );
  const [page, setPage] = React.useState(0);

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  const [pageData, setPageData] = React.useState<DataTable>(() => {
    const end = Math.min(pageSize, totalRows);
    return { columns: data.columns, rows: data.rows.slice(0, end) };
  });
  const [loading, setLoading] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  useEffect(() => {
    setPage(0);
    setPageError(null);
    const end = Math.min(pageSize, totalRows);
    setPageData({ columns: data.columns, rows: data.rows.slice(0, end) });
  }, [nodeId, totalRows, data.columns.length, data.rows.length, pageSize]);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [page, safePage]);

  const startIndex = safePage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  useEffect(() => {
    let cancelled = false;
    const w = getWorker();

    const canServeFromPreview = startIndex === 0 && data.rows.length >= endIndex;
    if (canServeFromPreview) {
      setLoading(false);
      setPageError(null);
      setPageData({ columns: data.columns, rows: data.rows.slice(0, endIndex) });
      return;
    }

    setLoading(true);
    setPageError(null);

    const onMessage = (event: MessageEvent<any>) => {
      const msg = event.data as any;
      if (msg?.type !== "RESULT_PAGE") return;
      if (msg.nodeId !== nodeId) return;
      if (msg.page !== safePage) return;
      if (msg.pageSize !== pageSize) return;

      if (cancelled) return;
      setLoading(false);

      if (typeof msg.error === "string" && msg.error) {
        setPageError(msg.error);
        setPageData({ columns: data.columns, rows: [] });
        return;
      }

      setPageData(msg.result as DataTable);
    };

    w.addEventListener("message", onMessage as any);
    w.postMessage({
      type: "GET_RESULT_PAGE",
      nodeId,
      page: safePage,
      pageSize,
    });

    return () => {
      cancelled = true;
      w.removeEventListener("message", onMessage as any);
    };
  }, [
    data.columns,
    data.rows,
    endIndex,
    nodeId,
    pageSize,
    safePage,
    startIndex,
  ]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <p className="ml-2 text-xs text-slate-400 whitespace-nowrap">
            {totalRows} rows · {data.columns.length} columns
          </p>
          {totalRows > 0 && (
            <p className="text-xs text-slate-600 whitespace-nowrap">
              Showing {startIndex + 1}–{endIndex} · Page {safePage + 1} of{" "}
              {pageCount}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPreview && (
            <span
              className="hidden sm:inline text-xs text-slate-600 whitespace-nowrap"
              title="Only a preview is kept in the UI; pages are fetched on demand."
            >
              Preview
            </span>
          )}
          <label className="text-xs text-slate-600 flex items-center gap-2">
            Rows/page
            <select
              className="rounded-md px-2 py-1 text-xs"
              style={{
                background: "#0b0d12",
                border: "1px solid #1e2330",
                color: "#cbd5e1",
              }}
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value) as (typeof pageSizeOptions)[number];
                setPageSize(nextSize);
                setPage(0);
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-slate-300 disabled:text-slate-700 disabled:cursor-not-allowed"
            style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-slate-300 disabled:text-slate-700 disabled:cursor-not-allowed"
            style={{ border: "1px solid #1e2330", background: "#0b0d12" }}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={!canNext}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
      <div
        className="overflow-auto rounded-lg no-scrollbar"
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
            {pageData.rows.map((r, idx) => (
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
            {pageData.rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-6 text-center text-slate-600"
                  colSpan={data.columns.length || 1}
                >
                  {loading ? "Loading…" : pageError ? pageError : "No rows"}
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
  const [phase, setPhase] = React.useState<"enter" | "entered" | "exit">("enter");
  const closeTimerRef = React.useRef<number | null>(null);

  const node = useGraphStore((s) =>
    resultsModalNodeId
      ? s.nodes.find((n) => n.id === resultsModalNodeId)
      : undefined,
  );

  const canShow = Boolean(resultsModalNodeId && node && result);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const title = useMemo(() => {
    if (!node) return "Results";
    return `${node.data.label ?? node.data.type} — Results`;
  }, [node]);

  const isError = result && isExecutionError(result as any);
  const tableResult: ExecutionTableResult | null =
    result && !isExecutionError(result as any) && (result as any).kind === "table"
      ? (result as any)
      : null;

  const requestClose = React.useCallback(() => {
    setPhase((p) => (p === "exit" ? p : "exit"));
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => close(), 200);
  }, [close]);

  useEffect(() => {
    if (!resultsModalNodeId) return;
    // Trigger enter animation on mount/open.
    setPhase("enter");
    const raf = window.requestAnimationFrame(() => setPhase("entered"));
    return () => window.cancelAnimationFrame(raf);
  }, [resultsModalNodeId]);

  useEffect(() => {
    if (!resultsModalNodeId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resultsModalNodeId, requestClose]);

  const entered = phase === "entered" && Boolean(resultsModalNodeId);

  if (!canShow) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.65)",
          opacity: entered ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
        onClick={requestClose}
      />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 h-full overflow-hidden flex flex-col"
        style={{
          width: "min(80vw, 1100px)",
          background: "#0d0f14",
          borderLeft: "1px solid #1e2330",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.65)",
          transform: entered ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease-out",
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-6"
          style={{
            background:
              "linear-gradient(90deg, rgba(13,15,20,0) 0%, rgba(13,15,20,1) 70%)",
          }}
        />

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid #1e2330" }}
        >
          <div className="flex-1 min-w-0">
            <p className="ml-2 text-sm font-semibold text-slate-200 truncate">
              {title}
            </p>
          </div>
          <button
            onClick={requestClose}
            className="text-slate-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          <div className="h-full p-5 overflow-auto no-scrollbar">
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
                        data={(tableResult?.table ?? { columns: [], rows: [] }) as any}
                        config={node.data.config ?? {}}
                      />
                    </div>
                  </div>
                )}
                {tableResult && (
                  <DataTablePreview
                    nodeId={resultsModalNodeId!}
                    data={tableResult.table}
                    totalRows={tableResult.totalRows}
                    isPreview={tableResult.isPreview}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
