import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import type { Quote, Position } from "@/api/types";

interface TraderMetricsProps {
  quote: Quote | undefined;
  positions: Position[];
}

/** Pending entry 数据结构（来自后端 PendingEntryManager.status()） */
interface PendingEntryData {
  signal_id: string;
  symbol: string;
  direction: string;
  strategy: string;
  zone: [number, number]; // [entry_low, entry_high]
  reference_price: number;
  zone_mode: string;
  checks_count: number;
  best_price_seen: number | null;
  remaining_seconds: number;
}

const ZONE_MODE_LABELS: Record<string, string> = {
  pullback: "回调", momentum: "动量", symmetric: "对称",
};

export function TraderMetrics({ quote, positions }: TraderMetricsProps): React.ReactNode {
  const traderEmp = useEmployeeStore.getState().employees["trader"];
  const tm = traderEmp?.stats ?? {};
  const pendingEntries = Array.isArray(tm.pending_entries) ? tm.pending_entries as unknown as PendingEntryData[] : [];
  const pendingStats = (typeof tm.pending_stats === "object" && tm.pending_stats !== null)
    ? tm.pending_stats as unknown as Record<string, number | null>
    : {};
  const execCount = Number(tm.execution_count ?? 0);
  const currentBid = quote?.bid;

  return (
    <div className="space-y-2.5">
      {/* 执行统计 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-text-muted">已执行</div><div className="font-mono text-text-primary">{String(execCount)}</div></div>
        <div><div className="text-text-muted">成交率</div><div className="font-mono text-text-primary">{pendingStats.fill_rate != null ? `${(Number(pendingStats.fill_rate) * 100).toFixed(0)}%` : "—"}</div></div>
        <div><div className="text-text-muted">价格优化</div><div className="font-mono text-text-primary">{pendingStats.avg_price_improvement != null ? `${Number(pendingStats.avg_price_improvement).toFixed(2)}` : "—"}</div></div>
      </div>

      {/* Pending Entries — 入场区间可视化 */}
      {pendingEntries.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[10px] text-text-muted">价格确认中 ({pendingEntries.length})</div>
          {pendingEntries.map((pe) => (
            <EntryZoneCard key={pe.signal_id} entry={pe} currentPrice={currentBid} />
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-text-muted">无挂起入场</div>
      )}

      {/* 持仓 */}
      {positions.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted">活跃持仓 ({positions.length})</div>
          {positions.slice(0, 3).map((p) => (
            <div key={p.ticket} className="flex justify-between text-[10px]">
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
      )}
    </div>
  );
}

/** 入场区间可视化卡片 */
function EntryZoneCard({ entry, currentPrice }: { entry: PendingEntryData; currentPrice?: number }) {
  const [low, high] = entry.zone;
  const ref = entry.reference_price;
  const isBuy = entry.direction === "buy";
  const remaining = Math.max(0, entry.remaining_seconds);
  const timeStr = remaining >= 60 ? `${Math.floor(remaining / 60)}m${Math.round(remaining % 60)}s` : `${Math.round(remaining)}s`;

  const zoneWidth = high - low;
  const pricePct = currentPrice != null && zoneWidth > 0
    ? Math.min(Math.max((currentPrice - low) / zoneWidth * 100, 0), 100)
    : null;
  const inZone = currentPrice != null && currentPrice >= low && currentPrice <= high;

  return (
    <div className={cn(
      "rounded border px-2 py-1.5 text-[10px]",
      inZone ? "border-success/50 bg-success/5" : "border-border/50",
    )}>
      {/* 头部：方向 + 策略 + 模式 + 倒计时 */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className={cn("font-medium", isBuy ? "text-buy" : "text-sell")}>
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span className="text-text-secondary">{entry.strategy}</span>
          <span className="text-text-muted">({ZONE_MODE_LABELS[entry.zone_mode] ?? entry.zone_mode})</span>
        </span>
        <span className={cn("tabular-nums", remaining < 30 ? "text-warning" : "text-text-muted")}>
          {timeStr}
        </span>
      </div>

      {/* 区间条 */}
      <div className="mt-1 space-y-0.5">
        <div className="flex items-center justify-between tabular-nums text-text-muted">
          <span>{low.toFixed(2)}</span>
          <span className="text-accent">ref {ref.toFixed(2)}</span>
          <span>{high.toFixed(2)}</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
          {/* 区间填充 */}
          <div className={cn(
            "absolute inset-0 rounded-full opacity-30",
            isBuy ? "bg-buy" : "bg-sell",
          )} />
          {/* 当前价格标记 */}
          {pricePct != null && (
            <div
              className={cn(
                "absolute top-0 h-full w-0.5 rounded-full",
                inZone ? "bg-success" : "bg-text-muted",
              )}
              style={{ left: `${pricePct}%` }}
            />
          )}
        </div>
        {/* 当前价格 */}
        {currentPrice != null && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">当前</span>
            <span className={cn("tabular-nums font-medium", inZone ? "text-success" : "text-text-secondary")}>
              {currentPrice.toFixed(2)} {inZone ? "✓ 区间内" : "区间外"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
