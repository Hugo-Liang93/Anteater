import { cn } from "@/lib/utils";
import { employeeConfigs, type EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore, selectEmployee, type ActivityStatus } from "@/store/employees";

const statusLabel: Record<ActivityStatus, string> = {
  idle: "空闲",
  working: "工作中",
  thinking: "思考中",
  reviewing: "审核中",
  alert: "告警",
  success: "完成",
  error: "异常",
  blocked: "已拦截",
  disconnected: "失联",
  reconnecting: "重连中",
};

const statusDot: Record<ActivityStatus, string> = {
  idle: "bg-text-muted",
  working: "bg-success animate-pulse",
  thinking: "bg-blue-400 animate-pulse",
  reviewing: "bg-purple-400 animate-pulse",
  alert: "bg-warning animate-pulse",
  success: "bg-success",
  error: "bg-danger animate-pulse",
  blocked: "bg-danger",
  disconnected: "bg-danger",
  reconnecting: "bg-warning animate-pulse",
};

export function TaskPanel() {
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        员工状态
      </div>
      <div className="flex-1 overflow-y-auto">
        {employeeConfigs.map((cfg) => (
          <TaskRow key={cfg.id} role={cfg.id} name={cfg.name} color={cfg.color} onSelect={setSelected} />
        ))}
      </div>
    </div>
  );
}

/** 单行员工状态 — 独立订阅单个员工，避免其他员工更新触发重渲染 */
function TaskRow({ role, name, color, onSelect }: {
  role: EmployeeRoleType;
  name: string;
  color: string;
  onSelect: (role: EmployeeRoleType) => void;
}) {
  const emp = useEmployeeStore(selectEmployee(role));
  if (!emp) return null;

  return (
    <button
      onClick={() => onSelect(role)}
      className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
    >
      {/* 色块头像 */}
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-bg-primary"
        style={{ backgroundColor: color }}
      >
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary">
            {name}
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
}
