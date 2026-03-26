"use client";

import React from "react";
import { NODE_LIST } from "@/nodes/index";

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/datawire-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="flex flex-col gap-1 p-3 overflow-y-auto flex-shrink-0"
      style={{
        width: 200,
        background: "#0d0f14",
        borderRight: "1px solid #1e2330",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
        style={{ color: "#3d4f6e", letterSpacing: "0.15em" }}
      >
        Nodes
      </p>

      {NODE_LIST.map((def) => (
        <div
          key={def.type}
          draggable
          onDragStart={(e) => onDragStart(e, def.type)}
          className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing select-none"
          style={{
            border: "1px solid #1e2330",
            background: "#0d0f14",
            transition: "background 0.12s, border-color 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "#161b27";
            (e.currentTarget as HTMLDivElement).style.borderColor = "#2a3347";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "#0d0f14";
            (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2330";
          }}
        >
          {/* Color dot */}
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
            style={{ background: def.color }}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 leading-tight">
              {def.label}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 leading-tight line-clamp-2">
              {def.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
