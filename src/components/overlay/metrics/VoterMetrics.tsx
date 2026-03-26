import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import type { LiveSignal } from "@/store/live";
import type { StrategyInfo } from "@/api/types";
import { Empty, TugOfWarBar } from "./shared";

interface VotingGroup {
  name: string;
  strategies: string[];
}

interface VoterMetricsProps {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
}

export function VoterMetrics({ signals, strategies }: VoterMetricsProps): React.ReactNode {
  const emp = useEmployeeStore.getState().employees["voter"];
  const m = emp?.stats ?? {};

  // 从后端 Studio metrics 获取 voting group 定义
  const votingGroups: VotingGroup[] = Array.isArray(m.voting_groups)
    ? (m.voting_groups as unknown as VotingGroup[])
    : [];

  if (signals.length === 0) {
    return <Empty text="等待投票数据" />;
  }

  return (
    <VoterMetricsContent
      signals={signals}
      strategies={strategies}
      votingGroups={votingGroups}
    />
  );
}

const GROUP_LABELS: Record<string, string> = {
  trend_vote: "趋势组",
  reversion_vote: "回归组",
  breakout_vote: "突破组",
  channel_vote: "通道组",
  consensus: "共识",
};

/** 投票主席核心指标 — 按 voting group 分组 + 时间框架多空力量对比 */
function VoterMetricsContent({ signals, strategies, votingGroups }: {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
  votingGroups: VotingGroup[];
}) {
  // 构建 strategy → group 映射
  const strategyToGroup = new Map<string, string>();
  for (const g of votingGroups) {
    for (const s of g.strategies) {
      strategyToGroup.set(s, g.name);
    }
  }

  // 按 group 分类信号（仅统计 group 成员，solo 策略不经过投票）
  const groupSignals = new Map<string, { buy: number; sell: number; hold: number; buyConf: number; sellConf: number }>();

  for (const s of signals) {
    const group = strategyToGroup.get(s.strategy);
    if (!group) continue;
    if (!groupSignals.has(group)) groupSignals.set(group, { buy: 0, sell: 0, hold: 0, buyConf: 0, sellConf: 0 });
    const g = groupSignals.get(group)!;
    if (s.direction === "buy") { g.buy++; g.buyConf += s.confidence; }
    else if (s.direction === "sell") { g.sell++; g.sellConf += s.confidence; }
    else { g.hold++; }
  }

  // 按 TF 统计（仅 group 内信号）
  const tfOrder = [...config.timeframes];
  const byTF = new Map<string, { buyConf: number; sellConf: number; buy: number; sell: number; hold: number }>();
  for (const s of signals) {
    if (!strategyToGroup.has(s.strategy)) continue;
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

  const groupTotal = [...groupSignals.values()].reduce((s, g) => s + g.buy + g.sell + g.hold, 0);
  const groupBuy = [...groupSignals.values()].reduce((s, g) => s + g.buy, 0);
  const groupSell = [...groupSignals.values()].reduce((s, g) => s + g.sell, 0);

  return (
    <div className="space-y-2.5">
      {/* 投票总览（仅 group 成员） */}
      {groupTotal > 0 && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">组投票 ({groupTotal}票)</span>
            <span className="font-medium">
              {groupBuy > groupSell ? <span className="text-buy">偏多</span>
                : groupSell > groupBuy ? <span className="text-sell">偏空</span>
                : <span className="text-text-muted">分歧</span>}
            </span>
          </div>
          <TugOfWarBar buy={groupBuy} sell={groupSell} total={groupTotal} />
        </>
      )}

      {/* 各 Voting Group 力量对比 */}
      {votingGroups.length > 0 && groupSignals.size > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">投票分组</div>
          {votingGroups.map((vg) => {
            const g = groupSignals.get(vg.name);
            if (!g) return null;
            const gTotal = g.buy + g.sell + g.hold;
            if (gTotal === 0) return null;
            const label = GROUP_LABELS[vg.name] ?? vg.name;
            return (
              <div key={vg.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-accent">{label}</span>
                  <span className="text-text-muted tabular-nums">
                    <span className="text-buy">{g.buy}</span>
                    /<span className="text-sell">{g.sell}</span>
                    {g.hold > 0 && <span>/{g.hold}</span>}
                  </span>
                </div>
                <TugOfWarBar buy={g.buy} sell={g.sell} total={gTotal} small />
              </div>
            );
          })}
        </div>
      )}

      {/* 各 TF 力量对比（仅 group 信号） */}
      {sortedTFs.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">时间框架投票</div>
          {sortedTFs.map((tf) => {
            const t = byTF.get(tf)!;
            const tfTotal = t.buy + t.sell + t.hold;
            return (
              <div key={tf} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-accent">{tf}</span>
                  <span className="text-text-muted tabular-nums">
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
      )}

    </div>
  );
}
