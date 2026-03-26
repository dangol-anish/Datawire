"use client";

import React, { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  BackgroundVariant,
  type Connection,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraphStore } from "@/store/graphStore";
import { NODE_REGISTRY, NODE_LIST } from "@/nodes/index";
import { PipelineNodeCard } from "./PipelineNodeCard";
import { NodePalette } from "./NodePalette";
import type { PipelineNode } from "@/types";

// Register custom node types for ReactFlow
const nodeTypes: Record<string, React.ComponentType<any>> = {};
NODE_LIST.forEach((def) => {
  nodeTypes[def.type] = PipelineNodeCard;
});

let nodeIdCounter = 1;
function generateNodeId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

export function EditorCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setEdges,
    setSelectedNodeId,
    pushHistory,
  } = useGraphStore();

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      setEdges(addEdge({ ...connection, animated: true }, edges) as any);
    },
    [edges, setEdges, pushHistory],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Handle drag-over so the drop target is valid
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop a node from the palette onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const nodeType = event.dataTransfer.getData("application/datawire-node");
      if (!nodeType || !NODE_REGISTRY[nodeType]) return;

      const wrapperBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - wrapperBounds.left,
        y: event.clientY - wrapperBounds.top,
      });

      const def = NODE_REGISTRY[nodeType];
      const newNode: PipelineNode = {
        id: generateNodeId(),
        type: nodeType,
        position,
        data: {
          type: nodeType,
          label: def.label,
          config: {},
        },
      };

      pushHistory();
      useGraphStore.getState().setNodes([...nodes, newNode]);
    },
    [reactFlowInstance, nodes, pushHistory],
  );

  return (
    <div className="relative flex h-full w-full">
      {/* Node palette on the left */}
      <NodePalette />

      {/* Main canvas area */}
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
          className="bg-[#0d0f14]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#1e2330"
          />
          <Controls
            className="!bg-[#161b27] !border-[#2a3347] !rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-[#161b27] !border-[#2a3347] !rounded-lg"
            nodeColor={(node) => {
              const def = NODE_REGISTRY[node.data?.type];
              return def?.color ?? "#334155";
            }}
            maskColor="rgba(13,15,20,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
