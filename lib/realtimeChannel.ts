import { supabase } from "./supabaseClient";

export function getPipelineChannel(pipelineId: string) {
  return supabase.channel(`pipeline:${pipelineId}`);
}

export type GraphBroadcastEvent =
  | { type: "NODE_MOVED"; nodeId: string; position: { x: number; y: number } }
  | {
      type: "NODE_CONFIG_CHANGED";
      nodeId: string;
      config: Record<string, unknown>;
    }
  | { type: "EDGE_ADDED"; edge: { id: string; source: string; target: string } }
  | { type: "EDGE_REMOVED"; edgeId: string }
  | { type: "NODE_ADDED"; node: object }
  | { type: "NODE_REMOVED"; nodeId: string };

export type PresenceState = {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
};
