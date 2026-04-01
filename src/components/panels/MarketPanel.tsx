/**
 * MarketPanel -- 行情概览
 *
 * 关键指标和状态区都跟随默认分析周期。
 */

import { config } from "@/config";
import { selectEmployee, useEmployeeStore } from "@/store/employees";
import { useLiveStore, type IndicatorData } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { Section, PanelShell } from "./shared";

export function MarketPanel() {
  const symbol = config.symbols[0];
  const indicatorTimeframe = config.defaultTimeframe;
  const statusTimeframe = config.defaultTimeframe;
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const latestStatusBar = useMarketStore(
    (s) => s.latestOhlcBars[`${symbol}:${statusTimeframe}`],
  );
  const connected = useMarketStore((s) => s.connected);
  const indicators = useLiveStore((s) => s.indicators[indicatorTimeframe]);
  const allIndicators = useLiveStore((s) => s.indicators);
  const collector = useEmployeeStore(selectEmployee("collector"));

  const marketClosed = isLikelyMarketClosed({
    connected,
    quoteTime: quote?.time,
    barTime: latestStatusBar?.time,
    timeframe: statusTimeframe,
  });

  return (
    <PanelShell title="行情概览">
        <Section title="报价">
          {quote ? (
            <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2.5">
              <div className="mb-1 text-[11px] text-white/35">{symbol}</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-white/40">Bid</span>
                  <div className="font-mono text-[14px] font-medium text-emerald-400">
                    {quote.bid.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-white/40">Ask</span>
                  <div className="font-mono text-[14px] font-medium text-rose-400">
                    {quote.ask.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-white/40">Spread</span>
                  <div className="font-mono text-[14px] font-medium text-white">
                    {quote.spread.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-white/40">等待报价连接...</p>
          )}
        </Section>

        <Section title={`关键指标 (${indicatorTimeframe})`}>
          {indicators ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <IndicatorItem
                label="RSI(14)"
                value={indicators.indicators.rsi14?.rsi}
                format={fmtNum}
                color={rsiColor}
              />
              <IndicatorItem
                label="ATR(14)"
                value={indicators.indicators.atr14?.atr}
                format={fmtNum}
              />
              <IndicatorItem
                label="ADX(14)"
                value={indicators.indicators.adx14?.adx}
                format={fmtNum}
              />
              <IndicatorItem
                label="MACD"
                value={indicators.indicators.macd?.macd}
                format={fmtNum}
              />
              <IndicatorItem
                label="Supertrend"
                value={indicators.indicators.supertrend14?.direction}
                format={fmtDirection}
                color={directionColor}
              />
              <IndicatorItem
                label="Boll"
                value={formatBollinger(indicators.indicators.boll20)}
                raw
              />
            </div>
          ) : (
            <p className="text-[13px] text-white/40">加载中...</p>
          )}
        </Section>

        <Section title="多周期概览">
          <div className="space-y-1">
            {config.timeframes.map((tf) => (
              <TfRow key={tf} tf={tf} data={allIndicators[tf]} />
            ))}
          </div>
        </Section>

        <Section title="采集状态">
          <div className="space-y-1.5">
            <StatusRow
              label="报价时间"
              value={marketClosed ? "休盘" : quote ? formatAge(quote.time) : "--"}
              ok={marketClosed || !!quote}
            />
            <BarFreshnessGrid symbol={symbol} marketClosed={marketClosed} />
            <StatusRow
              label="采集状态"
              value={marketClosed
                ? "休盘"
                : collector?.status === "working"
                  ? "正常采集"
                  : collector?.status ?? "未知"}
              ok={marketClosed || collector?.status === "working"}
            />
            <StatusRow
              label="后端链路"
              value={connected ? "已连通" : "未连通"}
              ok={connected}
            />
            {collector?.stats && typeof collector.stats.polls_total === "number" && (
              <StatusRow
                label="累计轮询"
                value={`${(collector.stats.polls_total as number).toLocaleString()} 次`}
                ok
              />
            )}
          </div>
        </Section>
    </PanelShell>
  );
}

function IndicatorItem({
  label,
  value,
  format,
  color,
  raw,
}: {
  label: string;
  value?: number | string | null;
  format?: (v: number) => string;
  color?: (v: number) => string;
  raw?: boolean;
}) {
  if (raw && typeof value === "string") {
    return (
      <div className="flex items-baseline justify-between rounded bg-white/[0.03] px-2 py-1">
        <span className="text-[11px] text-white/40">{label}</span>
        <span className="font-mono text-[13px] text-white/80">{value}</span>
      </div>
    );
  }

  const num = typeof value === "number" ? value : null;
  const display = num != null && format ? format(num) : num != null ? num.toFixed(2) : "--";
  const cls = num != null && color ? color(num) : "text-white/80";

  return (
    <div className="flex items-baseline justify-between rounded bg-white/[0.03] px-2 py-1">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className={`font-mono text-[13px] ${cls}`}>{display}</span>
    </div>
  );
}

function TfRow({ tf, data }: { tf: string; data?: IndicatorData }) {
  if (!data) {
    return (
      <div className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5 text-[13px]">
        <span className="font-mono text-white/50">{tf}</span>
        <span className="text-[11px] text-white/25">--</span>
      </div>
    );
  }

  const rsi = data.indicators.rsi14?.rsi;
  const atr = data.indicators.atr14?.atr;
  const count = Object.keys(data.indicators).length;

  return (
    <div className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5">
      <span className="font-mono text-[13px] text-white/60">{tf}</span>
      <div className="flex items-center gap-3 text-[13px]">
        <span className={rsi != null ? rsiColor(rsi) : "text-white/30"}>
          RSI {rsi != null ? rsi.toFixed(0) : "--"}
        </span>
        <span className="text-white/50">
          ATR {atr != null ? atr.toFixed(1) : "--"}
        </span>
        <span className="text-[11px] text-white/25">{count} 指标</span>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5">
      <span className="text-[13px] text-white/50">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-white/20"}`}
        />
        <span className="text-[13px] text-white/70">{value}</span>
      </div>
    </div>
  );
}

function fmtNum(v: number): string {
  return v.toFixed(2);
}

function rsiColor(v: number): string {
  if (v > 70) return "text-rose-400";
  if (v < 30) return "text-emerald-400";
  return "text-white/80";
}

function fmtDirection(v: number): string {
  return v > 0 ? "多" : "空";
}

function directionColor(v: number): string {
  return v > 0 ? "text-emerald-400" : "text-rose-400";
}

function formatBollinger(boll?: Record<string, number | null>): string {
  if (!boll) return "--";
  const upper = boll.upper;
  const lower = boll.lower;
  if (upper == null || lower == null) return "--";
  return `${upper.toFixed(0)} / ${lower.toFixed(0)}`;
}

function formatAge(timeStr: string): string {
  const diff = Date.now() - new Date(timeStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return "刚刚";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "刚刚";
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  return `${Math.floor(minutes / 60)}小时前`;
}

/**
 * 格式化 bar 时间显示 — bar.time 是开盘时间，需加上 TF 周期才是收盘时间。
 * 显示 "收盘时间 (距今 Xm)" 格式，避免与报价时间混淆。
 */
function formatBarTime(barTimeStr: string, timeframe: string): string {
  const barOpen = new Date(barTimeStr).getTime();
  if (Number.isNaN(barOpen)) return "--";
  const tfMs = timeframeToMinutes(timeframe) * 60_000;
  const barClose = barOpen + tfMs;
  const closeDate = new Date(barClose);
  const hh = String(closeDate.getHours()).padStart(2, "0");
  const mm = String(closeDate.getMinutes()).padStart(2, "0");
  const ageSec = Math.floor((Date.now() - barClose) / 1000);
  if (ageSec < 5) return `${hh}:${mm} (刚收盘)`;
  if (ageSec < 60) return `${hh}:${mm} (${ageSec}s前)`;
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) return `${hh}:${mm} (${ageMin}m前)`;
  return `${hh}:${mm} (${Math.floor(ageMin / 60)}h前)`;
}

/** 判断 bar 是否在合理新鲜度内（2 个周期以内） */
function isBarFresh(barTimeStr: string, timeframe: string): boolean {
  const barOpen = new Date(barTimeStr).getTime();
  if (Number.isNaN(barOpen)) return false;
  const tfMs = timeframeToMinutes(timeframe) * 60_000;
  return Date.now() - barOpen < tfMs * 3;
}

function isLikelyMarketClosed(input: {
  connected: boolean;
  quoteTime?: string;
  barTime?: string;
  timeframe: string;
}): boolean {
  if (!input.connected || !input.quoteTime || !input.barTime) {
    return false;
  }

  const quoteAgeMs = Date.now() - new Date(input.quoteTime).getTime();
  const barAgeMs = Date.now() - new Date(input.barTime).getTime();
  const tfMinutes = timeframeToMinutes(input.timeframe);

  if (Number.isNaN(quoteAgeMs) || Number.isNaN(barAgeMs)) {
    return false;
  }

  // 前端当前没有后端显式 market_state，这里用保守启发式：
  // 报价和 M15 bar 同时长时间停滞，但后端链路仍可达，优先视为休盘而不是故障。
  return quoteAgeMs >= 45 * 60 * 1000 && barAgeMs >= tfMinutes * 3 * 60 * 1000;
}

function BarFreshnessGrid({ symbol, marketClosed }: { symbol: string; marketClosed: boolean }) {
  const ohlcBars = useMarketStore((s) => s.latestOhlcBars);

  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-white/30 px-2">各周期最新收盘</div>
      {config.timeframes.map((tf) => {
        const bar = ohlcBars[`${symbol}:${tf}`];
        const fresh = bar ? isBarFresh(bar.time, tf) : false;
        const display = marketClosed
          ? "休盘"
          : bar
            ? formatBarTime(bar.time, tf)
            : "--";
        return (
          <div key={tf} className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1">
            <span className="font-mono text-[13px] text-white/50">{tf}</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${marketClosed || fresh ? "bg-emerald-400" : "bg-white/20"}`} />
              <span className="text-[13px] text-white/70">{display}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function timeframeToMinutes(timeframe: string): number {
  switch (timeframe) {
    case "M1":
      return 1;
    case "M5":
      return 5;
    case "M15":
      return 15;
    case "M30":
      return 30;
    case "H1":
      return 60;
    case "H4":
      return 240;
    case "D1":
      return 1440;
    default:
      return 15;
  }
}
