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

export type EmployeePresentation = "employee" | "module";

export interface EmployeeConfig {
  id: EmployeeRoleType;
  name: string;
  title: string;
  backendComponent: string;
  zone:
    | "collection"
    | "analysis"
    | "filter"
    | "strategy"
    | "regime"
    | "decision"
    | "support";
  color: string;
  icon: string;
  responsibility: string;
  deliverable: string;
  inputs: string[];
  outputs: string[];
  presentation: EmployeePresentation;
  relatedRoles?: EmployeeRoleType[];
}

export const employeeConfigs: EmployeeConfig[] = [
  {
    id: EmployeeRole.COLLECTOR,
    name: "采集员",
    title: "行情与基础数据采集",
    backendComponent: "BackgroundIngestor",
    zone: "collection",
    color: "#4298d4",
    icon: "Download",
    responsibility: "接入 MT5 行情、K 线与基础快照，保证后续链路拿到同一份实时输入。",
    deliverable: "最新报价、K 线缓存与统一市场快照",
    inputs: ["MT5 行情流", "账户基础状态"],
    outputs: ["标准化报价", "指标计算输入", "信号引擎基础数据"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.ANALYST,
    name: "分析师",
    title: "收盘指标分析",
    backendComponent: "UnifiedIndicatorManager(confirmed)",
    zone: "analysis",
    color: "#4caf50",
    icon: "BarChart3",
    responsibility: "基于确认态 K 线计算指标，为策略区提供稳定的结构化分析结果。",
    deliverable: "确认态指标快照",
    inputs: ["采集员报价与 K 线", "指标配置"],
    outputs: ["确认态指标", "策略评估依据"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.LIVE_ANALYST,
    name: "实时分析员",
    title: "盘中指标分析",
    backendComponent: "UnifiedIndicatorManager(intrabar)",
    zone: "analysis",
    color: "#66bb6a",
    icon: "Activity",
    responsibility: "在盘中更新未确认指标，提前暴露行情变化，为预览信号提供依据。",
    deliverable: "盘中指标预览",
    inputs: ["实时行情波动", "指标配置"],
    outputs: ["盘中指标", "预览策略输入"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.FILTER_GUARD,
    name: "过滤员",
    title: "环境与条件过滤",
    backendComponent: "SignalFilterChain",
    zone: "filter",
    color: "#ff8a65",
    icon: "Filter",
    responsibility: "在策略评估前过滤低质量输入，拦截至少显著不满足交易条件的样本。",
    deliverable: "过滤结果与阻断原因",
    inputs: ["指标结果", "策略前置条件"],
    outputs: ["通过样本", "阻断原因", "过滤统计"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.REGIME_GUARD,
    name: "研判员",
    title: "市场状态研判",
    backendComponent: "RegimeDetector+AffinityGate",
    zone: "regime",
    color: "#ffab40",
    icon: "Radar",
    responsibility: "判断当前市场是否适合该类策略参与，避免在错误状态下继续推进。",
    deliverable: "市场状态标签与适配结论",
    inputs: ["候选信号", "行情结构特征"],
    outputs: ["适配结论", "状态标签", "阻断说明"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.STRATEGIST,
    name: "策略师",
    title: "确认态信号生成",
    backendComponent: "SignalModule",
    zone: "strategy",
    color: "#ab47bc",
    icon: "Brain",
    responsibility: "基于确认态指标生成正式候选信号，作为投票与风控的输入。",
    deliverable: "正式候选信号",
    inputs: ["确认态指标", "通过样本"],
    outputs: ["候选信号", "策略解释"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.LIVE_STRATEGIST,
    name: "实时策略员",
    title: "盘中信号预览",
    backendComponent: "SignalModule(intrabar)",
    zone: "strategy",
    color: "#ce93d8",
    icon: "Zap",
    responsibility: "在盘中生成预览信号，帮助提前判断机会，但不直接作为最终执行依据。",
    deliverable: "盘中预览信号",
    inputs: ["盘中指标", "通过样本"],
    outputs: ["预览信号", "盘中观察提示"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.VOTER,
    name: "投票主席",
    title: "多策略投票汇总",
    backendComponent: "VotingEngine",
    zone: "decision",
    color: "#fff176",
    icon: "Vote",
    responsibility: "汇总多策略观点，给出当前交易方向的集体结论和置信度。",
    deliverable: "投票结果与方向偏好",
    inputs: ["候选信号", "市场状态结论"],
    outputs: ["投票结论", "方向偏好", "置信度"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.RISK_OFFICER,
    name: "风控官",
    title: "交易前风险审批",
    backendComponent: "PreTradeRiskService",
    zone: "decision",
    color: "#ef5350",
    icon: "ShieldCheck",
    responsibility: "检查风险窗口、仓位限制与交易前条件，决定是否允许执行。",
    deliverable: "风控审批结论",
    inputs: ["投票结果", "风险窗口", "账户状态"],
    outputs: ["批准或拒绝结论", "风险提示", "审批理由"],
    presentation: "employee",
    relatedRoles: [
      EmployeeRole.ACCOUNTANT,
      EmployeeRole.CALENDAR_REPORTER,
      EmployeeRole.INSPECTOR,
    ],
  },
  {
    id: EmployeeRole.TRADER,
    name: "交易员",
    title: "下单执行",
    backendComponent: "TradeExecutor",
    zone: "decision",
    color: "#f9a825",
    icon: "ArrowLeftRight",
    responsibility: "接收已批准信号并执行下单，确保请求真正落到交易通道。",
    deliverable: "订单提交与执行结果",
    inputs: ["风控批准", "下单参数"],
    outputs: ["订单状态", "成交回执", "执行日志"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.POSITION_MANAGER,
    name: "仓管员",
    title: "持仓与订单跟踪",
    backendComponent: "PositionManager",
    zone: "support",
    color: "#26a69a",
    icon: "Briefcase",
    responsibility: "跟踪当前持仓与订单状态，把执行结果转换成持续监控的仓位事实。",
    deliverable: "持仓状态与盈亏快照",
    inputs: ["成交回执", "账户持仓变化"],
    outputs: ["持仓快照", "浮动盈亏", "仓位变更记录"],
    presentation: "employee",
  },
  {
    id: EmployeeRole.ACCOUNTANT,
    name: "会计模块",
    title: "账户与保证金状态",
    backendComponent: "TradingModule",
    zone: "support",
    color: "#78909c",
    icon: "Calculator",
    responsibility: "汇总账户余额、净值、保证金与可用资金，为风控审批提供账户侧事实。",
    deliverable: "账户状态、保证金水位与权益变化",
    inputs: ["成交记录", "账户状态"],
    outputs: ["余额变化", "权益快照", "保证金状态"],
    presentation: "module",
    relatedRoles: [EmployeeRole.RISK_OFFICER, EmployeeRole.TRADER],
  },
  {
    id: EmployeeRole.CALENDAR_REPORTER,
    name: "日历模块",
    title: "经济日历与风险窗口",
    backendComponent: "EconomicCalendarService",
    zone: "support",
    color: "#7e57c2",
    icon: "CalendarClock",
    responsibility: "跟踪高影响经济事件，提前给策略和风控链路提供时间窗口提醒。",
    deliverable: "风险日历窗口",
    inputs: ["经济日历事件", "风险级别配置"],
    outputs: ["风险窗口", "事件提醒", "保护建议"],
    presentation: "module",
    relatedRoles: [
      EmployeeRole.RISK_OFFICER,
      EmployeeRole.STRATEGIST,
      EmployeeRole.LIVE_STRATEGIST,
    ],
  },
  {
    id: EmployeeRole.INSPECTOR,
    name: "巡检员",
    title: "系统健康巡检",
    backendComponent: "MonitoringManager",
    zone: "support",
    color: "#26c6da",
    icon: "ScanSearch",
    responsibility: "监测各模块健康、连接状态与队列压力，把系统层问题提前暴露出来。",
    deliverable: "健康状态与告警",
    inputs: ["模块状态", "连接状态", "队列利用率"],
    outputs: ["健康报告", "异常告警", "恢复提示"],
    presentation: "employee",
    relatedRoles: [EmployeeRole.RISK_OFFICER, EmployeeRole.TRADER],
  },
  {
    id: EmployeeRole.BACKTESTER,
    name: "回测模块",
    title: "策略回测与参数优化",
    backendComponent: "BacktestEngine",
    zone: "support",
    color: "#ff7043",
    icon: "FlaskConical",
    responsibility: "评估策略在历史区间的表现，给策略侧提供参数优化与稳定性验证结果。",
    deliverable: "回测报告与参数建议",
    inputs: ["历史行情", "策略参数"],
    outputs: ["回测结果", "参数建议", "稳定性结论"],
    presentation: "module",
    relatedRoles: [EmployeeRole.STRATEGIST, EmployeeRole.LIVE_STRATEGIST],
  },
];

export const employeeConfigMap = new Map(
  employeeConfigs.map((config) => [config.id, config]),
);

export const employeePresentationRoles = employeeConfigs
  .filter((config) => config.presentation === "employee")
  .map((config) => config.id);

export const supportModuleRoles = employeeConfigs
  .filter((config) => config.presentation === "module")
  .map((config) => config.id);

export function isSupportModuleRole(role: EmployeeRoleType): boolean {
  return employeeConfigMap.get(role)?.presentation === "module";
}

export function getRelatedSupportModules(role: EmployeeRoleType): EmployeeRoleType[] {
  return supportModuleRoles.filter((moduleRole) =>
    employeeConfigMap.get(moduleRole)?.relatedRoles?.includes(role),
  );
}

export function statusColor(status: string): string {
  switch (status) {
    case "working":
    case "walking":
      return "#00d4aa";
    case "thinking":
    case "judging":
      return "#90caf9";
    case "waiting":
      return "#78909c";
    case "signal_ready":
      return "#ffb74d";
    case "reviewing":
      return "#ce93d8";
    case "approved":
    case "executed":
    case "success":
      return "#66bb6a";
    case "submitting":
      return "#4fc3f7";
    case "rejected":
    case "error":
      return "#ff4757";
    case "warning":
    case "alert":
      return "#ffa726";
    case "blocked":
      return "#ff1744";
    case "disconnected":
      return "#b71c1c";
    case "reconnecting":
      return "#ff9100";
    default:
      return "#5a6d7e";
  }
}
