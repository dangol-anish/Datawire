import { create } from "zustand";
import type { DataTable } from "@/types";

export type NodeStatus = "idle" | "running" | "complete" | "error";

interface ExecutionState {
  results: Record<string, DataTable>;
  errors: Record<string, string>;
  nodeStatuses: Record<string, NodeStatus>;
  pipelineStatus: "idle" | "running" | "complete" | "error";

  setNodeRunning: (nodeId: string) => void;
  setNodeComplete: (nodeId: string, result: DataTable) => void;
  setNodeError: (nodeId: string, error: string) => void;
  setPipelineStatus: (
    status: "idle" | "running" | "complete" | "error",
  ) => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  results: {},
  errors: {},
  nodeStatuses: {},
  pipelineStatus: "idle",

  setNodeRunning: (nodeId) =>
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: "running" },
    })),

  setNodeComplete: (nodeId, result) =>
    set((state) => ({
      results: { ...state.results, [nodeId]: result },
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: "complete" },
    })),

  setNodeError: (nodeId, error) =>
    set((state) => ({
      errors: { ...state.errors, [nodeId]: error },
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: "error" },
    })),

  setPipelineStatus: (status) => set({ pipelineStatus: status }),

  reset: () =>
    set({ results: {}, errors: {}, nodeStatuses: {}, pipelineStatus: "idle" }),
}));
