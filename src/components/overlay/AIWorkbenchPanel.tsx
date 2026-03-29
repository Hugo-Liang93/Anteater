import { useMemo } from "react";
import {
  Activity,
  Brain,
  ListTodo,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDecisionContext } from "@/lib/decisionDesk";
import { useDecisionBrief } from "@/hooks/useDecisionBrief";
import { useDecisionStore, type DecisionRecordStatus } from "@/store/decision";
import { useUIStore } from "@/store/ui";
import { EVIDENCE_TONE, ActionButton, useDecisionInput } from "./ai-shared";

type BoardTone = "positive" | "warning" | "danger" | "neutral";

const BOARD_TONE: Record<BoardTone, string> = {
  positive: "border-emerald-400/18 bg-emerald-400/8 text-emerald-200",
  warning: "border-amber-400/18 bg-amber-400/8 text-amber-200",
  danger: "border-rose-400/18 bg-rose-400/8 text-rose-200",
  neutral: "border-white/8 bg-white/[0.04] text-white/72",
};

const RECORD_STATUS_META: Record<
  DecisionRecordStatus,
  { label: string; cls: string }
> = {
  adopted: { label: "已采纳", cls: "bg-emerald-400/15 text-emerald-200" },
  deferred: { label: "已暂缓", cls: "bg-amber-400/15 text-amber-200" },
  dismissed: { label: "已忽略", cls: "bg-white/10 text-white/62" },
};

// ─── Local types ───

interface PriorityItem {
  id: string;
  label: string;
  text: string;
  tone: BoardTone;
}

interface StatusItem {
  id: string;
  label: string;
  value: string;
  tone: BoardTone;
}

interface OperationItem {
  id: string;
  role: string;
  status: string;
  task: string;
  tone: BoardTone;
}

// ─── Props ───

interface AIWorkbenchPanelProps {
  onClose: () => void;
}

// ─── Helpers ───

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function humanizeHealthStatus(status: "healthy" | "degraded" | "unhealthy" | "unknown") {
  switch (status) {
    case "healthy":
      return "系统稳定";
    case "degraded":
      return "系统降级";
    case "unhealthy":
      return "系统异常";
    default:
      return "状态未知";
  }
}

function humanizeRoleStatus(status: string) {
  const map: Record<string, string> = {
    working: "处理中",
    walking: "流转中",
    thinking: "分析中",
    judging: "评估中",
    reviewing: "复核中",
    submitting: "提交中",
    warning: "告警",
    alert: "警报",
    error: "异常",
    blocked: "阻塞",
    disconnected: "离线",
    reconnecting: "重连中",
  };
  return map[status] ?? status;
}

// ─── Main Component ───

export default function AIWorkbenchPanel({ onClose }: AIWorkbenchPanelProps) {
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const records = useDecisionStore((s) => s.records);
  const addRecord = useDecisionStore((s) => s.addRecord);

  const liveInput = useDecisionInput();
  const { brief, loading, error, refresh } = useDecisionBrief(liveInput);
  const context = useMemo(() => buildDecisionContext(liveInput), [liveInput]);

  // ─── Derived data ───

  const priorityItems = useMemo<PriorityItem[]>(
    () => [
      ...brief.risks.map((text, index) => ({
        id: `risk-${index}`,
        label: "风险",
        text,
        tone: "danger" as const,
      })),
      ...brief.conflicts.map((text, index) => ({
        id: `conflict-${index}`,
        label: "冲突",
        text,
        tone: "warning" as const,
      })),
      ...brief.invalidations.map((text, index) => ({
        id: `invalidation-${index}`,
        label: "失效条件",
        text,
        tone: "neutral" as const,
      })),
    ],
    [brief.conflicts, brief.invalidations, brief.risks],
  );

  const riskStatusItems = useMemo<StatusItem[]>(
    () => [
      ...context.risks.activeGuardLabels.map((value, index) => ({
        id: `guard-${index}`,
        label: "风控保护",
        value,
        tone: "danger" as const,
      })),
      ...context.risks.topWarnings.map((value, index) => ({
        id: `warning-${index}`,
        label: "预警事件",
        value,
        tone: "warning" as const,
      })),
    ],
    [context.risks.activeGuardLabels, context.risks.topWarnings],
  );

  const operationItems = useMemo<OperationItem[]>(() => {
    const queueItems = context.operations.queuePressures.map((queue) => ({
      id: `queue-${queue.name}`,
      role: `队列 ${queue.name}`,
      status: `${queue.utilizationPct.toFixed(0)}%`,
      task: "利用率过高，需要关注堆积或消费延迟。",
      tone: queue.utilizationPct >= 90 ? ("danger" as const) : ("warning" as const),
    }));

    const abnormalTasks = context.system.currentTasks
      .filter((task) =>
        ["warning", "alert", "error", "blocked", "disconnected", "reconnecting"].includes(
          task.status,
        ),
      )
      .map((task) => ({
        id: `task-${task.role}`,
        role: task.role,
        status: task.status,
        task: task.task || "当前状态异常，需要确认上下游依赖。",
        tone:
          task.status === "error" || task.status === "blocked" || task.status === "disconnected"
            ? ("danger" as const)
            : ("warning" as const),
      }));

    const activeTasks = context.system.currentTasks
      .filter((task) =>
        ["working", "walking", "thinking", "judging", "reviewing", "submitting"].includes(
          task.status,
        ),
      )
      .slice(0, 4)
      .map((task) => ({
        id: `active-${task.role}`,
        role: task.role,
        status: task.status,
        task: task.task || "正在处理当前链路任务。",
        tone: "positive" as const,
      }));

    return [...queueItems, ...abnormalTasks, ...activeTasks].slice(0, 6);
  }, [context.operations.queuePressures, context.system.currentTasks]);

  const recordAction = (status: DecisionRecordStatus) => {
    addRecord({
      focus: brief.focusTitle,
      stance: brief.stance,
      confidence: brief.confidence,
      action: brief.recommendedAction,
      summary: brief.summary,
      status,
      source: brief.source,
      sourceLabel: brief.sourceLabel,
    });
  };

  // ─── Render ───

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/8 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs tracking-[0.18em] text-white/35">AI 决策工作台</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/60">
                {brief.sourceLabel}
              </span>
            </div>
            <h3 className="mt-1 font-display text-lg tracking-[0.06em] text-white">
              {brief.focusTitle}
            </h3>
            <p className="mt-1 text-sm text-white/48">{brief.focusSubtitle}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={refresh}
              className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              title="重新生成"
            >
              <RefreshCcw size={13} className={cn(loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Overview cards (2x2 grid) */}
        <section className="grid grid-cols-2 gap-2">
          <OverviewCard
            icon={ShieldAlert}
            title="风险闸门"
            value={
              context.risks.activeGuardCount > 0
                ? `${context.risks.activeGuardCount} 个保护窗口`
                : "当前未触发"
            }
            meta={
              context.risks.highImpactWindowCount > 0
                ? `${context.risks.highImpactWindowCount} 个高影响临近`
                : "高影响可控"
            }
            tone={
              context.risks.activeGuardCount > 0 || context.risks.highImpactWindowCount > 0
                ? "danger"
                : "positive"
            }
          />
          <OverviewCard
            icon={ListTodo}
            title="待处理"
            value={priorityItems.length > 0 ? `${priorityItems.length} 项` : "已清空"}
            meta={priorityItems[0]?.text ?? "暂无阻断项"}
            tone={priorityItems.length > 0 ? "warning" : "positive"}
          />
          <OverviewCard
            icon={Brain}
            title="执行暴露"
            value={
              context.market.openPositionCount > 0
                ? `${context.market.openPositionCount} 笔 / ${formatSigned(context.market.openPnl)}`
                : "无持仓"
            }
            meta={
              context.market.spread != null
                ? `点差 ${context.market.spread.toFixed(1)}`
                : "等待报价"
            }
            tone={
              context.market.openPositionCount === 0
                ? "neutral"
                : context.market.openPnl < 0
                  ? "warning"
                  : "positive"
            }
          />
          <OverviewCard
            icon={Activity}
            title="运行状态"
            value={humanizeHealthStatus(context.system.healthStatus)}
            meta={`${context.operations.abnormalRoleCount} 异常 / ${context.operations.queuePressureCount} 高压`}
            tone={
              context.system.healthStatus === "unhealthy" || context.operations.abnormalRoleCount > 0
                ? "danger"
                : context.system.healthStatus === "degraded" || context.operations.queuePressureCount > 0
                  ? "warning"
                  : "positive"
            }
          />
        </section>

        {/* Conclusion */}
        <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
          <div className="text-xs tracking-[0.16em] text-white/35">当前结论</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-2xl tracking-[0.08em] text-white">
              {brief.stance}
            </span>
            <span className="font-data text-sm text-white/62">{brief.confidence}%</span>
          </div>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
            <div className="text-xs text-white/35">建议动作</div>
            <div className="mt-0.5 text-sm text-white">{brief.recommendedAction}</div>
          </div>
          <p className="mt-2.5 text-sm leading-6 text-white/80">{brief.summary}</p>
          <p className="mt-1 text-xs leading-5 text-white/48">{brief.actionHint}</p>
          {error && <p className="mt-1 text-xs leading-5 text-amber-300">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {brief.focusRoles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-white/68"
              >
                {role}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton label="采纳建议" tone="positive" onClick={() => recordAction("adopted")} />
            <ActionButton label="暂缓处理" tone="warning" onClick={() => recordAction("deferred")} />
            <ActionButton label="忽略建议" tone="neutral" onClick={() => recordAction("dismissed")} />
          </div>
        </section>

        {/* Evidence */}
        <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
          <div className="flex items-center gap-1.5 text-xs tracking-[0.16em] text-white/35">
            <Sparkles size={10} />
            证据面板
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {brief.evidence.map((item) => (
              <div
                key={item.title}
                className={cn("rounded-xl border px-2.5 py-2", EVIDENCE_TONE[item.tone])}
              >
                <div className="text-xs text-white/35">{item.title}</div>
                <div className="mt-0.5 text-sm leading-5">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Priority items */}
        <PriorityPanel title="首要事项" items={priorityItems} />

        {/* Invalidations */}
        <WorkbenchList
          title="失效条件"
          items={brief.invalidations}
          emptyText="当前没有额外失效条件。"
        />

        {/* Risk & Operation boards */}
        <StatusBoard
          title="风险与运行细节"
          items={riskStatusItems}
          emptyText="当前没有新增风控阻断或预警事件。"
        />
        <OperationBoard title="执行态势" items={operationItems} />

        {/* Decision records */}
        <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs tracking-[0.16em] text-white/35">决策记录</div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-data text-xs text-white/55">
              {records.length}
            </span>
          </div>

          {records.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">还没有建议处理记录。</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {records.slice(0, 6).map((record) => {
                const meta = RECORD_STATUS_META[record.status];
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-white/8 bg-white/[0.04] px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">{record.focus}</div>
                        <div className="mt-0.5 text-xs text-white/38">
                          {new Date(record.createdAt).toLocaleTimeString("zh-CN", {
                            hour12: false,
                          })}
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px]", meta.cls)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/62">
                      {record.stance} / {record.action} / {record.confidence}%
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Collapse to brief */}
        <button
          onClick={() => openRightPanel({ kind: "ai-brief" })}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-center text-sm text-white/68 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
        >
          收起为摘要
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function OverviewCard({
  icon: Icon,
  title,
  value,
  meta,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  meta: string;
  tone: BoardTone;
}) {
  return (
    <div className={cn("rounded-2xl border p-2.5", BOARD_TONE[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs tracking-[0.14em] text-white/42">{title}</div>
          <div className="mt-1 text-[13px] font-medium leading-5 text-white">{value}</div>
        </div>
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] p-1.5 text-white/72">
          <Icon size={13} />
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-4 text-white/55">{meta}</p>
    </div>
  );
}

function PriorityPanel({ title, items }: { title: string; items: PriorityItem[] }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs tracking-[0.16em] text-white/35">{title}</div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/55">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">当前没有需要立即处理的事项。</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn("rounded-xl border px-2.5 py-2", BOARD_TONE[item.tone])}
            >
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] text-white/68">
                {item.label}
              </span>
              <p className="mt-1.5 text-sm leading-5">{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBoard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: StatusItem[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="text-xs tracking-[0.16em] text-white/35">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">{emptyText}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn("rounded-xl border px-2.5 py-2", BOARD_TONE[item.tone])}
            >
              <div className="text-xs text-white/42">{item.label}</div>
              <div className="mt-0.5 text-sm leading-5">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function OperationBoard({ title, items }: { title: string; items: OperationItem[] }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs tracking-[0.16em] text-white/35">{title}</div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/55">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">当前没有需要额外关注的运行事项。</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn("rounded-xl border px-2.5 py-2", BOARD_TONE[item.tone])}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm text-white">{item.role}</div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] text-white/68">
                  {humanizeRoleStatus(item.status)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5">{item.task}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkbenchList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="text-xs tracking-[0.16em] text-white/35">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">{emptyText}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-white/8 bg-white/[0.04] px-2.5 py-2 text-sm leading-5 text-white/72"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
