// store/executionStore.ts
// Replace your existing executionStore with this full version.
// Adds setPipelineStatus, setNodeStatus, setResult actions
// that EditorClient.tsx calls from Worker messages.

import { create } from "zustand";
import type { DataTable, NodeExecutionError } from "@/types";

export type NodeStatus = "idle" | "running" | "complete" | "error";
export type PipelineStatus = "idle" | "running" | "complete" | "error";

type NodeResult = DataTable | NodeExecutionError;

interface ExecutionState {
  results: Record<string, NodeResult>;
  nodeStatuses: Record<string, NodeStatus>;
  pipelineStatus: PipelineStatus;

  resultsModalNodeId: string | null;
  openResultsModal: (nodeId: string) => void;
  closeResultsModal: () => void;

  setResult: (nodeId: string, result: NodeResult) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setPipelineStatus: (status: PipelineStatus) => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  results: {},
  nodeStatuses: {},
  pipelineStatus: "idle",

  resultsModalNodeId: null,
  openResultsModal: (nodeId) => set({ resultsModalNodeId: nodeId }),
  closeResultsModal: () => set({ resultsModalNodeId: null }),

  setResult: (nodeId, result) =>
    set((s) => ({ results: { ...s.results, [nodeId]: result } })),

  setNodeStatus: (nodeId, status) =>
    set((s) => ({ nodeStatuses: { ...s.nodeStatuses, [nodeId]: status } })),

  setPipelineStatus: (status) => set({ pipelineStatus: status }),

  reset: () =>
    set({
      results: {},
      nodeStatuses: {},
      pipelineStatus: "idle",
      resultsModalNodeId: null,
    }),
}));
