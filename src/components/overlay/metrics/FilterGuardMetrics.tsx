import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { Empty, TugOfWarBar, extractBlocks } from "./shared";

const FILTER_LABELS: Record<string, string> = {
  outside_allowed_sessions: "交易时段",
  spread_too_wide: "点差过大",
  volatility_spike: "波动率异常",
  session_transition_cooldown: "时段切换冷却",
  trade_guard: "经济事件防护",
};

export function FilterGuardMetrics(): React.ReactNode {
  const emp = useEmployeeStore.getState().employees["filter_guard"];
  const m = emp?.stats ?? {};

  const cPassed = Number(m.confirmed_passed ?? 0);
  const cBlocked = Number(m.confirmed_blocked ?? 0);
  const cBlocks = extractBlocks(m.confirmed_blocks);
  const iPassed = Number(m.intrabar_passed ?? 0);
  const iBlocked = Number(m.intrabar_blocked ?? 0);
  const iBlocks = extractBlocks(m.intrabar_blocks);
  const totalPassed = Number(m.total_passed ?? 0);
  const totalBlocked = Number(m.total_blocked ?? 0);
  const totalSnap = Number(m.total_snapshots ?? 0);

  const wElapsed = Number(m.window_elapsed ?? 0);
  const wByScope = typeof m.window_by_scope === "object" && m.window_by_scope !== null
    ? m.window_by_scope as unknown as Record<string, { passed: number; blocked: number; blocks: Record<string, number> }>
    : {};
  const windowLabel = wElapsed >= 3600 ? "最近 1h" : wElapsed >= 60 ? `最近 ${Math.round(wElapsed / 60)}m` : "刚启动";

  const passRate = Number(m.pass_rate ?? (totalSnap > 0 ? (totalPassed / totalSnap * 100) : 0));
  const hasData = totalSnap > 0;

  const allBlocks: Record<string, number> = {};
  for (const b of [cBlocks, iBlocks]) {
    for (const [k, v] of Object.entries(b)) allBlocks[k] = (allBlocks[k] ?? 0) + Number(v);
  }

  if (!hasData) {
    return <Empty text="等待指标快照" />;
  }

  return (
    <div className="space-y-2.5">
      {/* 通过率 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">通过率</span>
        <span className={cn("font-medium tabular-nums",
          passRate >= 70 ? "text-success" : passRate >= 40 ? "text-warning" : "text-danger"
        )}>
          {passRate.toFixed(0)}%
        </span>
      </div>
      <TugOfWarBar buy={totalPassed} sell={totalBlocked} total={totalSnap} />

      {/* Confirmed vs Intrabar 分维度 */}
      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">按 Scope（累计）</div>
        <div className="space-y-0.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Bar Close</span>
            <span className="tabular-nums">
              <span className="text-success">{cPassed}</span> 通过 / <span className="text-danger">{cBlocked}</span> 拦截
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Intrabar</span>
            <span className="tabular-nums">
              <span className="text-success">{iPassed}</span> 通过 / <span className="text-danger">{iBlocked}</span> 拦截
            </span>
          </div>
        </div>
      </div>

      {/* 滑动窗口 */}
      {Object.keys(wByScope).length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">{windowLabel}</div>
          <div className="space-y-0.5 text-[10px]">
            {Object.entries(wByScope).map(([scope, s]) => (
              <div key={scope} className="flex items-center justify-between">
                <span className="text-text-muted">{scope === "confirmed" ? "Bar Close" : "Intrabar"}</span>
                <span className="tabular-nums">
                  <span className="text-success">{s.passed}</span> / <span className="text-danger">{s.blocked}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 拦截原因 */}
      {Object.keys(allBlocks).length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">拦截原因（累计）</div>
          {Object.entries(allBlocks)
            .sort(([, a], [, b]) => b - a)
            .map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between text-[10px]">
                <span className="text-text-secondary">{FILTER_LABELS[reason] ?? reason}</span>
                <span className="tabular-nums text-danger">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
