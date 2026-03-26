/**
 * UI 状态 Store — 按 ARCHITECTURE.md 要求
 *
 * 管理所有 UI 层状态：面板可见性、场景模式、过滤器等。
 */

import { create } from "zustand";

export type SidebarTab = "tasks" | "data" | "calendar" | "logs" | "alerts";
export type SceneMode = "3d" | "2d";

interface UIState {
  /** 左侧面板当前 tab */
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;

  /** 左侧面板是否折叠 */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** 员工详情面板是否打开 */
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;

  /** 场景模式：3D / 2D */
  sceneMode: SceneMode;
  setSceneMode: (mode: SceneMode) => void;

  /** 底部事件流是否显示 */
  eventFeedVisible: boolean;
  setEventFeedVisible: (visible: boolean) => void;

  /** 告警过滤：显示的最低级别 */
  alertFilter: "all" | "warning" | "error";
  setAlertFilter: (filter: "all" | "warning" | "error") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarTab: "tasks",
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  detailPanelOpen: false,
  setDetailPanelOpen: (detailPanelOpen) => set({ detailPanelOpen }),

  sceneMode: "3d",
  setSceneMode: (sceneMode) => set({ sceneMode }),

  eventFeedVisible: true,
  setEventFeedVisible: (eventFeedVisible) => set({ eventFeedVisible }),

  alertFilter: "all",
  setAlertFilter: (alertFilter) => set({ alertFilter }),
}));

/** 选择器 */
export const selectSidebarTab = (s: UIState) => s.sidebarTab;
export const selectSidebarCollapsed = (s: UIState) => s.sidebarCollapsed;
export const selectSceneMode = (s: UIState) => s.sceneMode;
export const selectDetailPanelOpen = (s: UIState) => s.detailPanelOpen;
export const selectEventFeedVisible = (s: UIState) => s.eventFeedVisible;
