import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import type { Position, Quote } from "@/api/types";

interface TraderMetricsProps {
  quote: Quote | undefined;
  positions: Position[];
}

interface PendingEntryData {
  signal_id: string;
  symbol: string;
  direction: string;
  strategy: string;
  zone: [number, number];
  reference_price: number;
  zone_mode: string;
  checks_count: number;
  best_price_seen: number | null;
  remaining_seconds: number;
}

const ZONE_MODE_LABELS: Record<string, string> = {
  pullback: "回调",
  momentum: "动量",
  symmetric: "对称",
};

export function TraderMetrics({ quote, positions }: TraderMetricsProps): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.trader;
  const stats = employee?.stats ?? {};
  const pendingEntries = Array.isArray(stats.pending_entries)
    ? (stats.pending_entries as PendingEntryData[])
    : [];
  const pendingStats =
    typeof stats.pending_stats === "object" && stats.pending_stats !== null
      ? (stats.pending_stats as Record<string, number | null>)
      : {};
  const execCount = Number(stats.execution_count ?? 0);
  const lastError = typeof stats.last_error === "string" ? stats.last_error : null;
  const lastRiskBlock =
    typeof stats.last_risk_block === "string" ? stats.last_risk_block : null;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <KVText title="已执行" value={String(execCount)} />
        <KVText
          title="成交率"
          value={
            pendingStats.fill_rate != null
              ? `${(Number(pendingStats.fill_rate) * 100).toFixed(0)}%`
              : "--"
          }
        />
        <KVText
          title="价格优化"
          value={
            pendingStats.avg_price_improvement != null
              ? Number(pendingStats.avg_price_improvement).toFixed(2)
              : "--"
          }
        />
      </div>

      {lastError && (
        <div className="rounded border border-warning/40 bg-warning/5 px-2 py-1 text-[10px] text-warning">
          <span className="font-medium">执行异常：</span>
          {lastError}
        </div>
      )}
      {!lastError && lastRiskBlock && (
        <div className="rounded border border-white/10 bg-black/10 px-2 py-1 text-[10px] text-white/65">
          <span className="font-medium">最近风控阻断：</span>
          {lastRiskBlock}
        </div>
      )}

      {pendingEntries.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[10px] text-text-muted">价格确认中（{pendingEntries.length}）</div>
          {pendingEntries.map((entry) => (
            <EntryZoneCard key={entry.signal_id} entry={entry} currentPrice={quote?.bid} />
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-text-muted">当前没有挂起入场区间</div>
      )}

      {positions.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">活动持仓（{positions.length}）</div>
          {positions.slice(0, 3).map((position) => (
            <div key={position.ticket} className="flex justify-between text-[10px]">
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
      )}
    </div>
  );
}

function KVText({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="text-text-muted">{title}</div>
      <div className="font-mono text-text-primary">{value}</div>
    </div>
  );
}

function EntryZoneCard({
  entry,
  currentPrice,
}: {
  entry: PendingEntryData;
  currentPrice?: number;
}) {
  const [low, high] = entry.zone;
  const isBuy = entry.direction === "buy";
  const remaining = Math.max(0, entry.remaining_seconds);
  const timeStr =
    remaining >= 60
      ? `${Math.floor(remaining / 60)}m${Math.round(remaining % 60)}s`
      : `${Math.round(remaining)}s`;
  const width = high - low;
  const pricePct =
    currentPrice != null && width > 0
      ? Math.min(Math.max(((currentPrice - low) / width) * 100, 0), 100)
      : null;
  const inZone = currentPrice != null && currentPrice >= low && currentPrice <= high;

  return (
    <div
      className={cn(
        "rounded border px-2 py-1.5 text-[10px]",
        inZone ? "border-success/50 bg-success/5" : "border-border/50",
      )}
    >
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

      <div className="mt-1 space-y-0.5">
        <div className="flex items-center justify-between tabular-nums text-text-muted">
          <span>{low.toFixed(2)}</span>
          <span className="text-accent">参考 {entry.reference_price.toFixed(2)}</span>
          <span>{high.toFixed(2)}</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
          <div
            className={cn("absolute inset-0 rounded-full opacity-30", isBuy ? "bg-buy" : "bg-sell")}
          />
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
        {currentPrice != null && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">当前价格</span>
            <span
              className={cn(
                "tabular-nums font-medium",
                inZone ? "text-success" : "text-text-secondary",
              )}
            >
              {currentPrice.toFixed(2)} {inZone ? "在区间内" : "未到区间"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
