import type {
  AccountInfo,
  HealthStatus,
  Position,
  Quote,
  RiskWindow,
  SignalEvent,
} from "@/api/types";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";
import { getWorkflowByRole, workflowConfigMap, type WorkflowId } from "@/config/workflows";
import type { StudioEvent } from "@/types/protocol";
import type { EmployeeState } from "@/store/employees";
import type { IndicatorData, LiveSignal, QueueInfo } from "@/store/live";
import type {
  DecisionBrief,
  DecisionContext,
  DecisionEvidence,
  DecisionStance,
} from "@/types/decision";

export interface DecisionDeskInput {
  selectedWorkflow: WorkflowId | null;
  selectedEmployee: EmployeeRoleType | null;
  employees: Record<EmployeeRoleType, EmployeeState>;
  indicators: Record<string, IndicatorData>;
  signals: LiveSignal[];
  previewSignals: LiveSignal[];
  queues: QueueInfo[];
  quote?: Quote;
  account: AccountInfo | null;
  positions: Position[];
  riskWindows: RiskWindow[];
  recentSignals: SignalEvent[];
  health: HealthStatus | null;
  events: StudioEvent[];
}

type Direction = "buy" | "sell" | "hold";

function getRoleName(role: EmployeeRoleType | string): string {
  return employeeConfigMap.get(role as EmployeeRoleType)?.name ?? role;
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function getDirectionScore<T extends { direction: Direction; confidence?: number }>(
  list: T[],
  weight: number,
) {
  return list.reduce(
    (acc, item) => {
      const confidence = typeof item.confidence === "number" ? item.confidence : 0.5;
      acc[item.direction] += confidence * weight;
      return acc;
    },
    { buy: 0, sell: 0, hold: 0 },
  );
}

function mergeScores(
  ...scores: Array<{ buy: number; sell: number; hold: number }>
): { buy: number; sell: number; hold: number } {
  return scores.reduce(
    (acc, item) => ({
      buy: acc.buy + item.buy,
      sell: acc.sell + item.sell,
      hold: acc.hold + item.hold,
    }),
    { buy: 0, sell: 0, hold: 0 },
  );
}

function resolveStance(score: {
  buy: number;
  sell: number;
  hold: number;
}): DecisionStance {
  if (score.buy > score.sell && score.buy >= score.hold) return "偏多";
  if (score.sell > score.buy && score.sell >= score.hold) return "偏空";
  return "观望";
}

function getFocusContext(
  selectedWorkflow: WorkflowId | null,
  selectedEmployee: EmployeeRoleType | null,
) {
  if (selectedEmployee) {
    const employee = employeeConfigMap.get(selectedEmployee);
    const workflowId = getWorkflowByRole(selectedEmployee);
    const workflow = workflowId ? workflowConfigMap.get(workflowId) : null;

    return {
      workflowId,
      employeeRole: selectedEmployee,
      title: employee?.name ?? selectedEmployee,
      subtitle: workflow
        ? `当前关注 ${workflow.label} / ${employee?.title ?? "工位详情"}`
        : employee?.title ?? "工位详情",
      focusRoles: [employee?.name ?? selectedEmployee],
    };
  }

  if (selectedWorkflow) {
    const workflow = workflowConfigMap.get(selectedWorkflow);
    return {
      workflowId: selectedWorkflow,
      employeeRole: null,
      title: workflow?.label ?? "交易全局",
      subtitle: workflow?.subtitle ?? "当前关注流程态势",
      focusRoles:
        workflow?.roles.map((role) => employeeConfigMap.get(role)?.name ?? role) ?? [],
    };
  }

  return {
    workflowId: null,
    employeeRole: null,
    title: "交易全局",
    subtitle: "当前关注全链路决策上下文",
    focusRoles: ["采集员", "策略师", "风控官", "交易员"],
  };
}

export function buildDecisionContext(input: DecisionDeskInput): DecisionContext {
  const focus = getFocusContext(input.selectedWorkflow, input.selectedEmployee);
  const mergedScore = mergeScores(
    getDirectionScore(input.signals, 1),
    getDirectionScore(input.previewSignals, 0.65),
    getDirectionScore(
      input.recentSignals.map((signal) => ({
        direction: signal.direction,
        confidence: signal.confidence,
      })),
      0.45,
    ),
  );

  return {
    generatedAt: new Date().toISOString(),
    focus,
    market: {
      symbol: input.quote?.symbol ?? "XAUUSD",
      bid: input.quote?.bid,
      ask: input.quote?.ask,
      spread: input.quote?.spread,
      balance: input.account?.balance,
      equity: input.account?.equity,
      openPositionCount: input.positions.length,
      openPnl: input.positions.reduce((sum, position) => sum + position.profit, 0),
    },
    signals: {
      formalCount: input.signals.length,
      previewCount: input.previewSignals.length,
      recentCount: input.recentSignals.length,
      buyCount:
        input.signals.filter((signal) => signal.direction === "buy").length
        + input.previewSignals.filter((signal) => signal.direction === "buy").length,
      sellCount:
        input.signals.filter((signal) => signal.direction === "sell").length
        + input.previewSignals.filter((signal) => signal.direction === "sell").length,
      holdCount:
        input.signals.filter((signal) => signal.direction === "hold").length
        + input.previewSignals.filter((signal) => signal.direction === "hold").length,
      dominantBias: resolveStance(mergedScore),
    },
    risks: {
      activeGuardCount: input.riskWindows.filter((window) => window.guard_active).length,
      highImpactWindowCount: input.riskWindows.filter((window) => window.impact === "high").length,
      activeGuardLabels: input.riskWindows
        .filter((window) => window.guard_active)
        .slice(0, 4)
        .map((window) => `${window.currency} ${window.event_name}`),
      topWarnings: input.events
        .filter((event) => event.level === "warning" || event.level === "error")
        .slice(0, 4)
        .map((event) => event.message),
    },
    operations: {
      activeRoleCount: Object.values(input.employees).filter((employee) =>
        ["working", "walking", "thinking", "judging", "reviewing", "submitting"].includes(
          employee.status,
        ),
      ).length,
      abnormalRoleCount: Object.values(input.employees).filter((employee) =>
        ["warning", "alert", "error", "blocked", "disconnected", "reconnecting"].includes(
          employee.status,
        ),
      ).length,
      disconnectedRoleCount: Object.values(input.employees).filter(
        (employee) => employee.status === "disconnected",
      ).length,
      queuePressureCount: input.queues.filter((queue) => queue.utilization_pct >= 80).length,
      queuePressures: input.queues
        .filter((queue) => queue.utilization_pct >= 80)
        .slice(0, 4)
        .map((queue) => ({
          name: queue.name,
          utilizationPct: queue.utilization_pct,
        })),
    },
    system: {
      healthStatus: input.health?.status ?? "unknown",
      currentTasks: Object.values(input.employees).slice(0, 8).map((employee) => ({
        role: getRoleName(employee.role),
        status: employee.status,
        task: employee.currentTask,
      })),
    },
    recentEvents: input.events.slice(0, 8).map((event) => ({
      source: getRoleName(event.source),
      target: event.target ? getRoleName(event.target) : undefined,
      level: event.level,
      message: event.message,
      createdAt: event.createdAt,
    })),
  };
}

function buildEvidence(context: DecisionContext): DecisionEvidence[] {
  return [
    {
      title: "策略倾向",
      value: `${context.signals.formalCount} 条正式 / ${context.signals.previewCount} 条预览`,
      tone:
        context.signals.formalCount > 0 || context.signals.previewCount > 0
          ? "positive"
          : "neutral",
    },
    {
      title: "市场点差",
      value:
        context.market.spread != null ? `${context.market.spread.toFixed(1)}` : "--",
      tone:
        context.market.spread != null && context.market.spread > 0.5
          ? "warning"
          : "positive",
    },
    {
      title: "风险保护",
      value:
        context.risks.activeGuardCount > 0
          ? `${context.risks.activeGuardCount} 个保护窗口生效`
          : "当前无保护阻断",
      tone: context.risks.activeGuardCount > 0 ? "danger" : "positive",
    },
    {
      title: "执行暴露",
      value:
        context.market.openPositionCount > 0
          ? `${context.market.openPositionCount} 笔 / ${formatSigned(context.market.openPnl)}`
          : "当前无持仓暴露",
      tone:
        context.market.openPositionCount === 0
          ? "neutral"
          : context.market.openPnl < 0
            ? "warning"
            : "positive",
    },
    {
      title: "系统健康",
      value:
        context.system.healthStatus === "healthy"
          ? "稳定"
          : context.system.healthStatus === "degraded"
            ? "降级"
            : context.system.healthStatus === "unhealthy"
              ? "异常"
              : "待确认",
      tone:
        context.system.healthStatus === "unhealthy"
          ? "danger"
          : context.system.healthStatus === "degraded"
            ? "warning"
            : "positive",
    },
    {
      title: "队列压力",
      value:
        context.operations.queuePressureCount > 0
          ? `${context.operations.queuePressureCount} 个队列高压`
          : "当前无高压队列",
      tone: context.operations.queuePressureCount > 0 ? "warning" : "positive",
    },
  ];
}

function buildConflicts(
  context: DecisionContext,
  stance: DecisionStance,
): string[] {
  const conflicts: string[] = [];

  if (context.signals.buyCount > 0 && context.signals.sellCount > 0) {
    conflicts.push("当前多空信号同时存在，策略共识不足。");
  }
  if (context.market.spread != null && context.market.spread > 0.5) {
    conflicts.push("当前点差偏大，执行成本上升。");
  }
  if (stance !== "观望" && context.market.openPositionCount > 0) {
    conflicts.push("已有持仓暴露，新动作前需要先确认是否叠加风险。");
  }
  if (context.risks.topWarnings.length > 0) {
    conflicts.push("最近存在预警事件，建议先核对异常来源。");
  }

  return conflicts.slice(0, 3);
}

function buildRisks(context: DecisionContext): string[] {
  const risks: string[] = [];

  if (context.risks.activeGuardCount > 0) {
    risks.push(`当前有 ${context.risks.activeGuardCount} 个保护窗口生效，短线动作容易被风控拦截。`);
  }
  if (context.system.healthStatus === "degraded") {
    risks.push("系统处于降级状态，建议降低对实时信号的依赖。");
  }
  if (context.system.healthStatus === "unhealthy") {
    risks.push("系统健康异常，当前建议不应直接转化为执行动作。");
  }
  if (context.operations.disconnectedRoleCount > 0) {
    risks.push(`${context.operations.disconnectedRoleCount} 个工位离线，链路上下文可能不完整。`);
  }

  return risks.slice(0, 3);
}

function buildInvalidations(
  context: DecisionContext,
  stance: DecisionStance,
): string[] {
  const invalidations = [
    "风控窗口转为激活保护状态。",
    "系统健康降级为异常或核心工位离线。",
    "点差持续扩大并显著抬高执行成本。",
  ];

  if (stance !== "观望") {
    invalidations.unshift("多空方向重新分裂，正式信号与盘中预览不再同向。");
  }
  if (context.market.openPositionCount > 0) {
    invalidations.push("现有持仓盈亏快速恶化，需要先处理已有关联暴露。");
  }

  return invalidations.slice(0, 4);
}

function buildRecommendedAction(
  context: DecisionContext,
  stance: DecisionStance,
) {
  const unhealthy = context.system.healthStatus === "unhealthy";
  const degraded = context.system.healthStatus === "degraded";
  const activeGuard = context.risks.activeGuardCount;
  const spreadHigh = context.market.spread != null && context.market.spread > 0.5;
  const hasFormalSignals = context.signals.formalCount > 0;
  const hasPreviewSignals = context.signals.previewCount > 0;

  if (unhealthy || activeGuard > 0) {
    return {
      action: "暂停推进",
      hint: "先处理系统或风控阻断，再考虑恢复决策链路。",
      summary: "当前风险或系统约束高于交易机会，建议暂缓新增动作。",
    };
  }

  if (degraded || spreadHigh) {
    return {
      action: "等待确认",
      hint: "先等待系统恢复或执行成本回落，再决定是否继续推进。",
      summary: "当前执行条件不稳，更适合继续确认而不是立刻动作。",
    };
  }

  if (stance === "偏多" || stance === "偏空") {
    if (hasFormalSignals) {
      return {
        action: "小仓位试单",
        hint: "先由风控官复核，再用小仓位验证当前方向是否延续。",
        summary: `当前 ${stance} 证据更强，适合在风控允许前提下小步验证。`,
      };
    }
    if (hasPreviewSignals) {
      return {
        action: "等待确认",
        hint: "当前更多是盘中预览，先确认是否升级为正式信号。",
        summary: `当前 ${stance} 倾向已经出现，但仍缺少足够的确认态证据。`,
      };
    }
  }

  return {
    action: "继续观察",
    hint: "继续跟踪策略一致性、风险窗口和执行条件是否改善。",
    summary: "当前更适合把注意力放在信息收集和冲突消解上，而不是直接行动。",
  };
}

export function buildHeuristicDecisionBrief(
  context: DecisionContext,
): DecisionBrief {
  const mergedScore = mergeScores(
    {
      buy: context.signals.buyCount,
      sell: context.signals.sellCount,
      hold: context.signals.holdCount,
    },
    {
      buy: context.signals.formalCount * 0.2,
      sell: context.signals.previewCount * 0.05,
      hold: context.market.openPositionCount * 0.05,
    },
  );

  const stance = resolveStance(mergedScore);
  const guardPenalty = context.risks.activeGuardCount * 10;
  const healthPenalty =
    context.system.healthStatus === "unhealthy"
      ? 24
      : context.system.healthStatus === "degraded"
        ? 12
        : 0;
  const disagreementPenalty =
    context.signals.buyCount > 0 && context.signals.sellCount > 0 ? 8 : 0;
  const spreadPenalty =
    context.market.spread != null && context.market.spread > 0.5 ? 8 : 0;
  const supportScore = Math.max(mergedScore.buy, mergedScore.sell, mergedScore.hold);
  const confidence = Math.max(
    28,
    Math.min(
      92,
      Math.round(
        46
          + supportScore * 8
          - guardPenalty
          - healthPenalty
          - disagreementPenalty
          - spreadPenalty,
      ),
    ),
  );

  const action = buildRecommendedAction(context, stance);

  return {
    focusTitle: context.focus.title,
    focusSubtitle: context.focus.subtitle,
    stance,
    confidence,
    summary: action.summary,
    recommendedAction: action.action,
    actionHint: action.hint,
    evidence: buildEvidence(context),
    conflicts: buildConflicts(context, stance),
    risks: buildRisks(context),
    invalidations: buildInvalidations(context, stance),
    focusRoles: context.focus.focusRoles,
    generatedAt: context.generatedAt,
    source: "heuristic",
    sourceLabel: "规则推导",
  };
}

export function normalizeDecisionBrief(
  payload: Partial<DecisionBrief> | null | undefined,
  fallback: DecisionBrief,
  source: DecisionBrief["source"],
  sourceLabel: string,
): DecisionBrief {
  if (!payload) {
    return {
      ...fallback,
      source,
      sourceLabel,
    };
  }

  return {
    focusTitle: payload.focusTitle ?? fallback.focusTitle,
    focusSubtitle: payload.focusSubtitle ?? fallback.focusSubtitle,
    stance: payload.stance ?? fallback.stance,
    confidence: payload.confidence ?? fallback.confidence,
    summary: payload.summary ?? fallback.summary,
    recommendedAction: payload.recommendedAction ?? fallback.recommendedAction,
    actionHint: payload.actionHint ?? fallback.actionHint,
    evidence: payload.evidence?.length ? payload.evidence : fallback.evidence,
    conflicts: payload.conflicts?.length ? payload.conflicts : fallback.conflicts,
    risks: payload.risks?.length ? payload.risks : fallback.risks,
    invalidations: payload.invalidations?.length ? payload.invalidations : fallback.invalidations,
    focusRoles: payload.focusRoles?.length ? payload.focusRoles : fallback.focusRoles,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source,
    sourceLabel,
  };
}
