import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { Empty } from "./shared";

const REGIME_LABELS: Record<string, string> = {
  trending: "趋势",
  ranging: "震荡",
  breakout: "突破",
  uncertain: "不确定",
};

const REGIME_COLORS: Record<string, string> = {
  trending: "text-buy",
  ranging: "text-accent",
  breakout: "text-warning",
  uncertain: "text-text-muted",
};

interface RegimeDetail {
  current_regime: string | null;
  consecutive_bars: number;
  stability_multiplier: number;
}

export function RegimeGuardMetrics(): React.ReactNode {
  const emp = useEmployeeStore.getState().employees["regime_guard"];
  const m = emp?.stats ?? {};

  const affinitySkip = Number(m.affinity_skipped ?? 0);
  const distribution = typeof m.regime_distribution === "object" && m.regime_distribution !== null
    ? m.regime_distribution as Record<string, number>
    : {};
  const details = typeof m.regime_details === "object" && m.regime_details !== null
    ? m.regime_details as Record<string, RegimeDetail>
    : {};

  const hasData = Object.keys(details).length > 0;

  if (!hasData) {
    return <Empty text="等待 Regime 数据" />;
  }

  const totalTargets = Object.keys(details).length;

  return (
    <div className="space-y-2.5">
      {/* Regime 分布概览 */}
      <div className="space-y-1">
        <div className="text-[10px] text-text-muted">当前 Regime 分布</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
          {Object.entries(distribution)
            .sort(([, a], [, b]) => b - a)
            .map(([regime, count]) => (
              <span key={regime} className="tabular-nums">
                <span className={cn("font-medium", REGIME_COLORS[regime])}>
                  {REGIME_LABELS[regime] ?? regime}
                </span>
                {" "}{count}/{totalTargets}
              </span>
            ))}
        </div>
      </div>

      {/* 亲和度跳过统计 */}
      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
        <span className="text-text-muted">亲和度跳过</span>
        <span className={cn("font-medium tabular-nums", affinitySkip > 0 ? "text-warning" : "text-success")}>
          {affinitySkip} 次
        </span>
      </div>

      {/* 各 symbol/tf 的 Regime 详情 */}
      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">各品种时间框架</div>
        <div className="space-y-0.5 text-[10px]">
          {Object.entries(details).map(([key, info]) => {
            const regime = info.current_regime;
            const bars = info.consecutive_bars ?? 0;
            const stability = info.stability_multiplier ?? 0;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-text-secondary">{key}</span>
                <span className="tabular-nums">
                  <span className={cn("font-medium", REGIME_COLORS[regime ?? ""])}>
                    {REGIME_LABELS[regime ?? ""] ?? regime ?? "—"}
                  </span>
                  <span className="text-text-muted ml-1.5">
                    {bars}bar {stability >= 1.0 ? "稳定" : `×${stability.toFixed(2)}`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
