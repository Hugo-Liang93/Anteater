import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { useSignalStore } from "@/store/signals";
import type { AccountInfo, HealthStatus, Position } from "@/api/types";
import type { QueueInfo } from "@/store/live";
import { Empty, KV } from "./shared";

interface PositionManagerMetricsProps {
  positions: Position[];
}

export function PositionManagerMetrics({ positions }: PositionManagerMetricsProps): React.ReactNode {
  if (positions.length === 0) return <Empty text="当前无持仓" />;

  const totalPnl = positions.reduce((sum, position) => sum + position.profit, 0);

  return (
    <div className="space-y-2">
      <div className="space-y-1 text-[13px]">
        {positions.slice(0, 5).map((position) => (
          <div key={position.ticket} className="flex justify-between">
            <span>
              <span className={position.type === "buy" ? "text-buy" : "text-sell"}>
                {position.type === "buy" ? "多" : "空"}
              </span>{" "}
              {position.volume} 手 @ {position.price_open.toFixed(2)}
            </span>
            <span className={position.profit >= 0 ? "text-buy" : "text-sell"}>
              {position.profit >= 0 ? "+" : ""}
              {position.profit.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[13px] font-medium">
        <span className="text-text-muted">总浮盈亏</span>
        <span className={totalPnl >= 0 ? "text-buy" : "text-sell"}>
          {totalPnl >= 0 ? "+" : ""}
          {totalPnl.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

interface MarginGuardInfo {
  state: string;
  should_block_new_trades: boolean;
  should_tighten_stops: boolean;
  should_emergency_close: boolean;
  emergency_close_count: number;
  tighten_count: number;
  block_count: number;
  thresholds: {
    warn: number;
    danger: number;
    critical: number;
  };
}

interface AccountantMetricsProps {
  account: AccountInfo | null;
}

export function AccountantMetrics({ account }: AccountantMetricsProps): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.accountant;
  const stats = employee?.stats ?? {};
  const marginGuard =
    typeof stats.margin_guard === "object" && stats.margin_guard !== null
      ? (stats.margin_guard as MarginGuardInfo)
      : null;

  if (!account) return <Empty text="等待账户数据" />;

  const marginLevel = account.margin > 0 ? (account.equity / account.margin) * 100 : null;
  const guardState = marginGuard?.state ?? "safe";
  const stateLabel =
    guardState === "critical"
      ? "紧急"
      : guardState === "danger"
        ? "危险"
        : guardState === "warn"
          ? "预警"
          : "正常";
  const stateColor =
    guardState === "critical"
      ? "text-danger"
      : guardState === "danger"
        ? "text-warning"
        : guardState === "warn"
          ? "text-yellow-400"
          : "text-success";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <KV k="余额" v={`$${account.balance.toFixed(2)}`} />
        <KV k="净值" v={`$${account.equity.toFixed(2)}`} />
        <KV k="保证金" v={`$${account.margin.toFixed(2)}`} />
        <KV k="可用资金" v={`$${account.free_margin.toFixed(2)}`} />
        <KV
          k="当前盈亏"
          v={`$${account.profit.toFixed(2)}`}
          color={account.profit >= 0 ? "text-buy" : "text-sell"}
        />
        <KV k="杠杆" v={`1:${account.leverage}`} />
      </div>

      {marginLevel != null && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-text-muted">保证金水位</span>
            <span className={cn("font-medium tabular-nums", stateColor)}>
              {marginLevel.toFixed(0)}% / {stateLabel}
            </span>
          </div>
          <MarginLevelBar level={marginLevel} thresholds={marginGuard?.thresholds} />
        </div>
      )}

      {marginGuard &&
        (marginGuard.should_block_new_trades ||
          marginGuard.should_tighten_stops ||
          marginGuard.should_emergency_close) && (
          <div className="space-y-1 border-t border-border/50 pt-2">
            <div className="text-[13px] text-text-muted">当前保护动作</div>
            {marginGuard.should_emergency_close && (
              <div className="rounded bg-danger/10 px-2 py-1 text-[13px] text-danger">
                紧急平仓已激活（{marginGuard.emergency_close_count} 次）
              </div>
            )}
            {marginGuard.should_tighten_stops && (
              <div className="rounded bg-warning/10 px-2 py-1 text-[13px] text-warning">
                已收紧止损（{marginGuard.tighten_count} 次）
              </div>
            )}
            {marginGuard.should_block_new_trades && (
              <div className="rounded bg-warning/10 px-2 py-1 text-[13px] text-warning">
                新开仓已禁止（{marginGuard.block_count} 次）
              </div>
            )}
          </div>
        )}
    </div>
  );
}

function MarginLevelBar({
  level,
  thresholds,
}: {
  level: number;
  thresholds?: { warn: number; danger: number; critical: number } | null;
}) {
  const warn = thresholds?.warn ?? 200;
  const danger = thresholds?.danger ?? 150;
  const critical = thresholds?.critical ?? 100;
  const max = warn * 1.5;
  const pct = Math.min(Math.max((level / max) * 100, 2), 100);
  const color =
    level < critical ? "#ff1744" : level < danger ? "#ff6d00" : level < warn ? "#ffc107" : "#00d4aa";

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      {[critical, danger, warn].map((threshold) => {
        const x = (threshold / max) * 100;
        return x > 0 && x < 100 ? (
          <div key={threshold} className="absolute top-0 h-full w-px bg-text-muted/30" style={{ left: `${x}%` }} />
        ) : null;
      })}
    </div>
  );
}

interface InspectorMetricsProps {
  health: HealthStatus | null;
  queues: QueueInfo[];
  connected: boolean;
}

export function InspectorMetrics({
  health,
  queues,
  connected,
}: InspectorMetricsProps): React.ReactNode {
  const totalDrops = queues.reduce((sum, queue) => sum + queue.drops_oldest + queue.drops_newest, 0);

  if (!health) return <Empty text={connected ? "等待巡检结果" : "等待连接恢复"} />;

  const components = Object.entries(health.components);
  const issues = components.filter(([, component]) => component.status !== "healthy");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 text-[13px]">
        <KV
          k="总体状态"
          v={health.status}
          color={
            health.status === "healthy"
              ? "text-success"
              : health.status === "degraded"
                ? "text-warning"
                : "text-danger"
          }
        />
        <KV k="组件数量" v={String(components.length)} />
      </div>

      {issues.length > 0 && (
        <div className="space-y-1">
          {issues.map(([name, component]) => (
            <div key={name} className="flex justify-between text-[13px]">
              <span className="text-text-muted">{name}</span>
              <span className="text-warning">{component.status}</span>
            </div>
          ))}
        </div>
      )}

      {queues.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between text-[13px] text-text-muted">
            <span>队列健康</span>
            {totalDrops > 0 && <span className="text-warning">丢弃 {totalDrops}</span>}
          </div>
          {queues.map((queue) => (
            <div key={queue.name} className="flex items-center justify-between text-[13px]">
              <span className="text-text-muted">{queue.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-10 overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(Math.max(queue.utilization_pct, 1), 100)}%`,
                      backgroundColor:
                        queue.utilization_pct > 80
                          ? "#ff4757"
                          : queue.utilization_pct > 50
                            ? "#ffa726"
                            : "#00d4aa",
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "tabular-nums",
                    queue.status === "normal" ? "text-text-muted" : "text-warning",
                  )}
                >
                  {queue.size}/{queue.max}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CalendarReporterMetricsProps {
  connected: boolean;
}

export function CalendarReporterMetrics({
  connected,
}: CalendarReporterMetricsProps): React.ReactNode {
  const riskWindows = useSignalStore.getState().riskWindows;

  if (riskWindows.length === 0) {
    return <Empty text={connected ? "近期没有经济事件窗口" : "等待连接恢复"} />;
  }

  const now = Date.now();
  const highImpact = riskWindows.filter((item) => item.impact === "high");
  const activeGuards = riskWindows.filter((item) => item.guard_active);
  const upcoming = riskWindows
    .map((item) => ({
      ...item,
      ms: new Date(item.scheduled_at || item.datetime).getTime() - now,
    }))
    .filter((item) => item.ms > 0)
    .sort((a, b) => a.ms - b.ms);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <KV k="总事件" v={String(riskWindows.length)} />
        <KV k="高影响" v={String(highImpact.length)} color={highImpact.length > 0 ? "text-warning" : undefined} />
        <KV k="保护中" v={String(activeGuards.length)} color={activeGuards.length > 0 ? "text-danger" : undefined} />
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-1">
          <div className="text-[13px] text-text-muted">即将公布</div>
          {upcoming.slice(0, 3).map((item, index) => {
            const timeStr =
              item.ms < 3600_000
                ? `${Math.round(item.ms / 60_000)} 分钟`
                : `${Math.round(item.ms / 3600_000)} 小时`;
            return (
              <div key={index} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      item.impact === "high"
                        ? "bg-danger"
                        : item.impact === "medium"
                          ? "bg-warning"
                          : "bg-text-muted",
                    )}
                  />
                  <span className="text-text-secondary">{item.event_name}</span>
                  <span className="text-[13px] text-text-muted">{item.currency}</span>
                </span>
                <span className={item.ms < 3600_000 ? "font-medium text-warning" : "text-text-muted"}>
                  {timeStr}后
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeGuards.length > 0 && (
        <div className="rounded bg-danger/10 p-1.5 text-[13px] text-danger">
          保护窗口已激活：{activeGuards.map((item) => item.event_name).join("，")}
        </div>
      )}
    </div>
  );
}
