/**
 * SystemPanel — "系统运维"面板
 *
 * NavRail "system" section。
 * 组合巡检员 + 采集员 + 队列状态 + 员工异常 + 事件日志，
 * 提供系统级健康总览。
 */

import { useMemo } from "react";
import { useMarketStore } from "@/store/market";
import { useLiveStore } from "@/store/live";
import { useSignalStore } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useUIStore } from "@/store/ui";
import { employeeConfigs, employeeConfigMap, type EmployeeRoleType } from "@/config/employees";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { Section } from "./shared";

// ─── Abnormal status set ───

const ABNORMAL_STATUSES = new Set(["error", "blocked", "disconnected", "alert", "warning", "reconnecting"]);

// ─── Main Component ───

export function SystemPanel() {
  const health = useSignalStore((s) => s.health);
  const queues = useLiveStore((s) => s.queues);
  const connected = useMarketStore((s) => s.connected);
  const collectorStatus = useEmployeeStore((s) => s.employees.collector?.status ?? "idle");
  const collectorTask = useEmployeeStore((s) => s.employees.collector?.currentTask ?? "");
  const events = useEventStore((s) => s.events);
  const alertFilter = useUIStore((s) => s.alertFilter);
  const setAlertFilter = useUIStore((s) => s.setAlertFilter);

  // --- Section 1: Overall health ---
  const status = health?.status ?? "unknown";
  const components = health?.components ?? {};
  const componentEntries = Object.entries(components);
  const healthyCount = componentEntries.filter(([, v]) => v.status === "healthy").length;
  const issueCount = componentEntries.length - healthyCount;

  // --- Section 2: Component issues ---
  const componentIssues = componentEntries.filter(([, v]) => v.status !== "healthy");

  // --- Section 5: Abnormal employees ---
  const allEmployees = useEmployeeStore((s) => s.employees);
  const abnormalRoles = useMemo(() => {
    const result: { role: EmployeeRoleType; status: string; task: string; color: string; name: string }[] = [];
    for (const cfg of employeeConfigs) {
      const emp = allEmployees[cfg.id];
      if (emp && ABNORMAL_STATUSES.has(emp.status)) {
        result.push({
          role: cfg.id,
          status: emp.status,
          task: emp.currentTask,
          color: cfg.color,
          name: cfg.name,
        });
      }
    }
    return result;
  }, [allEmployees]);

  // --- Section 6: Filtered events ---
  const filteredEvents = useMemo(() => {
    const recent = events.slice(0, 20);
    if (alertFilter === "all") return recent;
    return recent.filter((e) =>
      alertFilter === "warning" ? e.level === "warning" : e.level === "error",
    );
  }, [events, alertFilter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-text-secondary">系统运维</h3>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">

        {/* Section 1: Overall Health */}
        <Section title="系统健康">
          <div className="flex items-center gap-2">
            <HealthBadge status={status} />
            <span className="text-[13px] text-text-muted">
              {componentEntries.length > 0
                ? `${healthyCount} 正常 / ${issueCount} 异常`
                : "未获取"}
            </span>
          </div>
        </Section>

        {/* Section 2: Component Status */}
        <Section title="组件状态">
          {componentIssues.length === 0 ? (
            <div className="flex items-center gap-1.5 text-[13px] text-text-muted">
              <CheckCircle size={13} className="text-success" />
              所有组件正常
            </div>
          ) : (
            <div className="space-y-1">
              {componentIssues.map(([name, comp]) => (
                <div key={name} className="flex items-center justify-between rounded bg-bg-secondary px-2 py-1 text-[13px]">
                  <span className="text-text-secondary">{name}</span>
                  <StatusBadge status={comp.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section 3: Queue Status */}
        {queues.length > 0 && (
          <Section title="队列状态">
            <div className="space-y-1">
              {queues.map((q) => {
                const pct = Math.min(q.utilization_pct, 100);
                const color = pct > 80 ? "#ff4757" : pct > 50 ? "#ffa726" : "#00d4aa";
                return (
                  <div key={q.name} className="flex items-center justify-between text-[13px]">
                    <span className="text-text-muted">{q.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-text-muted">
                        {q.utilization_pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Section 4: Collector Connection */}
        <Section title="采集连接">
          <div className="flex items-center gap-2 text-[13px]">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                connected ? "bg-success" : "bg-danger",
              )}
            />
            <span className="text-text-secondary">{connected ? "已连接" : "未连接"}</span>
            <span className={cn(
              "ml-auto text-[11px]",
              collectorStatus === "working" ? "text-success" :
              collectorStatus === "error" || collectorStatus === "disconnected" ? "text-danger" :
              "text-text-muted",
            )}>
              {collectorTask || collectorStatus}
            </span>
          </div>
        </Section>

        {/* Section 5: Abnormal Employees */}
        <Section title="员工异常">
          {abnormalRoles.length === 0 ? (
            <div className="flex items-center gap-1.5 text-[13px] text-text-muted">
              <CheckCircle size={13} className="text-success" />
              所有角色正常运行
            </div>
          ) : (
            <div className="space-y-1">
              {abnormalRoles.map((r) => (
                <div
                  key={r.role}
                  className="flex items-center gap-2 rounded bg-bg-secondary px-2 py-1 text-[13px]"
                >
                  <span className="font-medium" style={{ color: r.color }}>{r.name}</span>
                  <StatusBadge status={r.status} />
                  <span className="ml-auto max-w-[120px] truncate text-[11px] text-text-muted" title={r.task}>
                    {r.task}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section 6: Event Log */}
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="mb-1.5 flex items-center gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              事件日志
            </h4>
            <div className="ml-auto flex gap-1">
              {(["all", "warning", "error"] as const).map((f) => (
                <button
                  key={f}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] transition-colors",
                    alertFilter === f
                      ? "bg-bg-secondary text-text-secondary"
                      : "text-text-muted hover:text-text-secondary",
                  )}
                  onClick={() => setAlertFilter(f)}
                >
                  {f === "all" ? "全部" : f === "warning" ? "预警" : "异常"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-text-muted">暂无事件</p>
            ) : (
              filteredEvents.map((evt) => {
                const sourceName = employeeConfigMap.get(evt.source as EmployeeRoleType)?.name ?? evt.source;
                return (
                  <div
                    key={evt.eventId}
                    className="flex gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-bg-secondary/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                        evt.level === "error" ? "bg-danger" :
                        evt.level === "warning" ? "bg-warning" :
                        evt.level === "success" ? "bg-success" :
                        "bg-text-muted",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-text-muted">
                          {formatTime(evt.createdAt)}
                        </span>
                        <span className="text-[11px] font-medium text-text-secondary">
                          {sourceName}
                        </span>
                      </div>
                      <p className="truncate text-text-muted" title={evt.message}>
                        {evt.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Helper Components ───

function HealthBadge({ status }: { status: string }) {
  const label = status === "healthy" ? "稳定" : status === "degraded" ? "降级" : status === "unhealthy" ? "异常" : "未知";
  const colorClass = status === "healthy" ? "bg-success/20 text-success" :
    status === "degraded" ? "bg-warning/20 text-warning" :
    status === "unhealthy" ? "bg-danger/20 text-danger" :
    "bg-text-muted/20 text-text-muted";

  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold", colorClass)}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === "healthy" || status === "working" || status === "idle";
  const isDegraded = status === "degraded" || status === "warning" || status === "alert" || status === "reconnecting";
  const label = isHealthy ? "正常" : isDegraded ? "降级" : "异常";

  const colorClass = isHealthy ? "text-success" :
    isDegraded ? "text-warning" :
    "text-danger";

  return (
    <span className={cn("text-[11px] font-medium", colorClass)}>
      {label}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
