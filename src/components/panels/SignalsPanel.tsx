/**
 * SignalsPanel — "信号研判"面板
 *
 * 按周期独立展示，不做跨周期伪聚合。
 * 每个 TF 卡片内：confirmed 信号 + preview 信号 + 该 TF 的投票结果。
 * 交易员自行判断哪个周期更重要。
 */

import { useState, useMemo } from "react";
import { config } from "@/config";
import { useLiveStore, type LiveSignal } from "@/store/live";
import { useEmployeeStore } from "@/store/employees";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

// ─── Types ───

interface TfSummary {
  tf: string;
  confirmed: LiveSignal[];
  preview: LiveSignal[];
  buyCount: number;
  sellCount: number;
  holdCount: number;
  previewBuy: number;
  previewSell: number;
  topStrategy: string;
  topConfidence: number;
}

// ─── Main Component ───

export function SignalsPanel() {
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const strategies = useSignalStore((s) => s.strategies);
  const voterStats = useEmployeeStore((s) => s.employees.voter?.stats ?? {});
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const [expandedTf, setExpandedTf] = useState<string | null>(null);
  const [showStrategies, setShowStrategies] = useState(false);

  // 按 TF 分组
  const tfSummaries = useMemo(() => {
    const map = new Map<string, TfSummary>();

    // 初始化所有配置的 TF
    for (const tf of config.timeframes) {
      map.set(tf, {
        tf, confirmed: [], preview: [],
        buyCount: 0, sellCount: 0, holdCount: 0,
        previewBuy: 0, previewSell: 0,
        topStrategy: "", topConfidence: 0,
      });
    }

    // confirmed 信号
    for (const s of signals) {
      const entry = map.get(s.timeframe);
      if (!entry) continue;
      entry.confirmed.push(s);
      if (s.direction === "buy") entry.buyCount++;
      else if (s.direction === "sell") entry.sellCount++;
      else entry.holdCount++;
      if (s.confidence > entry.topConfidence) {
        entry.topConfidence = s.confidence;
        entry.topStrategy = s.strategy;
      }
    }

    // preview 信号
    for (const s of previewSignals) {
      const entry = map.get(s.timeframe);
      if (!entry) continue;
      entry.preview.push(s);
      if (s.direction === "buy") entry.previewBuy++;
      else if (s.direction === "sell") entry.previewSell++;
    }

    return config.timeframes.map((tf) => map.get(tf)!);
  }, [signals, previewSignals]);

  const totalConfirmed = signals.length;
  const totalPreview = previewSignals.length;

  // 投票结果
  const buyVotes = Number(voterStats.buy ?? voterStats.buy_votes ?? 0);
  const sellVotes = Number(voterStats.sell ?? voterStats.sell_votes ?? 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/80">信号研判</span>
        <div className="flex gap-3 text-[12px]">
          <span className="text-white/40">确认 <span className="text-white/70">{totalConfirmed}</span></span>
          <span className="text-white/40">预览 <span className="text-white/70">{totalPreview}</span></span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">

        {/* 投票结果摘要（后端 VotingEngine 的结论，不是前端算的） */}
        {(buyVotes > 0 || sellVotes > 0) && (
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="text-[11px] text-white/35">投票结论（后端）</div>
            <div className="mt-1 flex items-center gap-4 text-[13px]">
              <span className="text-white/50">多 <span className="font-mono text-buy">{buyVotes}</span></span>
              <span className="text-white/50">空 <span className="font-mono text-sell">{sellVotes}</span></span>
              {buyVotes + sellVotes > 0 && (
                <div className="ml-auto flex h-1.5 w-20 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-l-full bg-buy/60" style={{ width: `${(buyVotes / (buyVotes + sellVotes)) * 100}%` }} />
                  <div className="ml-auto h-full rounded-r-full bg-sell/60" style={{ width: `${(sellVotes / (buyVotes + sellVotes)) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 按周期卡片 */}
        {tfSummaries.map((tf) => {
          const hasSignals = tf.confirmed.length > 0 || tf.preview.length > 0;
          const expanded = expandedTf === tf.tf;

          // 状态指示器逻辑：
          // - 绿点：有 confirmed buy 信号且最高置信度 >= 0.6
          // - 红点：有 confirmed sell 信号且最高置信度 >= 0.6
          // - 黄点：有信号但置信度不足（观望/分歧）
          // - 灰点：无信号或全部 hold
          const topBuy = tf.confirmed.filter((s) => s.direction === "buy").sort((a, b) => b.confidence - a.confidence)[0];
          const topSell = tf.confirmed.filter((s) => s.direction === "sell").sort((a, b) => b.confidence - a.confidence)[0];
          const dotColor =
            topBuy && topBuy.confidence >= 0.6 && (!topSell || topBuy.confidence > topSell.confidence)
              ? "bg-buy" // 绿点：有可操作的买信号
              : topSell && topSell.confidence >= 0.6 && (!topBuy || topSell.confidence > topBuy.confidence)
                ? "bg-sell" // 红点：有可操作的卖信号
                : hasSignals
                  ? "bg-amber-400" // 黄点：有信号但不具备操作条件
                  : "bg-white/15"; // 灰点：无信号

          return (
            <div key={tf.tf} className={cn(
              "rounded-xl border transition-colors",
              hasSignals ? "border-white/8 bg-white/[0.03]" : "border-white/4 bg-white/[0.01]",
            )}>
              <button
                onClick={() => setExpandedTf(expanded ? null : tf.tf)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                {/* TF 标签 */}
                <span className={cn(
                  "w-8 text-center font-mono text-[14px] font-semibold",
                  hasSignals ? "text-accent" : "text-white/25",
                )}>{tf.tf}</span>

                {/* 方向指示 */}
                <div className="flex-1">
                  {hasSignals ? (
                    <div className="flex items-center gap-2 text-[13px]">
                      {tf.buyCount > 0 && <span className="text-buy">{tf.buyCount} 多</span>}
                      {tf.sellCount > 0 && <span className="text-sell">{tf.sellCount} 空</span>}
                      {tf.holdCount > 0 && <span className="text-white/40">{tf.holdCount} 望</span>}
                      {tf.previewBuy + tf.previewSell > 0 && (
                        <span className="text-white/30">+{tf.previewBuy + tf.previewSell} 预览</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[13px] text-white/25">暂无信号</span>
                  )}
                </div>

                {/* 状态指示点 */}
                <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />

                {hasSignals && (
                  expanded
                    ? <ChevronDown size={12} className="text-white/30" />
                    : <ChevronRight size={12} className="text-white/30" />
                )}
              </button>

              {/* 展开详情 */}
              {expanded && hasSignals && (
                <div className="border-t border-white/6 px-3 py-2 space-y-1.5">
                  {/* 最高置信度策略 */}
                  {tf.topStrategy && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/45">最高置信度</span>
                      <span className="text-white/70">
                        {tf.topStrategy}{" "}
                        <span className="font-mono text-accent">{(tf.topConfidence * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                  )}

                  {/* confirmed 信号列表 */}
                  {tf.confirmed.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-white/30">确认信号</div>
                      {tf.confirmed.map((s) => (
                        <button
                          key={s.signal_id}
                          onClick={() => openRightPanel({ kind: "employee", workflowId: "strategy", employeeId: "strategist" })}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[12px] hover:bg-white/[0.04]"
                        >
                          <span className="text-white/60">{s.strategy}</span>
                          <div className="flex items-center gap-2">
                            <span className={s.direction === "buy" ? "text-buy" : s.direction === "sell" ? "text-sell" : "text-white/40"}>
                              {s.direction === "buy" ? "多" : s.direction === "sell" ? "空" : "望"}
                            </span>
                            <span className="font-mono text-white/40">{(s.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* preview 信号 */}
                  {tf.preview.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-white/30">盘中预览</div>
                      {tf.preview.slice(0, 5).map((s) => (
                        <div key={s.signal_id} className="flex items-center justify-between px-2 py-0.5 text-[12px]">
                          <span className="text-white/40">{s.strategy}</span>
                          <span className={cn(
                            s.direction === "buy" ? "text-buy/60" : s.direction === "sell" ? "text-sell/60" : "text-white/30",
                          )}>
                            {s.direction === "buy" ? "多" : s.direction === "sell" ? "空" : "望"} {(s.confidence * 100).toFixed(0)}%
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

        {/* 策略列表（折叠） */}
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
              {strategies.map((s) => (
                <span key={s.name} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-white/45">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
