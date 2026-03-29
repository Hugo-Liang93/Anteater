import { create } from "zustand";
import type { WorkflowId } from "@/config/workflows";

export type SidebarTab = "data" | "calendar" | "logs" | "alerts";
export type SceneMode = "3d" | "2d";

interface UIState {
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;

  selectedWorkflow: WorkflowId | null;
  setSelectedWorkflow: (workflow: WorkflowId | null) => void;

  aiWorkbenchOpen: boolean;
  setAiWorkbenchOpen: (open: boolean) => void;

  sceneMode: SceneMode;
  setSceneMode: (mode: SceneMode) => void;

  eventFeedVisible: boolean;
  setEventFeedVisible: (visible: boolean) => void;

  alertFilter: "all" | "warning" | "error";
  setAlertFilter: (filter: "all" | "warning" | "error") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarTab: "data",
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  selectedWorkflow: null,
  setSelectedWorkflow: (selectedWorkflow) => set({ selectedWorkflow }),

  aiWorkbenchOpen: false,
  setAiWorkbenchOpen: (aiWorkbenchOpen) => set({ aiWorkbenchOpen }),

  sceneMode: "3d",
  setSceneMode: (sceneMode) => set({ sceneMode }),

  eventFeedVisible: true,
  setEventFeedVisible: (eventFeedVisible) => set({ eventFeedVisible }),

  alertFilter: "all",
  setAlertFilter: (alertFilter) => set({ alertFilter }),
}));

export const selectSidebarTab = (s: UIState) => s.sidebarTab;
export const selectSelectedWorkflow = (s: UIState) => s.selectedWorkflow;
export const selectAiWorkbenchOpen = (s: UIState) => s.aiWorkbenchOpen;
export const selectSceneMode = (s: UIState) => s.sceneMode;
export const selectEventFeedVisible = (s: UIState) => s.eventFeedVisible;
