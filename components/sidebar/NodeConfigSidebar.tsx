// components/sidebar/NodeConfigSidebar.tsx
"use client";

import React from "react";
import { useGraphStore } from "@/store/graphStore";
import { NODE_REGISTRY } from "@/nodes/index";
import type { ConfigField } from "@/types";
import { useExecutionStore } from "@/store/executionStore";
import { isExecutionError } from "@/types";

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

            {field.type === "text" || field.type === "expression" ? (
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
