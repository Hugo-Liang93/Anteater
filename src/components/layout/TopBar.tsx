import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { Activity, Wifi, WifiOff } from "lucide-react";

export function TopBar() {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const connected = useMarketStore((s) => s.connected);
  const health = useSignalStore((s) => s.health);

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

      {/* 右：状态 */}
      <div className="flex items-center gap-3 text-xs">
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
