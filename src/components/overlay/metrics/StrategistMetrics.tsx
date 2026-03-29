import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useSignalStore } from "@/store/signals";
import type { StrategyInfo } from "@/api/types";
import type { LiveSignal } from "@/store/live";
import { Empty } from "./shared";
import { confColor, dirColor } from "./utils";

interface StrategistMetricsProps {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
}

export function StrategistMetrics({
  signals,
  strategies,
}: StrategistMetricsProps): React.ReactNode {
  if (signals.length === 0) {
    return (
      <Empty text={strategies.length > 0 ? `${strategies.length} 个策略正在评估` : "等待策略结果"} />
    );
  }

  const byTF = new Map<string, LiveSignal[]>();
  for (const signal of signals) {
    const timeframe = signal.timeframe || "?";
    if (!byTF.has(timeframe)) byTF.set(timeframe, []);
    byTF.get(timeframe)!.push(signal);
  }

  const timeframeOrder = [...config.timeframes];
  const sortedTFs = [...byTF.keys()].sort((a, b) => {
    const ai = timeframeOrder.indexOf(a as (typeof timeframeOrder)[number]);
    const bi = timeframeOrder.indexOf(b as (typeof timeframeOrder)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const latestSignal = [...signals].sort(
    (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
  )[0];
  const buyCount = signals.filter((signal) => signal.direction === "buy").length;
  const sellCount = signals.filter((signal) => signal.direction === "sell").length;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <MetricBox title="参与策略" value={String(strategies.length)} />
        <MetricBox title="覆盖周期" value={String(byTF.size)} />
        <MetricBox title="偏多信号" value={String(buyCount)} color="text-buy" />
        <MetricBox title="偏空信号" value={String(sellCount)} color="text-sell" />
      </div>

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[13px] text-text-muted">按周期查看策略输出</div>
        {sortedTFs.map((timeframe) => {
          const tfSignals = byTF.get(timeframe)!;
          const buy = tfSignals.filter((signal) => signal.direction === "buy").length;
          const sell = tfSignals.filter((signal) => signal.direction === "sell").length;
          const top = tfSignals.reduce((best, signal) =>
            signal.confidence > best.confidence ? signal : best,
          );

          return (
            <div key={timeframe} className="flex items-center justify-between text-[13px]">
              <span className="font-mono text-accent">{timeframe}</span>
              <span className="text-text-muted">
                <span className="text-buy">{buy} 条偏多</span>
                {" "}
                <span className="text-sell">{sell} 条偏空</span>
                <span className="ml-1 text-text-secondary">
                  关注 {top.strategy} {(top.confidence * 100).toFixed(0)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {latestSignal?.reason && (
        <div className="rounded-lg border border-border/60 bg-bg-secondary/70 px-3 py-2 text-[13px] text-text-secondary">
          最新判断：{latestSignal.timeframe} 周期由 {latestSignal.strategy} 给出
          {latestSignal.direction === "buy" ? "偏多" : latestSignal.direction === "sell" ? "偏空" : "观望"}
          ，原因是“{latestSignal.reason}”。
        </div>
      )}

      <SignalFullView signals={signals} sortedTFs={sortedTFs} byTF={byTF} />
    </div>
  );
}

function MetricBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-text-muted">{title}</div>
      <div className={cn("font-mono text-text-primary", color)}>{value}</div>
    </div>
  );
}

export function SignalFullView({
  signals,
  sortedTFs,
  byTF,
}: {
  signals: LiveSignal[];
  sortedTFs: string[];
  byTF: Map<string, LiveSignal[]>;
}) {
  const [open, setOpen] = useState(false);
  const strategies = useSignalStore.getState().strategies;
  const categoryMap = new Map(strategies.map((strategy) => [strategy.name, strategy.category]));

  const tailCategories = new Set(["composite"]);
  const isTail = (name: string) =>
    tailCategories.has(categoryMap.get(name) ?? "") || name === "consensus" || name.endsWith("_vote");

  const allStrategies = [...new Set(signals.map((signal) => signal.strategy))].sort((a, b) => {
    const aTail = isTail(a);
    const bTail = isTail(b);
    if (aTail !== bTail) return aTail ? 1 : -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded bg-bg-hover py-1 text-[13px] text-text-secondary transition-colors hover:text-accent"
      >
        <ChevronDown size={12} />
        查看全部信号
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-[90vw] max-w-[900px] overflow-hidden rounded-xl border border-border bg-bg-panel shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">
                全部信号 / {sortedTFs.length} 个周期 / {allStrategies.length} 个策略
              </h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto p-4" style={{ maxHeight: "calc(85vh - 52px)" }}>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-3 text-left font-medium text-text-secondary">
                      策略
                    </th>
                    {sortedTFs.map((timeframe) => (
                      <th
                        key={timeframe}
                        className="px-3 py-1.5 text-center font-mono font-medium text-accent"
                      >
                        {timeframe}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allStrategies.map((strategy) => (
                    <tr key={strategy} className="border-t border-border/50">
                      <td className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-2 font-medium text-accent">
                        {strategy}
                      </td>
                      {sortedTFs.map((timeframe) => {
                        const signal = (byTF.get(timeframe) ?? []).find((item) => item.strategy === strategy);
                        if (!signal) {
                          return (
                            <td key={timeframe} className="px-3 py-1.5 text-center text-text-muted">
                              --
                            </td>
                          );
                        }

                        return (
                          <td key={timeframe} className="px-3 py-1.5 text-center">
                            <span className={cn("font-medium", dirColor(signal.direction))}>
                              {signal.direction === "buy"
                                ? "偏多"
                                : signal.direction === "sell"
                                  ? "偏空"
                                  : "观望"}
                            </span>
                            <span className={cn("ml-1 tabular-nums", confColor(signal.confidence))}>
                              {(signal.confidence * 100).toFixed(0)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border">
                    <td className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-2 text-[13px] font-semibold text-text-secondary">
                      汇总
                    </td>
                    {sortedTFs.map((timeframe) => {
                      const tfSignals = byTF.get(timeframe) ?? [];
                      const buy = tfSignals.filter((signal) => signal.direction === "buy").length;
                      const sell = tfSignals.filter((signal) => signal.direction === "sell").length;
                      const avg =
                        tfSignals.length > 0
                          ? tfSignals.reduce((sum, signal) => sum + signal.confidence, 0) / tfSignals.length
                          : 0;

                      return (
                        <td key={timeframe} className="px-3 py-1.5 text-center text-[13px]">
                          <div>
                            <span className="font-medium text-buy">{buy} 偏多</span>
                            {" "}
                            <span className="font-medium text-sell">{sell} 偏空</span>
                          </div>
                          {tfSignals.length > 0 && (
                            <div className="text-text-muted">平均置信度 {(avg * 100).toFixed(0)}%</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
