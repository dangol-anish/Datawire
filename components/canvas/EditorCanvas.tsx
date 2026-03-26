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
import { PresenceCursors } from "./PresenceCursors";

// Register custom node types for ReactFlow
const nodeTypes: Record<string, React.ComponentType<any>> = {};
NODE_LIST.forEach((def) => {
  nodeTypes[def.type] = PipelineNodeCard;
});

let nodeIdCounter = 1;
function generateNodeId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

export function EditorCanvas({
  onCursorMove,
  myUserId,
}: {
  onCursorMove?: (pos: { x: number; y: number }) => void;
  myUserId?: string;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const latestCursorEventRef = useRef<React.DragEvent | React.MouseEvent | null>(
    null,
  );

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setEdges,
    setSelectedNodeId,
    pushHistory,
  } = useGraphStore();

  const flushCursor = useCallback(() => {
    cursorRafRef.current = null;
    const handler = onCursorMove;
    const ev = latestCursorEventRef.current;
    if (!handler || !ev || !reactFlowInstance || !reactFlowWrapper.current) return;

    const wrapperBounds = reactFlowWrapper.current.getBoundingClientRect();
    const clientX = (ev as any).clientX as number | undefined;
    const clientY = (ev as any).clientY as number | undefined;
    if (typeof clientX !== "number" || typeof clientY !== "number") return;

    const pos = reactFlowInstance.screenToFlowPosition({
      x: clientX - wrapperBounds.left,
      y: clientY - wrapperBounds.top,
    });
    handler(pos);
  }, [reactFlowInstance, onCursorMove]);

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

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!onCursorMove) return;
      latestCursorEventRef.current = event;
      if (cursorRafRef.current == null) {
        cursorRafRef.current = window.requestAnimationFrame(flushCursor);
      }
    },
    [flushCursor, onCursorMove],
  );

  return (
    <div className="relative flex h-full w-full">
      {/* Node palette on the left */}
      <NodePalette />

      {/* Main canvas area */}
      <div ref={reactFlowWrapper} className="flex-1 h-full" onMouseMove={onMouseMove}>
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
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
          className="bg-[#0d0f14]"
        >
          <PresenceCursors myUserId={myUserId} />
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
