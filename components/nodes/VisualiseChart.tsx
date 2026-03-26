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

export function VisualiseChart({
  data,
  config,
}: {
  data: DataTable;
  config: Record<string, unknown>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    if (chartRef.current) chartRef.current.destroy();

    const xCol = (config.xColumn as string) || data.columns[0];
    const yCol = (config.yColumn as string) || data.columns[1];
    const chartType = (config.chartType as string) || "bar";
    const resolvedType =
      chartType === "bar" || chartType === "line" || chartType === "pie"
        ? chartType
        : "bar";

    const labels = data.rows.map((r) => String(r[xCol] ?? ""));
    const values = data.rows.map((r) => Number(r[yCol] ?? 0));
    const palette = makePalette(labels.length);

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
            borderColor: "#6366f1",
            borderWidth: 1,
            ...(resolvedType === "pie" ? {} : { borderRadius: 4 }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#cbd5e1", boxWidth: 10, boxHeight: 10 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.label ?? "";
                const raw = typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw);
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
                  ticks: { color: "#64748b" },
                  grid: { color: "#1e2330" },
                  title: { display: true, text: xCol, color: "#94a3b8" },
                },
                y: {
                  ticks: { color: "#64748b" },
                  grid: { color: "#1e2330" },
                  title: { display: true, text: yCol, color: "#94a3b8" },
                },
              },
            }),
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, config]);

  return (
    <div
      style={{
        width: "100%",
        height: 200,
        background: "#161b27",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
