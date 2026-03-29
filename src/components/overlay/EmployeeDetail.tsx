import { lazy, Suspense } from "react";
import { AlertTriangle, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  employeeConfigMap,
  EmployeeRole,
  getRelatedSupportModules,
  isSupportModuleRole,
  statusColor,
  type EmployeeRoleType,
} from "@/config/employees";
import { getWorkflowByRole, workflowConfigMap, type WorkflowId } from "@/config/workflows";
import { buildWorkflowSummaries, buildWorkflowTodos } from "@/lib/workflowPanel";
import {
  useEmployeeStore,
  type ActionLog,
  type ActivityStatus,
  type EmployeeState,
} from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";
import type { StudioEvent } from "@/types/protocol";
import { AnalystMetrics } from "./metrics/AnalystMetrics";
import { CollectorMetrics } from "./metrics/CollectorMetrics";
import { FilterGuardMetrics } from "./metrics/FilterGuardMetrics";
import { LiveAnalystMetrics } from "./metrics/LiveAnalystMetrics";
import { LiveStrategistMetrics } from "./metrics/LiveStrategistMetrics";
import { RegimeGuardMetrics } from "./metrics/RegimeGuardMetrics";
import { RiskOfficerMetrics } from "./metrics/RiskOfficerMetrics";
import { StrategistMetrics } from "./metrics/StrategistMetrics";
import {
  AccountantMetrics,
  CalendarReporterMetrics,
  InspectorMetrics,
  PositionManagerMetrics,
} from "./metrics/SupportMetrics";
import { TraderMetrics } from "./metrics/TraderMetrics";
import { VoterMetrics } from "./metrics/VoterMetrics";

const LazyBacktesterMetrics = lazy(() =>
  import("./metrics/BacktesterMetrics").then((module) => ({
    default: module.BacktesterMetrics,
  })),
);

const STATUS_BADGE: Partial<Record<ActivityStatus, { label: string; cls: string }>> = {
  idle: { label: "空闲", cls: "bg-white/10 text-white/60" },
  working: { label: "工作中", cls: "bg-emerald-400/15 text-emerald-300" },
  walking: { label: "移动中", cls: "bg-emerald-400/15 text-emerald-300" },
  thinking: { label: "分析中", cls: "bg-sky-400/15 text-sky-300" },
  judging: { label: "判断中", cls: "bg-sky-400/15 text-sky-300" },
  waiting: { label: "等待中", cls: "bg-white/10 text-white/60" },
  signal_ready: { label: "信号就绪", cls: "bg-amber-400/15 text-amber-300" },
  reviewing: { label: "审核中", cls: "bg-fuchsia-400/15 text-fuchsia-300" },
  approved: { label: "已批准", cls: "bg-emerald-400/15 text-emerald-300" },
  submitting: { label: "提交中", cls: "bg-sky-400/15 text-sky-300" },
  executed: { label: "已执行", cls: "bg-emerald-400/15 text-emerald-300" },
  rejected: { label: "已拒绝", cls: "bg-rose-400/15 text-rose-300" },
  warning: { label: "预警", cls: "bg-amber-400/15 text-amber-300" },
  alert: { label: "告警", cls: "bg-amber-400/15 text-amber-300" },
  success: { label: "完成", cls: "bg-emerald-400/15 text-emerald-300" },
  error: { label: "异常", cls: "bg-rose-400/15 text-rose-300" },
  blocked: { label: "阻塞", cls: "bg-rose-400/15 text-rose-300" },
  disconnected: { label: "离线", cls: "bg-rose-400/15 text-rose-300" },
  reconnecting: { label: "重连中", cls: "bg-amber-400/15 text-amber-300" },
};

const LOG_COLOR: Record<ActionLog["type"], string> = {
  info: "text-white/55",
  success: "text-emerald-300",
  warning: "text-amber-300",
  error: "text-rose-300",
};

const WORKFLOW_ORDER: WorkflowId[] = [
  "collection",
  "analysis",
  "filter",
  "strategy",
  "decision",
  "execution",
  "support",
];

type SupportEvidence = {
  role: EmployeeRoleType;
  title: string;
  summary: string;
  detail: string;
};

export function EmployeeDetail() {
  const selectedEmployee = useEmployeeStore((s) => s.selectedEmployee);
  const setSelectedEmployee = useEmployeeStore((s) => s.setSelectedEmployee);
  const employees = useEmployeeStore((s) => s.employees);
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const setSelectedWorkflow = useUIStore((s) => s.setSelectedWorkflow);
  const events = useEventStore((s) => s.events);
  const indicators = useLiveStore((s) => s.indicators);
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const queues = useLiveStore((s) => s.queues);
  const quote = useMarketStore((s) => s.quotes.XAUUSD);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const health = useSignalStore((s) => s.health);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const calendarEvents = useSignalStore((s) => s.calendarEvents);
  const recentSignals = useSignalStore((s) => s.recentSignals);

  if (!selectedWorkflow && !selectedEmployee) return null;

  const runtimeInput = {
    employees,
    indicators,
    signals,
    previewSignals,
    queues,
    quote,
    positions,
    riskWindows,
    calendarEvents,
    recentSignals,
    events,
    health,
  };

  const onClose = () => {
    if (selectedEmployee) {
      setSelectedEmployee(null);
      return;
    }
    setSelectedWorkflow(null);
  };

  if (!selectedEmployee && selectedWorkflow) {
    const workflow = workflowConfigMap.get(selectedWorkflow);
    if (!workflow) return null;

    const summary = buildWorkflowSummaries(runtimeInput).find(
      (item) => item.config.id === selectedWorkflow,
    );
    const todos = buildWorkflowTodos(runtimeInput).filter(
      (item) => item.workflowId === selectedWorkflow,
    );
    const roleEntries = workflow.roles.filter((role) => !isSupportModuleRole(role));
    const moduleEntries =
      selectedWorkflow === "support"
        ? workflow.roles.filter((role) => isSupportModuleRole(role))
        : dedupeRoles(roleEntries.flatMap((role) => getRelatedSupportModules(role)));

    if (!summary) return null;

    return (
      <div className="absolute inset-y-4 right-4 z-50 w-[400px] rounded-[28px] border border-white/10 bg-[#0d1723]/95 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
        <HeaderBar
          title={workflow.label}
          subtitle={workflow.subtitle}
          badge="流程"
          color={workflow.color}
          onClose={onClose}
        />
        <div className="max-h-[calc(100vh-11rem)] space-y-4 overflow-y-auto px-4 py-4">
          <SectionCard title="对象头部">
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="当前状态" value={getWorkflowStatusLabel(summary)} />
              <StatBox label="一句话结论" value={summary.nextAction} />
            </div>
          </SectionCard>

          <SectionCard title="业务解释层">
            <div className="space-y-3">
              <StatBox label="当前卡点" value={summary.blocker} />
              <StatBox label={summary.handoffLabel} value={summary.handoffValue} />
              <StatBox label="下一步动作" value={summary.nextAction} />
              <div className="grid grid-cols-2 gap-2">
                <TagCard title="涉及角色" items={roleEntries.map(getRoleName)} />
                <TagCard title="涉及支撑模块" items={moduleEntries.map(getRoleName)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="事实层">
            <div className="grid grid-cols-2 gap-2">
              <StatBox label={summary.metricLabel} value={summary.metricValue} />
              <StatBox label={summary.secondaryMetricLabel} value={summary.secondaryMetricValue} />
            </div>
            <div className="mt-3 space-y-2">
              {todos.length === 0 ? (
                <EmptyText text="当前这段流程没有新增阻塞或风险。" />
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3"
                  >
                    <p className="text-sm text-white">{todo.title}</p>
                    <p className="mt-1 text-xs text-white/45">{todo.detail}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  const roleId = selectedEmployee!;
  const employee = employees[roleId];
  const config = employeeConfigMap.get(roleId);
  if (!employee || !config) return null;

  const workflowId = getWorkflowByRole(roleId);
  const workflow = workflowId ? workflowConfigMap.get(workflowId) : null;
  const badge = STATUS_BADGE[employee.status] ?? STATUS_BADGE.idle!;
  const flowState = buildEmployeeFlowState(
    roleId,
    employee,
    riskWindows.filter((item) => item.guard_active).length,
    queues.filter((item) => item.utilization_pct >= 80).length,
    positions.length,
    health?.status ?? "unknown",
    account?.margin && account.margin > 0 ? (account.equity / account.margin) * 100 : null,
  );
  const relatedEvents = collectRelatedEvents(events, roleId, [
    ...flowState.upstreamRoles,
    ...flowState.downstreamRoles,
  ]);
  const supportEvidence = (!isSupportModuleRole(roleId)
    ? getRelatedSupportModules(roleId)
    : []
  )
    .map((role) =>
      buildSupportEvidence(role, health?.status ?? "unknown", queues, riskWindows, account, positions.length),
    )
    .filter((item): item is SupportEvidence => Boolean(item));

  return (
    <div className="absolute inset-y-4 right-4 z-50 w-[400px] rounded-[28px] border border-white/10 bg-[#0d1723]/95 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
      <HeaderBar
        title={config.name}
        subtitle={config.title}
        badge={config.presentation === "module" ? "支撑模块" : "角色"}
        color={config.color}
        onClose={onClose}
      />
      <div className="max-h-[calc(100vh-11rem)] space-y-4 overflow-y-auto px-4 py-4">
        <SectionCard title="对象头部">
          <p className="text-sm leading-6 text-white/82">{employee.currentTask}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={cn("rounded-full px-2 py-1 text-[11px]", badge.cls)}>{badge.label}</span>
            {workflow && (
              <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[11px] text-white/60">
                {workflow.label}
              </span>
            )}
          </div>
        </SectionCard>

        <SectionCard title="业务解释层">
          <div className="space-y-3">
            <StatBox
              label={config.presentation === "module" ? "模块职责" : "业务职责"}
              value={config.responsibility}
            />
            <StatBox label="当前交接" value={flowState.handoff} />
            <StatBox label="下一步动作" value={flowState.nextAction} />
            <div className="grid grid-cols-2 gap-2">
              <TagCard title="上游输入" items={config.inputs} />
              <TagCard title="下游输出" items={config.outputs} />
              <TagCard title="上游角色" items={flowState.upstreamRoles.map(getRoleName)} />
              <TagCard title="下游角色" items={flowState.downstreamRoles.map(getRoleName)} />
            </div>

            {supportEvidence.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] tracking-[0.16em] text-white/35">上游支撑证据</div>
                {supportEvidence.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => {
                      setSelectedWorkflow(getWorkflowByRole(item.role));
                      setSelectedEmployee(item.role);
                    }}
                    className="w-full rounded-2xl border border-white/8 bg-black/10 px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-white/70">{item.summary}</p>
                        <p className="mt-1 text-xs text-white/42">{item.detail}</p>
                      </div>
                      <Link2 size={14} className="mt-0.5 text-white/30" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="事实层">
          <RoleMetrics roleId={roleId} />

          {(employee.status === "error" ||
            employee.status === "warning" ||
            employee.status === "alert" ||
            employee.status === "blocked" ||
            employee.status === "disconnected") && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3 py-3">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: statusColor(employee.status) }}
              />
              <div>
                <p className="text-sm text-rose-200">{badge.label}</p>
                <p className="mt-1 text-xs text-white/55">{employee.currentTask}</p>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <div className="text-[11px] tracking-[0.16em] text-white/35">相关事件</div>
            {relatedEvents.length === 0 ? (
              <EmptyText text="当前没有和这段交接直接相关的新事件。" />
            ) : (
              relatedEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40">{formatEventPath(event)}</span>
                    <span className="text-[11px] text-white/30">{formatClock(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/82">{event.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] tracking-[0.16em] text-white/35">最近动作</div>
            {employee.recentActions.length === 0 ? (
              <EmptyText text="还没有动作记录。" />
            ) : (
              employee.recentActions.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-3"
                >
                  <span className="shrink-0 text-[11px] text-white/35">
                    {formatClock(log.timestamp)}
                  </span>
                  <span className={cn("text-sm", LOG_COLOR[log.type])}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function HeaderBar({
  title,
  subtitle,
  badge,
  color,
  onClose,
}: {
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#09111c]"
        style={{ backgroundColor: color }}
      >
        {title[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[20px] tracking-[0.08em] text-white">{title}</p>
        <p className="truncate text-xs text-white/45">{subtitle}</p>
      </div>
      <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[11px] text-white/55">
        {badge}
      </span>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-white/38 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="font-display text-[15px] tracking-[0.08em] text-white">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3">
      <p className="text-[11px] text-white/34">{label}</p>
      <p className="mt-1 text-sm leading-6 text-white/78">{value}</p>
    </div>
  );
}

function TagCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3">
      <p className="text-[11px] text-white/34">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-white/38">暂无</span>
        ) : (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-xs text-white/65"
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-white/45">{text}</p>;
}

function RoleMetrics({ roleId }: { roleId: EmployeeRoleType }) {
  const quote = useMarketStore((s) => s.quotes.XAUUSD);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const connected = useMarketStore((s) => s.connected);
  const strategies = useSignalStore((s) => s.strategies);
  const health = useSignalStore((s) => s.health);
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const queues = useLiveStore((s) => s.queues);

  const props = { quote, account, positions, connected, strategies, health, signals, previewSignals, queues };

  switch (roleId) {
    case EmployeeRole.COLLECTOR:
      return <CollectorMetrics {...props} />;
    case EmployeeRole.ANALYST:
      return <AnalystMetrics />;
    case EmployeeRole.LIVE_ANALYST:
      return <LiveAnalystMetrics />;
    case EmployeeRole.STRATEGIST:
      return <StrategistMetrics {...props} />;
    case EmployeeRole.LIVE_STRATEGIST:
      return <LiveStrategistMetrics {...props} />;
    case EmployeeRole.FILTER_GUARD:
      return <FilterGuardMetrics />;
    case EmployeeRole.REGIME_GUARD:
      return <RegimeGuardMetrics />;
    case EmployeeRole.VOTER:
      return <VoterMetrics {...props} />;
    case EmployeeRole.RISK_OFFICER:
      return <RiskOfficerMetrics />;
    case EmployeeRole.TRADER:
      return <TraderMetrics {...props} />;
    case EmployeeRole.POSITION_MANAGER:
      return <PositionManagerMetrics {...props} />;
    case EmployeeRole.ACCOUNTANT:
      return <AccountantMetrics {...props} />;
    case EmployeeRole.CALENDAR_REPORTER:
      return <CalendarReporterMetrics {...props} />;
    case EmployeeRole.INSPECTOR:
      return <InspectorMetrics {...props} />;
    case EmployeeRole.BACKTESTER:
      return (
        <Suspense fallback={<EmptyText text="正在加载回测模块..." />}>
          <LazyBacktesterMetrics />
        </Suspense>
      );
    default:
      return null;
  }
}

function dedupeRoles(roles: EmployeeRoleType[]): EmployeeRoleType[] {
  return Array.from(new Set(roles));
}

function getRoleName(role: EmployeeRoleType): string {
  return employeeConfigMap.get(role)?.name ?? role;
}

function getWorkflowStatusLabel(summary: { abnormalCount: number; activeCount: number }) {
  if (summary.abnormalCount > 0) return "有阻塞";
  if (summary.activeCount === 0) return "等待输入";
  return "正常推进";
}

function formatClock(value: string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatEventPath(event: StudioEvent) {
  const source = employeeConfigMap.get(event.source as EmployeeRoleType)?.name ?? event.source;
  const target = event.target
    ? employeeConfigMap.get(event.target as EmployeeRoleType)?.name ?? event.target
    : null;
  return target ? `${source} -> ${target}` : source;
}

function buildEmployeeFlowState(
  role: EmployeeRoleType,
  employee: EmployeeState,
  activeRiskWindows: number,
  hotQueueCount: number,
  openPositions: number,
  healthStatus: string,
  marginLevel: number | null,
) {
  const workflowId = getWorkflowByRole(role);
  const workflow = workflowId ? workflowConfigMap.get(workflowId) : null;
  const roleIndex = workflow?.roles.indexOf(role) ?? -1;
  let upstreamRoles: EmployeeRoleType[] = [];
  let downstreamRoles: EmployeeRoleType[] = [];

  if (workflow && roleIndex >= 0) {
    if (roleIndex > 0) {
      upstreamRoles = [workflow.roles[roleIndex - 1]!];
    } else {
      const previousWorkflow = workflowConfigMap.get(
        WORKFLOW_ORDER[Math.max(WORKFLOW_ORDER.indexOf(workflow.id) - 1, 0)] ?? workflow.id,
      );
      if (previousWorkflow && previousWorkflow.id !== workflow.id) {
        upstreamRoles = [previousWorkflow.roles[previousWorkflow.roles.length - 1]!];
      }
    }

    if (roleIndex < workflow.roles.length - 1) {
      downstreamRoles = [workflow.roles[roleIndex + 1]!];
    } else {
      const nextWorkflow = workflowConfigMap.get(
        WORKFLOW_ORDER[WORKFLOW_ORDER.indexOf(workflow.id) + 1] ?? workflow.id,
      );
      if (nextWorkflow && nextWorkflow.id !== workflow.id) {
        downstreamRoles = [nextWorkflow.roles[0]!];
      }
    }
  }

  switch (role) {
    case EmployeeRole.ACCOUNTANT:
      return {
        upstreamRoles: dedupeRoles([EmployeeRole.TRADER, EmployeeRole.POSITION_MANAGER]),
        downstreamRoles: [EmployeeRole.RISK_OFFICER],
        handoff: "持续向风控官输出余额、净值、保证金与可用资金状态。",
        nextAction:
          marginLevel !== null && marginLevel < 180
            ? "优先确认保证金水位，必要时提醒风控官收紧准入。"
            : "保持账户快照刷新，确保风控读取到最新账户事实。",
      };
    case EmployeeRole.CALENDAR_REPORTER:
      return {
        upstreamRoles: [],
        downstreamRoles: dedupeRoles([
          EmployeeRole.RISK_OFFICER,
          EmployeeRole.STRATEGIST,
          EmployeeRole.LIVE_STRATEGIST,
        ]),
        handoff: "向策略区和风控官暴露高影响事件窗口与保护期。",
        nextAction:
          activeRiskWindows > 0
            ? "保持事件窗口跟踪，提醒决策区避免在保护期内放行。"
            : "继续监控近端日历，提前为策略侧打上风险标签。",
      };
    case EmployeeRole.INSPECTOR:
      return {
        upstreamRoles: [],
        downstreamRoles: dedupeRoles([EmployeeRole.RISK_OFFICER, EmployeeRole.TRADER]),
        handoff: "把系统健康、连接状态和队列压力暴露给风控与执行链路。",
        nextAction:
          healthStatus !== "healthy" || hotQueueCount > 0
            ? "优先处理降级组件和高压队列，避免拖慢主链路。"
            : "保持巡检稳定运行，继续监听关键模块告警。",
      };
    case EmployeeRole.BACKTESTER:
      return {
        upstreamRoles: [],
        downstreamRoles: [EmployeeRole.STRATEGIST, EmployeeRole.LIVE_STRATEGIST],
        handoff: "向策略层提供回测结论、参数建议与稳定性验证结果。",
        nextAction: "把新的验证结果回灌给策略区，避免策略调整脱离历史表现。",
      };
    case EmployeeRole.RISK_OFFICER:
      return {
        upstreamRoles: [EmployeeRole.VOTER],
        downstreamRoles: [EmployeeRole.TRADER],
        handoff: "等待投票结论，同时联合账户、日历与巡检证据完成交易前审批。",
        nextAction:
          activeRiskWindows > 0
            ? "先核对保护窗口和账户水位，再决定是否放行执行。"
            : "重点检查账户约束和系统健康，确认具备放行条件。",
      };
    case EmployeeRole.TRADER:
      return {
        upstreamRoles: [EmployeeRole.RISK_OFFICER],
        downstreamRoles: [EmployeeRole.POSITION_MANAGER],
        handoff: "接收已批准信号并下单，把回执交给持仓跟踪。",
        nextAction:
          openPositions > 0 ? "执行后继续核对持仓变化和成交回执。" : "等待风控放行后的新指令进入执行链。",
      };
    case EmployeeRole.POSITION_MANAGER:
      return {
        upstreamRoles: [EmployeeRole.TRADER],
        downstreamRoles: [EmployeeRole.ACCOUNTANT],
        handoff: "把成交回执整理成持仓与盈亏事实，回流到账户侧和执行监控。",
        nextAction:
          openPositions > 0 ? "持续跟踪保护状态与浮盈亏变化。" : "等待新的持仓变更进入仓位跟踪。",
      };
    default:
      return {
        upstreamRoles,
        downstreamRoles,
        handoff:
          upstreamRoles.length > 0
            ? `正在接收${upstreamRoles.map(getRoleName).join("、")}的输出，并准备交给${downstreamRoles.length > 0 ? downstreamRoles.map(getRoleName).join("、") : "下一环节"}。`
            : employee.currentTask,
        nextAction:
          downstreamRoles.length > 0
            ? `继续把结果稳定交给${downstreamRoles.map(getRoleName).join("、")}。`
            : "等待新的输入或系统调度。",
      };
  }
}

function buildSupportEvidence(
  role: EmployeeRoleType,
  healthStatus: string,
  queues: Array<{ utilization_pct: number }>,
  riskWindows: Array<{ guard_active: boolean; impact: string; event_name: string }>,
  account: {
    balance: number;
    equity: number;
    margin: number;
    free_margin: number;
  } | null,
  openPositions: number,
): SupportEvidence | null {
  switch (role) {
    case EmployeeRole.ACCOUNTANT: {
      const marginLevel = account && account.margin > 0 ? (account.equity / account.margin) * 100 : null;
      return {
        role,
        title: "账户与保证金",
        summary: account
          ? `余额 $${account.balance.toFixed(2)}，净值 $${account.equity.toFixed(2)}`
          : "等待账户状态进入支撑链",
        detail:
          marginLevel !== null
            ? `保证金水位 ${marginLevel.toFixed(0)}%，当前持仓 ${openPositions} 笔`
            : "当前暂无有效保证金水位",
      };
    }
    case EmployeeRole.CALENDAR_REPORTER: {
      const active = riskWindows.filter((item) => item.guard_active);
      const highImpact = riskWindows.filter((item) => item.impact === "high");
      return {
        role,
        title: "风险日历窗口",
        summary: active.length > 0 ? `当前有 ${active.length} 个保护窗口生效` : "当前没有激活中的保护窗口",
        detail:
          highImpact[0] ? `最近高影响事件：${highImpact[0].event_name}` : "近端没有新的高影响事件压制",
      };
    }
    case EmployeeRole.INSPECTOR: {
      const hotQueues = queues.filter((item) => item.utilization_pct >= 80).length;
      return {
        role,
        title: "系统健康巡检",
        summary: `系统状态 ${formatHealthLabel(healthStatus)}，高压队列 ${hotQueues} 个`,
        detail:
          hotQueues > 0 ? "需要确认支撑链是否拖慢主链路响应。" : "当前巡检结果没有新增队列压力。",
      };
    }
    default: {
      const config = employeeConfigMap.get(role);
      if (!config) return null;
      return {
        role,
        title: config.name,
        summary: config.deliverable,
        detail: config.responsibility,
      };
    }
  }
}

function collectRelatedEvents(
  events: StudioEvent[],
  role: EmployeeRoleType,
  linkedRoles: EmployeeRoleType[],
) {
  const roleSet = new Set<EmployeeRoleType>([
    role,
    ...linkedRoles,
    ...getRelatedSupportModules(role),
  ]);

  return events
    .filter((event) => {
      const source = event.source as EmployeeRoleType;
      const target = event.target as EmployeeRoleType | undefined;
      return roleSet.has(source) || (target ? roleSet.has(target) : false);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
}

function formatHealthLabel(status: string) {
  switch (status) {
    case "healthy":
      return "稳定";
    case "degraded":
      return "降级";
    case "unhealthy":
      return "异常";
    default:
      return "未知";
  }
}
