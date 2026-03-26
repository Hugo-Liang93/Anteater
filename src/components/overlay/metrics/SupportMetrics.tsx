import { cn } from "@/lib/utils";
import { useSignalStore } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";
import type { AccountInfo, Position, HealthStatus } from "@/api/types";
import type { QueueInfo } from "@/store/live";
import { KV, Empty } from "./shared";

interface PositionManagerMetricsProps {
  positions: Position[];
}

export function PositionManagerMetrics({ positions }: PositionManagerMetricsProps): React.ReactNode {
  if (positions.length === 0) {
    return <Empty text="无持仓" />;
  }

  const totalPnL = positions.reduce((s, p) => s + p.profit, 0);

  return (
    <div className="space-y-2">
      <div className="space-y-1 text-xs">
        {positions.slice(0, 5).map((p) => (
          <div key={p.ticket} className="flex justify-between">
            <span>
              <span className={p.type === "buy" ? "text-buy" : "text-sell"}>
                {p.type === "buy" ? "多" : "空"}
              </span>{" "}
              {p.volume}手 @{p.price_open.toFixed(2)}
            </span>
            <span className={p.profit >= 0 ? "text-buy" : "text-sell"}>
              {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs font-medium">
        <span className="text-text-muted">总 P&L</span>
        <span className={totalPnL >= 0 ? "text-buy" : "text-sell"}>
          {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

interface MarginGuardInfo {
  enabled: boolean;
  margin_level: number | null;
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
    block_trades: number;
    tighten_stops: number;
    emergency_close: number;
  };
}

interface AccountantMetricsProps {
  account: AccountInfo | null;
}

export function AccountantMetrics({ account }: AccountantMetricsProps): React.ReactNode {
  const emp = useEmployeeStore.getState().employees["accountant"];
  const m = emp?.stats ?? {};
  const mg = typeof m.margin_guard === "object" && m.margin_guard !== null
    ? m.margin_guard as unknown as MarginGuardInfo : null;

  if (!account) return <Empty text="等待账户数据" />;

  const marginLevel = account.margin > 0
    ? (account.equity / account.margin) * 100
    : null;

  const mgState = mg?.state ?? "safe";
  const stateColor = mgState === "critical" ? "text-danger" :
    mgState === "danger" ? "text-warning" :
    mgState === "warn" ? "text-yellow-400" : "text-success";
  const stateLabel = mgState === "critical" ? "紧急" :
    mgState === "danger" ? "危险" :
    mgState === "warn" ? "预警" : "正常";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <KV k="余额" v={`$${account.balance.toFixed(2)}`} />
        <KV k="净值" v={`$${account.equity.toFixed(2)}`} />
        <KV k="保证金" v={`$${account.margin.toFixed(2)}`} />
        <KV k="可用" v={`$${account.free_margin.toFixed(2)}`} />
        <KV k="盈亏" v={`$${account.profit.toFixed(2)}`} color={account.profit >= 0 ? "text-buy" : "text-sell"} />
        <KV k="杠杆" v={`1:${account.leverage}`} />
      </div>

      {/* 保证金水位 */}
      {marginLevel != null && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">保证金水位</span>
            <span className={cn("font-medium tabular-nums", stateColor)}>
              {marginLevel.toFixed(0)}% · {stateLabel}
            </span>
          </div>
          <MarginLevelBar level={marginLevel} thresholds={mg?.thresholds} />
        </div>
      )}

      {/* 风控动作 */}
      {mg && (mg.should_block_new_trades || mg.should_tighten_stops || mg.should_emergency_close) && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">风控动作</div>
          {mg.should_emergency_close && (
            <div className="rounded bg-danger/10 px-2 py-1 text-[10px] text-danger">
              紧急平仓已激活 ({mg.emergency_close_count} 次)
            </div>
          )}
          {mg.should_tighten_stops && (
            <div className="rounded bg-warning/10 px-2 py-1 text-[10px] text-warning">
              止损已收紧 ({mg.tighten_count} 笔)
            </div>
          )}
          {mg.should_block_new_trades && (
            <div className="rounded bg-warning/10 px-2 py-1 text-[10px] text-warning">
              新开仓已禁止 ({mg.block_count} 次拦截)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 保证金水位条 — 按阈值分段着色 */
function MarginLevelBar({ level, thresholds }: {
  level: number;
  thresholds?: { warn: number; danger: number; critical: number } | null;
}) {
  const warn = thresholds?.warn ?? 200;
  const danger = thresholds?.danger ?? 150;
  const critical = thresholds?.critical ?? 100;
  // 归一化到 0-100%，以 warn*1.5 为满刻度
  const max = warn * 1.5;
  const pct = Math.min(Math.max((level / max) * 100, 2), 100);

  const color = level < critical ? "#ff1744"
    : level < danger ? "#ff6d00"
    : level < warn ? "#ffc107"
    : "#00d4aa";

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      {/* 阈值标记线 */}
      {[critical, danger, warn].map((t) => {
        const x = (t / max) * 100;
        return x > 0 && x < 100 ? (
          <div key={t} className="absolute top-0 h-full w-px bg-text-muted/30" style={{ left: `${x}%` }} />
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

export function InspectorMetrics({ health, queues, connected }: InspectorMetricsProps): React.ReactNode {
  const totalDrops = queues.reduce((s, q) => s + q.drops_oldest + q.drops_newest, 0);

  if (!health) {
    return <Empty text={connected ? "巡检中..." : "等待连接"} />;
  }

  const comps = Object.entries(health.components);
  const issues = comps.filter(([, c]) => c.status !== "healthy");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 text-xs">
        <KV k="总体状态" v={health.status} color={health.status === "healthy" ? "text-success" : health.status === "degraded" ? "text-warning" : "text-danger"} />
        <KV k="组件数" v={String(comps.length)} />
      </div>
      {issues.length > 0 && (
        <div className="space-y-1">
          {issues.map(([name, comp]) => (
            <div key={name} className="flex justify-between text-xs">
              <span className="text-text-muted">{name}</span>
              <span className="text-warning">{comp.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* 队列健康 */}
      {queues.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>队列健康</span>
            {totalDrops > 0 && <span className="text-warning">丢弃 {totalDrops}</span>}
          </div>
          {queues.map((q) => (
            <div key={q.name} className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">{q.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-10 overflow-hidden rounded-full bg-bg-secondary">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(Math.max(q.utilization_pct, 1), 100)}%`,
                    backgroundColor: q.utilization_pct > 80 ? "#ff4757" : q.utilization_pct > 50 ? "#ffa726" : "#00d4aa",
                  }} />
                </div>
                <span className={cn("tabular-nums",
                  q.status === "normal" ? "text-text-muted" : "text-warning"
                )}>
                  {q.size}/{q.max}
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

export function CalendarReporterMetrics({ connected }: CalendarReporterMetricsProps): React.ReactNode {
  const riskWindows = useSignalStore.getState().riskWindows;

  if (riskWindows.length === 0) {
    return <Empty text={connected ? "经济日历无近期事件" : "等待连接"} />;
  }

  const now = Date.now();
  const highImpact = riskWindows.filter((w) => w.impact === "high");
  const activeGuards = riskWindows.filter((w) => w.guard_active);
  const upcoming = riskWindows
    .map((w) => ({ ...w, ms: new Date(w.scheduled_at || w.datetime).getTime() - now }))
    .filter((w) => w.ms > 0)
    .sort((a, b) => a.ms - b.ms);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <KV k="总事件" v={String(riskWindows.length)} />
        <KV k="高影响" v={String(highImpact.length)} color={highImpact.length > 0 ? "text-warning" : undefined} />
        <KV k="防护中" v={String(activeGuards.length)} color={activeGuards.length > 0 ? "text-danger" : undefined} />
      </div>
      {upcoming.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted">即将公布</div>
          {upcoming.slice(0, 3).map((w, i) => {
            const timeStr = w.ms < 3600_000
              ? `${Math.round(w.ms / 60_000)}分钟`
              : `${Math.round(w.ms / 3600_000)}小时`;
            return (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    w.impact === "high" ? "bg-danger" : w.impact === "medium" ? "bg-warning" : "bg-text-muted",
                  )} />
                  <span className="text-text-secondary">{w.event_name}</span>
                  <span className="text-[10px] text-text-muted">{w.currency}</span>
                </span>
                <span className={w.ms < 3600_000 ? "font-medium text-warning" : "text-text-muted"}>
                  {timeStr}后
                </span>
              </div>
            );
          })}
        </div>
      )}
      {activeGuards.length > 0 && (
        <div className="rounded bg-danger/10 p-1.5 text-[10px] text-danger">
          风险防护已激活: {activeGuards.map((w) => w.event_name).join(", ")}
        </div>
      )}
    </div>
  );
}
