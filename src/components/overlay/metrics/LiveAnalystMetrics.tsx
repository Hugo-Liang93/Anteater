import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import { KV, Empty, MiniCandleChart } from "./shared";

export function LiveAnalystMetrics(): React.ReactNode {
  const liveEmp = useEmployeeStore.getState().employees["live_analyst"];
  const lm = liveEmp?.stats ?? {};
  const liveComps = Number(lm.computations ?? 0);
  const liveNames: string[] = Array.isArray(lm.indicator_names) ? lm.indicator_names as unknown as string[] : [];
  type TfBarData = { bar_time: string | null; snapshots: { o: number; h: number; l: number; c: number }[] };
  const barsByTf: Record<string, TfBarData> =
    typeof lm.bars_by_tf === "object" && lm.bars_by_tf !== null
      ? lm.bars_by_tf as unknown as Record<string, TfBarData>
      : {};
  const polls = Number(lm.ingest_polls ?? 0);
  const deduped = Number(lm.ingest_deduped ?? 0);
  const updated = Number(lm.ingest_updated ?? 0);
  const updateRate = polls > 0 ? (updated / polls * 100) : 0;

  const activeTfBars = config.timeframes.filter((tf) => barsByTf[tf]?.snapshots?.length);

  return (
    <div className="space-y-2">
      {/* 各 TF 迷你 K 线 */}
      {activeTfBars.length > 0 ? (
        <div className="space-y-2">
          {activeTfBars.map((tf) => {
            const data = barsByTf[tf]!;
            const snaps = data.snapshots;
            const last = snaps[snaps.length - 1]!;
            const first = snaps[0]!;
            const barTime = data.bar_time
              ? new Date(data.bar_time).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" })
              : "";
            return (
              <div key={tf} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-accent">{tf}</span>
                    {barTime && <span className="text-text-muted">{barTime}</span>}
                  </span>
                  <span className="tabular-nums text-text-muted">
                    {first.o.toFixed(2)} → <span className="text-text-primary">{last.c.toFixed(2)}</span>
                    <span className="ml-1">({snaps.length})</span>
                  </span>
                </div>
                <MiniCandleChart snapshots={snaps} />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty text="等待盘中 Bar 数据" />
      )}

      {/* 采集统计 */}
      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">
          采集统计 · 有效率 <span className={updateRate > 50 ? "text-success" : "text-text-secondary"}>{updateRate.toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <KV k="轮询" v={String(polls)} />
          <KV k="去重" v={String(deduped)} color="text-text-muted" />
          <KV k="有效" v={String(updated)} color="text-success" />
        </div>
      </div>

      {/* 指标列表 */}
      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">指标计算 {liveComps} 次</div>
        {liveNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {liveNames.map((name) => (
              <span key={name} className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">{name}</span>
            ))}
          </div>
        ) : (
          <Empty text={liveComps > 0 ? "指标计算中" : "等待盘中数据"} />
        )}
      </div>
    </div>
  );
}
