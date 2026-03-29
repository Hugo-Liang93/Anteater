import { cn } from "@/lib/utils";
import {
  employeeConfigMap,
  getRelatedSupportModules,
  isSupportModuleRole,
  supportModuleRoles,
  type EmployeeRoleType,
} from "@/config/employees";
import { workflowConfigMap, type WorkflowId } from "@/config/workflows";
import { buildWorkflowSummaries, buildWorkflowTodos } from "@/lib/workflowPanel";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";
import {
  AlertTriangle,
  BarChart3,
  Blocks,
  CalendarClock,
  ChevronRight,
  Database,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { AlertPanel } from "../panels/AlertPanel";
import { CalendarPanel } from "../panels/CalendarPanel";
import { DataPanel } from "../panels/DataPanel";
import { LogPanel } from "../panels/LogPanel";

const STATUS_LABELS: Record<string, string> = {
  idle: "空闲",
  working: "工作中",
  walking: "移动中",
  thinking: "分析中",
  judging: "判断中",
  waiting: "等待中",
  signal_ready: "信号就绪",
  reviewing: "审核中",
  approved: "已批准",
  submitting: "提交中",
  executed: "已执行",
  rejected: "已拒绝",
  warning: "预警",
  alert: "告警",
  success: "完成",
  error: "异常",
  blocked: "阻塞",
  disconnected: "离线",
  reconnecting: "重连中",
};

const UTILITY_TABS = [
  { key: "data" as const, label: "数据", icon: Database },
  { key: "calendar" as const, label: "日历明细", icon: CalendarClock },
  { key: "logs" as const, label: "日志", icon: ScrollText },
  { key: "alerts" as const, label: "告警", icon: AlertTriangle },
];

const WORKFLOW_ICONS: Record<WorkflowId, typeof Blocks> = {
  collection: Database,
  analysis: BarChart3,
  filter: Blocks,
  strategy: BarChart3,
  decision: ShieldCheck,
  execution: ChevronRight,
  support: CalendarClock,
};

const TODO_GROUPS = [
  { key: "blocker" as const, label: "阻塞" },
  { key: "risk" as const, label: "风险" },
  { key: "opportunity" as const, label: "机会" },
];

export function Sidebar() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const setSelectedWorkflow = useUIStore((s) => s.setSelectedWorkflow);
  const selectedEmployee = useEmployeeStore((s) => s.selectedEmployee);
  const setSelectedEmployee = useEmployeeStore((s) => s.setSelectedEmployee);
  const employees = useEmployeeStore((s) => s.employees);
  const indicators = useLiveStore((s) => s.indicators);
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const queues = useLiveStore((s) => s.queues);
  const quote = useMarketStore((s) => s.quotes.XAUUSD);
  const positions = useMarketStore((s) => s.positions);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const calendarEvents = useSignalStore((s) => s.calendarEvents);
  const recentSignals = useSignalStore((s) => s.recentSignals);
  const health = useSignalStore((s) => s.health);
  const events = useEventStore((s) => s.events);

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

  const summaries = buildWorkflowSummaries(runtimeInput);
  const todos = buildWorkflowTodos(runtimeInput);
  const groupedTodos = TODO_GROUPS.map((group) => ({
    ...group,
    items: todos.filter((item) => item.category === group.key),
  }));

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98)_0%,rgba(10,17,28,0.98)_100%)]">
      <div className="border-b border-white/8 px-5 py-5">
        <p className="font-display text-[11px] uppercase tracking-[0.32em] text-white/35">
          流程调度
        </p>
        <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[0.12em] text-white">
          交易工作台
        </h2>
        <p className="mt-2 text-sm text-white/55">
          左栏负责回答哪段流程有问题、为什么有问题、建议先看谁。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-3">
          {summaries.map((summary) => {
            const workflow = summary.config;
            const focused = selectedWorkflow === workflow.id;
            const Icon = WORKFLOW_ICONS[workflow.id];
            const roleEntries = workflow.roles.filter((role) => !isSupportModuleRole(role));
            const moduleEntries =
              workflow.id === "support"
                ? supportModuleRoles
                : dedupeRoles(roleEntries.flatMap((role) => getRelatedSupportModules(role)));
            const status = getWorkflowStatus(summary);
            const focusConfig = employeeConfigMap.get(summary.focusRole);

            return (
              <section
                key={workflow.id}
                className={cn(
                  "rounded-[22px] border transition-all duration-200",
                  focused
                    ? "border-white/16 bg-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
                    : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]",
                )}
              >
                <button
                  onClick={() => {
                    setSelectedWorkflow(workflow.id);
                    setSelectedEmployee(null);
                  }}
                  className="w-full px-4 py-4 text-left"
                >
                  <div className="flex gap-3">
                    <div
                      className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#09111c]"
                      style={{ backgroundColor: workflow.color }}
                    >
                      <Icon size={20} strokeWidth={2.2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-display text-[22px] leading-none tracking-[0.12em] text-white">
                            {workflow.label}
                          </div>
                          <div className="mt-1 text-[11px] tracking-[0.14em] text-white/35">
                            {workflow.subtitle}
                          </div>
                        </div>

                        <span className={cn("rounded-full px-2 py-1 text-[10px]", status.cls)}>
                          {status.label}
                        </span>
                      </div>

                      <FlowLine title="当前阻塞" value={summary.blocker} />
                      <FlowLine
                        title="关键证据"
                        value={`${summary.metricLabel}：${summary.metricValue}`}
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-white/34">建议先看谁</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedWorkflow(workflow.id);
                            setSelectedEmployee(summary.focusRole);
                          }}
                          className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] text-white/78 transition-colors hover:border-white/16 hover:bg-white/[0.06]"
                        >
                          {focusConfig?.name ?? summary.focusRole}
                        </button>
                      </div>
                    </div>
                  </div>
                </button>

                {focused && (
                  <div className="border-t border-white/8 px-4 py-3">
                    {roleEntries.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] text-white/35">
                          <span>流程角色</span>
                          <span>进入工位详情</span>
                        </div>
                        <div className="space-y-2">
                          {roleEntries.map((role) => {
                            const employee = employees[role];
                            const config = employeeConfigMap.get(role);
                            return (
                              <button
                                key={role}
                                onClick={() => {
                                  setSelectedWorkflow(workflow.id);
                                  setSelectedEmployee(role);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                                  selectedEmployee === role
                                    ? "border-white/16 bg-white/[0.10]"
                                    : "border-white/8 bg-black/10 hover:border-white/14 hover:bg-white/[0.05]",
                                )}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: config?.color ?? workflow.color }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-white">{config?.name ?? role}</span>
                                    <span className="text-[11px] text-white/35">
                                      {STATUS_LABELS[employee.status] ?? employee.status}
                                    </span>
                                  </div>
                                  <p className="truncate text-[12px] text-white/45">
                                    {employee.currentTask}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {moduleEntries.length > 0 && (
                      <div className={cn(roleEntries.length > 0 && "mt-4")}>
                        <div className="mb-2 flex items-center justify-between text-[11px] text-white/35">
                          <span>支撑模块</span>
                          <span>提供证据与约束</span>
                        </div>
                        <div className="space-y-2">
                          {moduleEntries.map((role) => (
                            <SupportModuleCard
                              key={role}
                              role={role}
                              selected={selectedEmployee === role}
                              onClick={() => {
                                setSelectedWorkflow(workflow.id);
                                setSelectedEmployee(role);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[18px] tracking-[0.12em] text-white">
                待处理事项
              </p>
              <p className="mt-1 text-xs text-white/38">
                这里只保留对流程推进有影响的阻塞、风险和机会。
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 font-data text-[11px] text-white/70">
              {todos.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {groupedTodos.map((group) => (
              <div key={group.key}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] tracking-[0.16em] text-white/35">
                    {group.label}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 font-data text-[10px] text-white/55">
                    {group.items.length}
                  </span>
                </div>

                {group.items.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white/45">
                    当前没有新的{group.label}事项。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((todo) => {
                      const workflow = workflowConfigMap.get(todo.workflowId);
                      return (
                        <button
                          key={todo.id}
                          onClick={() => {
                            setSelectedWorkflow(todo.workflowId);
                            setSelectedEmployee(todo.roleId ?? null);
                          }}
                          className="w-full rounded-2xl border border-white/8 bg-black/10 px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.05]"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 h-2.5 w-2.5 rounded-full",
                                todo.severity === "danger"
                                  ? "bg-rose-400"
                                  : todo.severity === "warning"
                                    ? "bg-amber-400"
                                    : "bg-sky-400",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm text-white">{todo.title}</span>
                                <span className="text-[11px] text-white/35">
                                  {workflow?.label ?? todo.workflowId}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[12px] text-white/45">
                                {todo.detail}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-white/8 p-3">
        <div className="px-2">
          <p className="font-display text-[11px] uppercase tracking-[0.28em] text-white/35">
            数据面板
          </p>
        </div>

        <div className="mt-3 flex gap-1.5">
          {UTILITY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSidebarTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs transition-colors",
                sidebarTab === tab.key
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:bg-white/[0.05] hover:text-white/70",
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 h-[260px] overflow-hidden rounded-[20px] border border-white/8 bg-[#0a111b]/85">
          {sidebarTab === "data" && <DataPanel />}
          {sidebarTab === "calendar" && <CalendarPanel />}
          {sidebarTab === "logs" && <LogPanel />}
          {sidebarTab === "alerts" && <AlertPanel />}
        </div>
      </div>
    </aside>
  );
}

function FlowLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-2 flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-white/34">{title}</span>
      <span className="line-clamp-2 text-right text-white/72">{value}</span>
    </div>
  );
}

function SupportModuleCard({
  role,
  selected,
  onClick,
}: {
  role: EmployeeRoleType;
  selected: boolean;
  onClick: () => void;
}) {
  const config = employeeConfigMap.get(role);
  const employee = useEmployeeStore((s) => s.employees[role]);
  if (!config || !employee) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
        selected
          ? "border-white/16 bg-white/[0.10]"
          : "border-white/8 bg-black/10 hover:border-white/14 hover:bg-white/[0.05]",
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#09111c]"
        style={{ backgroundColor: config.color }}
      >
        {config.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-white">{config.name}</span>
          <span className="text-[11px] text-white/35">模块</span>
        </div>
        <p className="mt-1 truncate text-[12px] text-white/45">
          {employee.currentTask || config.deliverable}
        </p>
      </div>
    </button>
  );
}

function getWorkflowStatus(summary: {
  abnormalCount: number;
  activeCount: number;
}) {
  if (summary.abnormalCount > 0) {
    return { label: "有阻塞", cls: "bg-rose-500/15 text-rose-300" };
  }
  if (summary.activeCount === 0) {
    return { label: "等待输入", cls: "bg-white/10 text-white/60" };
  }
  return { label: "正常推进", cls: "bg-emerald-400/15 text-emerald-300" };
}

function dedupeRoles(roles: EmployeeRoleType[]): EmployeeRoleType[] {
  return Array.from(new Set(roles));
}
