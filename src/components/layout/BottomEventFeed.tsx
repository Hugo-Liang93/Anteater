/**
 * 底部事件滚动条 — 对齐 UI_SPEC.md Section 3.5
 *
 * 从全局 event store 消费统一的 StudioEvent 流。
 * 支持级别过滤（全部 / 警告+ / 异常）。
 */

import { useEventStore } from "@/store/events";
import { useUIStore } from "@/store/ui";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";
import type { StudioEvent } from "@/types/protocol";

const LEVEL_COLORS: Record<string, string> = {
  info: "#4fc3f7",
  success: "#66bb6a",
  warning: "#ffa726",
  error: "#ff4757",
};

const FILTER_LABELS = {
  all: "全部",
  warning: "警告+",
  error: "异常",
} as const;

function filterEvents(events: StudioEvent[], filter: string): StudioEvent[] {
  if (filter === "all") return events;
  if (filter === "warning") return events.filter((e) => e.level === "warning" || e.level === "error");
  if (filter === "error") return events.filter((e) => e.level === "error");
  return events;
}

export function BottomEventFeed() {
  const allEvents = useEventStore((s) => s.events);
  const alertFilter = useUIStore((s) => s.alertFilter);
  const setAlertFilter = useUIStore((s) => s.setAlertFilter);

  const items = filterEvents(allEvents, alertFilter).slice(0, 20);

  return (
    <div className="flex h-8 items-center border-t border-white/5 bg-[#0a0f1a]/90">
      {/* 过滤按钮 */}
      <div className="flex shrink-0 items-center gap-1 border-r border-white/5 px-2">
        {(Object.entries(FILTER_LABELS) as [keyof typeof FILTER_LABELS, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAlertFilter(key)}
            className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
              alertFilter === key
                ? "bg-white/10 text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 事件流 */}
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-[#556677]">
          暂无事件
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-6 overflow-hidden px-3">
          <div className="animate-ticker flex items-center gap-6 whitespace-nowrap">
            {items.map((item) => {
              const cfg = employeeConfigMap.get(item.source as EmployeeRoleType);
              return (
                <span key={item.eventId} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: LEVEL_COLORS[item.level] ?? "#888" }}
                  />
                  <span style={{ color: cfg?.color ?? "#888", fontWeight: 600 }}>
                    [{cfg?.name ?? item.source}]
                  </span>
                  <span className="text-[#8899aa]">
                    {item.message}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
