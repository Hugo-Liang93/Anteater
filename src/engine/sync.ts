/**
 * 后端数据 → 员工状态同步引擎
 *
 * 将 MT5Services API 返回的数据映射为员工的 status / currentTask / stats。
 * 与 UI 解耦 — 只操作 Zustand store，不涉及渲染。
 * 后续可扩展为 WebSocket 事件驱动。
 */

import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";
import { useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";

const update = useEmployeeStore.getState().updateEmployee;
const addAction = useEmployeeStore.getState().addAction;

/** 从健康数据同步巡检员 + 全局组件状态 */
export function syncFromHealth() {
  const health = useSignalStore.getState().health;
  if (!health) return;

  // 巡检员
  const hasIssue = health.status !== "healthy";
  update(EmployeeRole.INSPECTOR, {
    status: hasIssue ? "alert" : "working",
    currentTask: hasIssue
      ? `系统异常: ${health.status}`
      : `系统正常 | 运行 ${Math.floor(health.uptime_seconds / 60)}min`,
    stats: { uptime: Math.floor(health.uptime_seconds / 60) },
  });

  // 根据组件状态设置对应员工
  const comps = health.components ?? {};
  syncComponentStatus("ingestor", EmployeeRole.COLLECTOR, comps);
  syncComponentStatus("indicator_manager", EmployeeRole.ANALYST, comps);
  syncComponentStatus("signal_runtime", EmployeeRole.STRATEGIST, comps);
  syncComponentStatus("storage_writer", EmployeeRole.ACCOUNTANT, comps);
}

function syncComponentStatus(
  key: string,
  role: string,
  comps: Record<string, { status: string; message?: string }>,
) {
  const comp = comps[key];
  if (!comp) return;
  const status: ActivityStatus =
    comp.status === "healthy" ? "working" : comp.status === "degraded" ? "alert" : "error";
  update(role as EmployeeRoleType, { status });
}

/** 从报价数据同步采集员 */
export function syncFromQuotes() {
  const quotes = useMarketStore.getState().quotes;
  const symbols = Object.keys(quotes);
  if (symbols.length === 0) return;

  const q = quotes[symbols[0]!];
  if (!q) return;

  update(EmployeeRole.COLLECTOR, {
    status: "working",
    currentTask: `采集 ${q.symbol} | bid ${q.bid.toFixed(2)} ask ${q.ask.toFixed(2)}`,
    stats: { spread: q.spread, symbols: symbols.length },
  });
}

/** 从持仓数据同步仓管员和会计 */
export function syncFromPositions() {
  const { positions, account } = useMarketStore.getState();

  // 仓管员
  if (positions.length > 0) {
    const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
    update(EmployeeRole.POSITION_MANAGER, {
      status: "working",
      currentTask: `监控 ${positions.length} 笔持仓 | P&L ${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
      stats: { positions: positions.length, profit: totalProfit },
    });
  } else {
    update(EmployeeRole.POSITION_MANAGER, {
      status: "idle",
      currentTask: "无持仓，等待新交易",
      stats: { positions: 0 },
    });
  }

  // 会计
  if (account) {
    update(EmployeeRole.ACCOUNTANT, {
      status: "working",
      currentTask: `余额 $${account.balance.toFixed(2)} | 净值 $${account.equity.toFixed(2)}`,
      stats: {
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
      },
    });
  }
}

/** 从信号数据同步策略师 / 投票主席 / 风控官 / 交易员 */
export function syncFromSignals() {
  const { recentSignals, strategies } = useSignalStore.getState();

  // 策略师
  const activeSignals = recentSignals.filter(
    (s) => s.signal_state.includes("buy") || s.signal_state.includes("sell"),
  );
  if (activeSignals.length > 0) {
    const latest = activeSignals[0]!;
    update(EmployeeRole.STRATEGIST, {
      status: "working",
      currentTask: `${latest.strategy}: ${latest.signal_state} (${(latest.confidence * 100).toFixed(0)}%)`,
      stats: {
        active_signals: activeSignals.length,
        total_strategies: strategies.length,
      },
    });

    // 投票主席
    update(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `汇总 ${activeSignals.length} 个活跃信号`,
    });

    // 有 confirmed 信号时 → 风控官和交易员活跃
    const confirmed = activeSignals.filter((s) =>
      s.signal_state.startsWith("confirmed_"),
    );
    if (confirmed.length > 0) {
      const c = confirmed[0]!;
      update(EmployeeRole.RISK_OFFICER, {
        status: "working",
        currentTask: `审批 ${c.strategy} ${c.direction} 信号`,
      });
      update(EmployeeRole.TRADER, {
        status: "working",
        currentTask: `准备执行 ${c.direction} ${c.symbol}`,
      });

      addAction(EmployeeRole.RISK_OFFICER, {
        timestamp: Date.now(),
        message: `审批 ${c.strategy} ${c.direction} (${(c.confidence * 100).toFixed(0)}%)`,
        type: "info",
      });
    }
  } else {
    update(EmployeeRole.STRATEGIST, {
      status: "idle",
      currentTask: `监听中 | ${strategies.length} 个策略就绪`,
      stats: { total_strategies: strategies.length },
    });
    update(EmployeeRole.VOTER, { status: "idle", currentTask: "等待策略投票" });
    update(EmployeeRole.RISK_OFFICER, { status: "idle", currentTask: "待命" });
    update(EmployeeRole.TRADER, { status: "idle", currentTask: "等待交易指令" });
  }
}

/** 一次性同步所有角色 */
export function syncAll() {
  syncFromHealth();
  syncFromQuotes();
  syncFromPositions();
  syncFromSignals();
}
