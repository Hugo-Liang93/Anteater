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
  const employee = useEmployeeStore((s) => s.employees.regime_guard);
  const metrics = employee?.stats ?? {};

  const affinitySkip = Number(metrics.affinity_skipped ?? 0);
  const distribution =
    typeof metrics.regime_distribution === "object" && metrics.regime_distribution !== null
      ? (metrics.regime_distribution as Record<string, number>)
      : {};
  const details =
    typeof metrics.regime_details === "object" && metrics.regime_details !== null
      ? (metrics.regime_details as Record<string, RegimeDetail>)
      : {};
  const perTfSkips =
    typeof metrics.per_tf_skips === "object" && metrics.per_tf_skips !== null
      ? (metrics.per_tf_skips as Record<string, Record<string, number>>)
      : {};

  if (Object.keys(details).length === 0) {
    return <Empty text="等待市场状态判断" />;
  }

  const totalTargets = Object.keys(details).length;

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <div className="text-[13px] text-text-muted">当前市场状态分布</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]">
          {Object.entries(distribution)
            .sort(([, a], [, b]) => b - a)
            .map(([regime, count]) => (
              <span key={regime} className="tabular-nums">
                <span className={cn("font-medium", REGIME_COLORS[regime])}>
                  {REGIME_LABELS[regime] ?? regime}
                </span>
                {" "}
                {count}/{totalTargets}
              </span>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[13px]">
        <span className="text-text-muted">Affinity 跳过总计</span>
        <span className={cn("tabular-nums font-medium", affinitySkip > 0 ? "text-warning" : "text-success")}>
          {affinitySkip} 次
        </span>
      </div>

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[13px] text-text-muted">各周期 Regime + 拦截</div>
        <div className="space-y-0.5 text-[13px]">
          {Object.entries(details).map(([key, info]) => {
            const regime = info.current_regime;
            const bars = info.consecutive_bars ?? 0;
            const tf = key.split("/").pop() ?? key;
            const tfSkip = perTfSkips[tf] ?? {};
            const affinityCount = Number(tfSkip.affinity ?? 0);

            return (
              <div key={key} className="flex items-center justify-between">
                <span className="font-mono text-accent">{tf}</span>
                <span className="tabular-nums">
                  <span className={cn("font-medium", REGIME_COLORS[regime ?? ""])}>
                    {REGIME_LABELS[regime ?? ""] ?? regime ?? "--"}
                  </span>
                  <span className="ml-1.5 text-text-muted">
                    {bars}根
                  </span>
                  {affinityCount > 0 && (
                    <span className="ml-1.5 text-warning">
                      跳过{affinityCount}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
