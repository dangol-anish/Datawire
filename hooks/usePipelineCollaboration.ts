"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";
import { usePresenceStore } from "@/store/presenceStore";
import { useGraphStore } from "@/store/graphStore";
import type { PipelineEdge, PipelineNode } from "@/types";

function colorFromUserId(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 85% 60%)`;
}

type CursorPayload = {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
};

export type GraphEvent =
  | {
      type: "NODE_ADDED";
      node: PipelineNode;
    }
  | {
      type: "NODE_MOVED";
      nodeId: string;
      position: { x: number; y: number };
    }
  | {
      type: "NODE_CONFIG_CHANGED";
      nodeId: string;
      config: Record<string, unknown>;
    }
  | {
      type: "NODE_REMOVED";
      nodeId: string;
    }
  | {
      type: "EDGE_ADDED";
      edge: PipelineEdge;
    }
  | {
      type: "EDGE_REMOVED";
      edgeId: string;
    };

type GraphEnvelope = {
  eventId: string;
  actorId: string;
  pipelineId: string;
  ts: number;
  event: GraphEvent;
};

type NodeAddedEvent = Extract<GraphEvent, { type: "NODE_ADDED" }>;
type NodeMovedEvent = Extract<GraphEvent, { type: "NODE_MOVED" }>;
type NodeConfigChangedEvent = Extract<GraphEvent, { type: "NODE_CONFIG_CHANGED" }>;
type NodeRemovedEvent = Extract<GraphEvent, { type: "NODE_REMOVED" }>;
type EdgeAddedEvent = Extract<GraphEvent, { type: "EDGE_ADDED" }>;
type EdgeRemovedEvent = Extract<GraphEvent, { type: "EDGE_REMOVED" }>;

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID() as string;
  }
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function usePipelineCollaboration(args: {
  pipelineId: string;
  userId: string | null | undefined;
  username: string | null | undefined;
}) {
  const { pipelineId, userId, username } = args;

  const setCollaborator = usePresenceStore((s) => s.setCollaborator);
  const removeCollaborator = usePresenceStore((s) => s.removeCollaborator);
  const clearCollaborators = usePresenceStore((s) => s.clearCollaborators);

  const me = useMemo(() => {
    if (!userId) return null;
    return {
      userId,
      username: username?.trim() || "User",
      color: colorFromUserId(userId),
    };
  }, [userId, username]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const recentEventIdsRef = useRef<Set<string>>(new Set());

  // Cursor throttling
  const cursorPendingRef = useRef<CursorPayload | null>(null);
  const cursorRafRef = useRef<number | null>(null);

  const flushCursor = useCallback(() => {
    cursorRafRef.current = null;
    const channel = channelRef.current;
    const payload = cursorPendingRef.current;
    cursorPendingRef.current = null;
    if (!channel || !payload) return;
    channel.send({ type: "broadcast", event: "cursor", payload });
  }, []);

  const sendCursor = useCallback(
    (pos: { x: number; y: number }) => {
      const channel = channelRef.current;
      if (!me || !channel) return;

      const payload: CursorPayload = {
        userId: me.userId,
        username: me.username,
        color: me.color,
        x: pos.x,
        y: pos.y,
      };

      setCollaborator(me.userId, payload);

      cursorPendingRef.current = payload;
      if (cursorRafRef.current == null) {
        cursorRafRef.current = window.requestAnimationFrame(flushCursor);
      }
    },
    [me, setCollaborator, flushCursor],
  );

  const broadcastGraphEvent = useCallback(
    (event: GraphEvent) => {
      const channel = channelRef.current;
      if (!me || !channel) return;
      const envelope: GraphEnvelope = {
        eventId: randomId(),
        actorId: me.userId,
        pipelineId,
        ts: Date.now(),
        event,
      };
      // Also mark locally to ignore if echoed back
      recentEventIdsRef.current.add(envelope.eventId);
      channel.send({ type: "broadcast", event: "graph", payload: envelope });

      // cap set size
      if (recentEventIdsRef.current.size > 500) {
        recentEventIdsRef.current = new Set(
          Array.from(recentEventIdsRef.current).slice(-250),
        );
      }
    },
    [me, pipelineId],
  );

  useEffect(() => {
    if (!pipelineId || !me) return;

    clearCollaborators();
    recentEventIdsRef.current.clear();

    const channel = supabase.channel(`pipeline:${pipelineId}`, {
      config: { presence: { key: me.userId } },
    });
    channelRef.current = channel;

    const applyPresenceState = () => {
      const state = channel.presenceState() as Record<
        string,
        Array<Partial<CursorPayload>>
      >;

      const presentIds = new Set(Object.keys(state));
      Object.keys(usePresenceStore.getState().collaborators).forEach((id) => {
        if (!presentIds.has(id)) removeCollaborator(id);
      });

      for (const [id, presences] of Object.entries(state)) {
        const p = presences?.[0];
        if (!p) continue;
        setCollaborator(id, {
          userId: id,
          username: typeof p.username === "string" ? p.username : "User",
          color: typeof p.color === "string" ? p.color : colorFromUserId(id),
          x: typeof p.x === "number" ? p.x : -99999,
          y: typeof p.y === "number" ? p.y : -99999,
        });
      }
    };

    channel.on("presence", { event: "sync" }, applyPresenceState);
    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      const p = (newPresences as any[])?.[0] ?? {};
      setCollaborator(String(key), {
        userId: String(key),
        username: typeof p.username === "string" ? p.username : "User",
        color:
          typeof p.color === "string" ? p.color : colorFromUserId(String(key)),
        x: typeof p.x === "number" ? p.x : -99999,
        y: typeof p.y === "number" ? p.y : -99999,
      });
    });
    channel.on("presence", { event: "leave" }, ({ key }) => {
      removeCollaborator(String(key));
    });

    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const p = payload as Partial<CursorPayload>;
      if (!p?.userId) return;
      if (p.userId === me.userId) return;
      setCollaborator(p.userId, {
        userId: p.userId,
        username: typeof p.username === "string" ? p.username : "User",
        color:
          typeof p.color === "string" ? p.color : colorFromUserId(p.userId),
        x: typeof p.x === "number" ? p.x : -99999,
        y: typeof p.y === "number" ? p.y : -99999,
      });
    });

    channel.on("broadcast", { event: "graph" }, ({ payload }) => {
      const env = payload as GraphEnvelope;
      if (!env?.eventId || !env?.actorId || !env?.event) return;
      if (env.pipelineId !== pipelineId) return;
      if (env.actorId === me.userId) return;
      if (recentEventIdsRef.current.has(env.eventId)) return;
      recentEventIdsRef.current.add(env.eventId);

      const { nodes, edges } = useGraphStore.getState();
      const setNodes = useGraphStore.getState().setNodes;
      const setEdges = useGraphStore.getState().setEdges;
      const updateNodeConfig = useGraphStore.getState().updateNodeConfig;

      switch (env.event.type) {
        case "NODE_ADDED": {
          const ev = env.event as NodeAddedEvent;
          const exists = nodes.some((n) => n.id === ev.node.id);
          if (exists) return;
          setNodes([...nodes, ev.node]);
          return;
        }
        case "NODE_MOVED": {
          const ev = env.event as NodeMovedEvent;
          setNodes(
            nodes.map((n) =>
              n.id === ev.nodeId ? { ...n, position: ev.position } : n,
            ),
          );
          return;
        }
        case "NODE_CONFIG_CHANGED": {
          const ev = env.event as NodeConfigChangedEvent;
          updateNodeConfig(ev.nodeId, ev.config);
          return;
        }
        case "NODE_REMOVED": {
          const ev = env.event as NodeRemovedEvent;
          const nextNodes = nodes.filter((n) => n.id !== ev.nodeId);
          const nextEdges = edges.filter(
            (e) => e.source !== ev.nodeId && e.target !== ev.nodeId,
          );
          setNodes(nextNodes);
          setEdges(nextEdges);
          return;
        }
        case "EDGE_ADDED": {
          const ev = env.event as EdgeAddedEvent;
          const exists = edges.some((e) => e.id === ev.edge.id);
          if (exists) return;
          setEdges([...edges, ev.edge]);
          return;
        }
        case "EDGE_REMOVED": {
          const ev = env.event as EdgeRemovedEvent;
          setEdges(edges.filter((e) => e.id !== ev.edgeId));
          return;
        }
      }
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      channel.track({
        userId: me.userId,
        username: me.username,
        color: me.color,
        x: -99999,
        y: -99999,
      });
      setCollaborator(me.userId, {
        userId: me.userId,
        username: me.username,
        color: me.color,
        x: -99999,
        y: -99999,
      });
    });

    return () => {
      cursorPendingRef.current = null;
      if (cursorRafRef.current != null) {
        window.cancelAnimationFrame(cursorRafRef.current);
        cursorRafRef.current = null;
      }
      channelRef.current = null;
      clearCollaborators();
      supabase.removeChannel(channel);
    };
  }, [
    pipelineId,
    me,
    setCollaborator,
    removeCollaborator,
    clearCollaborators,
  ]);

  return { sendCursor, broadcastGraphEvent };
}
