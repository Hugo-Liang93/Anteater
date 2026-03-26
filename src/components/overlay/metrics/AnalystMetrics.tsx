import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useLiveStore } from "@/store/live";
import { useEmployeeStore } from "@/store/employees";
import { KV, Empty, indColor, fmtVal } from "./shared";

export function AnalystMetrics(): React.ReactNode {
  const allIndicators = useLiveStore.getState().indicators;
  const activeTFs = config.timeframes.filter((tf) => allIndicators[tf]?.indicators);
  const analystEmp = useEmployeeStore.getState().employees["analyst"];
  const am = analystEmp?.stats ?? {};
  const comps = Number(am.computations ?? 0);
  const reconcileComps = Number(am.reconcile_computations ?? 0);
  const successRate = Number(am.success_rate ?? 0);
  const indNames: string[] = Array.isArray(am.indicator_names) ? am.indicator_names as unknown as string[] : [];

  if (activeTFs.length === 0) {
    return <Empty text="指标计算中..." />;
  }

  const defaultInd = allIndicators[config.defaultTimeframe]?.indicators;
  const rsi = defaultInd?.["rsi14"]?.["rsi"];
  const atr = defaultInd?.["atr14"]?.["atr"];

  return (
    <div className="space-y-0">
      {/* ── 概览 ── */}
      <div className="space-y-1.5 pb-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <KV k={`RSI(${config.defaultTimeframe})`} v={rsi != null ? rsi.toFixed(1) : "—"} color={rsi != null && rsi > 70 ? "text-sell" : rsi != null && rsi < 30 ? "text-buy" : undefined} />
          <KV k={`ATR(${config.defaultTimeframe})`} v={atr != null ? atr.toFixed(2) : "—"} />
        </div>
        <div className="text-[10px] text-text-muted">
          Bar Close {comps} 次 · Reconcile {reconcileComps} 次
          {successRate > 0 && <span> · 成功率 <span className="text-success">{successRate.toFixed(0)}%</span></span>}
        </div>
      </div>

      {/* ── 指标列表 ── */}
      {indNames.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2 pb-2">
          <div className="text-[10px] text-text-muted">{indNames.length} 个 Confirmed 指标</div>
          <div className="flex flex-wrap gap-1">
            {indNames.map((name) => (
              <span key={name} className="rounded bg-bg-secondary px-1.5 py-0.5 text-[9px] text-text-secondary">{name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── 各 TF 指标状态 ── */}
      <div className="space-y-0.5 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">各 TF 指标状态</div>
        {activeTFs.map((tf) => {
          const tfInd = allIndicators[tf]?.indicators ?? {};
          const count = Object.keys(tfInd).length;
          const tfRsi = tfInd["rsi14"]?.["rsi"];
          const tfAtr = tfInd["atr14"]?.["atr"];
          return (
            <div key={tf} className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-accent">{tf}</span>
              <span className="text-text-muted">
                {count} 指标
                {tfRsi != null && <span className={tfRsi > 70 ? " text-sell" : tfRsi < 30 ? " text-buy" : ""}> RSI {tfRsi.toFixed(0)}</span>}
                {tfAtr != null && <span> ATR {tfAtr.toFixed(1)}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <IndicatorFullView indicators={allIndicators} activeTFs={activeTFs} />
    </div>
  );
}

/** 全量指标弹窗入口 */
function IndicatorFullView({ indicators, activeTFs }: {
  indicators: Record<string, { indicators: Record<string, Record<string, number | null>> }>;
  activeTFs: readonly string[];
}) {
  const [open, setOpen] = useState(false);

  const allNames = [...new Set(
    activeTFs.flatMap((tf) => Object.keys(indicators[tf]?.indicators ?? {})),
  )].sort();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded bg-bg-hover py-1 text-[10px] text-text-secondary hover:text-accent transition-colors"
      >
        <ChevronDown size={12} />
        查看全部指标
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
                全部指标 · {activeTFs.length} 个时间框架 · {allNames.length} 个指标
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
                      <th key={tf} className="py-1.5 px-2 text-center font-mono font-medium text-accent">{tf}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allNames.map((name) => {
                    const fieldSet = new Set<string>();
                    for (const tf of activeTFs) {
                      const d = indicators[tf]?.indicators?.[name];
                      if (d) Object.keys(d).filter((k) => !k.startsWith("_")).forEach((k) => fieldSet.add(k));
                    }
                    const fields = [...fieldSet].sort();
                    return fields.map((field, fi) => (
                      <tr key={`${name}-${field}`} className={cn(
                        fi === 0 ? "border-t border-border/50" : "",
                      )}>
                        {fi === 0 && (
                          <td rowSpan={fields.length} className="sticky left-0 z-10 bg-bg-panel py-1 pr-2 align-top font-medium text-accent">
                            {name}
                          </td>
                        )}
                        <td className="py-0.5 pr-2 text-text-muted">{field}</td>
                        {activeTFs.map((tf) => {
                          const val = indicators[tf]?.indicators?.[name]?.[field] ?? null;
                          return (
                            <td key={tf} className={cn(
                              "py-0.5 px-2 text-center tabular-nums",
                              indColor(name, val) ?? "text-text-secondary",
                            )}>
                              {fmtVal(val)}
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
