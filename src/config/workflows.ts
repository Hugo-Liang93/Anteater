import { EmployeeRole, type EmployeeRoleType } from "./employees";

export type WorkflowId =
  | "collection"
  | "analysis"
  | "filter"
  | "strategy"
  | "decision"
  | "execution"
  | "support";

export interface WorkflowConfig {
  id: WorkflowId;
  label: string;
  subtitle: string;
  color: string;
  roles: EmployeeRoleType[];
  sceneZones: string[];
}

export const supportWorkflowConfig: WorkflowConfig = {
  id: "support",
  label: "支撑模块",
  subtitle: "账户、日历、巡检与回测支撑",
  color: "#63b7ea",
  roles: [
    EmployeeRole.ACCOUNTANT,
    EmployeeRole.CALENDAR_REPORTER,
    EmployeeRole.INSPECTOR,
    EmployeeRole.BACKTESTER,
  ],
  sceneZones: [],
};

export const workflowConfigs: WorkflowConfig[] = [
  {
    id: "collection",
    label: "采集区",
    subtitle: "行情接入与基础快照",
    color: "#29d3b0",
    roles: [EmployeeRole.COLLECTOR],
    sceneZones: ["collection"],
  },
  {
    id: "analysis",
    label: "分析区",
    subtitle: "指标计算与结果解析",
    color: "#54cf76",
    roles: [EmployeeRole.ANALYST, EmployeeRole.LIVE_ANALYST],
    sceneZones: ["analysis"],
  },
  {
    id: "filter",
    label: "过滤区",
    subtitle: "条件过滤与候选准入",
    color: "#ffb14a",
    roles: [EmployeeRole.FILTER_GUARD],
    sceneZones: ["filter"],
  },
  {
    id: "strategy",
    label: "策略区",
    subtitle: "候选信号与盘中预览",
    color: "#a87cf7",
    roles: [EmployeeRole.STRATEGIST, EmployeeRole.LIVE_STRATEGIST],
    sceneZones: ["strategy"],
  },
  {
    id: "decision",
    label: "决策区",
    subtitle: "统一研判、投票分支与风险审批",
    color: "#ff6f8b",
    roles: [EmployeeRole.REGIME_GUARD, EmployeeRole.VOTER, EmployeeRole.RISK_OFFICER],
    sceneZones: ["decision"],
  },
  {
    id: "execution",
    label: "执行区",
    subtitle: "下单执行与持仓跟踪",
    color: "#ffd455",
    roles: [EmployeeRole.TRADER, EmployeeRole.POSITION_MANAGER],
    sceneZones: ["execution"],
  },
];

export const workflowConfigMap = new Map(
  [...workflowConfigs, supportWorkflowConfig].map((config) => [config.id, config]),
);

export const workflowByRole = new Map<EmployeeRoleType, WorkflowId>(
  [...workflowConfigs, supportWorkflowConfig].flatMap((config) =>
    config.roles.map((role) => [role, config.id] as const),
  ),
);

export function getWorkflowByRole(
  role: EmployeeRoleType | null | undefined,
): WorkflowId | null {
  if (!role) return null;
  return workflowByRole.get(role) ?? null;
}
