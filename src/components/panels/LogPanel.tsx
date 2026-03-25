import { cn } from "@/lib/utils";
import { employeeConfigMap } from "@/config/employees";
import { useEmployeeStore, selectAllEmployees, type ActionLog } from "@/store/employees";
import { useLiveStore } from "@/store/live";

const typeColors: Record<ActionLog["type"], string> = {
  info: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

function formatTime(ts: number | string) {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

export function LogPanel() {
  const employees = useEmployeeStore(selectAllEmployees);
  const signals = useLiveStore((s) => s.signals);

  // 员工动作日志
  const actionLogs = Object.values(employees)
    .flatMap((e) => e.recentActions.map((a) => ({ ...a, role: e.role, source: "action" as const })))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  // 信号事件日志
  const signalLogs = signals.slice(0, 30).map((s) => ({
    id: s.signal_id,
    timestamp: s.generated_at,
    message: `${s.strategy} → ${s.direction} (${(s.confidence * 100).toFixed(0)}%) ${s.reason}`,
    type: (s.direction === "hold" ? "info" : s.direction === "buy" ? "success" : "warning") as ActionLog["type"],
    source: "signal" as const,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        活动日志
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* 信号流 */}
        {signalLogs.length > 0 && (
          <>
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              信号事件
            </div>
            {signalLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="flex gap-2 border-b border-border/30 px-3 py-1 text-xs">
                <span className="shrink-0 text-text-muted">{formatTime(log.timestamp)}</span>
                <span className={cn("min-w-0 break-all", typeColors[log.type])}>
                  {log.message}
                </span>
              </div>
            ))}
          </>
        )}

        {/* 员工动作 */}
        {actionLogs.length > 0 && (
          <>
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              员工动作
            </div>
            {actionLogs.map((log) => {
              const cfg = employeeConfigMap.get(log.role);
              return (
                <div key={log.id} className="flex gap-2 border-b border-border/30 px-3 py-1 text-xs">
                  <span className="shrink-0 text-text-muted">{formatTime(log.timestamp)}</span>
                  <span className="shrink-0 font-medium" style={{ color: cfg?.color }}>
                    {cfg?.name ?? log.role}
                  </span>
                  <span className={cn("min-w-0 break-all", typeColors[log.type])}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </>
        )}

        {actionLogs.length === 0 && signalLogs.length === 0 && (
          <p className="p-3 text-xs text-text-muted">暂无活动记录</p>
        )}
      </div>
    </div>
  );
}
