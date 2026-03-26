import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import type { LiveSignal } from "@/store/live";
import { Empty } from "./shared";
import { SignalFullView } from "./StrategistMetrics";

interface LiveStrategistMetricsProps {
  previewSignals: LiveSignal[];
}

export function LiveStrategistMetrics({ previewSignals }: LiveStrategistMetricsProps): React.ReactNode {
  const lsEmp = useEmployeeStore.getState().employees["live_strategist"];
  const ls = lsEmp?.stats ?? {};
  const stratNames: string[] = Array.isArray(ls.intrabar_strategy_names) ? ls.intrabar_strategy_names as unknown as string[] : [];
  const activePreview = Number(ls.active_preview ?? 0);

  if (previewSignals.length === 0) {
    return (
      <div className="space-y-2">
        {stratNames.length > 0 ? (
          <>
            <div className="text-[10px] text-text-muted">{stratNames.length} 个 Intrabar 策略就绪</div>
            <div className="flex flex-wrap gap-1">
              {stratNames.map((name) => (
                <span key={name} className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">{name}</span>
              ))}
            </div>
          </>
        ) : (
          <Empty text="等待盘中信号" />
        )}
      </div>
    );
  }

  const byTF = new Map<string, typeof previewSignals>();
  for (const s of previewSignals) {
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
  const totalBuy = previewSignals.filter((s) => s.direction === "buy").length;
  const totalSell = previewSignals.filter((s) => s.direction === "sell").length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-text-muted">策略数</div><div className="font-mono text-text-primary">{String(stratNames.length)}</div></div>
        <div><div className="text-text-muted">活跃预览</div><div className={`font-mono ${activePreview > 0 ? "text-accent" : "text-text-primary"}`}>{String(activePreview)}</div></div>
        <div><div className="text-text-muted">信号TF</div><div className="font-mono text-text-primary">{String(byTF.size)}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><div className="text-text-muted">预览买入</div><div className="font-mono text-buy">{String(totalBuy)}</div></div>
        <div><div className="text-text-muted">预览卖出</div><div className="font-mono text-sell">{String(totalSell)}</div></div>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-text-muted">各 TF 盘中信号</div>
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
      <SignalFullView signals={previewSignals} sortedTFs={sortedTFs} byTF={byTF} />
    </div>
  );
}
