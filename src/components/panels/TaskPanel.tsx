import { cn } from "@/lib/utils";
import { employeeConfigs } from "@/config/employees";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";

const statusLabel: Record<ActivityStatus, string> = {
  idle: "空闲",
  working: "工作中",
  alert: "告警",
  success: "完成",
  error: "异常",
};

const statusDot: Record<ActivityStatus, string> = {
  idle: "bg-text-muted",
  working: "bg-success animate-pulse",
  alert: "bg-warning animate-pulse",
  success: "bg-success",
  error: "bg-danger animate-pulse",
};

export function TaskPanel() {
  const employees = useEmployeeStore((s) => s.employees);
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        员工状态
      </div>
      <div className="flex-1 overflow-y-auto">
        {employeeConfigs.map((cfg) => {
          const emp = employees[cfg.id];
          if (!emp) return null;
          return (
            <button
              key={cfg.id}
              onClick={() => setSelected(cfg.id)}
              className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
            >
              {/* 色块头像 */}
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-bg-primary"
                style={{ backgroundColor: cfg.color }}
              >
                {cfg.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    {cfg.name}
                  </span>
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", statusDot[emp.status])}
                  />
                  <span className="text-[10px] text-text-muted">
                    {statusLabel[emp.status]}
                  </span>
                </div>
                <p className="truncate text-xs text-text-muted">
                  {emp.currentTask}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
