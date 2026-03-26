import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useMarketStore } from "@/store/market";
import { useSignalStore, selectRiskWindows } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";
import { Activity, CalendarClock, ShieldAlert, Wifi, WifiOff } from "lucide-react";

export function TopBar() {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const connected = useMarketStore((s) => s.connected);
  const health = useSignalStore((s) => s.health);
  const riskWindows = useSignalStore(selectRiskWindows);

  const healthColor =
    health?.status === "healthy"
      ? "text-success"
      : health?.status === "degraded"
        ? "text-warning"
        : "text-danger";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4">
      {/* 左：品牌 */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-wide text-accent">
          ANTEATER
        </span>
        <span className="text-xs text-text-muted">Trading Studio</span>
        {config.mockMode ? (
          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
            MOCK
          </span>
        ) : (
          <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
            LIVE
          </span>
        )}
      </div>

      {/* 中：行情 */}
      <div className="flex items-center gap-6 text-sm">
        {quote?.bid != null ? (
          <>
            <span className="font-mono text-text-primary">
              XAUUSD{" "}
              <span className="text-buy">{quote.bid.toFixed(2)}</span>
              {" / "}
              <span className="text-sell">{quote.ask?.toFixed(2) ?? "—"}</span>
            </span>
            {quote.spread != null && (
              <span className="text-text-muted">
                spread {quote.spread.toFixed(1)}
              </span>
            )}
          </>
        ) : (
          <span className="text-text-muted">等待行情...</span>
        )}

        {account && (
          <span className="text-text-secondary">
            余额{" "}
            <span className="font-mono text-text-primary">
              ${account.balance.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      {/* 右：保证金告警 + 日历 + 状态 */}
      <div className="flex items-center gap-3 text-xs">
        <MarginAlert />
        <CalendarAlert riskWindows={riskWindows} />
        <span className={cn("flex items-center gap-1", healthColor)}>
          <Activity size={14} />
          {health?.status ?? "unknown"}
        </span>
        {connected ? (
          <Wifi size={14} className="text-success" />
        ) : (
          <WifiOff size={14} className="text-danger" />
        )}
      </div>
    </header>
  );
}

/** 保证金水位告警指示器 */
function MarginAlert() {
  const stats = useEmployeeStore((s) => s.employees["accountant"]?.stats ?? {});
  const mg = typeof stats.margin_guard === "object" && stats.margin_guard !== null
    ? stats.margin_guard as { state?: string; margin_level?: number; should_block_new_trades?: boolean; should_emergency_close?: boolean }
    : null;

  if (!mg || mg.state === "safe" || mg.state === "unknown") return null;

  const level = mg.margin_level != null ? `${Math.round(mg.margin_level)}%` : "";
  const isCritical = mg.state === "critical";
  const isDanger = mg.state === "danger";

  const label = isCritical
    ? `保证金 ${level} 紧急`
    : isDanger
      ? `保证金 ${level} 危险`
      : `保证金 ${level} 预警`;

  return (
    <span className={cn(
      "flex items-center gap-1 rounded px-1.5 py-0.5",
      isCritical
        ? "bg-danger/20 text-danger animate-pulse"
        : isDanger
          ? "bg-warning/20 text-warning animate-pulse"
          : "bg-yellow-400/20 text-yellow-400",
    )}>
      <ShieldAlert size={12} />
      <span>{label}</span>
    </span>
  );
}

/** 经济日历预警指示器 */
function CalendarAlert({ riskWindows }: { riskWindows: import("@/api/types").RiskWindow[] }) {
  if (riskWindows.length === 0) return null;

  const now = Date.now();
  const activeGuards = riskWindows.filter((w) => w.guard_active);
  const nearest = riskWindows
    .filter((w) => w.impact === "high")
    .map((w) => ({ ...w, ms: new Date(w.scheduled_at || w.datetime).getTime() - now }))
    .filter((w) => w.ms > 0)
    .sort((a, b) => a.ms - b.ms)[0];

  // 无高影响事件且无防护 → 静默
  if (!nearest && activeGuards.length === 0) return null;

  const isUrgent = activeGuards.length > 0 || (nearest && nearest.ms < 3600_000);
  const timeStr = nearest
    ? nearest.ms < 3600_000
      ? `${Math.round(nearest.ms / 60_000)}m`
      : `${Math.round(nearest.ms / 3600_000)}h`
    : "";

  const label = activeGuards.length > 0
    ? `防护中`
    : nearest
      ? `${nearest.currency} ${nearest.event_name.length > 8 ? nearest.event_name.slice(0, 8) + "…" : nearest.event_name} ${timeStr}`
      : "";

  return (
    <span className={cn(
      "flex items-center gap-1 rounded px-1.5 py-0.5",
      isUrgent
        ? "bg-warning/20 text-warning animate-pulse"
        : "bg-text-muted/10 text-text-muted",
    )}>
      <CalendarClock size={12} />
      <span className="max-w-[120px] truncate">{label}</span>
    </span>
  );
}
