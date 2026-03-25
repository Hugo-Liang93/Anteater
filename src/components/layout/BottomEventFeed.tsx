/**
 * 底部事件滚动条
 *
 * 按 UI_SPEC.md 要求，显示最近系统事件（信号、告警、状态变更）。
 * 横向 ticker 样式，自动滚动。
 */

import { useMemo } from "react";
import { useEmployeeStore, selectAllEmployees } from "@/store/employees";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";

interface FeedItem {
  id: string;
  time: number;
  text: string;
  color: string;
  type: "info" | "success" | "warning" | "error";
}

const TYPE_COLORS: Record<string, string> = {
  info: "#4fc3f7",
  success: "#66bb6a",
  warning: "#ffa726",
  error: "#ff4757",
};

export function BottomEventFeed() {
  const employees = useEmployeeStore(selectAllEmployees);

  const items: FeedItem[] = useMemo(() => {
    const all: FeedItem[] = [];
    for (const [role, emp] of Object.entries(employees)) {
      const cfg = employeeConfigMap.get(role as EmployeeRoleType);
      const name = cfg?.name ?? role;
      for (const action of emp.recentActions.slice(0, 5)) {
        all.push({
          id: action.id,
          time: action.timestamp,
          text: `[${name}] ${action.message}`,
          color: cfg?.color ?? "#888",
          type: action.type,
        });
      }
    }
    all.sort((a, b) => b.time - a.time);
    return all.slice(0, 20);
  }, [employees]);

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
        {items.map((item) => (
          <span key={item.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[item.type] ?? "#888" }}
            />
            <span style={{ color: item.color, fontWeight: 600 }}>
              {item.text.split("]")[0]}]
            </span>
            <span className="text-[#8899aa]">
              {item.text.split("]").slice(1).join("]")}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
