import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";
import { Empty, KV } from "./shared";
import { fmtVal, indColor } from "./utils";

export function AnalystMetrics(): React.ReactNode {
  const allIndicators = useLiveStore.getState().indicators;
  const activeTFs = config.timeframes.filter((tf) => allIndicators[tf]?.indicators);
  const employee = useEmployeeStore.getState().employees.analyst;
  const stats = employee?.stats ?? {};
  const computations = Number(stats.computations ?? 0);
  const reconcileComputations = Number(stats.reconcile_computations ?? 0);
  const successRate = Number(stats.success_rate ?? 0);
  const indicatorNames = Array.isArray(stats.indicator_names)
    ? (stats.indicator_names as string[])
    : [];

  if (activeTFs.length === 0) return <Empty text="指标计算中..." />;

  const defaultIndicators = allIndicators[config.defaultTimeframe]?.indicators;
  const rsi = defaultIndicators?.rsi14?.rsi;
  const atr = defaultIndicators?.atr14?.atr;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <KV
          k={`RSI(${config.defaultTimeframe})`}
          v={rsi != null ? rsi.toFixed(1) : "--"}
          color={rsi != null && rsi > 70 ? "text-sell" : rsi != null && rsi < 30 ? "text-buy" : undefined}
        />
        <KV k={`ATR(${config.defaultTimeframe})`} v={atr != null ? atr.toFixed(2) : "--"} />
      </div>

      <div className="text-[10px] text-text-muted">
        收盘计算 {computations} 次 / 对账 {reconcileComputations} 次
        {successRate > 0 && (
          <span>
            {" "} / 成功率 <span className="text-success">{successRate.toFixed(0)}%</span>
          </span>
        )}
      </div>

      {indicatorNames.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">
            当前已产出 {indicatorNames.length} 个确认态指标
          </div>
          <div className="flex flex-wrap gap-1">
            {indicatorNames.map((name) => (
              <span
                key={name}
                className="rounded bg-bg-secondary px-1.5 py-0.5 text-[9px] text-text-secondary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0.5 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">按时间框架查看</div>
        {activeTFs.map((tf) => {
          const tfIndicators = allIndicators[tf]?.indicators ?? {};
          const count = Object.keys(tfIndicators).length;
          const tfRsi = tfIndicators.rsi14?.rsi;
          const tfAtr = tfIndicators.atr14?.atr;
          return (
            <div key={tf} className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-accent">{tf}</span>
              <span className="text-text-muted">
                {count} 个指标
                {tfRsi != null && (
                  <span className={tfRsi > 70 ? " text-sell" : tfRsi < 30 ? " text-buy" : ""}>
                    {" "}RSI {tfRsi.toFixed(0)}
                  </span>
                )}
                {tfAtr != null && <span> / ATR {tfAtr.toFixed(1)}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <IndicatorFullView indicators={allIndicators} activeTFs={activeTFs} />
    </div>
  );
}

function IndicatorFullView({
  indicators,
  activeTFs,
}: {
  indicators: Record<string, { indicators: Record<string, Record<string, number | null>> }>;
  activeTFs: readonly string[];
}) {
  const [open, setOpen] = useState(false);

  const allNames = [
    ...new Set(activeTFs.flatMap((tf) => Object.keys(indicators[tf]?.indicators ?? {}))),
  ].sort();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded bg-bg-hover py-1 text-[10px] text-text-secondary transition-colors hover:text-accent"
      >
        <ChevronDown size={12} />
        查看全部指标
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-[90vw] max-w-[900px] overflow-hidden rounded-xl border border-border bg-bg-panel shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">
                全部指标 / {activeTFs.length} 个时间框架 / {allNames.length} 个指标
              </h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto p-4" style={{ maxHeight: "calc(85vh - 52px)" }}>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-3 text-left font-medium text-text-secondary">指标</th>
                    <th className="sticky left-0 z-10 bg-bg-panel py-1.5 pr-3 text-left font-medium text-text-secondary">字段</th>
                    {activeTFs.map((tf) => (
                      <th key={tf} className="py-1.5 px-2 text-center font-mono font-medium text-accent">
                        {tf}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allNames.map((name) => {
                    const fieldSet = new Set<string>();
                    for (const tf of activeTFs) {
                      const data = indicators[tf]?.indicators?.[name];
                      if (data) Object.keys(data).filter((key) => !key.startsWith("_")).forEach((key) => fieldSet.add(key));
                    }
                    const fields = [...fieldSet].sort();
                    return fields.map((field, index) => (
                      <tr key={`${name}-${field}`} className={cn(index === 0 ? "border-t border-border/50" : "")}>
                        {index === 0 && (
                          <td
                            rowSpan={fields.length}
                            className="sticky left-0 z-10 bg-bg-panel py-1 pr-2 align-top font-medium text-accent"
                          >
                            {name}
                          </td>
                        )}
                        <td className="py-0.5 pr-2 text-text-muted">{field}</td>
                        {activeTFs.map((tf) => {
                          const value = indicators[tf]?.indicators?.[name]?.[field] ?? null;
                          return (
                            <td
                              key={tf}
                              className={cn(
                                "py-0.5 px-2 text-center tabular-nums",
                                indColor(name, value) ?? "text-text-secondary",
                              )}
                            >
                              {fmtVal(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
