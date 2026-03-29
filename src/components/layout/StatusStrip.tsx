import { useEffect, useState } from "react";
import { useEventStore } from "@/store/events";
import { useMarketStore } from "@/store/market";
import { employeeConfigMap, type EmployeeRoleType } from "@/config/employees";

function formatClock(date: Date): string {
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

export function StatusStrip() {
  const latestEvent = useEventStore((s) => s.events[0] ?? null);
  const connected = useMarketStore((s) => s.connected);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sourceRole = latestEvent?.source as EmployeeRoleType | undefined;
  const config = sourceRole ? employeeConfigMap.get(sourceRole) : undefined;

  return (
    <div className="flex h-8 items-center justify-between border-t border-white/6 bg-[#080e18]/95 px-4">
      {/* Left: latest event */}
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-white/50">
        {latestEvent ? (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: config?.color ?? "#7b8794" }}
            />
            <span className="shrink-0 text-white/60">
              {config?.name ?? latestEvent.source}
            </span>
            <span className="truncate">{latestEvent.message}</span>
            <span className="shrink-0 text-white/30">
              {formatEventTime(latestEvent.createdAt)}
            </span>
          </>
        ) : (
          <span>等待事件...</span>
        )}
      </div>

      {/* Right: connection + clock */}
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/50">
        <span
          className={
            connected
              ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
              : "h-1.5 w-1.5 rounded-full bg-rose-500"
          }
        />
        <span>{connected ? "已连接" : "离线"}</span>
        <span className="text-white/30">{formatClock(now)}</span>
      </div>
    </div>
  );
}
