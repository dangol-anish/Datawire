"use client";

import React, { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGraphStore } from "@/store/graphStore";
import { useExecutionStore } from "@/store/executionStore";
import { EditorCanvas } from "@/components/canvas/EditorCanvas";
import { EditorToolbar } from "@/components/toolbar/EditorToolbar";
import type { GraphJSON } from "@/types";
import { NodeConfigSidebar } from "@/components/sidebar/NodeConfigSidebar";
import { ResultsModal } from "@/components/results/ResultsModal";
import { usePipelineCollaboration } from "@/hooks/usePipelineCollaboration";
import { ShareDialog } from "@/components/share/ShareDialog";
import { useFileStore } from "@/store/fileStore";

interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  graph_json: GraphJSON | null;
  is_public: boolean;
}

interface Props {
  pipeline: Pipeline;
}

export function EditorClient({ pipeline }: Props) {
  const { setNodes, setEdges, setSelectedNodeId, pushHistory, undo, redo } =
    useGraphStore();
  const { setPipelineStatus, setNodeStatus, setResult } = useExecutionStore();
  const workerRef = useRef<Worker | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const myUserId = session?.user?.id;
  const myUsername = session?.user?.name || session?.user?.email || "User";
  const [shareOpen, setShareOpen] = React.useState(false);
  const isOwner = Boolean(myUserId && pipeline.user_id === myUserId);

  const { sendCursor, broadcastGraphEvent } = usePipelineCollaboration({
    pipelineId: pipeline.id,
    userId: myUserId,
    username: myUsername,
  });

  const configDebounceRef = useRef<Record<string, number>>({});
  const broadcastConfigChange = (nodeId: string, config: Record<string, unknown>) => {
    const existing = configDebounceRef.current[nodeId];
    if (existing) window.clearTimeout(existing);
    configDebounceRef.current[nodeId] = window.setTimeout(() => {
      broadcastGraphEvent({
        type: "NODE_CONFIG_CHANGED",
        nodeId,
        config,
      });
    }, 200);
  };

  // Initialise canvas from saved graph
  useEffect(() => {
    if (pipeline.graph_json) {
      setNodes(pipeline.graph_json.nodes ?? []);
      setEdges(pipeline.graph_json.edges ?? []);
    }
  }, [pipeline.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the owner downgrades this user from editor -> viewer, auto-switch them to the read-only view.
  useEffect(() => {
    if (!myUserId) return;
    if (pipeline.is_public) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/pipelines/${pipeline.id}/me`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { canEdit?: boolean; canView?: boolean };
        if (cancelled) return;
        if (body?.canEdit === false) {
          if (body?.canView) router.replace(`/p/${pipeline.id}`);
          else router.replace("/");
        }
      } catch {
        // ignore
      }
    };

    check();
    const t = window.setInterval(check, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [myUserId, pipeline.id, pipeline.is_public, router]);

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
    const files = useFileStore.getState().files;

    // Build configs map expected by executor
    const configs: Record<string, Record<string, unknown>> = {};
    nodes.forEach((node) => {
      const base = { ...node.data.config, __type: node.data.type };

      if (node.data.type === "FileInput") {
        const file = files[node.id];
        configs[node.id] = {
          ...base,
          __fileText: file?.text,
        };
      } else {
        configs[node.id] = base;
      }
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

    const res = await fetch(`/api/pipelines/${pipeline.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph_json }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg =
        (body && typeof body.error === "string" && body.error) ||
        `Save failed (${res.status})`;
      window.alert(msg);
    }
  };

  const isTypingInInput = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return el.isContentEditable;
  };

  // Keyboard shortcuts: save/undo/redo/delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const metaOrCtrl = e.metaKey || e.ctrlKey;

      // Never steal keystrokes while typing in a field (except meta/ctrl combos we handle).
      const typing = isTypingInInput();

      // Save: Cmd/Ctrl + S
      if (metaOrCtrl && (key === "s" || key === "S")) {
        e.preventDefault();
        void handleSave();
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if (metaOrCtrl && (key === "z" || key === "Z") && !e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z OR Ctrl+Y
      if (
        (metaOrCtrl && (key === "z" || key === "Z") && e.shiftKey) ||
        (e.ctrlKey && (key === "y" || key === "Y"))
      ) {
        if (typing) return;
        e.preventDefault();
        redo();
        return;
      }

      // Delete selected node: Delete/Backspace (only when not typing)
      if ((key === "Delete" || key === "Backspace") && !typing) {
        const { selectedNodeId } = useGraphStore.getState();
        if (!selectedNodeId) return;
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, pipeline.id]);

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

    broadcastGraphEvent({ type: "NODE_REMOVED", nodeId: selectedNodeId });
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

    nodes.forEach((n) =>
      broadcastGraphEvent({ type: "NODE_REMOVED", nodeId: n.id }),
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14] overflow-hidden">
      <EditorToolbar
        pipelineName={pipeline.name}
        onRun={handleRun}
        onSave={handleSave}
        onDeleteSelected={handleDeleteSelected}
        onClear={handleClear}
        onShare={() => setShareOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <EditorCanvas
            myUserId={myUserId}
            onCursorMove={(pos) => {
              sendCursor(pos);
            }}
            onNodeAdded={(node) =>
              broadcastGraphEvent({ type: "NODE_ADDED", node })
            }
            onNodeMoved={(nodeId, position) =>
              broadcastGraphEvent({ type: "NODE_MOVED", nodeId, position })
            }
            onNodeRemoved={(nodeId) =>
              broadcastGraphEvent({ type: "NODE_REMOVED", nodeId })
            }
            onEdgeAdded={(edge) =>
              broadcastGraphEvent({ type: "EDGE_ADDED", edge })
            }
            onEdgeRemoved={(edgeId) =>
              broadcastGraphEvent({ type: "EDGE_REMOVED", edgeId })
            }
          />
        </div>
        <NodeConfigSidebar
          onNodeConfigChange={(nodeId, config) => {
            broadcastConfigChange(nodeId, config);
          }}
        />
      </div>
      <ResultsModal />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        pipelineId={pipeline.id}
        isOwner={isOwner}
      />
    </div>
  );
}
