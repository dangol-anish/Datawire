import type { GraphJSON } from "./graph";
import type { DataTable } from "./nodes";

export type WorkerInboundMessage =
  | {
      type: "RUN";
      graph: GraphJSON;
      configs: Record<string, Record<string, unknown>>;
    }
  | {
      type: "GET_RESULT_PAGE";
      nodeId: string;
      page: number;
      pageSize: number;
    }
  | { type: "CANCEL" };

export type WorkerOutboundMessage =
  | {
      type: "NODE_COMPLETE";
      nodeId: string;
      result: DataTable; // may be a preview when `isPreview` is true
      totalRows: number;
      isPreview: boolean;
    }
  | { type: "NODE_ERROR"; nodeId: string; error: string }
  | { type: "NODE_RUNNING"; nodeId: string }
  | {
      type: "RESULT_PAGE";
      nodeId: string;
      page: number;
      pageSize: number;
      totalRows: number;
      result: DataTable;
      error?: string;
    }
  | { type: "RUN_COMPLETE" }
  | { type: "RUN_CANCELLED" }
  | { type: "CYCLE_DETECTED"; nodeIds: string[] };
