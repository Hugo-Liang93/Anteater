import { useSignalStore } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";
import { employeeConfigs } from "@/config/employees";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function AlertPanel() {
  const health = useSignalStore((s) => s.health);
  const employees = useEmployeeStore((s) => s.employees);
  const queues = useLiveStore((s) => s.queues);

  // 异常员工
  const alertEmployees = employeeConfigs.filter((cfg) => {
    const emp = employees[cfg.id];
    return emp && (emp.status === "alert" || emp.status === "error");
  });

  // 组件健康问题
  const componentIssues = Object.entries(health?.components ?? {}).filter(
    ([, v]) => v.status !== "healthy",
  );

  // 队列问题
  const queueIssues = queues.filter(
    (q) => q.status !== "normal" || q.drops_oldest > 0 || q.drops_newest > 0,
  );

  const hasIssues = alertEmployees.length > 0 || componentIssues.length > 0 || queueIssues.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        告警中心
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!hasIssues ? (
          <div className="flex flex-col items-center gap-2 py-8 text-text-muted">
            <CheckCircle size={24} className="text-success" />
            <span className="text-xs">系统正常，无告警</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 员工异常 */}
            {alertEmployees.map((cfg) => {
              const emp = employees[cfg.id]!;
              return (
                <AlertCard
                  key={cfg.id}
                  color={cfg.color}
                  title={cfg.name}
                  message={emp.currentTask}
                  level={emp.status === "error" ? "error" : "warning"}
                />
              );
            })}

            {/* 组件异常 */}
            {componentIssues.map(([name, comp]) => (
              <AlertCard
                key={name}
                title={name}
                message={`${comp.status}${comp.message ? ": " + comp.message : ""}`}
                level="warning"
              />
            ))}

            {/* 队列异常 */}
            {queueIssues.map((q) => (
              <AlertCard
                key={q.name}
                title={`队列: ${q.name}`}
                message={`${q.status} | ${q.utilization_pct.toFixed(0)}% | 丢弃 ${q.drops_oldest + q.drops_newest}`}
                level={q.status === "normal" ? "warning" : "error"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ title, message, level, color }: {
  title: string;
  message: string;
  level: "warning" | "error";
  color?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-bg-secondary p-2">
      <AlertTriangle size={14} className={level === "error" ? "text-danger" : "text-warning"} />
      <div className="text-xs">
        <span className="font-medium" style={{ color: color ?? (level === "error" ? "#ff4757" : "#ffa726") }}>
          {title}
        </span>
        <p className="text-text-muted">{message}</p>
      </div>
    </div>
  );
}
