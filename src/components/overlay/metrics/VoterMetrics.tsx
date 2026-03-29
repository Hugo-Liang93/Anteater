import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import type { LiveSignal } from "@/store/live";
import { Empty, TugOfWarBar } from "./shared";

interface VotingGroup {
  name: string;
  strategies: string[];
}

interface VoterMetricsProps {
  signals: LiveSignal[];
}

const GROUP_LABELS: Record<string, string> = {
  trend_vote: "趋势组",
  reversion_vote: "回归组",
  breakout_vote: "突破组",
  channel_vote: "通道组",
  consensus: "共识组",
};

export function VoterMetrics({ signals }: VoterMetricsProps): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.voter;
  const metrics = employee?.stats ?? {};

  const votingGroups: VotingGroup[] = Array.isArray(metrics.voting_groups)
    ? (metrics.voting_groups as VotingGroup[])
    : [];

  if (signals.length === 0) {
    return <Empty text="等待投票结果" />;
  }

  const strategyToGroup = new Map<string, string>();
  for (const group of votingGroups) {
    for (const strategy of group.strategies) {
      strategyToGroup.set(strategy, group.name);
    }
  }

  const groupSignals = new Map<
    string,
    { buy: number; sell: number; hold: number; buyConf: number; sellConf: number }
  >();

  for (const signal of signals) {
    const group = strategyToGroup.get(signal.strategy);
    if (!group) continue;
    if (!groupSignals.has(group)) {
      groupSignals.set(group, { buy: 0, sell: 0, hold: 0, buyConf: 0, sellConf: 0 });
    }

    const current = groupSignals.get(group)!;
    if (signal.direction === "buy") {
      current.buy += 1;
      current.buyConf += signal.confidence;
    } else if (signal.direction === "sell") {
      current.sell += 1;
      current.sellConf += signal.confidence;
    } else {
      current.hold += 1;
    }
  }

  const timeframeOrder = [...config.timeframes];
  const byTF = new Map<string, { buy: number; sell: number; hold: number }>();
  for (const signal of signals) {
    if (!strategyToGroup.has(signal.strategy)) continue;
    const timeframe = signal.timeframe || "?";
    if (!byTF.has(timeframe)) byTF.set(timeframe, { buy: 0, sell: 0, hold: 0 });
    const current = byTF.get(timeframe)!;
    if (signal.direction === "buy") current.buy += 1;
    else if (signal.direction === "sell") current.sell += 1;
    else current.hold += 1;
  }

  const sortedTFs = [...byTF.keys()].sort((a, b) => {
    const ai = timeframeOrder.indexOf(a as (typeof timeframeOrder)[number]);
    const bi = timeframeOrder.indexOf(b as (typeof timeframeOrder)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const groupTotal = [...groupSignals.values()].reduce((sum, group) => sum + group.buy + group.sell + group.hold, 0);
  const groupBuy = [...groupSignals.values()].reduce((sum, group) => sum + group.buy, 0);
  const groupSell = [...groupSignals.values()].reduce((sum, group) => sum + group.sell, 0);

  return (
    <div className="space-y-2.5">
      {groupTotal > 0 && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">投票总览（{groupTotal} 条组内信号）</span>
            <span className="font-medium">
              {groupBuy > groupSell ? (
                <span className="text-buy">整体偏多</span>
              ) : groupSell > groupBuy ? (
                <span className="text-sell">整体偏空</span>
              ) : (
                <span className="text-text-muted">多空均衡</span>
              )}
            </span>
          </div>
          <TugOfWarBar buy={groupBuy} sell={groupSell} total={groupTotal} />
        </>
      )}

      {votingGroups.length > 0 && groupSignals.size > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">按投票分组查看</div>
          {votingGroups.map((group) => {
            const current = groupSignals.get(group.name);
            if (!current) return null;

            const total = current.buy + current.sell + current.hold;
            if (total === 0) return null;

            return (
              <div key={group.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-accent">{GROUP_LABELS[group.name] ?? group.name}</span>
                  <span className="tabular-nums text-text-muted">
                    <span className="text-buy">{current.buy}</span> /
                    <span className="text-sell">{current.sell}</span>
                    {current.hold > 0 && <span> / {current.hold}</span>}
                  </span>
                </div>
                <TugOfWarBar buy={current.buy} sell={current.sell} total={total} small />
              </div>
            );
          })}
        </div>
      )}

      {sortedTFs.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">按周期查看投票拉锯</div>
          {sortedTFs.map((timeframe) => {
            const current = byTF.get(timeframe)!;
            const total = current.buy + current.sell + current.hold;

            return (
              <div key={timeframe} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-accent">{timeframe}</span>
                  <span className="tabular-nums text-text-muted">
                    <span className="text-buy">{current.buy}</span> /
                    <span className="text-sell">{current.sell}</span>
                    {current.hold > 0 && <span> / {current.hold}</span>}
                  </span>
                </div>
                <TugOfWarBar buy={current.buy} sell={current.sell} total={total} small />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
