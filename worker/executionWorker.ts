import { buildGraph } from "@/engine/buildGraph";
import { topologicalSort } from "@/engine/topologicalSort";
import { execute } from "@/engine/executor";
import type { DataTable, WorkerInboundMessage, WorkerOutboundMessage } from "@/types";

const PREVIEW_MAX_ROWS = 250;
const lastResults: Record<string, DataTable> = {};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  if (message.type === "GET_RESULT_PAGE") {
    const nodeId = String(message.nodeId ?? "");
    const pageSize = clampInt(Number(message.pageSize), 1, 1000);
    const page = clampInt(Number(message.page), 0, 1_000_000);

    const table = lastResults[nodeId];
    if (!table) {
      const out: WorkerOutboundMessage = {
        type: "RESULT_PAGE",
        nodeId,
        page,
        pageSize,
        totalRows: 0,
        result: { columns: [], rows: [] },
        error: "No cached results for this node. Run the pipeline again.",
      };
      self.postMessage(out);
      return;
    }

    const totalRows = table.rows.length;
    const start = page * pageSize;
    const end = Math.min(start + pageSize, totalRows);
    const rows = start >= totalRows ? [] : table.rows.slice(start, end);

    const out: WorkerOutboundMessage = {
      type: "RESULT_PAGE",
      nodeId,
      page,
      pageSize,
      totalRows,
      result: { columns: table.columns, rows },
    };
    self.postMessage(out);
    return;
  }

  if (message.type !== "RUN") return;

  const { graph, configs } = message;

  // Reset cache for the new run.
  for (const k of Object.keys(lastResults)) delete lastResults[k];

  const adjacency = buildGraph(graph);
  const { sorted, cycleDetected, cycleNodes } = topologicalSort(adjacency);

  if (cycleDetected) {
    const out: WorkerOutboundMessage = {
      type: "CYCLE_DETECTED",
      nodeIds: cycleNodes,
    };
    self.postMessage(out);
    return;
  }

  await execute(
    sorted,
    adjacency,
    configs,
    (nodeId) => {
      const out: WorkerOutboundMessage = { type: "NODE_RUNNING", nodeId };
      self.postMessage(out);
    },
    (nodeId, result) => {
      lastResults[nodeId] = result;
      const totalRows = result.rows.length;
      const isPreview = totalRows > PREVIEW_MAX_ROWS;
      const preview: DataTable = isPreview
        ? { columns: result.columns, rows: result.rows.slice(0, PREVIEW_MAX_ROWS) }
        : result;
      const out: WorkerOutboundMessage = {
        type: "NODE_COMPLETE",
        nodeId,
        result: preview,
        totalRows,
        isPreview,
      };
      self.postMessage(out);
    },
    (nodeId, error) => {
      const out: WorkerOutboundMessage = { type: "NODE_ERROR", nodeId, error };
      self.postMessage(out);
    },
  );

  const out: WorkerOutboundMessage = { type: "RUN_COMPLETE" };
  self.postMessage(out);
};
