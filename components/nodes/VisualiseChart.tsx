// components/nodes/VisualiseChart.tsx
"use client";

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import type { DataTable } from "@/types";

function makePalette(count: number): string[] {
  // Deterministic HSL palette that looks good on dark backgrounds
  return Array.from({ length: count }, (_, i) => {
    const hue = Math.round((i * 360) / Math.max(1, count));
    return `hsla(${hue}, 75%, 55%, 0.85)`;
  });
}

function formatCategoryTick(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "";

  // Shorten ISO-like dates/timestamps (e.g. 2026-03-31 or 2026-03-31T12:34:56Z).
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
      });
    }
    return trimmed.slice(0, 10);
  }

  // Generic long labels: keep them readable without dominating the chart.
  if (trimmed.length > 14) return `${trimmed.slice(0, 12)}…`;
  return trimmed;
}

export function VisualiseChart({
  data,
  config,
}: {
  data: DataTable;
  config: Record<string, unknown>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const xCol = (config.xColumn as string) || data.columns[0];
  const yCol = (config.yColumn as string) || data.columns[1];
  const chartType = (config.chartType as string) || "bar";
  const resolvedType =
    chartType === "bar" || chartType === "line" || chartType === "pie"
      ? chartType
      : "bar";

  const rawLabels = React.useMemo(
    () => data.rows.map((r) => String(r[xCol] ?? "")),
    [data.rows, xCol],
  );
  const rawValues = React.useMemo(
    () => data.rows.map((r) => Number(r[yCol] ?? 0)),
    [data.rows, yCol],
  );

  const piePalette = React.useMemo(() => {
    if (resolvedType !== "pie") return [];
    return makePalette(rawLabels.length);
  }, [rawLabels.length, resolvedType]);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = rawLabels;
    const values = rawValues;
    const palette =
      resolvedType === "pie" ? piePalette : makePalette(labels.length);

    chartRef.current = new Chart(canvasRef.current, {
      type: resolvedType,
      data: {
        labels,
        datasets: [
          {
            label: yCol,
            data: values,
            backgroundColor:
              resolvedType === "pie" ? palette : "rgba(99,102,241,0.7)",
            hoverBackgroundColor:
              resolvedType === "pie" ? palette : "rgba(99,102,241,0.9)",
            borderColor: "#6366f1",
            borderWidth: 1,
            ...(resolvedType === "bar"
              ? {
                  borderRadius: 6,
                  borderSkipped: false,
                  categoryPercentage: 0.75,
                  barPercentage: 0.9,
                }
              : resolvedType === "pie"
                ? {}
                : { borderRadius: 4 }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 220 },
        interaction:
          resolvedType === "pie"
            ? { mode: "nearest", intersect: true }
            : { mode: "index", intersect: false },
        hover: { mode: "nearest", intersect: false },
        onClick: (event, elements, chart) => {
          // Click a bar to "lock" its tooltip (helps discoverability vs hover-only).
          if (!elements || elements.length === 0) return;
          const first = elements[0] as any;
          const active = [
            { datasetIndex: first.datasetIndex, index: first.index },
          ];
          (chart as any).setActiveElements(active);
          (chart as any).tooltip?.setActiveElements(active, {
            x: (event as any).x,
            y: (event as any).y,
          });
          chart.update();
        },
        layout: { padding: { top: 6, left: 6, right: 10, bottom: 6 } },
        plugins: {
          legend: {
            display: resolvedType !== "pie",
            position: "top",
            labels: {
              color: "#cbd5e1",
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              padding: 14,
              font: { size: 11, weight: 600 },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(11,13,18,0.95)",
            borderColor: "#2a3347",
            borderWidth: 1,
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e1",
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                const label = ctx.label ?? "";
                const raw =
                  typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw);
                return `${label}: ${Number.isFinite(raw) ? raw : ctx.raw}`;
              },
            },
          },
        },
        ...(resolvedType === "pie"
          ? {}
          : {
              scales: {
                x: {
                  ticks: {
                    color: "#64748b",
                    autoSkip: true,
                    maxTicksLimit: 10,
                    maxRotation: 0,
                    minRotation: 0,
                    font: { size: 10 },
                    callback: function (value: any) {
                      const raw =
                        (this as any)?.getLabelForValue?.(value) ?? value;
                      return formatCategoryTick(String(raw));
                    },
                  },
                  grid: { color: "#1e2330" },
                  title: { display: true, text: xCol, color: "#94a3b8" },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#64748b", font: { size: 10 } },
                  grid: { color: "#1e2330" },
                  title: { display: true, text: yCol, color: "#94a3b8" },
                },
              },
            }),
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, piePalette, rawLabels, rawValues, resolvedType, xCol, yCol]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 220,
        background: "#161b27",
        borderRadius: 8,
        padding: 12,
      }}
    >
      {resolvedType === "pie" ? (
        <div className="flex flex-col sm:flex-row gap-3 h-full min-h-[220px]">
          <div className="flex-1 min-w-0">
            <canvas ref={canvasRef} />
          </div>
          <div
            className="sm:w-[240px] rounded-lg p-2"
            style={{
              border: "1px solid #2a3347",
              background: "#0b0d12",
            }}
          >
            <p className="text-xs font-semibold text-slate-300 px-1 pb-2">
              Legend
            </p>
            <div className="max-h-[270px] overflow-auto pr-1">
              {rawLabels.map((label, i) => (
                <div
                  key={`${label}:${i}`}
                  className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-white/5"
                  title={label}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: piePalette[i] ?? "#94a3b8" }}
                  />
                  <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
                    {formatCategoryTick(label)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
