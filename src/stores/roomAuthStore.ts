import { create } from 'zustand';

type RoomAuthState = {
  pendingPasswords: Record<string, string>;
  setPendingPassword: (roomId: string, password: string) => void;
  clearPendingPassword: (roomId: string) => void;
};

export const useRoomAuthStore = create<RoomAuthState>((set) => ({
  pendingPasswords: {},
  setPendingPassword: (roomId, password) =>
    set((state) => ({
      pendingPasswords: { ...state.pendingPasswords, [roomId]: password },
    })),
  clearPendingPassword: (roomId) =>
    set((state) => {
      const next = { ...state.pendingPasswords };
      delete next[roomId];
      return { pendingPasswords: next };
    }),
}));
