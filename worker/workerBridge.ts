import type { WorkerInboundMessage, WorkerOutboundMessage } from "@/types";

// Singleton worker instance — one per browser tab
let worker: Worker | null = null;

export function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./executionWorker.ts", import.meta.url));
  }
  return worker;
}

export function runPipeline(
  message: Extract<WorkerInboundMessage, { type: "RUN" }>,
  onMessage: (msg: WorkerOutboundMessage) => void,
): void {
  const w = getWorker();
  w.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => onMessage(e.data);
  w.postMessage(message);
}

export function terminateWorker(): void {
  worker?.terminate();
  worker = null;
}
