import { buildGraph } from "@/engine/buildGraph";
import { topologicalSort } from "@/engine/topologicalSort";
import { execute } from "@/engine/executor";
import type { WorkerInboundMessage, WorkerOutboundMessage } from "@/types";

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  if (message.type !== "RUN") return;

  const { graph, configs } = message;

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
      const out: WorkerOutboundMessage = {
        type: "NODE_COMPLETE",
        nodeId,
        result,
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
