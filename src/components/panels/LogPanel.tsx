import { cn } from "@/lib/utils";
import { employeeConfigMap } from "@/config/employees";
import { useEmployeeStore, type ActionLog } from "@/store/employees";

const typeColors: Record<ActionLog["type"], string> = {
  info: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

export function LogPanel() {
  const employees = useEmployeeStore((s) => s.employees);

  // 汇总所有员工的动作日志，按时间倒序
  const allLogs = Object.values(employees)
    .flatMap((e) => e.recentActions.map((a) => ({ ...a, role: e.role })))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        活动日志
      </div>
      <div className="flex-1 overflow-y-auto">
        {allLogs.length === 0 ? (
          <p className="p-3 text-xs text-text-muted">暂无活动记录</p>
        ) : (
          allLogs.map((log) => {
            const cfg = employeeConfigMap.get(log.role);
            return (
              <div
                key={log.id}
                className="flex gap-2 border-b border-border/30 px-3 py-1.5 text-xs"
              >
                <span className="shrink-0 text-text-muted">
                  {new Date(log.timestamp).toLocaleTimeString("zh-CN", {
                    hour12: false,
                  })}
                </span>
                <span
                  className="shrink-0 font-medium"
                  style={{ color: cfg?.color }}
                >
                  {cfg?.name ?? log.role}
                </span>
                <span className={cn("min-w-0 break-all", typeColors[log.type])}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
