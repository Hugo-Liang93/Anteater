import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import { Empty, KV, MiniCandleChart } from "./shared";

export function LiveAnalystMetrics(): React.ReactNode {
  const liveEmp = useEmployeeStore.getState().employees.live_analyst;
  const metrics = liveEmp?.stats ?? {};

  const liveComputations = Number(metrics.computations ?? 0);
  const indicatorNames = Array.isArray(metrics.indicator_names)
    ? (metrics.indicator_names as string[])
    : [];

  type TfBarData = {
    bar_time: string | null;
    snapshots: { o: number; h: number; l: number; c: number }[];
  };

  const barsByTf: Record<string, TfBarData> =
    typeof metrics.bars_by_tf === "object" && metrics.bars_by_tf !== null
      ? (metrics.bars_by_tf as Record<string, TfBarData>)
      : {};

  const polls = Number(metrics.ingest_polls ?? 0);
  const deduped = Number(metrics.ingest_deduped ?? 0);
  const updated = Number(metrics.ingest_updated ?? 0);
  const updateRate = polls > 0 ? (updated / polls) * 100 : 0;

  const activeTfBars = config.timeframes.filter((timeframe) => barsByTf[timeframe]?.snapshots?.length);

  return (
    <div className="space-y-2.5">
      {activeTfBars.length > 0 ? (
        <div className="space-y-2">
          {activeTfBars.map((timeframe) => {
            const data = barsByTf[timeframe]!;
            const snapshots = data.snapshots;
            const first = snapshots[0]!;
            const last = snapshots[snapshots.length - 1]!;
            const barTime = data.bar_time
              ? new Date(data.bar_time).toLocaleTimeString("zh-CN", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div key={timeframe} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-accent">{timeframe}</span>
                    {barTime && <span className="text-text-muted">最新 Bar {barTime}</span>}
                  </span>
                  <span className="tabular-nums text-text-muted">
                    {first.o.toFixed(2)} 到 <span className="text-text-primary">{last.c.toFixed(2)}</span>
                    <span className="ml-1">共 {snapshots.length} 根</span>
                  </span>
                </div>
                <MiniCandleChart snapshots={snapshots} />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty text="等待盘中 Bar 数据" />
      )}

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">
          采集更新效率
          <span className={updateRate > 50 ? "ml-1 text-success" : "ml-1 text-text-secondary"}>
            {updateRate.toFixed(0)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <KV k="轮询次数" v={String(polls)} />
          <KV k="重复过滤" v={String(deduped)} color="text-text-muted" />
          <KV k="有效更新" v={String(updated)} color="text-success" />
        </div>
      </div>

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">盘中指标计算 {liveComputations} 次</div>
        {indicatorNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {indicatorNames.map((name) => (
              <span key={name} className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                {name}
              </span>
            ))}
          </div>
        ) : (
          <Empty text={liveComputations > 0 ? "本轮暂未暴露指标名称" : "等待盘中指标计算"} />
        )}
      </div>
    </div>
  );
}
