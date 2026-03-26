import type { GraphJSON } from "./graph";
import type { DataTable } from "./nodes";

export type WorkerInboundMessage =
  | {
      type: "RUN";
      graph: GraphJSON;
      configs: Record<string, Record<string, unknown>>;
    }
  | { type: "CANCEL" };

export type WorkerOutboundMessage =
  | { type: "NODE_COMPLETE"; nodeId: string; result: DataTable }
  | { type: "NODE_ERROR"; nodeId: string; error: string }
  | { type: "NODE_RUNNING"; nodeId: string }
  | { type: "RUN_COMPLETE" }
  | { type: "RUN_CANCELLED" }
  | { type: "CYCLE_DETECTED"; nodeIds: string[] };
