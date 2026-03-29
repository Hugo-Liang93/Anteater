import { useMemo } from "react";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";
import { getWorkflowByRole } from "@/config/workflows";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useUIStore } from "@/store/ui";
import type { StudioEvent } from "@/types/protocol";

const FILTER_LABELS = {
  all: "全部",
  warning: "预警+",
  error: "异常",
} as const;

const LEVEL_CLASS: Record<string, string> = {
  info: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  error: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

function filterEvents(events: StudioEvent[], filter: string): StudioEvent[] {
  if (filter === "all") return events;
  if (filter === "warning") {
    return events.filter((event) => event.level === "warning" || event.level === "error");
  }
  if (filter === "error") return events.filter((event) => event.level === "error");
  return events;
}

export function BottomEventFeed() {
  const allEvents = useEventStore((s) => s.events);
  const alertFilter = useUIStore((s) => s.alertFilter);
  const setAlertFilter = useUIStore((s) => s.setAlertFilter);
  const setSelectedEmployee = useEmployeeStore((s) => s.setSelectedEmployee);
  const setSelectedWorkflow = useUIStore((s) => s.setSelectedWorkflow);

  const items = useMemo(
    () => filterEvents(allEvents, alertFilter).slice(0, 12),
    [allEvents, alertFilter],
  );

  return (
    <div className="border-t border-white/6 bg-[#0a0f1a]/92 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.24em] text-white/35">
            交易时间线
          </p>
          <p className="mt-1 text-xs text-white/42">
            只保留对决策和执行有价值的关键事件。
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(Object.entries(FILTER_LABELS) as [keyof typeof FILTER_LABELS, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setAlertFilter(key)}
                className={
                  alertFilter === key
                    ? "rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] text-white"
                    : "rounded-full border border-transparent px-2.5 py-1 text-[11px] text-white/48 transition-colors hover:border-white/10 hover:bg-white/[0.04] hover:text-white/72"
                }
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white/45">
          当前没有新的关键事件。
        </div>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const sourceRole = item.source as EmployeeRoleType;
            const config = employeeConfigMap.get(sourceRole);
            const workflowId = getWorkflowByRole(sourceRole);
            return (
              <button
                key={item.eventId}
                onClick={() => {
                  if (workflowId) setSelectedWorkflow(workflowId);
                  if (config) setSelectedEmployee(sourceRole);
                }}
                className="min-w-[260px] max-w-[320px] rounded-[20px] border border-white/8 bg-black/10 px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/35">
                    {formatClock(item.createdAt)}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      LEVEL_CLASS[item.level] ?? "border-white/8 bg-white/[0.04] text-white/70"
                    }`}
                  >
                    {formatEventType(item.type)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: config?.color ?? "#7b8794" }}
                  />
                  <span className="text-sm text-white">{config?.name ?? item.source}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/72">
                  {item.message}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatEventType(type: string) {
  const labels: Record<string, string> = {
    signal_generated: "信号生成",
    vote_completed: "投票完成",
    risk_approved: "风控放行",
    risk_rejected: "风控拒绝",
    trade_submitted: "交易提交",
    trade_executed: "执行回执",
    trade_rejected: "交易拒绝",
    position_opened: "开仓",
    position_closed: "平仓",
    module_error: "模块异常",
    module_recovered: "恢复",
    calendar_alert: "日历提醒",
    connection_lost: "连接中断",
    connection_restored: "连接恢复",
    status_change: "状态变更",
    action: "动作",
  };
  return labels[type] ?? type;
}
