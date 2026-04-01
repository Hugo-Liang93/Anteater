import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/store/employees";
import { Empty, TugOfWarBar } from "./shared";
import { extractBlocks, safeNum } from "./utils";

function formatBlockReason(reason: string): string {
  const [category, detail] = reason.split(":", 2);
  const labels: Record<string, string> = {
    outside_allowed_sessions: "时段限制",
    spread_too_wide: "点差过大",
    volatility_spike: "波动率异常",
    session_transition_cooldown: "时段切换冷却",
    trade_guard: "经济事件保护",
  };
  const label = labels[category] ?? category;
  return detail ? `${label} (${detail})` : label;
}

const RULE_CONFIG: Array<{
  key: string;
  label: string;
  getStatus: (f: Record<string, Record<string, unknown>>) => { ok: boolean; detail: string };
}> = [
  {
    key: "session",
    label: "交易时段",
    getStatus: (f) => {
      const s = f.session;
      if (!s) return { ok: true, detail: "未配置" };
      const sessions = (s.current_sessions as string[]) ?? [];
      return {
        ok: Boolean(s.active),
        detail: s.active ? sessions.join(",") || "活跃" : `当前 ${sessions.join(",") || "off_hours"}`,
      };
    },
  },
  {
    key: "session_transition",
    label: "时段切换冷却",
    getStatus: (f) => {
      const s = f.session_transition;
      if (!s) return { ok: true, detail: "未配置" };
      return {
        ok: !s.in_cooldown,
        detail: s.in_cooldown ? `冷却中 (${String(s.transition_name)})` : "正常",
      };
    },
  },
  {
    key: "volatility",
    label: "波动率异常",
    getStatus: (f) => {
      const s = f.volatility;
      if (!s || !s.enabled) return { ok: true, detail: "未启用" };
      return { ok: true, detail: `阈值 ×${String(s.spike_multiplier)}` };
    },
  },
  {
    key: "spread",
    label: "点差过滤",
    getStatus: (f) => {
      const s = f.spread;
      if (!s || !s.enabled) return { ok: true, detail: "未启用" };
      return { ok: true, detail: "监控中" };
    },
  },
  {
    key: "economic",
    label: "经济事件保护",
    getStatus: (f) => {
      const s = f.economic;
      if (!s) return { ok: true, detail: "未配置" };
      return {
        ok: Boolean(s.active),
        detail: s.blocked ? String(s.reason || "事件阻断中") : "无高影响事件",
      };
    },
  },
];

export function FilterGuardMetrics(): React.ReactNode {
  const employee = useEmployeeStore((s) => s.employees.filter_guard);
  const stats = employee?.stats ?? {};

  const confirmedPassed = safeNum(stats.confirmed_passed);
  const confirmedBlocked = safeNum(stats.confirmed_blocked);
  const confirmedBlocks = extractBlocks(stats.confirmed_blocks);
  const intrabarPassed = safeNum(stats.intrabar_passed);
  const intrabarBlocked = safeNum(stats.intrabar_blocked);
  const intrabarBlocks = extractBlocks(stats.intrabar_blocks);
  const totalPassed = safeNum(stats.total_passed);
  const totalBlocked = safeNum(stats.total_blocked);
  const totalSnapshots = safeNum(stats.total_snapshots);
  const passRate = safeNum(
    stats.pass_rate ?? (totalSnapshots > 0 ? (totalPassed / totalSnapshots) * 100 : 0),
  );

  const allBlocks: Record<string, number> = {};
  for (const blocks of [confirmedBlocks, intrabarBlocks]) {
    for (const [key, value] of Object.entries(blocks)) {
      allBlocks[key] = (allBlocks[key] ?? 0) + safeNum(value);
    }
  }

  const realtimeFilters =
    typeof stats.realtime_filters === "object" && stats.realtime_filters !== null
      ? (stats.realtime_filters as Record<string, Record<string, unknown>>)
      : {};

  if (totalSnapshots === 0 && Object.keys(realtimeFilters).length === 0) return <Empty text="等待过滤样本进入" />;

  return (
    <div className="space-y-2.5">
      {Object.keys(realtimeFilters).length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[13px] text-text-muted">过滤规则实时状态</div>
          {RULE_CONFIG.map((rule) => {
            const { ok, detail } = rule.getStatus(realtimeFilters);
            return (
              <div key={rule.key} className="flex items-center justify-between text-[13px]">
                <span className="text-text-secondary">{rule.label}</span>
                <span className={cn("tabular-nums font-medium", ok ? "text-success" : "text-danger")}>
                  {ok ? "✓" : "✗"} {detail}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalSnapshots > 0 && (<>
        <div className="flex items-center justify-between text-[13px] border-t border-border/50 pt-2">
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
          <div className="text-[13px] text-text-muted">按输入范围查看</div>
          <div className="space-y-0.5 text-[13px]">
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
            <div className="text-[13px] text-text-muted">阻断原因</div>
            {Object.entries(allBlocks)
              .sort(([, a], [, b]) => b - a)
              .map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-[13px]">
                  <span className="text-text-secondary">{formatBlockReason(reason)}</span>
                  <span className="tabular-nums text-danger">{count}</span>
                </div>
              ))}
          </div>
        )}
      </>)}
    </div>
  );
}
