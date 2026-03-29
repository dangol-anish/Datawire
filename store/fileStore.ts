import { create } from "zustand";

export interface NodeFile {
  name: string;
  format: "csv" | "json";
  text: string;
  size: number;
  updatedAt: number;
}

interface FileState {
  files: Record<string, NodeFile>;
  setFile: (nodeId: string, file: NodeFile) => void;
  clearFile: (nodeId: string) => void;
  clearAll: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: {},
  setFile: (nodeId, file) =>
    set((s) => ({ files: { ...s.files, [nodeId]: file } })),
  clearFile: (nodeId) =>
    set((s) => {
      const next = { ...s.files };
      delete next[nodeId];
      return { files: next };
    }),
  clearAll: () => set({ files: {} }),
}));

