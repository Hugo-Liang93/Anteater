/**
 * 员工详情浮窗 — 点击工作室中的员工弹出
 *
 * 显示：角色信息、当前任务、统计数据、最近动作日志。
 * 后续可扩展「对话」功能（向员工发送指令 / 查看分析报告）。
 */

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { employeeConfigMap } from "@/config/employees";
import {
  useEmployeeStore,
  type ActionLog,
  type ActivityStatus,
} from "@/store/employees";

const statusBadge: Record<ActivityStatus, { label: string; cls: string }> = {
  idle: { label: "空闲", cls: "bg-text-muted/20 text-text-muted" },
  working: { label: "工作中", cls: "bg-success/20 text-success" },
  alert: { label: "告警", cls: "bg-warning/20 text-warning" },
  success: { label: "完成", cls: "bg-success/20 text-success" },
  error: { label: "异常", cls: "bg-danger/20 text-danger" },
};

const logTypeColor: Record<ActionLog["type"], string> = {
  info: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

export function EmployeeDetail() {
  const selectedId = useEmployeeStore((s) => s.selectedEmployee);
  const employee = useEmployeeStore((s) =>
    selectedId ? s.employees[selectedId] : null,
  );
  const close = useEmployeeStore((s) => s.setSelectedEmployee);

  if (!selectedId || !employee) return null;

  const cfg = employeeConfigMap.get(selectedId);
  if (!cfg) return null;

  const badge = statusBadge[employee.status];

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-xl border border-border bg-bg-panel shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-bg-primary"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.name[0]}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary">
            {cfg.name}
          </h3>
          <p className="text-xs text-text-muted">{cfg.title}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px]", badge.cls)}>
          {badge.label}
        </span>
        <button
          onClick={() => close(null)}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      {/* 当前任务 */}
      <div className="border-b border-border px-4 py-3">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          当前任务
        </span>
        <p className="mt-1 text-sm text-text-primary">{employee.currentTask}</p>
      </div>

      {/* 统计数据 */}
      {Object.keys(employee.stats).length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            数据
          </span>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(employee.stats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-text-muted">{k}</span>
                <span className="font-mono text-text-primary">
                  {typeof v === "number" ? v.toFixed(2) : v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近动作 */}
      <div className="max-h-48 overflow-y-auto px-4 py-3">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          最近活动
        </span>
        {employee.recentActions.length === 0 ? (
          <p className="mt-1 text-xs text-text-muted">暂无记录</p>
        ) : (
          <div className="mt-1 space-y-1">
            {employee.recentActions.slice(0, 10).map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="shrink-0 text-text-muted">
                  {new Date(log.timestamp).toLocaleTimeString("zh-CN", {
                    hour12: false,
                  })}
                </span>
                <span className={logTypeColor[log.type]}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 预留：对话/指令区域 */}
      <div className="border-t border-border px-4 py-2">
        <p className="text-center text-[10px] text-text-muted">
          点击画布空白处关闭 · 对话功能即将上线
        </p>
      </div>
    </div>
  );
}
