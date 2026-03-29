import type {
  EnrichedCalendarEvent,
  HealthStatus,
  Position,
  Quote,
  RiskWindow,
  SignalEvent,
} from "@/api/types";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";
import { workflowConfigs, type WorkflowConfig, type WorkflowId } from "@/config/workflows";
import type { StudioEvent } from "@/types/protocol";
import type { EmployeeState, ActivityStatus } from "@/store/employees";
import type { IndicatorData, LiveSignal, QueueInfo } from "@/store/live";

export interface WorkflowRuntimeInput {
  employees: Record<EmployeeRoleType, EmployeeState>;
  indicators: Record<string, IndicatorData>;
  signals: LiveSignal[];
  previewSignals: LiveSignal[];
  queues: QueueInfo[];
  quote?: Quote;
  positions: Position[];
  riskWindows: RiskWindow[];
  calendarEvents: EnrichedCalendarEvent[];
  recentSignals: SignalEvent[];
  events: StudioEvent[];
  health: HealthStatus | null;
}

export interface WorkflowSummary {
  config: WorkflowConfig;
  focusRole: EmployeeRoleType;
  activeCount: number;
  abnormalCount: number;
  headline: string;
  metricLabel: string;
  metricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  handoffLabel: string;
  handoffValue: string;
  nextAction: string;
  blocker: string;
}

export interface WorkflowTodo {
  id: string;
  workflowId: WorkflowId;
  roleId?: EmployeeRoleType;
  category: "blocker" | "risk" | "opportunity";
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
}

const ACTIVE_STATUSES: ActivityStatus[] = [
  "working",
  "walking",
  "thinking",
  "judging",
  "signal_ready",
  "reviewing",
  "approved",
  "submitting",
  "executed",
  "success",
];

const ABNORMAL_STATUSES: ActivityStatus[] = [
  "warning",
  "alert",
  "error",
  "blocked",
  "disconnected",
  "reconnecting",
];

export function isWorkflowActive(status: ActivityStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isWorkflowAbnormal(status: ActivityStatus): boolean {
  return ABNORMAL_STATUSES.includes(status);
}

function formatSignedMoney(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function formatAgo(time: string | undefined): string {
  if (!time) return "--";
  const diffMs = Date.now() - new Date(time).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "--";
  if (diffMs < 60_000) return "刚刚";
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)} 分钟前`;
  return `${Math.round(diffMs / 3_600_000)} 小时前`;
}

function pickFocusRole(
  config: WorkflowConfig,
  employees: Record<EmployeeRoleType, EmployeeState>,
): EmployeeRoleType {
  return [...config.roles].sort((a, b) => {
    const aEmp = employees[a];
    const bEmp = employees[b];
    const aScore = Number(isWorkflowActive(aEmp.status));
    const bScore = Number(isWorkflowActive(bEmp.status));
    if (aScore !== bScore) return bScore - aScore;
    return bEmp.lastUpdate - aEmp.lastUpdate;
  })[0]!;
}

function getLatestIndicatorTimestamp(
  indicators: Record<string, IndicatorData>,
): string | undefined {
  return Object.values(indicators)
    .map((indicator) => indicator.timestamp)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function formatHealthStatus(health: HealthStatus | null): string {
  switch (health?.status) {
    case "healthy":
      return "稳定";
    case "degraded":
      return "降级";
    case "unhealthy":
      return "异常";
    default:
      return "--";
  }
}

function countSignalsByDirection(
  signals: Array<{ direction: "buy" | "sell" | "hold" }>,
): string {
  const counts = signals.reduce(
    (acc, signal) => {
      acc[signal.direction] += 1;
      return acc;
    },
    { buy: 0, sell: 0, hold: 0 },
  );

  if (counts.buy === 0 && counts.sell === 0 && counts.hold === 0) return "暂无方向偏向";
  if (counts.buy >= counts.sell && counts.buy >= counts.hold) return `偏多 ${counts.buy}`;
  if (counts.sell >= counts.buy && counts.sell >= counts.hold) return `偏空 ${counts.sell}`;
  return `观望 ${counts.hold}`;
}

function buildWorkflowMetrics(
  config: WorkflowConfig,
  input: WorkflowRuntimeInput,
): {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
} {
  switch (config.id) {
    case "collection":
      return {
        primaryLabel: "报价新鲜度",
        primaryValue: formatAgo(input.quote?.time),
        secondaryLabel: "当前点差",
        secondaryValue: input.quote ? input.quote.spread.toFixed(1) : "--",
      };
    case "analysis":
      return {
        primaryLabel: "指标周期",
        primaryValue: `${Object.keys(input.indicators).length} 个`,
        secondaryLabel: "最近更新",
        secondaryValue: formatAgo(getLatestIndicatorTimestamp(input.indicators)),
      };
    case "filter": {
      const stats = input.employees.filter_guard?.stats ?? {};
      const blocked = Number((stats.total_blocked as number | undefined) ?? 0);
      const passRate = Number((stats.pass_rate as number | undefined) ?? Number.NaN);
      return {
        primaryLabel: "样本通过率",
        primaryValue: Number.isFinite(passRate) ? `${passRate.toFixed(0)}%` : "--",
        secondaryLabel: "累计阻断",
        secondaryValue: `${blocked}`,
      };
    }
    case "strategy":
      return {
        primaryLabel: "正式信号",
        primaryValue: `${input.signals.length} 条`,
        secondaryLabel: "盘中预览",
        secondaryValue: `${input.previewSignals.length} 条`,
      };
    case "decision":
      return {
        primaryLabel: "待审批",
        primaryValue: `${input.previewSignals.length} 条`,
        secondaryLabel: "保护窗口",
        secondaryValue: `${input.riskWindows.filter((item) => item.guard_active).length} 个`,
      };
    case "execution": {
      const pnl = input.positions.reduce((sum, position) => sum + position.profit, 0);
      return {
        primaryLabel: "当前持仓",
        primaryValue: `${input.positions.length} 笔`,
        secondaryLabel: "浮动盈亏",
        secondaryValue: formatSignedMoney(pnl),
      };
    }
    case "support": {
      const hotQueues = input.queues.filter((queue) => queue.utilization_pct >= 80).length;
      return {
        primaryLabel: "系统健康",
        primaryValue: formatHealthStatus(input.health),
        secondaryLabel: "高压队列",
        secondaryValue: `${hotQueues} 个`,
      };
    }
  }
}

function buildWorkflowControl(
  config: WorkflowConfig,
  input: WorkflowRuntimeInput,
): {
  handoffLabel: string;
  handoffValue: string;
  nextAction: string;
} {
  switch (config.id) {
    case "collection": {
      const indicatorCount = Object.keys(input.indicators).length;
      const stale = formatAgo(input.quote?.time);
      return {
        handoffLabel: "当前交接",
        handoffValue:
          indicatorCount > 0
            ? `已向分析区提供 ${indicatorCount} 个周期输入`
            : "等待首批行情快照进入分析区",
        nextAction:
          stale === "--"
            ? "先确认行情连接和报价是否恢复。"
            : "继续观察报价新鲜度，避免采集层停摆。",
      };
    }
    case "analysis": {
      const indicatorCount = Object.keys(input.indicators).length;
      return {
        handoffLabel: "当前交接",
        handoffValue:
          indicatorCount > 0
            ? `分析结果已覆盖 ${indicatorCount} 个周期`
            : "分析结果尚未准备好",
        nextAction:
          indicatorCount > 0
            ? "重点确认确认态与盘中态是否同步输出。"
            : "等待采集区刷新后重新计算指标。",
      };
    }
    case "filter": {
      const stats = input.employees.filter_guard?.stats ?? {};
      const blocked = Number((stats.total_blocked as number | undefined) ?? 0);
      const passRate = Number((stats.pass_rate as number | undefined) ?? Number.NaN);
      return {
        handoffLabel: "当前交接",
        handoffValue: Number.isFinite(passRate)
          ? `样本通过率 ${passRate.toFixed(0)}%，已阻断 ${blocked} 条`
          : "等待过滤链输出首批样本",
        nextAction:
          blocked > 0
            ? "检查是否存在过滤过严导致策略侧缺样本。"
            : "继续确认通过样本是否顺利进入策略区。",
      };
    }
    case "strategy": {
      const total = input.signals.length + input.previewSignals.length;
      return {
        handoffLabel: "当前交接",
        handoffValue: total > 0 ? `共有 ${total} 条信号待送决策区` : "当前没有待推进的策略信号",
        nextAction:
          input.previewSignals.length > input.signals.length
            ? "优先核对盘中预览是否应升级为正式信号。"
            : "关注策略输出是否被决策区及时接收。",
      };
    }
    case "decision": {
      const guarded = input.riskWindows.filter((item) => item.guard_active).length;
      return {
        handoffLabel: "当前交接",
        handoffValue:
          input.previewSignals.length > 0
            ? `有 ${input.previewSignals.length} 条信号等待风控与执行`
            : "当前没有待审批信号",
        nextAction:
          guarded > 0
            ? "先评估保护窗口，再决定是否放行执行。"
            : `当前方向结论：${countSignalsByDirection(input.previewSignals)}`,
      };
    }
    case "execution": {
      const pnl = input.positions.reduce((sum, position) => sum + position.profit, 0);
      return {
        handoffLabel: "当前交接",
        handoffValue:
          input.positions.length > 0
            ? `已形成 ${input.positions.length} 笔在途持仓`
            : "执行链当前没有新的成交回执",
        nextAction:
          pnl < 0 ? "优先复核亏损持仓和保护设置。" : "继续跟踪成交、仓位和账户变化。",
      };
    }
    case "support": {
      const guarded = input.riskWindows.filter((item) => item.guard_active).length;
      const hotQueues = input.queues.filter((queue) => queue.utilization_pct >= 80).length;
      return {
        handoffLabel: "当前交接",
        handoffValue:
          guarded > 0 ? `已向决策区暴露 ${guarded} 个保护窗口` : "当前没有新增保护阻断",
        nextAction:
          input.health?.status === "healthy" && hotQueues === 0
            ? "维持账户、日历与巡检稳定支撑。"
            : "优先清理健康告警和高压队列，避免拖慢主链路。",
      };
    }
  }
}

export function buildWorkflowSummaries(input: WorkflowRuntimeInput): WorkflowSummary[] {
  return workflowConfigs.map((config) => {
    const focusRole = pickFocusRole(config, input.employees);
    const focusEmployee = input.employees[focusRole];
    const activeCount = config.roles.filter((role) => isWorkflowActive(input.employees[role].status)).length;
    const abnormalCount = config.roles.filter((role) => isWorkflowAbnormal(input.employees[role].status)).length;
    const metrics = buildWorkflowMetrics(config, input);
    const control = buildWorkflowControl(config, input);
    const blocker = config.roles
      .map((role) => input.employees[role])
      .find((employee) => isWorkflowAbnormal(employee.status))?.currentTask
      ?? focusEmployee.currentTask;

    return {
      config,
      focusRole,
      activeCount,
      abnormalCount,
      headline: employeeConfigMap.get(focusRole)?.name ?? focusRole,
      metricLabel: metrics.primaryLabel,
      metricValue: metrics.primaryValue,
      secondaryMetricLabel: metrics.secondaryLabel,
      secondaryMetricValue: metrics.secondaryValue,
      handoffLabel: control.handoffLabel,
      handoffValue: control.handoffValue,
      nextAction: control.nextAction,
      blocker,
    };
  });
}

export function buildWorkflowTodos(input: WorkflowRuntimeInput): WorkflowTodo[] {
  const todos: WorkflowTodo[] = [];

  for (const config of workflowConfigs) {
    for (const role of config.roles) {
      const employee = input.employees[role];
      if (!isWorkflowAbnormal(employee.status)) continue;

      todos.push({
        id: `employee-${role}`,
        workflowId: config.id,
        roleId: role,
        category:
          employee.status === "error" || employee.status === "blocked" || employee.status === "disconnected"
            ? "blocker"
            : "risk",
        severity:
          employee.status === "error" || employee.status === "blocked" || employee.status === "disconnected"
            ? "danger"
            : "warning",
        title: employee.currentTask,
        detail: employee.recentActions[0]?.message ?? employee.status,
      });
    }
  }

  for (const queue of input.queues) {
    if (queue.utilization_pct < 80) continue;
    todos.push({
      id: `queue-${queue.name}`,
      workflowId: "support",
      category: queue.utilization_pct >= 95 ? "blocker" : "risk",
      severity: queue.utilization_pct >= 95 ? "danger" : "warning",
      title: `队列 ${queue.name} 接近上限`,
      detail: `利用率 ${queue.utilization_pct.toFixed(0)}%`,
    });
  }

  for (const window of input.riskWindows) {
    if (!window.guard_active && window.impact !== "high") continue;
    todos.push({
      id: `calendar-${window.event_uid}`,
      workflowId: "support",
      category: "risk",
      severity: window.guard_active ? "danger" : "warning",
      title: `${window.currency} ${window.event_name}`,
      detail: window.guard_active ? "保护窗口已生效" : "高风险事件临近",
    });
  }

  for (const event of input.events) {
    if (event.level !== "warning" && event.level !== "error") continue;
    todos.push({
      id: `event-${event.eventId}`,
      workflowId: "support",
      category: event.level === "error" ? "blocker" : "risk",
      severity: event.level === "error" ? "danger" : "warning",
      title: event.message,
      detail: event.source,
    });
  }

  if (Object.keys(input.indicators).length > 0) {
    todos.push({
      id: "opportunity-analysis-ready",
      workflowId: "analysis",
      category: "opportunity",
      severity: "info",
      title: "指标结果已就绪",
      detail: `${Object.keys(input.indicators).length} 个周期可继续推进到策略区`,
    });
  }

  if (input.signals.length > 0) {
    todos.push({
      id: "opportunity-strategy-signals",
      workflowId: "strategy",
      category: "opportunity",
      severity: "info",
      title: "正式信号待送审",
      detail: `${input.signals.length} 条候选信号可送入决策区`,
    });
  }

  if (input.previewSignals.length > 0) {
    todos.push({
      id: "opportunity-decision-preview",
      workflowId: "decision",
      category: "opportunity",
      severity: "info",
      title: "信号等待审批",
      detail: `${input.previewSignals.length} 条预览信号待风控确认`,
    });
  }

  if (input.positions.length > 0) {
    todos.push({
      id: "opportunity-execution-positions",
      workflowId: "execution",
      category: "opportunity",
      severity: "info",
      title: "持仓反馈持续更新",
      detail: `${input.positions.length} 笔持仓可继续跟踪保护与盈亏`,
    });
  }

  const order = { blocker: 0, risk: 1, opportunity: 2 } as const;

  return todos.sort((a, b) => order[a.category] - order[b.category]).slice(0, 12);
}
