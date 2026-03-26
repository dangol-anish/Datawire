// components/nodes/VisualiseChart.tsx
"use client";

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import type { DataTable } from "@/types";

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

    const labels = data.rows.map((r) => String(r[xCol] ?? ""));
    const values = data.rows.map((r) => Number(r[yCol] ?? 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: chartType as any,
      data: {
        labels,
        datasets: [
          {
            label: yCol,
            data: values,
            backgroundColor: "rgba(99,102,241,0.7)",
            borderColor: "#6366f1",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "#1e2330" } },
          y: { ticks: { color: "#64748b" }, grid: { color: "#1e2330" } },
        },
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
