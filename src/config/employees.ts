/**
 * 员工角色定义 — 映射后端组件到虚拟工作室角色
 *
 * 每个角色对应 MT5Services 中的一个核心组件。
 * 角色 ID 用于全局唯一标识，贯穿引擎、Store、UI。
 */

export const EmployeeRole = {
  COLLECTOR: "collector",
  ANALYST: "analyst",
  LIVE_ANALYST: "live_analyst",
  STRATEGIST: "strategist",
  LIVE_STRATEGIST: "live_strategist",
  FILTER_GUARD: "filter_guard",
  REGIME_GUARD: "regime_guard",
  VOTER: "voter",
  RISK_OFFICER: "risk_officer",
  TRADER: "trader",
  POSITION_MANAGER: "position_manager",
  ACCOUNTANT: "accountant",
  CALENDAR_REPORTER: "calendar_reporter",
  INSPECTOR: "inspector",
  BACKTESTER: "backtester",
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
  zone: "collection" | "analysis" | "filter" | "strategy" | "regime" | "decision" | "support";
  /** 角色颜色（用于头像/标签） */
  color: string;
  /** 角色图标名（lucide-react） */
  icon: string;
}

/** 全部员工配置（顺序 = 数据流方向） */
export const employeeConfigs: EmployeeConfig[] = [
  // ── 采集区 ──
  {
    id: EmployeeRole.COLLECTOR,
    name: "采集员",
    title: "数据采集专员",
    backendComponent: "BackgroundIngestor",
    zone: "collection",
    color: "#4298d4",
    icon: "Download",
  },
  // ── 分析区（confirmed + intrabar 共享）──
  {
    id: EmployeeRole.ANALYST,
    name: "分析师",
    title: "技术指标分析师",
    backendComponent: "UnifiedIndicatorManager(confirmed)",
    zone: "analysis",
    color: "#4caf50",
    icon: "BarChart3",
  },
  {
    id: EmployeeRole.LIVE_ANALYST,
    name: "实时分析员",
    title: "盘中指标分析员",
    backendComponent: "UnifiedIndicatorManager(intrabar)",
    zone: "analysis",
    color: "#66bb6a",
    icon: "Activity",
  },
  // ── 过滤区（指标计算后、策略评估前）──
  {
    id: EmployeeRole.FILTER_GUARD,
    name: "过滤员",
    title: "环境条件过滤员",
    backendComponent: "SignalFilterChain",
    zone: "filter",
    color: "#ff8a65",
    icon: "Filter",
  },
  // ── 策略区（confirmed + intrabar 共享）──
  {
    id: EmployeeRole.STRATEGIST,
    name: "策略师",
    title: "信号策略评估师",
    backendComponent: "SignalModule",
    zone: "strategy",
    color: "#ab47bc",
    icon: "Brain",
  },
  {
    id: EmployeeRole.LIVE_STRATEGIST,
    name: "实时策略员",
    title: "盘中信号预览员",
    backendComponent: "SignalModule(intrabar)",
    zone: "strategy",
    color: "#ce93d8",
    icon: "Zap",
  },
  // ── 研判区（策略评估后、投票前）──
  {
    id: EmployeeRole.REGIME_GUARD,
    name: "研判员",
    title: "市场状态研判员",
    backendComponent: "RegimeDetector+AffinityGate",
    zone: "regime",
    color: "#ffab40",
    icon: "Radar",
  },
  // ── 决策区（投票 + 风控 + 交易共享）──
  {
    id: EmployeeRole.VOTER,
    name: "投票主席",
    title: "策略投票汇总",
    backendComponent: "VotingEngine",
    zone: "decision",
    color: "#fff176",
    icon: "Vote",
  },
  {
    id: EmployeeRole.RISK_OFFICER,
    name: "风控官",
    title: "风险管理审批官",
    backendComponent: "PreTradeRiskService",
    zone: "decision",
    color: "#ef5350",
    icon: "ShieldCheck",
  },
  {
    id: EmployeeRole.TRADER,
    name: "交易员",
    title: "交易执行员",
    backendComponent: "TradeExecutor",
    zone: "decision",
    color: "#f9a825",
    icon: "ArrowLeftRight",
  },
  // ── 支持区（持仓 + 财务 + 巡检 + 日历共享）──
  {
    id: EmployeeRole.POSITION_MANAGER,
    name: "仓管员",
    title: "持仓管理员",
    backendComponent: "PositionManager",
    zone: "support",
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
    color: "#26c6da",
    icon: "ScanSearch",
  },
  // ── 回测区 ──
  {
    id: EmployeeRole.BACKTESTER,
    name: "回测员",
    title: "策略回测与参数优化",
    backendComponent: "BacktestEngine",
    zone: "support",
    color: "#ff7043",
    icon: "FlaskConical",
  },
];

/** 按 ID 查找配置 */
export const employeeConfigMap = new Map(
  employeeConfigs.map((c) => [c.id, c]),
);

/** 统一的状态颜色映射 — 对齐 API_CONTRACT + ANIMATION_SPEC */
export function statusColor(status: string): string {
  switch (status) {
    case "working": return "#00d4aa";
    case "walking": return "#00d4aa";
    case "thinking": return "#90caf9";
    case "judging": return "#90caf9";
    case "waiting": return "#78909c";
    case "signal_ready": return "#ffb74d";
    case "reviewing": return "#ce93d8";
    case "approved": return "#66bb6a";
    case "submitting": return "#4fc3f7";
    case "executed": return "#66bb6a";
    case "rejected": return "#ff4757";
    case "success": return "#66bb6a";
    case "warning": return "#ffa726";
    case "alert": return "#ffa726";
    case "error": return "#ff4757";
    case "blocked": return "#ff1744";
    case "disconnected": return "#b71c1c";
    case "reconnecting": return "#ff9100";
    default: return "#5a6d7e";
  }
}
