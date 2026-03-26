import { create } from "zustand";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import type { NodeChange, EdgeChange } from "reactflow";
import type { PipelineNode, PipelineEdge } from "@/types";

interface GraphState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // undo/redo
  history: { nodes: PipelineNode[]; edges: PipelineEdge[] }[];
  future: { nodes: PipelineNode[]; edges: PipelineEdge[] }[];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  history: [],
  future: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as PipelineNode[],
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as PipelineEdge[],
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
      ),
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  pushHistory: () =>
    set((state) => ({
      history: [...state.history, { nodes: state.nodes, edges: state.edges }],
      future: [],
    })),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        nodes: prev.nodes,
        edges: prev.edges,
        history: state.history.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        nodes: next.nodes,
        edges: next.edges,
        history: [...state.history, { nodes: state.nodes, edges: state.edges }],
        future: state.future.slice(1),
      };
    }),
}));
