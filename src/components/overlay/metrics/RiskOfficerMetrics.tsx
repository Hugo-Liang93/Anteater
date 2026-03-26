import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useEmployeeStore } from "@/store/employees";
import { Empty, TugOfWarBar } from "./shared";

interface TfEntry {
  received: number;
  passed: number;
  blocked: number;
  skip_reasons: Record<string, number>;
}

export function RiskOfficerMetrics(): React.ReactNode {
  const riskEmp = useEmployeeStore.getState().employees["risk_officer"];
  const rm = riskEmp?.stats ?? {};
  const received = Number(rm.signals_received ?? 0);
  const passed = Number(rm.signals_passed ?? 0);
  const blocked = Number(rm.signals_blocked ?? 0);
  const skipReasons = typeof rm.skip_reasons === "object" && rm.skip_reasons !== null
    ? rm.skip_reasons as unknown as Record<string, number> : {};
  const byTimeframe = typeof rm.by_timeframe === "object" && rm.by_timeframe !== null
    ? rm.by_timeframe as unknown as Record<string, TfEntry> : {};

  const SKIP_LABELS: Record<string, string> = {
    gate_block: "准入门控",
    require_armed: "未蓄力",
    not_in_trade_trigger_whitelist: "非白名单",
    voting_group_member: "需投票聚合",
    min_confidence: "置信度不足",
    position_limit: "持仓上限",
    trade_params_unavailable: "参数不可用",
    spread_to_stop_ratio_too_high: "成本过高",
    missing_signal_id: "信号ID缺失",
    margin_guard_block: "保证金不足",
  };

  const passRate = received > 0 ? (passed / received * 100) : 0;
  const hasData = received > 0;

  if (!hasData) {
    return <Empty text="等待信号" />;
  }

  const tfOrder = [...config.timeframes];
  const sortedTFs = Object.keys(byTimeframe).sort((a, b) => {
    const ai = tfOrder.indexOf(a as typeof tfOrder[number]);
    const bi = tfOrder.indexOf(b as typeof tfOrder[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-2.5">
      {/* 信号决策漏斗 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">通过率</span>
        <span className={cn("font-medium tabular-nums",
          passRate >= 70 ? "text-success" : passRate >= 40 ? "text-warning" : "text-danger"
        )}>
          {passRate.toFixed(0)}%
        </span>
      </div>
      <TugOfWarBar buy={passed} sell={blocked} total={received} />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-text-muted">接收</div><div className="font-mono text-text-primary">{String(received)}</div></div>
        <div><div className="text-text-muted">通过</div><div className="font-mono text-success">{String(passed)}</div></div>
        <div><div className="text-text-muted">拦截</div><div className={`font-mono ${blocked > 0 ? "text-danger" : "text-text-primary"}`}>{String(blocked)}</div></div>
      </div>

      {/* 按 TF 分维度 */}
      {sortedTFs.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">时间框架</div>
          {sortedTFs.map((tf) => {
            const entry = byTimeframe[tf]!;
            const tfTotal = entry.received;
            if (tfTotal === 0) return null;
            const tfBlocked = entry.blocked;
            const reasons = Object.entries(entry.skip_reasons ?? {});
            return (
              <div key={tf} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-accent">{tf}</span>
                  <span className="tabular-nums text-text-muted">
                    <span className="text-success">{entry.passed}</span>
                    /<span className={tfBlocked > 0 ? "text-danger" : "text-text-muted"}>{tfBlocked}</span>
                  </span>
                </div>
                <TugOfWarBar buy={entry.passed} sell={tfBlocked} total={tfTotal} small />
                {reasons.length > 0 && (
                  <div className="pl-2 space-y-px">
                    {reasons.sort(([, a], [, b]) => b - a).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between text-[9px]">
                        <span className="text-text-muted">{SKIP_LABELS[reason] ?? reason}</span>
                        <span className="tabular-nums text-danger">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 全局拦截原因汇总 */}
      {Object.keys(skipReasons).length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">拦截原因（累计）</div>
          {Object.entries(skipReasons)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between text-[10px]">
                <span className="text-text-secondary">{SKIP_LABELS[reason] ?? reason}</span>
                <span className="tabular-nums text-danger">{String(count)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
