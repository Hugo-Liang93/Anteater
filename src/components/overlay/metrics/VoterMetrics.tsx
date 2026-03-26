import { cn } from "@/lib/utils";
import { config } from "@/config";
import type { LiveSignal } from "@/store/live";
import type { StrategyInfo } from "@/api/types";
import { Empty, TugOfWarBar } from "./shared";

interface VoterMetricsProps {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
}

export function VoterMetrics({ signals, strategies }: VoterMetricsProps): React.ReactNode {
  if (signals.length === 0) {
    return <Empty text="等待投票数据" />;
  }

  return <VoterMetricsContent signals={signals} strategies={strategies} />;
}

/** 投票主席核心指标 — 按 TF + 按类别的多空力量对比 */
function VoterMetricsContent({ signals, strategies }: {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
}) {
  const categoryMap = new Map(strategies.map((s) => [s.name, s.category]));

  const tfOrder = [...config.timeframes];
  const byTF = new Map<string, { buyConf: number; sellConf: number; buy: number; sell: number; hold: number }>();
  for (const s of signals) {
    const tf = s.timeframe || "?";
    if (!byTF.has(tf)) byTF.set(tf, { buyConf: 0, sellConf: 0, buy: 0, sell: 0, hold: 0 });
    const t = byTF.get(tf)!;
    if (s.direction === "buy") { t.buy++; t.buyConf += s.confidence; }
    else if (s.direction === "sell") { t.sell++; t.sellConf += s.confidence; }
    else { t.hold++; }
  }
  const sortedTFs = [...byTF.keys()].sort((a, b) => {
    const ai = tfOrder.indexOf(a as typeof tfOrder[number]);
    const bi = tfOrder.indexOf(b as typeof tfOrder[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const CATEGORY_LABELS: Record<string, string> = {
    trend: "趋势", mean_reversion: "均值回归", breakout: "突破",
    session: "时段", price_action: "价格行为", composite: "组合",
  };
  const byCat = new Map<string, { buy: number; sell: number; hold: number }>();
  for (const s of signals) {
    const cat = categoryMap.get(s.strategy) ?? "other";
    if (cat === "composite") continue;
    if (!byCat.has(cat)) byCat.set(cat, { buy: 0, sell: 0, hold: 0 });
    const c = byCat.get(cat)!;
    if (s.direction === "buy") c.buy++;
    else if (s.direction === "sell") c.sell++;
    else c.hold++;
  }

  const totalBuy = signals.filter((s) => s.direction === "buy").length;
  const totalSell = signals.filter((s) => s.direction === "sell").length;
  const total = signals.length;

  return (
    <div className="space-y-2.5">
      {/* 全局共识 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">共识 ({total}票)</span>
        <span className="font-medium">
          {totalBuy > totalSell ? <span className="text-buy">偏多</span>
            : totalSell > totalBuy ? <span className="text-sell">偏空</span>
            : <span className="text-text-muted">分歧</span>}
        </span>
      </div>
      <TugOfWarBar buy={totalBuy} sell={totalSell} total={total} />

      {/* 各 TF 力量对比 */}
      <div className="space-y-1">
        <div className="text-[10px] text-text-muted">时间框架投票</div>
        {sortedTFs.map((tf) => {
          const t = byTF.get(tf)!;
          const tfTotal = t.buy + t.sell + t.hold;
          return (
            <div key={tf} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-accent">{tf}</span>
                <span className="text-text-muted">
                  <span className="text-buy">{t.buy}</span>
                  /<span className="text-sell">{t.sell}</span>
                  {t.hold > 0 && <span>/{t.hold}</span>}
                </span>
              </div>
              <TugOfWarBar buy={t.buy} sell={t.sell} total={tfTotal} small />
            </div>
          );
        })}
      </div>

      {/* 类别投票倾向 */}
      {byCat.size > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted">策略类别</div>
          {[...byCat.entries()].map(([cat, c]) => {
            const label = CATEGORY_LABELS[cat] ?? cat;
            const lean = c.buy > c.sell ? "buy" : c.sell > c.buy ? "sell" : "neutral";
            return (
              <div key={cat} className="flex items-center justify-between text-[10px]">
                <span className="text-text-secondary">{label}</span>
                <span className={cn("font-medium",
                  lean === "buy" ? "text-buy" : lean === "sell" ? "text-sell" : "text-text-muted"
                )}>
                  {c.buy}买 {c.sell}卖
                  {lean === "buy" ? " ↑" : lean === "sell" ? " ↓" : " —"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
