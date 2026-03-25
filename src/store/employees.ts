import { create } from "zustand";
import type { EmployeeRoleType } from "@/config/employees";

/** 员工活动状态 — 按 ANIMATION_SPEC.md 完整定义 */
export type ActivityStatus =
  | "idle"
  | "working"
  | "thinking"      // 思考/决策中
  | "reviewing"     // 审核中（风控）
  | "alert"         // 警告（黄灯）
  | "success"       // 成功/已执行/已通过
  | "error"         // 异常（红灯）
  | "blocked"       // 被拦截（风控拒绝）
  | "disconnected"  // 失联
  | "reconnecting"; // 重连中

/** 运行时员工状态 */
export interface EmployeeState {
  role: EmployeeRoleType;
  status: ActivityStatus;
  /** 当前正在做的事（显示在气泡/点击面板） */
  currentTask: string;
  /** 最近完成的动作日志 */
  recentActions: ActionLog[];
  /** 统计数据（角色相关） */
  stats: Record<string, number | string>;
  /** 上次状态更新时间 */
  lastUpdate: number;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

interface EmployeeStore {
  employees: Record<EmployeeRoleType, EmployeeState>;

  /** 更新单个员工状态 */
  updateEmployee: (
    role: EmployeeRoleType,
    patch: Partial<Omit<EmployeeState, "role">>,
  ) => void;

  /** 给员工添加一条动作日志 */
  addAction: (role: EmployeeRoleType, log: Omit<ActionLog, "id">) => void;

  /** 当前选中查看详情的员工 */
  selectedEmployee: EmployeeRoleType | null;
  setSelectedEmployee: (role: EmployeeRoleType | null) => void;
}

const MAX_ACTIONS = 50;
let actionSeq = 0;

function makeDefaultState(role: EmployeeRoleType): EmployeeState {
  return {
    role,
    status: "idle",
    currentTask: "等待系统启动...",
    recentActions: [],
    stats: {},
    lastUpdate: Date.now(),
  };
}

const allRoles: EmployeeRoleType[] = [
  "collector",
  "analyst",
  "strategist",
  "voter",
  "risk_officer",
  "trader",
  "position_manager",
  "accountant",
  "calendar_reporter",
  "inspector",
];

const initialEmployees = Object.fromEntries(
  allRoles.map((r) => [r, makeDefaultState(r)]),
) as Record<EmployeeRoleType, EmployeeState>;

export const useEmployeeStore = create<EmployeeStore>((set) => ({
  employees: initialEmployees,
  selectedEmployee: null,

  updateEmployee: (role, patch) =>
    set((s) => ({
      employees: {
        ...s.employees,
        [role]: { ...s.employees[role], ...patch, lastUpdate: Date.now() },
      },
    })),

  addAction: (role, log) =>
    set((s) => {
      const emp = s.employees[role];
      if (!emp) return s;
      const action: ActionLog = { ...log, id: `act-${++actionSeq}` };
      const prev = emp.recentActions;
      const recentActions = prev.length >= MAX_ACTIONS
        ? [action, ...prev.slice(0, MAX_ACTIONS - 1)]
        : [action, ...prev];
      return {
        employees: {
          ...s.employees,
          [role]: { ...emp, recentActions, lastUpdate: Date.now() },
        },
      };
    }),

  setSelectedEmployee: (selectedEmployee) => set({ selectedEmployee }),
}));

/** 选择单个员工状态 */
export const selectEmployee = (role: EmployeeRoleType) =>
  (s: EmployeeStore) => s.employees[role];

/** 选择单个员工的 status 字段 */
export const selectEmployeeStatus = (role: EmployeeRoleType) =>
  (s: EmployeeStore) => s.employees[role]?.status ?? "idle";

/** 选择所有员工 */
export const selectAllEmployees = (s: EmployeeStore) => s.employees;
