import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { isLikelyMarketClosed } from "@/lib/marketStatus";

export function TopBar() {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const connected = useMarketStore((s) => s.connected);
  const positions = useMarketStore((s) => s.positions);
  const latestBar = useMarketStore((s) => s.latestOhlcBars[`${config.symbols[0]}:${config.defaultTimeframe}`]);
  const health = useSignalStore((s) => s.health);

  const healthStatus = health?.status ?? "unknown";

  const marketClosed = isLikelyMarketClosed({
    connected,
    quoteTime: quote?.time,
    barTime: latestBar?.time,
    timeframe: config.defaultTimeframe,
  });

  return (
    <header className="flex h-full items-center justify-between border-b border-white/8 bg-[#0a111b]/90 px-5">
      {/* Left: branding */}
      <div className="flex items-center gap-3">
        <span className="font-display text-[20px] font-semibold tracking-[0.12em] text-accent">
          ANTEATER
        </span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.18em]",
            config.mockMode ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
          )}
        >
          {config.mockMode ? "MOCK" : "LIVE"}
        </span>
      </div>

      {/* Center: market data */}
      <div className="flex min-w-0 shrink items-center gap-5 font-data text-[13px]">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] tracking-wider text-white/40">XAUUSD</span>
          {quote ? (
            <>
              <span className="text-[15px] font-semibold text-buy">{quote.bid.toFixed(2)}</span>
              <span className="text-white/20">/</span>
              <span className="text-[15px] font-semibold text-sell">{quote.ask.toFixed(2)}</span>
              <span className="text-[11px] text-white/30">sp {quote.spread.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-white/25">--.--</span>
          )}
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-white/35">净值</span>
          <span className="text-white/80">${account?.equity?.toFixed(0) ?? "--"}</span>
          {positions.length > 0 && (
            <span className="text-[11px] text-white/30">{positions.length} 仓</span>
          )}
        </div>
      </div>

      {/* Right: market status + system health */}
      <div className="flex items-center gap-3">
        {/* 市场状态 */}
        <div className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1",
          !connected
            ? "border-rose-400/20 bg-rose-400/10"
            : marketClosed
              ? "border-white/10 bg-white/5"
              : "border-emerald-400/20 bg-emerald-400/10",
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            !connected ? "bg-rose-400" : marketClosed ? "bg-white/30" : "bg-emerald-400",
          )} />
          <span className={cn(
            "text-[12px] font-medium",
            !connected ? "text-rose-300" : marketClosed ? "text-white/45" : "text-emerald-300",
          )}>
            {!connected ? "离线" : marketClosed ? "休市" : "交易中"}
          </span>
        </div>

        {/* 系统健康 */}
        <div className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1",
          healthStatus === "healthy" ? "border-emerald-400/15 bg-emerald-400/5" :
          healthStatus === "degraded" ? "border-amber-400/15 bg-amber-400/5" :
          "border-rose-400/15 bg-rose-400/5",
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            healthStatus === "healthy" ? "bg-emerald-400" :
            healthStatus === "degraded" ? "bg-amber-400" :
            "bg-rose-400",
          )} />
          <span className={cn(
            "text-[12px]",
            healthStatus === "healthy" ? "text-emerald-300/80" :
            healthStatus === "degraded" ? "text-amber-300" :
            "text-rose-300",
          )}>
            {healthStatus === "healthy" ? "系统正常" :
             healthStatus === "degraded" ? "系统降级" : "系统异常"}
          </span>
        </div>
      </div>
    </header>
  );
}
