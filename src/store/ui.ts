import { create } from "zustand";

type SidebarTab = "tasks" | "data" | "logs" | "alerts";

interface UIState {
  /** 左侧面板当前 tab */
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;

  /** 左侧面板是否折叠 */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarTab: "tasks",
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
