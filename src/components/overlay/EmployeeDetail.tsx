import { lazy, Suspense, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Link2, X } from "lucide-react";
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
  type ActivityStatus,
  type EmployeeState,
} from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useUIStore, selectSelectedEmployee } from "@/store/ui";
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
  import("./metrics/BacktesterMetrics").then((m) => ({ default: m.BacktesterMetrics })),
);

// ─── Status badge 映射 ───

const STATUS_BADGE: Partial<Record<ActivityStatus, { label: string; cls: string }>> = {
  idle: { label: "空闲", cls: "bg-white/10 text-white/60" },
  working: { label: "工作中", cls: "bg-emerald-400/15 text-emerald-300" },
  thinking: { label: "分析中", cls: "bg-sky-400/15 text-sky-300" },
  reviewing: { label: "审核中", cls: "bg-fuchsia-400/15 text-fuchsia-300" },
  warning: { label: "预警", cls: "bg-amber-400/15 text-amber-300" },
  alert: { label: "告警", cls: "bg-amber-400/15 text-amber-300" },
  error: { label: "异常", cls: "bg-rose-400/15 text-rose-300" },
  blocked: { label: "阻塞", cls: "bg-rose-400/15 text-rose-300" },
  disconnected: { label: "离线", cls: "bg-rose-400/15 text-rose-300" },
  reconnecting: { label: "重连中", cls: "bg-amber-400/15 text-amber-300" },
};

const WORKFLOW_ORDER: WorkflowId[] = [
  "collection", "analysis", "filter", "strategy", "decision", "execution",
];

// ─── 主组件 ───

export function EmployeeDetail() {
  const selectedEmployee = useUIStore(selectSelectedEmployee);
  const rightPanel = useUIStore((s) => s.rightPanel);
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const closeRightPanel = useUIStore((s) => s.closeRightPanel);
  const employees = useEmployeeStore((s) => s.employees);
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

  const panelWorkflowId =
    rightPanel.kind === "workflow" ? rightPanel.workflowId
    : rightPanel.kind === "employee" ? rightPanel.workflowId
    : null;

  const runtimeInput = {
    employees, indicators, signals, previewSignals, queues, quote,
    positions, riskWindows, calendarEvents, recentSignals, events, health,
  };

  // ═══ Workflow 视图 ═══
  if (!selectedEmployee && panelWorkflowId) {
    const workflow = workflowConfigMap.get(panelWorkflowId);
    if (!workflow) return null;
    const summary = buildWorkflowSummaries(runtimeInput).find((s) => s.config.id === panelWorkflowId);
    const todos = buildWorkflowTodos(runtimeInput).filter((t) => t.workflowId === panelWorkflowId);
    if (!summary) return null;

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <CompactHeader
          name={workflow.label}
          subtitle={workflow.subtitle}
          color={workflow.color}
          badge={getWorkflowStatusLabel(summary)}
          badgeCls={summary.abnormalCount > 0 ? "bg-rose-400/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300"}
          onClose={closeRightPanel}
        />
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {/* 关键指标 */}
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label={summary.metricLabel} value={summary.metricValue} />
            <MiniStat label={summary.secondaryMetricLabel} value={summary.secondaryMetricValue} />
          </div>

          {/* 卡点 */}
          {summary.blocker !== "无" && summary.blocker !== "" && (
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 px-3 py-2">
              <span className="text-[13px] text-amber-300/70">当前卡点</span>
              <p className="text-[13px] text-amber-200">{summary.blocker}</p>
            </div>
          )}

          {/* 待处理 */}
          {todos.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[13px] text-white/35">待处理 ({todos.length})</span>
              {todos.slice(0, 4).map((todo) => (
                <div key={todo.id} className="rounded-xl border border-white/6 bg-black/10 px-2.5 py-2">
                  <p className="text-[13px] text-white/80">{todo.title}</p>
                  <p className="mt-0.5 text-[13px] text-white/40">{todo.detail}</p>
                </div>
              ))}
            </div>
          )}

          {/* 涉及角色 */}
          <div className="flex flex-wrap gap-1">
            {workflow.roles.map((role) => {
              const cfg = employeeConfigMap.get(role);
              return (
                <button
                  key={role}
                  onClick={() => openRightPanel({ kind: "employee", workflowId: workflow.id, employeeId: role })}
                  className="rounded-lg border border-white/6 bg-white/[0.03] px-2 py-1 text-[13px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  {cfg?.name ?? role}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══ Employee 视图 ═══
  const roleId = selectedEmployee!;
  const employee = employees[roleId];
  const config = employeeConfigMap.get(roleId);
  if (!employee || !config) return null;

  const workflowId = panelWorkflowId ?? getWorkflowByRole(roleId);
  const workflow = workflowId ? workflowConfigMap.get(workflowId) : null;
  const badge = STATUS_BADGE[employee.status] ?? STATUS_BADGE.idle!;
  const isSupportModule = isSupportModuleRole(roleId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CompactHeader
        name={config.name}
        subtitle={employee.currentTask}
        color={config.color}
        badge={badge.label}
        badgeCls={badge.cls}
        onClose={closeRightPanel}
        extra={
          isSupportModule ? (
            <span className="rounded-lg border border-white/8 bg-black/10 px-1.5 py-0.5 text-[13px] text-white/45">
              支撑模块
            </span>
          ) : workflow ? (
            <span className="rounded-lg border border-white/8 bg-black/10 px-1.5 py-0.5 text-[13px] text-white/45">
              {workflow.label}
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* 异常告警（置顶） */}
        {isAbnormal(employee.status) && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: statusColor(employee.status) }} />
            <p className="text-[13px] text-rose-200">{employee.currentTask}</p>
          </div>
        )}

        {/* 核心指标（最重要，放最前面） */}
        <RoleMetrics roleId={roleId} />

        {/* 业务上下文（可折叠，默认收起） */}
        <CollapsibleSection title={isSupportModule ? "证据上下文" : "业务上下文"} defaultOpen={false}>
          <BusinessContext roleId={roleId} employee={employee} riskWindows={riskWindows} queues={queues} positions={positions} health={health} account={account} openRightPanel={openRightPanel} workflowId={workflowId} />
        </CollapsibleSection>

        {/* 相关事件（可折叠） */}
        <CollapsibleSection title={isSupportModule ? "证据动态" : "相关事件"} defaultOpen={false}>
          <RelatedEvents roleId={roleId} employee={employee} events={events} riskWindows={riskWindows} queues={queues} positions={positions} health={health} account={account} />
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─── 紧凑头部 ───

function CompactHeader({ name, subtitle, color, badge, badgeCls, onClose, extra }: {
  name: string; subtitle: string; color: string; badge: string; badgeCls: string;
  onClose: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/8 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-[#09111c]" style={{ backgroundColor: color }}>
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{name}</span>
          <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[13px]", badgeCls)}>{badge}</span>
          {extra}
        </div>
        <p className="truncate text-[13px] text-white/45">{subtitle}</p>
      </div>
      <button onClick={onClose} className="shrink-0 rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-white/60">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── 可折叠区域 ───

function CollapsibleSection({ title, defaultOpen, children }: {
  title: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-[13px] text-white/40">{title}</span>
        {open ? <ChevronDown size={12} className="text-white/30" /> : <ChevronRight size={12} className="text-white/30" />}
      </button>
      {open && <div className="border-t border-white/4 px-3 py-2.5">{children}</div>}
    </div>
  );
}

// ─── 迷你统计 ───

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/10 px-2.5 py-2">
      <p className="text-[13px] text-white/30">{label}</p>
      <p className="mt-0.5 text-[13px] text-white/75">{value}</p>
    </div>
  );
}

// ─── 业务上下文（折叠内容） ───

function BusinessContext({ roleId, employee, riskWindows, queues, positions, health, account, openRightPanel, workflowId }: {
  roleId: EmployeeRoleType; employee: EmployeeState;
  riskWindows: Array<{ guard_active: boolean; impact: string; event_name: string }>;
  queues: Array<{ utilization_pct: number }>;
  positions: Array<unknown>; health: { status: string } | null;
  account: { balance: number; equity: number; margin: number; free_margin: number } | null;
  openRightPanel: (s: import("@/store/ui").RightPanelState) => void;
  workflowId: WorkflowId | null;
}) {
  const config = employeeConfigMap.get(roleId);
  if (!config) return null;

  const flowState = buildEmployeeFlowState(
    roleId, employee,
    riskWindows.filter((w) => w.guard_active).length,
    queues.filter((q) => q.utilization_pct >= 80).length,
    positions.length,
    health?.status ?? "unknown",
    account?.margin && account.margin > 0 ? (account.equity / account.margin) * 100 : null,
  );

  const supportEvidence = (!isSupportModuleRole(roleId) ? getRelatedSupportModules(roleId) : [])
    .map((role) => buildSupportEvidence(role, health?.status ?? "unknown", queues, riskWindows, account))
    .filter(Boolean) as Array<{ role: EmployeeRoleType; title: string; summary: string }>;
  const isSupportModule = isSupportModuleRole(roleId);

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-white/60">{config.responsibility}</p>
      {isSupportModule && (
        <div className="rounded-lg border border-sky-400/12 bg-sky-400/5 px-2.5 py-2 text-[13px] text-sky-200/80">
          该模块提供证据、约束或验证，不直接承担交易主链路推进职责。
        </div>
      )}
      <div className="rounded-lg border border-white/6 bg-black/10 px-2.5 py-2">
        <p className="text-[13px] text-white/30">{isSupportModule ? "证据输出" : "当前交接"}</p>
        <p className="mt-0.5 text-[13px] text-white/60">{flowState.handoff}</p>
      </div>
      {isSupportModule ? (
        <div className="space-y-1">
          <p className="text-[13px] text-white/30">服务对象</p>
          <div className="flex flex-wrap gap-1">
            {flowState.downstreamRoles.map((r) => (
              <span key={r} className="rounded-md bg-sky-400/10 px-1.5 py-0.5 text-[13px] text-sky-300">
                {getRoleName(r)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {flowState.upstreamRoles.map((r) => (
            <span key={r} className="rounded-md bg-sky-400/10 px-1.5 py-0.5 text-[13px] text-sky-300">
              ← {getRoleName(r)}
            </span>
          ))}
          {flowState.downstreamRoles.map((r) => (
            <span key={r} className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[13px] text-amber-300">
              → {getRoleName(r)}
            </span>
          ))}
        </div>
      )}
      {/* 支撑证据 */}
      {supportEvidence.length > 0 && (
        <div className="space-y-1">
          <p className="text-[13px] text-white/30">上游支撑证据</p>
          {supportEvidence.map((ev) => (
            <button key={ev.role} onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole(ev.role) ?? workflowId ?? "support", employeeId: ev.role })}
              className="flex w-full items-center justify-between rounded-lg border border-white/6 bg-black/10 px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]">
              <div className="min-w-0">
                <p className="text-[13px] text-white/70">{ev.title}</p>
                <p className="text-[13px] text-white/40">{ev.summary}</p>
              </div>
              <Link2 size={10} className="shrink-0 text-white/20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 相关事件（折叠内容） ───

function RelatedEvents({ roleId, employee, events, riskWindows, queues, positions, health, account }: {
  roleId: EmployeeRoleType; employee: EmployeeState;
  events: StudioEvent[];
  riskWindows: Array<{ guard_active: boolean; impact: string; event_name: string }>;
  queues: Array<{ utilization_pct: number }>;
  positions: Array<unknown>; health: { status: string } | null;
  account: { balance: number; equity: number; margin: number; free_margin: number } | null;
}) {
  const isSupportModule = isSupportModuleRole(roleId);
  const flowState = buildEmployeeFlowState(
    roleId, employee,
    riskWindows.filter((w) => w.guard_active).length,
    queues.filter((q) => q.utilization_pct >= 80).length,
    positions.length,
    health?.status ?? "unknown",
    account?.margin && account.margin > 0 ? (account.equity / account.margin) * 100 : null,
  );

  const relatedEvents = collectRelatedEvents(events, roleId, [...flowState.upstreamRoles, ...flowState.downstreamRoles]);

  if (relatedEvents.length === 0) return <p className="text-[13px] text-white/40">{isSupportModule ? "暂无相关证据动态" : "暂无相关事件"}</p>;

  return (
    <div className="space-y-1">
      {relatedEvents.map((evt) => (
        <div key={evt.eventId} className="flex gap-2 text-[13px]">
          <span className="shrink-0 text-white/25">{formatClock(evt.createdAt)}</span>
          <span className="text-white/60">{evt.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── RoleMetrics 路由 ───

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
    case EmployeeRole.COLLECTOR: return <CollectorMetrics {...props} />;
    case EmployeeRole.ANALYST: return <AnalystMetrics />;
    case EmployeeRole.LIVE_ANALYST: return <LiveAnalystMetrics />;
    case EmployeeRole.STRATEGIST: return <StrategistMetrics {...props} />;
    case EmployeeRole.LIVE_STRATEGIST: return <LiveStrategistMetrics {...props} />;
    case EmployeeRole.FILTER_GUARD: return <FilterGuardMetrics />;
    case EmployeeRole.REGIME_GUARD: return <RegimeGuardMetrics />;
    case EmployeeRole.VOTER: return <VoterMetrics {...props} />;
    case EmployeeRole.RISK_OFFICER: return <RiskOfficerMetrics />;
    case EmployeeRole.TRADER: return <TraderMetrics {...props} />;
    case EmployeeRole.POSITION_MANAGER: return <PositionManagerMetrics {...props} />;
    case EmployeeRole.ACCOUNTANT: return <AccountantMetrics {...props} />;
    case EmployeeRole.CALENDAR_REPORTER: return <CalendarReporterMetrics {...props} />;
    case EmployeeRole.INSPECTOR: return <InspectorMetrics {...props} />;
    case EmployeeRole.BACKTESTER: return (
      <Suspense fallback={<p className="text-[13px] text-white/40">加载中...</p>}>
        <LazyBacktesterMetrics />
      </Suspense>
    );
    default: return null;
  }
}

// ─── 工具函数 ───

function isAbnormal(status: ActivityStatus): boolean {
  return ["error", "warning", "alert", "blocked", "disconnected"].includes(status);
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
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("zh-CN", { hour12: false });
}

function dedupeRoles(roles: EmployeeRoleType[]): EmployeeRoleType[] {
  return Array.from(new Set(roles));
}

function collectRelatedEvents(events: StudioEvent[], role: EmployeeRoleType, _linkedRoles: EmployeeRoleType[]) {
  // 每个角色只显示自己作为 source 或 target 的事件，不冒泡上下游
  return events
    .filter((e) => e.source === role || e.target === role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
}

function buildEmployeeFlowState(
  role: EmployeeRoleType, employee: EmployeeState,
  activeRiskWindows: number, hotQueueCount: number, openPositions: number,
  healthStatus: string, marginLevel: number | null,
) {
  const workflowId = getWorkflowByRole(role);
  const workflow = workflowId ? workflowConfigMap.get(workflowId) : null;
  const roleIndex = workflow?.roles.indexOf(role) ?? -1;
  let upstreamRoles: EmployeeRoleType[] = [];
  let downstreamRoles: EmployeeRoleType[] = [];

  if (workflow && roleIndex >= 0) {
    if (roleIndex > 0) upstreamRoles = [workflow.roles[roleIndex - 1]!];
    else {
      const prev = workflowConfigMap.get(WORKFLOW_ORDER[Math.max(WORKFLOW_ORDER.indexOf(workflow.id) - 1, 0)] ?? workflow.id);
      if (prev && prev.id !== workflow.id) upstreamRoles = [prev.roles[prev.roles.length - 1]!];
    }
    if (roleIndex < workflow.roles.length - 1) downstreamRoles = [workflow.roles[roleIndex + 1]!];
    else {
      const next = workflowConfigMap.get(WORKFLOW_ORDER[WORKFLOW_ORDER.indexOf(workflow.id) + 1] ?? workflow.id);
      if (next && next.id !== workflow.id) downstreamRoles = [next.roles[0]!];
    }
  }

  const defaults = {
    upstreamRoles, downstreamRoles,
    handoff: upstreamRoles.length > 0 ? `接收${upstreamRoles.map(getRoleName).join("、")}输出` : employee.currentTask,
    nextAction: downstreamRoles.length > 0 ? `交付给${downstreamRoles.map(getRoleName).join("、")}` : "等待调度",
  };

  switch (role) {
    case EmployeeRole.ACCOUNTANT: return { ...defaults, upstreamRoles: dedupeRoles([EmployeeRole.TRADER, EmployeeRole.POSITION_MANAGER]), downstreamRoles: [EmployeeRole.RISK_OFFICER], handoff: "向风控输出余额/净值/保证金状态", nextAction: marginLevel !== null && marginLevel < 180 ? "保证金水位偏低，提醒风控收紧" : "保持账户快照刷新" };
    case EmployeeRole.CALENDAR_REPORTER: return { ...defaults, upstreamRoles: [], downstreamRoles: dedupeRoles([EmployeeRole.RISK_OFFICER, EmployeeRole.STRATEGIST, EmployeeRole.LIVE_STRATEGIST]), handoff: "暴露高影响事件窗口与保护期", nextAction: activeRiskWindows > 0 ? "保护窗口生效中，跟踪事件窗口" : "监控近端日历" };
    case EmployeeRole.INSPECTOR: return { ...defaults, upstreamRoles: [], downstreamRoles: dedupeRoles([EmployeeRole.RISK_OFFICER, EmployeeRole.TRADER]), handoff: "暴露系统健康与队列压力", nextAction: healthStatus !== "healthy" || hotQueueCount > 0 ? "处理降级组件和高压队列" : "巡检稳定运行" };
    case EmployeeRole.BACKTESTER: return { ...defaults, upstreamRoles: [], downstreamRoles: dedupeRoles([EmployeeRole.STRATEGIST, EmployeeRole.LIVE_STRATEGIST]), handoff: "输出研究验证结论与参数稳定性证据", nextAction: "确认回测结论是否支持当前策略参数" };
    case EmployeeRole.RISK_OFFICER: return { ...defaults, upstreamRoles: [EmployeeRole.VOTER], downstreamRoles: [EmployeeRole.TRADER], handoff: "联合账户/日历/巡检完成交易审批", nextAction: activeRiskWindows > 0 ? "先核对保护窗口和账户水位" : "检查账户约束和系统健康" };
    case EmployeeRole.TRADER: return { ...defaults, upstreamRoles: [EmployeeRole.RISK_OFFICER], downstreamRoles: [EmployeeRole.POSITION_MANAGER], handoff: "接收已批准信号并下单", nextAction: openPositions > 0 ? "核对持仓变化和成交回执" : "等待风控放行" };
    case EmployeeRole.POSITION_MANAGER: return { ...defaults, upstreamRoles: [EmployeeRole.TRADER], downstreamRoles: [EmployeeRole.ACCOUNTANT], handoff: "整理持仓与盈亏事实", nextAction: openPositions > 0 ? "跟踪保护状态与浮盈亏" : "等待新持仓变更" };
    default: return defaults;
  }
}

function buildSupportEvidence(
  role: EmployeeRoleType, healthStatus: string,
  queues: Array<{ utilization_pct: number }>,
  riskWindows: Array<{ guard_active: boolean; impact: string; event_name: string }>,
  account: { balance: number; equity: number; margin: number; free_margin: number } | null,
) {
  switch (role) {
    case EmployeeRole.ACCOUNTANT: {
      const ml = account && account.margin > 0 ? (account.equity / account.margin) * 100 : null;
      return { role, title: "账户与保证金", summary: account ? `余额 $${account.balance.toFixed(0)} | 水位 ${ml?.toFixed(0) ?? "--"}%` : "等待账户数据" };
    }
    case EmployeeRole.CALENDAR_REPORTER: {
      const active = riskWindows.filter((w) => w.guard_active).length;
      return { role, title: "风险日历", summary: active > 0 ? `${active} 个保护窗口生效` : "无激活保护窗口" };
    }
    case EmployeeRole.INSPECTOR: {
      const hot = queues.filter((q) => q.utilization_pct >= 80).length;
      return { role, title: "系统巡检", summary: `${healthStatus === "healthy" ? "稳定" : "异常"} | ${hot} 高压队列` };
    }
    case EmployeeRole.BACKTESTER: {
      return { role, title: "研究与验证", summary: "用于确认参数稳定性与策略适配性" };
    }
    default: return null;
  }
}
