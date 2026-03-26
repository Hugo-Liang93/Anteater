import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useSignalStore } from "@/store/signals";
import type { LiveSignal } from "@/store/live";
import type { StrategyInfo } from "@/api/types";
import { Empty, dirColor, confColor } from "./shared";

interface StrategistMetricsProps {
  signals: LiveSignal[];
  strategies: StrategyInfo[];
}

export function StrategistMetrics({ signals, strategies }: StrategistMetricsProps): React.ReactNode {
  if (signals.length === 0) {
    return <Empty text={strategies.length > 0 ? `${strategies.length} 个策略评估中` : "等待策略加载"} />;
  }

  const byTF = new Map<string, typeof signals>();
  for (const s of signals) {
    const tf = s.timeframe || "?";
    if (!byTF.has(tf)) byTF.set(tf, []);
    byTF.get(tf)!.push(s);
  }
  const tfOrder = [...config.timeframes];
  const sortedTFs = [...byTF.keys()].sort((a, b) => {
    const ai = tfOrder.indexOf(a as typeof tfOrder[number]);
    const bi = tfOrder.indexOf(b as typeof tfOrder[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const latestSignal = signals[0];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><div className="text-text-muted">活跃策略</div><div className="font-mono text-text-primary">{String(strategies.length)}</div></div>
        <div><div className="text-text-muted">信号TF</div><div className="font-mono text-text-primary">{String(byTF.size)}</div></div>
        <div><div className="text-text-muted">总买入</div><div className={`font-mono text-buy`}>{String(signals.filter((s) => s.direction === "buy").length)}</div></div>
        <div><div className="text-text-muted">总卖出</div><div className={`font-mono text-sell`}>{String(signals.filter((s) => s.direction === "sell").length)}</div></div>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-text-muted">各 TF 信号</div>
        {sortedTFs.map((tf) => {
          const tfSignals = byTF.get(tf)!;
          const buy = tfSignals.filter((s) => s.direction === "buy").length;
          const sell = tfSignals.filter((s) => s.direction === "sell").length;
          const top = tfSignals.reduce((best, s) => s.confidence > best.confidence ? s : best, tfSignals[0]!);
          return (
            <div key={tf} className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-accent">{tf}</span>
              <span className="text-text-muted">
                <span className="text-buy">{buy}买</span>
                {" "}
                <span className="text-sell">{sell}卖</span>
                <span className="ml-1 text-text-secondary">{top.strategy} {(top.confidence * 100).toFixed(0)}%</span>
              </span>
            </div>
          );
        })}
      </div>
      {latestSignal?.reason && (
        <div className="text-[10px] text-text-muted">最新: {latestSignal.timeframe} {latestSignal.reason}</div>
      )}
      <SignalFullView signals={signals} sortedTFs={sortedTFs} byTF={byTF} />
    </div>
  );
}

/** 全量信号弹窗 — 跨 TF 矩阵表 */
export function SignalFullView({ signals, sortedTFs, byTF }: {
  signals: LiveSignal[];
  sortedTFs: string[];
  byTF: Map<string, LiveSignal[]>;
}) {
  const [open, setOpen] = useState(false);
  const strategies = useSignalStore.getState().strategies;
  const categoryMap = new Map(strategies.map((s) => [s.name, s.category]));

  const TAIL_CATEGORIES = new Set(["composite"]);
  const TAIL_NAMES = (name: string) =>
    TAIL_CATEGORIES.has(categoryMap.get(name) ?? "") || name === "consensus" || name.endsWith("_vote");

  const allStrategies = [...new Set(signals.map((s) => s.strategy))].sort((a, b) => {
    const aTail = TAIL_NAMES(a);
    const bTail = TAIL_NAMES(b);
    if (aTail !== bTail) return aTail ? 1 : -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded bg-bg-hover py-1 text-[10px] text-text-secondary hover:text-accent transition-colors"
      >
        <ChevronDown size={12} />
        查看全部信号
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-[90vw] max-w-[900px] overflow-hidden rounded-xl border border-border bg-bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">
                全部信号 · {sortedTFs.length} 个时间框架 · {allStrategies.length} 个策略
              </h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto p-4" style={{ maxHeight: "calc(85vh - 52px)" }}>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-3 text-left font-medium text-text-secondary">策略</th>
                    {sortedTFs.map((tf) => (
                      <th key={tf} className="py-1.5 px-3 text-center font-mono font-medium text-accent">{tf}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allStrategies.map((strat) => (
                    <tr key={strat} className="border-t border-border/50">
                      <td className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-2 font-medium text-accent">{strat}</td>
                      {sortedTFs.map((tf) => {
                        const tfSignals = byTF.get(tf) ?? [];
                        const sig = tfSignals.find((s) => s.strategy === strat);
                        if (!sig) {
                          return <td key={tf} className="py-1.5 px-3 text-center text-text-muted">—</td>;
                        }
                        return (
                          <td key={tf} className="py-1.5 px-3 text-center">
                            <span className={cn("font-medium", dirColor(sig.direction))}>
                              {sig.direction === "buy" ? "买" : sig.direction === "sell" ? "空" : "—"}
                            </span>
                            <span className={cn("ml-1 tabular-nums", confColor(sig.confidence))}>
                              {(sig.confidence * 100).toFixed(0)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* TF 汇总行 */}
                  <tr className="border-t-2 border-border">
                    <td className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-2 text-[10px] font-semibold text-text-secondary">汇总</td>
                    {sortedTFs.map((tf) => {
                      const tfSigs = byTF.get(tf) ?? [];
                      const buy = tfSigs.filter((s) => s.direction === "buy").length;
                      const sell = tfSigs.filter((s) => s.direction === "sell").length;
                      const avg = tfSigs.length > 0
                        ? tfSigs.reduce((sum, s) => sum + s.confidence, 0) / tfSigs.length
                        : 0;
                      return (
                        <td key={tf} className="py-1.5 px-3 text-center text-[10px]">
                          <div>
                            <span className="text-buy font-medium">{buy}买</span>
                            {" "}
                            <span className="text-sell font-medium">{sell}卖</span>
                          </div>
                          {tfSigs.length > 0 && (
                            <div className="text-text-muted">均 {(avg * 100).toFixed(0)}%</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
