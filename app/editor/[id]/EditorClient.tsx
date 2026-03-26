"use client";

import React, { useEffect, useRef } from "react";
import { useGraphStore } from "@/store/graphStore";
import { useExecutionStore } from "@/store/executionStore";
import { EditorCanvas } from "@/components/canvas/EditorCanvas";
import { EditorToolbar } from "@/components/toolbar/EditorToolbar";
import type { GraphJSON } from "@/types";
import { NodeConfigSidebar } from "@/components/sidebar/NodeConfigSidebar";
import { ResultsModal } from "@/components/results/ResultsModal";

interface Pipeline {
  id: string;
  name: string;
  graph_json: GraphJSON | null;
  is_public: boolean;
}

interface Props {
  pipeline: Pipeline;
}

export function EditorClient({ pipeline }: Props) {
  const { setNodes, setEdges, setSelectedNodeId, pushHistory } = useGraphStore();
  const { setPipelineStatus, setNodeStatus, setResult } = useExecutionStore();
  const workerRef = useRef<Worker | null>(null);

  // Initialise canvas from saved graph
  useEffect(() => {
    if (pipeline.graph_json) {
      setNodes(pipeline.graph_json.nodes ?? []);
      setEdges(pipeline.graph_json.edges ?? []);
    }
  }, [pipeline.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spin up the Web Worker once
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("@/worker/executionWorker.ts", import.meta.url),
    );

    workerRef.current.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case "NODE_RUNNING":
          setNodeStatus(msg.nodeId, "running");
          break;
        case "NODE_COMPLETE":
          setNodeStatus(msg.nodeId, "complete");
          setResult(msg.nodeId, msg.result);
          break;
        case "NODE_ERROR":
          setNodeStatus(msg.nodeId, "error");
          setResult(msg.nodeId, { nodeId: msg.nodeId, message: msg.error });
          break;
        case "CYCLE_DETECTED":
          setPipelineStatus("error");
          break;
        case "RUN_COMPLETE":
          setPipelineStatus("complete");
          break;
        case "RUN_CANCELLED":
          setPipelineStatus("idle");
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setNodeStatus, setResult, setPipelineStatus]);

  const handleRun = () => {
    const { nodes, edges } = useGraphStore.getState();

    // Build configs map expected by executor
    const configs: Record<string, Record<string, unknown>> = {};
    nodes.forEach((node) => {
      configs[node.id] = { ...node.data.config, __type: node.data.type };
    });

    setPipelineStatus("running");
    workerRef.current?.postMessage({
      type: "RUN",
      graph: { nodes, edges },
      configs,
    });
  };

  const handleSave = async () => {
    const { nodes, edges } = useGraphStore.getState();
    const graph_json: GraphJSON = { nodes, edges };

    await fetch(`/api/pipelines/${pipeline.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph_json }),
    });
  };

  const handleDeleteSelected = () => {
    const { selectedNodeId, nodes, edges } = useGraphStore.getState();
    if (!selectedNodeId) return;

    pushHistory();
    setNodes(nodes.filter((n) => n.id !== selectedNodeId));
    setEdges(
      edges.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
  };

  const handleClear = () => {
    const { nodes, edges } = useGraphStore.getState();
    if (nodes.length === 0 && edges.length === 0) return;
    const ok = window.confirm("Clear the canvas? This can be undone.");
    if (!ok) return;

    pushHistory();
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14] overflow-hidden">
      <EditorToolbar
        pipelineName={pipeline.name}
        onRun={handleRun}
        onSave={handleSave}
        onDeleteSelected={handleDeleteSelected}
        onClear={handleClear}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <EditorCanvas />
        </div>
        <NodeConfigSidebar />
      </div>
      <ResultsModal />
    </div>
  );
}
