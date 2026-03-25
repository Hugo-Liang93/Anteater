/**
 * 底部事件滚动条 — 按 UI_SPEC.md 的 5 部分布局要求
 *
 * 从全局 event store 消费统一的 StudioEvent 流。
 */

import { useEventStore, selectRecentEvents } from "@/store/events";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";

const LEVEL_COLORS: Record<string, string> = {
  info: "#4fc3f7",
  success: "#66bb6a",
  warning: "#ffa726",
  error: "#ff4757",
};

export function BottomEventFeed() {
  const items = useEventStore(selectRecentEvents(20));

  if (items.length === 0) {
    return (
      <div className="flex h-8 items-center justify-center border-t border-white/5 bg-[#0a0f1a]/90 px-4 text-xs text-[#556677]">
        暂无事件
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center gap-6 overflow-hidden border-t border-white/5 bg-[#0a0f1a]/90 px-4">
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
  );
}
