import { create } from 'zustand';
import type { Profile, Admin, AppScreen } from '../types';

interface AppState {
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;

  user: Profile | null;
  setUser: (user: Profile | null) => void;

  admin: Admin | null;
  setAdmin: (admin: Admin | null) => void;

  selectedLoadId: string | null;
  setSelectedLoadId: (id: string | null) => void;

  selectedDmUserId: string | null;
  setSelectedDmUserId: (id: string | null) => void;

  selectedChannelId: string | null;
  setSelectedChannelId: (id: string | null) => void;

  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;

  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;

  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;

  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'landing',
  setScreen: (screen) => set({ currentScreen: screen }),

  user: null,
  setUser: (user) => set({ user }),

  admin: null,
  setAdmin: (admin) => set({ admin }),

  selectedLoadId: null,
  setSelectedLoadId: (id) => set({ selectedLoadId: id }),

  selectedDmUserId: null,
  setSelectedDmUserId: (id) => set({ selectedDmUserId: id }),

  selectedChannelId: null,
  setSelectedChannelId: (id) => set({ selectedChannelId: id }),

  selectedGameId: null,
  setSelectedGameId: (id) => set({ selectedGameId: id }),

  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),

  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),

  unreadNotifications: 0,
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
}));
