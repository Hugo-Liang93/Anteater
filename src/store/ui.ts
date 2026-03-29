import { create } from "zustand";
import type { WorkflowId } from "@/config/workflows";
import type { EmployeeRoleType } from "@/config/employees";

// ─── 右面板状态机 ───

export type RightPanelState =
  | { kind: "closed" }
  | { kind: "workflow"; workflowId: WorkflowId }
  | { kind: "employee"; workflowId: WorkflowId; employeeId: EmployeeRoleType }
  | { kind: "ai-brief" }
  | { kind: "ai-workbench" };

// ─── NavRail 导航 ───

export type NavSection = "market" | "signals" | "risk" | "positions" | "system";

// ─── Store ───

interface UIState {
  /** NavRail 当前激活的导航项（null = SecondaryPanel 收起） */
  activeNav: NavSection | null;
  setActiveNav: (section: NavSection | null) => void;

  /** 左侧栏当前展开的 workflow（用于高亮和展开 accordion） */
  selectedWorkflow: WorkflowId | null;
  setSelectedWorkflow: (workflow: WorkflowId | null) => void;

  /** 右面板状态机 */
  rightPanel: RightPanelState;
  openRightPanel: (state: RightPanelState) => void;
  closeRightPanel: () => void;

  /** 告警过滤器 */
  alertFilter: "all" | "warning" | "error";
  setAlertFilter: (filter: "all" | "warning" | "error") => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeNav: "market",
  setActiveNav: (section) =>
    set((s) => ({
      activeNav: s.activeNav === section ? null : section,
    })),

  selectedWorkflow: null,
  setSelectedWorkflow: (selectedWorkflow) => set({ selectedWorkflow }),

  rightPanel: { kind: "closed" } as RightPanelState,
  openRightPanel: (panel) =>
    set((s) => ({
      rightPanel: panel,
      selectedWorkflow:
        panel.kind === "workflow"
          ? panel.workflowId
          : panel.kind === "employee"
            ? panel.workflowId
            : s.selectedWorkflow,
    })),
  closeRightPanel: () => set({ rightPanel: { kind: "closed" } }),

  alertFilter: "all",
  setAlertFilter: (alertFilter) => set({ alertFilter }),
}));

// ─── 选择器 ───

export const selectActiveNav = (s: UIState) => s.activeNav;
export const selectSelectedWorkflow = (s: UIState) => s.selectedWorkflow;
export const selectRightPanel = (s: UIState) => s.rightPanel;

export const selectSelectedEmployee = (s: UIState): EmployeeRoleType | null =>
  s.rightPanel.kind === "employee" ? s.rightPanel.employeeId : null;

export const selectAiWorkbenchOpen = (s: UIState): boolean =>
  s.rightPanel.kind === "ai-workbench";

export const selectIsRightPanelOpen = (s: UIState): boolean =>
  s.rightPanel.kind !== "closed";
