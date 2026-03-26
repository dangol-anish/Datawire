"use client";

import React, { useEffect } from "react";
import ReactFlow, { Background, Controls, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import { PipelineNodeCard } from "@/components/canvas/PipelineNodeCard";
import { NODE_LIST } from "@/nodes/index";

const nodeTypes: Record<string, React.ComponentType<any>> = {};
NODE_LIST.forEach((def) => {
  nodeTypes[def.type] = PipelineNodeCard;
});

export function SharedViewClient({ pipeline }: { pipeline: any }) {
  const nodes = pipeline.graph_json?.nodes ?? [];
  const edges = pipeline.graph_json?.edges ?? [];

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14]">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[#1e2330]">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-sm font-semibold text-white">
          {pipeline.name}
        </span>
        <span className="text-xs text-slate-500 ml-1">read-only</span>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          className="bg-[#0d0f14]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#1e2330"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
