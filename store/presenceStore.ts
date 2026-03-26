import { create } from "zustand";

export interface CollaboratorPresence {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

interface PresenceState {
  collaborators: Record<string, CollaboratorPresence>;
  setCollaborator: (userId: string, presence: CollaboratorPresence) => void;
  removeCollaborator: (userId: string) => void;
  clearCollaborators: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  collaborators: {},

  setCollaborator: (userId, presence) =>
    set((state) => ({
      collaborators: { ...state.collaborators, [userId]: presence },
    })),

  removeCollaborator: (userId) =>
    set((state) => {
      const next = { ...state.collaborators };
      delete next[userId];
      return { collaborators: next };
    }),

  clearCollaborators: () => set({ collaborators: {} }),
}));
