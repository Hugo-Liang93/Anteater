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

const SKIP_LABELS: Record<string, string> = {
  gate_block: "准入门控",
  require_armed: "未武装",
  not_in_trade_trigger_whitelist: "非白名单触发",
  voting_group_member: "需要投票聚合",
  min_confidence: "置信度不足",
  position_limit: "持仓上限",
  trade_params_unavailable: "参数不可用",
  spread_to_stop_ratio_too_high: "执行成本过高",
  missing_signal_id: "信号 ID 缺失",
  margin_guard_block: "保证金不足",
};

export function RiskOfficerMetrics(): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.risk_officer;
  const stats = employee?.stats ?? {};
  const received = Number(stats.signals_received ?? 0);
  const passed = Number(stats.signals_passed ?? 0);
  const blocked = Number(stats.signals_blocked ?? 0);
  const skipReasons =
    typeof stats.skip_reasons === "object" && stats.skip_reasons !== null
      ? (stats.skip_reasons as Record<string, number>)
      : {};
  const byTimeframe =
    typeof stats.by_timeframe === "object" && stats.by_timeframe !== null
      ? (stats.by_timeframe as Record<string, TfEntry>)
      : {};

  if (received === 0) return <Empty text="等待审批信号进入" />;

  const passRate = (passed / received) * 100;
  const tfOrder = [...config.timeframes];
  const sortedTFs = Object.keys(byTimeframe).sort((a, b) => {
    const ai = tfOrder.indexOf(a as (typeof tfOrder)[number]);
    const bi = tfOrder.indexOf(b as (typeof tfOrder)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">审批通过率</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            passRate >= 70 ? "text-success" : passRate >= 40 ? "text-warning" : "text-danger",
          )}
        >
          {passRate.toFixed(0)}%
        </span>
      </div>
      <TugOfWarBar buy={passed} sell={blocked} total={received} />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-text-muted">接收</div>
          <div className="font-mono text-text-primary">{received}</div>
        </div>
        <div>
          <div className="text-text-muted">放行</div>
          <div className="font-mono text-success">{passed}</div>
        </div>
        <div>
          <div className="text-text-muted">阻断</div>
          <div className={`font-mono ${blocked > 0 ? "text-danger" : "text-text-primary"}`}>
            {blocked}
          </div>
        </div>
      </div>

      {sortedTFs.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">按时间框架查看</div>
          {sortedTFs.map((tf) => {
            const entry = byTimeframe[tf]!;
            if (entry.received === 0) return null;
            const reasons = Object.entries(entry.skip_reasons ?? {});
            return (
              <div key={tf} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-accent">{tf}</span>
                  <span className="tabular-nums text-text-muted">
                    <span className="text-success">{entry.passed}</span> /{" "}
                    <span className={entry.blocked > 0 ? "text-danger" : "text-text-muted"}>
                      {entry.blocked}
                    </span>
                  </span>
                </div>
                <TugOfWarBar buy={entry.passed} sell={entry.blocked} total={entry.received} small />
                {reasons.length > 0 && (
                  <div className="pl-2 space-y-px">
                    {reasons
                      .sort(([, a], [, b]) => b - a)
                      .map(([reason, count]) => (
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

      {Object.keys(skipReasons).length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">主要阻断原因</div>
          {Object.entries(skipReasons)
            .sort(([, a], [, b]) => b - a)
            .map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between text-[10px]">
                <span className="text-text-secondary">{SKIP_LABELS[reason] ?? reason}</span>
                <span className="tabular-nums text-danger">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
