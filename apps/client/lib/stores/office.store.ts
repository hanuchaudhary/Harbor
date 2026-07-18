import { create } from "zustand";

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  lastSeenAt: Date | string;
  image?: string | null;
}

interface OfficeState {
  activeUsers: ActiveUser[];
  setActiveUsers: (users: ActiveUser[]) => void;
  updateUser: (userId: string, updates: Partial<ActiveUser>) => void;
  removeUser: (userId: string) => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  activeUsers: [],

  setActiveUsers: (users) => set({ activeUsers: users }),

  updateUser: (userId, updates) =>
    set((s) => ({
      activeUsers: s.activeUsers.map((u) =>
        u.id === userId ? { ...u, ...updates } : u,
      ),
    })),

  removeUser: (userId) =>
    set((s) => ({ activeUsers: s.activeUsers.filter((u) => u.id !== userId) })),
}));
