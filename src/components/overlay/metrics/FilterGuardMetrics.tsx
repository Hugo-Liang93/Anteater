import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { Empty, TugOfWarBar } from "./shared";
import { extractBlocks } from "./utils";

const FILTER_LABELS: Record<string, string> = {
  outside_allowed_sessions: "交易时段限制",
  spread_too_wide: "点差过大",
  volatility_spike: "波动率异常",
  session_transition_cooldown: "时段切换冷却",
  trade_guard: "经济事件保护",
};

export function FilterGuardMetrics(): React.ReactNode {
  const employee = useEmployeeStore.getState().employees.filter_guard;
  const stats = employee?.stats ?? {};

  const confirmedPassed = Number(stats.confirmed_passed ?? 0);
  const confirmedBlocked = Number(stats.confirmed_blocked ?? 0);
  const confirmedBlocks = extractBlocks(stats.confirmed_blocks);
  const intrabarPassed = Number(stats.intrabar_passed ?? 0);
  const intrabarBlocked = Number(stats.intrabar_blocked ?? 0);
  const intrabarBlocks = extractBlocks(stats.intrabar_blocks);
  const totalPassed = Number(stats.total_passed ?? 0);
  const totalBlocked = Number(stats.total_blocked ?? 0);
  const totalSnapshots = Number(stats.total_snapshots ?? 0);
  const passRate = Number(
    stats.pass_rate ?? (totalSnapshots > 0 ? (totalPassed / totalSnapshots) * 100 : 0),
  );

  const allBlocks: Record<string, number> = {};
  for (const blocks of [confirmedBlocks, intrabarBlocks]) {
    for (const [key, value] of Object.entries(blocks)) {
      allBlocks[key] = (allBlocks[key] ?? 0) + Number(value);
    }
  }

  if (totalSnapshots === 0) return <Empty text="等待过滤样本进入" />;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">样本通过率</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            passRate >= 70 ? "text-success" : passRate >= 40 ? "text-warning" : "text-danger",
          )}
        >
          {passRate.toFixed(0)}%
        </span>
      </div>
      <TugOfWarBar buy={totalPassed} sell={totalBlocked} total={totalSnapshots} />

      <div className="space-y-1 border-t border-border/50 pt-2">
        <div className="text-[10px] text-text-muted">按输入范围查看</div>
        <div className="space-y-0.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">确认态样本</span>
            <span className="tabular-nums">
              <span className="text-success">{confirmedPassed}</span> 通过 /{" "}
              <span className="text-danger">{confirmedBlocked}</span> 阻断
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">盘中样本</span>
            <span className="tabular-nums">
              <span className="text-success">{intrabarPassed}</span> 通过 /{" "}
              <span className="text-danger">{intrabarBlocked}</span> 阻断
            </span>
          </div>
        </div>
      </div>

      {Object.keys(allBlocks).length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <div className="text-[10px] text-text-muted">阻断原因</div>
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
