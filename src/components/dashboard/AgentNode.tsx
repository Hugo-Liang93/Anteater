/**
 * Agent 节点卡片 — 2D 拓扑图中的单个角色/模块
 *
 * 两种变体：
 * - employee（11 个角色）：~152×84px，含名称、状态、任务、2 行指标
 * - module（4 个模块）：~120×52px，含名称、状态、1 行指标
 */

import { memo, useCallback, useMemo } from "react";
import {
  employeeConfigMap,
  statusColor,
  type EmployeeRoleType,
} from "@/config/employees";
import { getWorkflowByRole } from "@/config/workflows";
import { useEmployeeStore } from "@/store/employees";
import { useUIStore, selectSelectedEmployee } from "@/store/ui";

interface AgentNodeProps {
  role: EmployeeRoleType;
}

/** 从 employee.stats 提取每个角色的摘要指标 */
function extractMetrics(
  role: EmployeeRoleType,
  stats: Record<string, unknown>,
  currentTask: string,
): { line1: string; line2?: string } {
  switch (role) {
    case "collector": {
      const bid = stats.bid as number | undefined;
      const ask = stats.ask as number | undefined;
      const spread = stats.spread as number | undefined;
      if (bid && ask) {
        return {
          line1: `${bid.toFixed(2)} / ${ask.toFixed(2)}`,
          line2: spread != null ? `Spread ${spread.toFixed(1)}` : undefined,
        };
      }
      return { line1: currentTask || "等待报价" };
    }
    case "analyst":
    case "live_analyst": {
      const count = stats.total_indicator_count as number | undefined;
      const rsi = stats.rsi_value as number | undefined;
      const tfCount = stats.timeframe_count as number | undefined;
      const parts: string[] = [];
      if (count != null) parts.push(`${count} 指标`);
      if (tfCount != null) parts.push(`${tfCount} TF`);
      return {
        line1: parts.join("  ") || currentTask || "等待数据",
        line2: rsi != null ? `RSI ${rsi.toFixed(0)}` : undefined,
      };
    }
    case "strategist":
    case "live_strategist": {
      const buy = stats.buy_count as number | undefined;
      const sell = stats.sell_count as number | undefined;
      const conf = stats.top_confidence as number | undefined;
      const parts: string[] = [];
      if (buy != null) parts.push(`${buy} 多`);
      if (sell != null) parts.push(`${sell} 空`);
      return {
        line1: parts.join(" / ") || currentTask || "等待评估",
        line2: conf != null ? `最高 ${(conf * 100).toFixed(0)}%` : undefined,
      };
    }
    case "filter_guard": {
      const received = stats.received as number | undefined;
      const passed = stats.passed as number | undefined;
      const blocked = stats.blocked as number | undefined;
      if (received != null) {
        const rate = received > 0 && passed != null ? ((passed / received) * 100).toFixed(0) : "--";
        return {
          line1: `通过率 ${rate}%`,
          line2: blocked != null && blocked > 0 ? `拦截 ${blocked}` : undefined,
        };
      }
      return { line1: currentTask || "等待信号" };
    }
    case "regime_guard": {
      const regime = stats.regime as string | undefined;
      return {
        line1: regime ? `Regime: ${regime}` : currentTask || "等待研判",
      };
    }
    case "voter": {
      const dir = stats.consensus_direction as string | undefined;
      const buyVotes = stats.buy_votes as number | undefined;
      const sellVotes = stats.sell_votes as number | undefined;
      const parts: string[] = [];
      if (buyVotes != null) parts.push(`${buyVotes} 多`);
      if (sellVotes != null) parts.push(`${sellVotes} 空`);
      return {
        line1: dir || "等待投票",
        line2: parts.join(" / ") || undefined,
      };
    }
    case "risk_officer": {
      const received = stats.received as number | undefined;
      const passed = stats.passed as number | undefined;
      const blocked = stats.blocked as number | undefined;
      if (received != null) {
        return {
          line1: `审批 ${passed ?? 0} 通过`,
          line2: blocked != null && blocked > 0 ? `阻断 ${blocked}` : undefined,
        };
      }
      return { line1: currentTask || "等待审批" };
    }
    case "trader": {
      const pnl = stats.total_pnl as number | undefined;
      const posCount = stats.position_count as number | undefined;
      return {
        line1: posCount != null ? `${posCount} 笔持仓` : currentTask || "等待下单",
        line2: pnl != null ? `PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` : undefined,
      };
    }
    case "position_manager": {
      const posCount = stats.position_count as number | undefined;
      const pnl = stats.total_pnl as number | undefined;
      return {
        line1: posCount != null ? `${posCount} 笔持仓` : currentTask || "等待仓位",
        line2: pnl != null ? `PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` : undefined,
      };
    }
    case "accountant": {
      const equity = stats.equity as number | undefined;
      return { line1: equity != null ? `$${equity.toFixed(2)}` : currentTask || "等待账户" };
    }
    case "calendar_reporter": {
      const guardCount = stats.active_guard_count as number | undefined;
      const nearest = stats.nearest_event as string | undefined;
      return { line1: guardCount != null ? `${guardCount} 活跃窗口` : nearest || currentTask || "无近期事件" };
    }
    case "inspector": {
      const issues = stats.issue_count as number | undefined;
      return { line1: issues != null ? (issues > 0 ? `${issues} 异常` : "正常") : currentTask || "巡检中" };
    }
    case "backtester":
      return { line1: currentTask || "空闲" };
    default:
      return { line1: currentTask || "" };
  }
}

export const AgentNode = memo(function AgentNode({ role }: AgentNodeProps) {
  const config = employeeConfigMap.get(role);
  const status = useEmployeeStore((s) => s.employees[role]?.status ?? "idle");
  const currentTask = useEmployeeStore((s) => s.employees[role]?.currentTask ?? "");
  const stats = useEmployeeStore((s) => s.employees[role]?.stats ?? {});
  const selectedEmployee = useUIStore(selectSelectedEmployee);
  const openRightPanel = useUIStore((s) => s.openRightPanel);

  const isSelected = selectedEmployee === role;
  const isModule = config?.presentation === "module";
  const isActive = status !== "idle" && status !== "disconnected";
  const color = config?.color ?? "#5a6d7e";
  const ledColor = statusColor(status);
  const moduleTag = role === "backtester" ? "验证" : "证据";

  const metrics = useMemo(
    () => extractMetrics(role, stats, currentTask),
    [role, stats, currentTask],
  );

  const handleClick = useCallback(() => {
    const workflowId = getWorkflowByRole(role) ?? "support";
    openRightPanel({ kind: "employee", workflowId, employeeId: role });
  }, [role, openRightPanel]);

  if (isModule) {
    return (
      <button
        onClick={handleClick}
        className="group flex w-full cursor-pointer flex-col rounded-lg border border-white/8 transition-all duration-200 hover:border-white/16 hover:bg-bg-hover"
        style={{
          background: "rgba(20,33,50,0.85)",
          borderLeft: `2px solid ${color}`,
          opacity: isActive ? 1 : 0.5,
          boxShadow: isSelected
            ? `0 0 0 1.5px ${color}, 0 0 20px ${color}30`
            : isActive
              ? `0 0 12px ${color}18`
              : "none",
          padding: "6px 10px",
          minWidth: 110,
        }}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: ledColor,
                boxShadow: isActive ? `0 0 6px ${ledColor}` : "none",
              }}
            />
            <span className="text-[11px] font-semibold" style={{ color }}>
              {config?.name ?? role}
            </span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-white/45">
            {moduleTag}
          </span>
        </div>
        <div className="mt-0.5 w-full truncate text-left font-mono text-[10px] text-text-secondary">
          {metrics.line1}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-white/8 transition-all duration-200 hover:border-white/16 hover:bg-bg-hover"
      style={{
        background: "rgba(20,33,50,0.85)",
        borderLeft: `2.5px solid ${color}`,
        opacity: isActive ? 1 : 0.5,
        boxShadow: isSelected
          ? `0 0 0 1.5px ${color}, 0 0 20px ${color}30`
          : isActive
            ? `0 0 12px ${color}18`
            : "none",
        padding: "8px 10px",
        minWidth: 140,
      }}
    >
      {/* Header: name + status LED */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: ledColor,
              boxShadow: isActive ? `0 0 6px ${ledColor}` : "none",
            }}
          />
          <span className="text-[12px] font-semibold" style={{ color }}>
            {config?.name ?? role}
          </span>
        </div>
        <span className="text-[9px] text-text-muted">{status}</span>
      </div>

      {/* Metric line 1 */}
      <div className="mt-1 w-full truncate text-left font-mono text-[11px] text-text-secondary">
        {metrics.line1}
      </div>

      {/* Metric line 2 (optional) */}
      {metrics.line2 && (
        <div className="mt-0.5 w-full truncate text-left font-mono text-[10px] text-text-muted">
          {metrics.line2}
        </div>
      )}
    </button>
  );
});
