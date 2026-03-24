import { useSignalStore } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";
import { employeeConfigs } from "@/config/employees";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function AlertPanel() {
  const health = useSignalStore((s) => s.health);
  const employees = useEmployeeStore((s) => s.employees);

  // 收集异常/告警员工
  const alertEmployees = employeeConfigs.filter((cfg) => {
    const emp = employees[cfg.id];
    return emp && (emp.status === "alert" || emp.status === "error");
  });

  // 收集组件健康问题
  const componentIssues = Object.entries(health?.components ?? {}).filter(
    ([, v]) => v.status !== "healthy",
  );

  const hasIssues = alertEmployees.length > 0 || componentIssues.length > 0;

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
            {alertEmployees.map((cfg) => {
              const emp = employees[cfg.id]!;
              return (
                <div
                  key={cfg.id}
                  className="flex items-start gap-2 rounded-md bg-bg-secondary p-2"
                >
                  <AlertTriangle
                    size={14}
                    className={
                      emp.status === "error" ? "text-danger" : "text-warning"
                    }
                  />
                  <div className="text-xs">
                    <span
                      className="font-medium"
                      style={{ color: cfg.color }}
                    >
                      {cfg.name}
                    </span>
                    <p className="text-text-muted">{emp.currentTask}</p>
                  </div>
                </div>
              );
            })}

            {componentIssues.map(([name, comp]) => (
              <div
                key={name}
                className="flex items-start gap-2 rounded-md bg-bg-secondary p-2"
              >
                <AlertTriangle size={14} className="text-warning" />
                <div className="text-xs">
                  <span className="font-medium text-text-primary">{name}</span>
                  <p className="text-text-muted">
                    {comp.status}: {comp.message ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
