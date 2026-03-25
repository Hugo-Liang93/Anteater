/**
 * 员工角色定义 — 映射后端组件到虚拟工作室角色
 *
 * 每个角色对应 MT5Services 中的一个核心组件。
 * 角色 ID 用于全局唯一标识，贯穿引擎、Store、UI。
 */

export const EmployeeRole = {
  COLLECTOR: "collector",
  ANALYST: "analyst",
  STRATEGIST: "strategist",
  VOTER: "voter",
  RISK_OFFICER: "risk_officer",
  TRADER: "trader",
  POSITION_MANAGER: "position_manager",
  ACCOUNTANT: "accountant",
  CALENDAR_REPORTER: "calendar_reporter",
  INSPECTOR: "inspector",
} as const;

export type EmployeeRoleType =
  (typeof EmployeeRole)[keyof typeof EmployeeRole];

export interface EmployeeConfig {
  id: EmployeeRoleType;
  name: string;
  title: string;
  /** 对应后端组件 */
  backendComponent: string;
  /** 工作室中的区域 */
  zone: "collection" | "analysis" | "strategy" | "risk" | "trading" | "support";
  /** 角色颜色（用于头像/标签） */
  color: string;
  /** 角色图标名（lucide-react） */
  icon: string;
}

/** 全部员工配置（顺序 = 数据流方向） */
export const employeeConfigs: EmployeeConfig[] = [
  {
    id: EmployeeRole.COLLECTOR,
    name: "采集员",
    title: "数据采集专员",
    backendComponent: "BackgroundIngestor",
    zone: "collection",
    color: "#4fc3f7",
    icon: "Download",
  },
  {
    id: EmployeeRole.ANALYST,
    name: "分析师",
    title: "技术指标分析师",
    backendComponent: "UnifiedIndicatorManager",
    zone: "analysis",
    color: "#ab47bc",
    icon: "BarChart3",
  },
  {
    id: EmployeeRole.STRATEGIST,
    name: "策略师",
    title: "信号策略评估师",
    backendComponent: "SignalModule",
    zone: "strategy",
    color: "#ffb74d",
    icon: "Brain",
  },
  {
    id: EmployeeRole.VOTER,
    name: "投票主席",
    title: "策略投票汇总",
    backendComponent: "VotingEngine",
    zone: "strategy",
    color: "#fff176",
    icon: "Vote",
  },
  {
    id: EmployeeRole.RISK_OFFICER,
    name: "风控官",
    title: "风险管理审批官",
    backendComponent: "FilterChain+RiskService",
    zone: "risk",
    color: "#ef5350",
    icon: "ShieldCheck",
  },
  {
    id: EmployeeRole.TRADER,
    name: "交易员",
    title: "交易执行员",
    backendComponent: "TradeExecutor",
    zone: "trading",
    color: "#66bb6a",
    icon: "ArrowLeftRight",
  },
  {
    id: EmployeeRole.POSITION_MANAGER,
    name: "仓管员",
    title: "持仓管理员",
    backendComponent: "PositionManager",
    zone: "trading",
    color: "#26a69a",
    icon: "Briefcase",
  },
  {
    id: EmployeeRole.ACCOUNTANT,
    name: "会计",
    title: "账务核算员",
    backendComponent: "TradingModule",
    zone: "support",
    color: "#78909c",
    icon: "Calculator",
  },
  {
    id: EmployeeRole.CALENDAR_REPORTER,
    name: "日历员",
    title: "经济日历播报员",
    backendComponent: "EconomicCalendarService",
    zone: "support",
    color: "#7e57c2",
    icon: "CalendarClock",
  },
  {
    id: EmployeeRole.INSPECTOR,
    name: "巡检员",
    title: "系统健康巡检员",
    backendComponent: "MonitoringManager",
    zone: "support",
    color: "#8d6e63",
    icon: "ScanSearch",
  },
];

/** 按 ID 查找配置 */
export const employeeConfigMap = new Map(
  employeeConfigs.map((c) => [c.id, c]),
);

/** 统一的状态颜色映射 */
export function statusColor(status: string): string {
  switch (status) {
    case "working": return "#00d4aa";
    case "alert": return "#ffa726";
    case "error": return "#ff4757";
    default: return "#5a6d7e";
  }
}
