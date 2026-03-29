import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import type { LiveSignal } from "@/store/live";
import { Empty } from "./shared";
import { SignalFullView } from "./StrategistMetrics";

interface LiveStrategistMetricsProps {
  previewSignals: LiveSignal[];
}

export function LiveStrategistMetrics({
  previewSignals,
}: LiveStrategistMetricsProps): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.live_strategist;
  const metrics = employee?.stats ?? {};

  const strategyNames = Array.isArray(metrics.intrabar_strategy_names)
    ? (metrics.intrabar_strategy_names as string[])
    : [];
  const activePreview = Number(metrics.active_preview ?? 0);

  if (previewSignals.length === 0) {
    return (
      <div className="space-y-2">
        {strategyNames.length > 0 ? (
          <>
            <div className="text-[13px] text-text-muted">{strategyNames.length} 个盘中策略已就绪</div>
            <div className="flex flex-wrap gap-1">
              {strategyNames.map((name) => (
                <span key={name} className="rounded bg-accent/10 px-1.5 py-0.5 text-[13px] text-accent">
                  {name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <Empty text="等待盘中预览信号" />
        )}
      </div>
    );
  }

  const byTF = new Map<string, LiveSignal[]>();
  for (const signal of previewSignals) {
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

  const totalBuy = previewSignals.filter((signal) => signal.direction === "buy").length;
  const totalSell = previewSignals.filter((signal) => signal.direction === "sell").length;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <MetricBox title="盘中策略" value={String(strategyNames.length)} />
        <MetricBox title="预览信号" value={String(activePreview)} accent={activePreview > 0} />
        <MetricBox title="覆盖周期" value={String(byTF.size)} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <MetricBox title="偏多预览" value={String(totalBuy)} color="text-buy" />
        <MetricBox title="偏空预览" value={String(totalSell)} color="text-sell" />
      </div>

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[13px] text-text-muted">按周期查看盘中预览</div>
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

      <SignalFullView signals={previewSignals} sortedTFs={sortedTFs} byTF={byTF} />
    </div>
  );
}

function cnMetric(color?: string, accent?: boolean): string {
  if (color) return `font-mono ${color}`;
  if (accent) return "font-mono text-accent";
  return "font-mono text-text-primary";
}

function MetricBox({
  title,
  value,
  color,
  accent,
}: {
  title: string;
  value: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-text-muted">{title}</div>
      <div className={cnMetric(color, accent)}>{value}</div>
    </div>
  );
}
