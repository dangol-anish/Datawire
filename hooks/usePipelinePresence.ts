"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";
import { usePresenceStore } from "@/store/presenceStore";

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

export function usePipelinePresence(args: {
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

  const cursorPendingRef = useRef<CursorPayload | null>(null);
  const cursorRafRef = useRef<number | null>(null);

  const flushCursor = useCallback(() => {
    cursorRafRef.current = null;
    const channel = channelRef.current;
    const payload = cursorPendingRef.current;
    cursorPendingRef.current = null;
    if (!channel || !payload) return;

    channel.send({
      type: "broadcast",
      event: "cursor",
      payload,
    });
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

  useEffect(() => {
    if (!pipelineId || !me) return;

    clearCollaborators();

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
      // Remove anyone no longer present (best-effort; cursor broadcasts may repopulate)
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

  return { sendCursor };
}

