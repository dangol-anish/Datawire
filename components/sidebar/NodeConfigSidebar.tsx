// components/sidebar/NodeConfigSidebar.tsx
"use client";

import React from "react";
import { useGraphStore } from "@/store/graphStore";
import { NODE_REGISTRY } from "@/nodes/index";
import type { ConfigField, DataTable } from "@/types";
import { useExecutionStore } from "@/store/executionStore";
import { isExecutionError } from "@/types";
import { useFileStore } from "@/store/fileStore";

function guessFormatFromName(name: string): "csv" | "json" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  return "csv";
}

export function NodeConfigSidebar() {
  const { selectedNodeId, nodes, updateNodeConfig, pushHistory } =
    useGraphStore();
  const node = nodes.find((n) => n.id === selectedNodeId);
  const result = useExecutionStore((s) =>
    selectedNodeId ? s.results[selectedNodeId] : undefined,
  );
  const nodeStatus = useExecutionStore((s) =>
    selectedNodeId ? s.nodeStatuses[selectedNodeId] : "idle",
  );
  const openResultsModal = useExecutionStore((s) => s.openResultsModal);
  const files = useFileStore((s) => s.files);
  const setFile = useFileStore((s) => s.setFile);
  const clearFile = useFileStore((s) => s.clearFile);
  const nodeFile = selectedNodeId ? files[selectedNodeId] : undefined;

  if (!node) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-6"
        style={{
          width: 260,
          borderLeft: "1px solid #1e2330",
          background: "#0d0f14",
        }}
      >
        <p className="text-xs text-slate-600 text-center">
          Select a node to configure it
        </p>
      </div>
    );
  }

  const def = NODE_REGISTRY[node.data.type];
  if (!def) return null;

  const config = node.data.config ?? {};
  const resultTable: DataTable | null =
    result && !isExecutionError(result as any) ? (result as any) : null;
  const availableColumns = resultTable?.columns ?? [];

  const handleChange = (key: string, value: unknown) => {
    pushHistory();
    updateNodeConfig(node.id, { ...config, [key]: value });
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 260,
        borderLeft: "1px solid #1e2330",
        background: "#0d0f14",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e2330" }}>
        <div className="flex items-center gap-2 mb-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: def.color }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: def.color, letterSpacing: "0.12em" }}
          >
            {def.type}
          </span>
        </div>
        <p className="text-sm font-medium text-white">{def.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{def.description}</p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 p-4">
        {def.configSchema.map((field: ConfigField) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {def.type === "Visualise" &&
            (field.key === "xColumn" || field.key === "yColumn") ? (
              <>
                <select
                  value={(config[field.key] as string) ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  disabled={availableColumns.length === 0}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-200 rounded-md outline-none disabled:opacity-60"
                  style={{
                    background: "#161b27",
                    border: "1px solid #2a3347",
                  }}
                >
                  {availableColumns.length === 0 ? (
                    <option value="">Run pipeline to load columns…</option>
                  ) : (
                    <>
                      <option value="">Select…</option>
                      {availableColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {availableColumns.length === 0 && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    Run the pipeline first so Datawire can detect available
                    columns.
                  </p>
                )}
              </>
            ) : def.type === "FileInput" && field.key === "fileName" ? (
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".csv,.json,application/json,text/csv"
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const maxBytes = 5 * 1024 * 1024; // 5MB
                    if (file.size > maxBytes) {
                      window.alert("File too large (max 5MB for now).");
                      e.currentTarget.value = "";
                      return;
                    }

                    const text = await file.text();
                    const format = guessFormatFromName(file.name);

                    // Store file in local (non-persisted) store
                    setFile(node.id, {
                      name: file.name,
                      format,
                      text,
                      size: file.size,
                      updatedAt: Date.now(),
                    });

                    // Persist metadata only in graph config (safe to save/share)
                    handleChange("fileName", file.name);
                    handleChange("format", format);
                  }}
                />

                {(config.fileName as string) ? (
                  <div
                    className="rounded-md px-2.5 py-2"
                    style={{
                      background: "#161b27",
                      border: "1px solid #2a3347",
                    }}
                  >
                    <p className="text-xs text-slate-200 truncate">
                      {(config.fileName as string) ?? ""}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Local upload {nodeFile ? "loaded" : "missing"} ·{" "}
                      {(config.format as string) || "csv"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
                        onClick={() => {
                          clearFile(node.id);
                        }}
                      >
                        Clear upload
                      </button>
                      {!nodeFile && (
                        <span className="text-[11px] text-amber-400">
                          Re-upload before running.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    Upload a file to use this node.
                  </p>
                )}
              </div>
            ) : field.type === "text" || field.type === "expression" ? (
              <input
                type="text"
                value={(config[field.key] as string) ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-2.5 py-1.5 text-xs text-slate-200 rounded-md outline-none focus:ring-1"
                style={{
                  background: "#161b27",
                  border: "1px solid #2a3347",
                  fontFamily:
                    field.type === "expression" ? "monospace" : "inherit",
                }}
              />
            ) : field.type === "select" ? (
              <select
                value={(config[field.key] as string) ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs text-slate-200 rounded-md outline-none"
                style={{ background: "#161b27", border: "1px solid #2a3347" }}
              >
                <option value="">Select…</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "multiselect" ? (
              <div className="flex flex-col gap-1">
                {field.options?.map((opt) => {
                  const selected = (
                    (config[field.key] as string[]) ?? []
                  ).includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = (config[field.key] as string[]) ?? [];
                          handleChange(
                            field.key,
                            selected
                              ? current.filter((v) => v !== opt)
                              : [...current, opt],
                          );
                        }}
                        className="accent-indigo-500"
                      />
                      <span className="text-xs text-slate-300">{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}

        {def.configSchema.length === 0 && (
          <p className="text-xs text-slate-600">
            This node has no configuration.
          </p>
        )}
      </div>

      {/* Results access */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid #1e2330" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            Results
          </p>
          <span className="text-xs text-slate-600">{nodeStatus}</span>
        </div>

        {result && isExecutionError(result) && (
          <p className="text-xs text-red-400 truncate mb-2">
            ✗ {result.message}
          </p>
        )}

        {result && !isExecutionError(result) && (
          <p className="text-xs text-green-400 mb-2">
            ✓ {result.rows.length} rows · {result.columns.length} cols
          </p>
        )}

        <button
          onClick={() => selectedNodeId && openResultsModal(selectedNodeId)}
          disabled={!result}
          className="w-full h-8 rounded-md text-xs font-semibold disabled:opacity-40"
          style={{
            background: result ? "#6366f1" : "#1f2937",
            color: "white",
          }}
          title={result ? "Open results" : "Run the pipeline to see results"}
        >
          Open Results
        </button>
      </div>

      {/* Node ID */}
      <div
        className="mt-auto px-4 py-3"
        style={{ borderTop: "1px solid #1e2330" }}
      >
        <p className="text-xs text-slate-700 font-mono truncate">{node.id}</p>
      </div>
    </div>
  );
}
