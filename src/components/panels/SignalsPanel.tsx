import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore, type LiveSignal } from "@/store/live";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";

interface VotingGroup {
  name: string;
  strategies: string[];
}

interface TfSummary {
  tf: string;
  confirmed: LiveSignal[];
  directConfirmed: LiveSignal[];
  votedConfirmed: LiveSignal[];
  preview: LiveSignal[];
  buyCount: number;
  sellCount: number;
  holdCount: number;
  previewBuy: number;
  previewSell: number;
  topStrategy: string;
  topConfidence: number;
}

export function SignalsPanel() {
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const strategies = useSignalStore((s) => s.strategies);
  const voterStats = useEmployeeStore((s) => s.employees.voter?.stats ?? {});
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const [expandedTf, setExpandedTf] = useState<string | null>(null);
  const [showStrategies, setShowStrategies] = useState(false);

  const votingGroups = useMemo<VotingGroup[]>(
    () => (Array.isArray(voterStats.voting_groups)
      ? (voterStats.voting_groups as VotingGroup[])
      : []),
    [voterStats],
  );

  const voteStrategyNames = useMemo(() => {
    const names = new Set<string>(["consensus"]);
    for (const group of votingGroups) {
      const name = String(group.name ?? "").trim();
      if (name) names.add(name);
    }
    return names;
  }, [votingGroups]);

  const tfSummaries = useMemo(() => {
    const map = new Map<string, TfSummary>();

    for (const tf of config.timeframes) {
      map.set(tf, {
        tf,
        confirmed: [],
        directConfirmed: [],
        votedConfirmed: [],
        preview: [],
        buyCount: 0,
        sellCount: 0,
        holdCount: 0,
        previewBuy: 0,
        previewSell: 0,
        topStrategy: "",
        topConfidence: 0,
      });
    }

    for (const signal of signals) {
      const entry = map.get(signal.timeframe);
      if (!entry) continue;
      entry.confirmed.push(signal);
      if (voteStrategyNames.has(signal.strategy)) {
        entry.votedConfirmed.push(signal);
      } else {
        entry.directConfirmed.push(signal);
      }
      if (signal.direction === "buy") entry.buyCount++;
      else if (signal.direction === "sell") entry.sellCount++;
      else entry.holdCount++;
      if (signal.confidence > entry.topConfidence) {
        entry.topConfidence = signal.confidence;
        entry.topStrategy = signal.strategy;
      }
    }

    for (const signal of previewSignals) {
      const entry = map.get(signal.timeframe);
      if (!entry) continue;
      entry.preview.push(signal);
      if (signal.direction === "buy") entry.previewBuy++;
      else if (signal.direction === "sell") entry.previewSell++;
    }

    return config.timeframes.map((tf) => map.get(tf)!);
  }, [previewSignals, signals, voteStrategyNames]);

  const totalConfirmed = signals.length;
  const totalPreview = previewSignals.length;
  const votedConfirmedSignals = signals.filter((signal) => voteStrategyNames.has(signal.strategy) && signal.direction !== "hold");
  const directConfirmedSignals = signals.filter((signal) => !voteStrategyNames.has(signal.strategy) && signal.direction !== "hold");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/80">信号研判</span>
        <div className="flex gap-3 text-[12px]">
          <span className="text-white/40">确认 <span className="text-white/70">{totalConfirmed}</span></span>
          <span className="text-white/40">预览 <span className="text-white/70">{totalPreview}</span></span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          <BranchSummaryCard
            title="投票组结果"
            subtitle={votingGroups.length > 0 ? `${votingGroups.length} 个投票组` : "未命中投票结果"}
            signals={votedConfirmedSignals}
            onClick={() => openRightPanel({ kind: "employee", workflowId: "decision", employeeId: "voter" })}
          />
          <BranchSummaryCard
            title="直达风控"
            subtitle="研判后可直接送审"
            signals={directConfirmedSignals}
            onClick={() => openRightPanel({ kind: "employee", workflowId: "decision", employeeId: "risk_officer" })}
          />
        </div>

        {tfSummaries.map((tf) => {
          const hasSignals = tf.confirmed.length > 0 || tf.preview.length > 0;
          const expanded = expandedTf === tf.tf;
          const topBuy = tf.confirmed.filter((signal) => signal.direction === "buy").sort((a, b) => b.confidence - a.confidence)[0];
          const topSell = tf.confirmed.filter((signal) => signal.direction === "sell").sort((a, b) => b.confidence - a.confidence)[0];
          const dotColor =
            topBuy && topBuy.confidence >= 0.6 && (!topSell || topBuy.confidence > topSell.confidence)
              ? "bg-buy"
              : topSell && topSell.confidence >= 0.6 && (!topBuy || topSell.confidence > topBuy.confidence)
                ? "bg-sell"
                : hasSignals
                  ? "bg-amber-400"
                  : "bg-white/15";

          return (
            <div
              key={tf.tf}
              className={cn(
                "rounded-xl border transition-colors",
                hasSignals ? "border-white/8 bg-white/[0.03]" : "border-white/4 bg-white/[0.01]",
              )}
            >
              <button
                onClick={() => setExpandedTf(expanded ? null : tf.tf)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                <span className={cn("w-8 text-center font-mono text-[14px] font-semibold", hasSignals ? "text-accent" : "text-white/25")}>
                  {tf.tf}
                </span>

                <div className="flex-1">
                  {hasSignals ? (
                    <div className="space-y-0.5 text-[13px]">
                      <div className="flex items-center gap-2">
                        {tf.buyCount > 0 && <span className="text-buy">{tf.buyCount} 多</span>}
                        {tf.sellCount > 0 && <span className="text-sell">{tf.sellCount} 空</span>}
                        {tf.holdCount > 0 && <span className="text-white/40">{tf.holdCount} 观望</span>}
                        {tf.previewBuy + tf.previewSell > 0 && (
                          <span className="text-white/30">+{tf.previewBuy + tf.previewSell} 预览</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/35">
                        直达 {tf.directConfirmed.length} / 投票 {tf.votedConfirmed.length}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[13px] text-white/25">暂无信号</span>
                  )}
                </div>

                <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />

                {hasSignals && (expanded ? <ChevronDown size={12} className="text-white/30" /> : <ChevronRight size={12} className="text-white/30" />)}
              </button>

              {expanded && hasSignals && (
                <div className="space-y-1.5 border-t border-white/6 px-3 py-2">
                  {tf.topStrategy && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/45">最高置信度</span>
                      <span className="text-white/70">
                        {tf.topStrategy} <span className="font-mono text-accent">{(tf.topConfidence * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                  )}

                  {tf.votedConfirmed.length > 0 && (
                    <SignalSection
                      title="投票组结果"
                      signals={tf.votedConfirmed}
                      onClick={() => openRightPanel({ kind: "employee", workflowId: "decision", employeeId: "voter" })}
                    />
                  )}

                  {tf.directConfirmed.length > 0 && (
                    <SignalSection
                      title="直达风控"
                      signals={tf.directConfirmed}
                      onClick={() => openRightPanel({ kind: "employee", workflowId: "strategy", employeeId: "strategist" })}
                    />
                  )}

                  {tf.preview.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-white/30">盘中预览</div>
                      {tf.preview.slice(0, 5).map((signal) => (
                        <div key={signal.signal_id} className="flex items-center justify-between px-2 py-0.5 text-[12px]">
                          <span className="text-white/40">{signal.strategy}</span>
                          <span className={cn(signal.direction === "buy" ? "text-buy/60" : signal.direction === "sell" ? "text-sell/60" : "text-white/30")}>
                            {signal.direction === "buy" ? "多" : signal.direction === "sell" ? "空" : "观望"} {(signal.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                      {tf.preview.length > 5 && (
                        <div className="px-2 text-[11px] text-white/25">还有 {tf.preview.length - 5} 条...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <button
            onClick={() => setShowStrategies(!showStrategies)}
            className="flex w-full items-center gap-1 text-left text-[11px] text-white/35"
          >
            策略列表 ({strategies.length})
            <ChevronDown size={10} className={cn("ml-auto transition-transform", showStrategies && "rotate-180")} />
          </button>
          {showStrategies && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {strategies.map((strategy) => (
                <span key={strategy.name} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-white/45">
                  {strategy.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BranchSummaryCard({
  title,
  subtitle,
  signals,
  onClick,
}: {
  title: string;
  subtitle: string;
  signals: LiveSignal[];
  onClick: () => void;
}) {
  const buy = signals.filter((signal) => signal.direction === "buy").length;
  const sell = signals.filter((signal) => signal.direction === "sell").length;
  const tone = buy > sell ? "text-buy" : sell > buy ? "text-sell" : "text-white/60";
  const label = buy > sell ? "偏多" : sell > buy ? "偏空" : signals.length > 0 ? "分歧" : "无结果";

  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <div className="text-[11px] text-white/35">{title}</div>
      <div className="mt-1 flex items-center justify-between">
        <span className={cn("text-[13px] font-medium", tone)}>{label}</span>
        <span className="font-mono text-[12px] text-white/60">{signals.length}</span>
      </div>
      <div className="mt-1 text-[11px] text-white/35">{subtitle}</div>
      {(buy > 0 || sell > 0) && (
        <div className="mt-2 flex items-center gap-3 text-[12px] text-white/45">
          <span>多 <span className="font-mono text-buy">{buy}</span></span>
          <span>空 <span className="font-mono text-sell">{sell}</span></span>
        </div>
      )}
    </button>
  );
}

function SignalSection({
  title,
  signals,
  onClick,
}: {
  title: string;
  signals: LiveSignal[];
  onClick: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-white/30">{title}</div>
      {signals.map((signal) => (
        <button
          key={signal.signal_id}
          onClick={onClick}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[12px] hover:bg-white/[0.04]"
        >
          <span className="text-white/60">{signal.strategy}</span>
          <div className="flex items-center gap-2">
            <span className={signal.direction === "buy" ? "text-buy" : signal.direction === "sell" ? "text-sell" : "text-white/40"}>
              {signal.direction === "buy" ? "多" : signal.direction === "sell" ? "空" : "观望"}
            </span>
            <span className="font-mono text-white/40">{(signal.confidence * 100).toFixed(0)}%</span>
          </div>
        </button>
      ))}
    </div>
  );
}
