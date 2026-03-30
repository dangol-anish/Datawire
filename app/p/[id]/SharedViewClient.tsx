"use client";

import React, { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import { PipelineNodeCard } from "@/components/canvas/PipelineNodeCard";
import { NODE_LIST } from "@/nodes/index";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { recordRecentPipeline } from "@/lib/homeUiState";
import { useToast } from "@/components/ui/ToastProvider";

const nodeTypes: Record<string, React.ComponentType<any>> = {};
NODE_LIST.forEach((def) => {
  nodeTypes[def.type] = PipelineNodeCard;
});

export function SharedViewClient({ pipeline }: { pipeline: any }) {
  const nodes = pipeline.graph_json?.nodes ?? [];
  const edges = pipeline.graph_json?.edges ?? [];
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      recordRecentPipeline({
        scope: userId,
        id: pipeline.id,
        name: pipeline.name,
        href: `/p/${pipeline.id}`,
      });
    } catch {
      // ignore
    }
  }, [pipeline.id, pipeline.name, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (pipeline.is_public) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/pipelines/${pipeline.id}/me`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { canEdit?: boolean };
        if (cancelled) return;
        if (body?.canEdit) {
          setPromoted(true);
          router.replace(`/editor/${pipeline.id}`);
        }
      } catch {
        // ignore
      }
    };

    // Run immediately, then poll briefly to catch role changes without requiring a manual refresh.
    check();
    const t = window.setInterval(check, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pipeline.id, pipeline.is_public, router, session?.user?.id]);

  const requestEditor = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}/access-requests`, {
        method: "POST",
      });
      if (res.ok) setRequested(true);
    } finally {
      setRequesting(false);
    }
  };

  const forkPipeline = async () => {
    if (forking) return;
    setForking(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}/fork`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Fork failed");
      router.push(`/editor/${body.id}`);
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Fork failed");
    } finally {
      setForking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14]">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[#1e2330]">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-sm font-semibold text-white">
          {pipeline.name}
        </span>
        <span className="text-xs text-slate-500 ml-1">read-only</span>
        <div className="flex-1" />
        {session?.user?.id && (
          <button
            onClick={forkPipeline}
            disabled={forking || promoted}
            className="h-8 px-3 rounded-md text-xs font-semibold disabled:opacity-60"
            style={{
              background: "#0b0d12",
              border: "1px solid #1e2330",
              color: "white",
            }}
            title="Create your own copy of this pipeline"
          >
            {forking ? "Forking…" : "Fork"}
          </button>
        )}
        {session?.user?.id && !pipeline.is_public && (
          <button
            onClick={requestEditor}
            disabled={requesting || requested || promoted}
            className="h-8 px-3 rounded-md text-xs font-semibold disabled:opacity-60"
            style={{
              background: promoted ? "#1f2937" : requested ? "#1f2937" : "#6366f1",
              color: "white",
            }}
            title="Request editor access from the owner"
          >
            {promoted
              ? "Opening editor…"
              : requested
                ? "Request sent"
                : requesting
                  ? "Requesting…"
                  : "Request edit access"}
          </button>
        )}
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
