/**
 * 后端数据 → 员工状态同步引擎
 *
 * 将 MT5Services API 返回的数据映射为员工的 status / currentTask / stats。
 * 与 UI 解耦 — 只操作 Zustand store，不涉及渲染。
 */

import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";
import { useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";

/** 每次调用时从 store 实时取 action，避免模块加载时闭包过期 */
function update(
  role: EmployeeRoleType,
  patch: Partial<Omit<import("@/store/employees").EmployeeState, "role">>,
) {
  useEmployeeStore.getState().updateEmployee(role, patch);
}

function addAction(
  role: EmployeeRoleType,
  log: Omit<import("@/store/employees").ActionLog, "id">,
) {
  useEmployeeStore.getState().addAction(role, log);
}

/** 从健康数据同步巡检员 + 全局组件状态 */
function syncFromHealth() {
  const health = useSignalStore.getState().health;
  if (!health) {
    // 即使 health 不可用，也更新巡检员状态
    update(EmployeeRole.INSPECTOR, {
      status: "idle",
      currentTask: "健康数据获取中...",
    });
    return;
  }

  const hasIssue = health.status !== "healthy";
  update(EmployeeRole.INSPECTOR, {
    status: hasIssue ? "alert" : "working",
    currentTask: hasIssue
      ? `系统异常: ${health.status}`
      : `系统正常 | 运行 ${Math.floor(health.uptime_seconds / 60)}min`,
    stats: { uptime: Math.floor(health.uptime_seconds / 60) },
  });

  const comps = health.components ?? {};
  syncComponentStatus("data_ingestion", EmployeeRole.COLLECTOR, comps);
  syncComponentStatus("indicator_calculation", EmployeeRole.ANALYST, comps);
  syncComponentStatus("signal_runtime", EmployeeRole.STRATEGIST, comps);
}

function syncComponentStatus(
  key: string,
  role: EmployeeRoleType,
  comps: Record<string, { status: string; message?: string }>,
) {
  const comp = comps[key];
  if (!comp) return;
  const status: ActivityStatus =
    comp.status === "healthy" ? "working" : comp.status === "degraded" ? "alert" : "error";
  update(role, { status });
}

/** 从报价数据同步采集员 */
function syncFromQuotes() {
  const quotes = useMarketStore.getState().quotes;
  const connected = useMarketStore.getState().connected;
  const symbols = Object.keys(quotes);

  if (symbols.length === 0) {
    update(EmployeeRole.COLLECTOR, {
      status: connected ? "idle" : "error",
      currentTask: connected ? "已连接，等待行情..." : "后端未连接",
    });
    return;
  }

  const q = quotes[symbols[0]!];
  if (!q) return;

  update(EmployeeRole.COLLECTOR, {
    status: "working",
    currentTask: `采集 ${q.symbol} | bid ${q.bid.toFixed(2)} ask ${q.ask.toFixed(2)}`,
    stats: { spread: q.spread, symbols: symbols.length },
  });
}

/** 从持仓数据同步仓管员和会计 */
function syncFromPositions() {
  const { positions, account } = useMarketStore.getState();

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
  } else {
    update(EmployeeRole.ACCOUNTANT, {
      status: "idle",
      currentTask: "等待账户数据...",
    });
  }
}

/** 从信号数据同步策略师 / 投票主席 / 风控官 / 交易员 */
function syncFromSignals() {
  const { recentSignals, strategies } = useSignalStore.getState();

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

    update(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `汇总 ${activeSignals.length} 个活跃信号`,
    });

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
    } else {
      update(EmployeeRole.RISK_OFFICER, { status: "idle", currentTask: "待命" });
      update(EmployeeRole.TRADER, { status: "idle", currentTask: "等待交易指令" });
    }
  } else {
    const taskMsg = strategies.length > 0
      ? `监听中 | ${strategies.length} 个策略就绪`
      : "等待策略列表...";
    update(EmployeeRole.STRATEGIST, {
      status: strategies.length > 0 ? "working" : "idle",
      currentTask: taskMsg,
      stats: { total_strategies: strategies.length },
    });
    update(EmployeeRole.VOTER, {
      status: strategies.length > 0 ? "idle" : "idle",
      currentTask: strategies.length > 0 ? "等待策略投票" : "等待策略加载...",
    });
    update(EmployeeRole.RISK_OFFICER, { status: "idle", currentTask: "待命" });
    update(EmployeeRole.TRADER, { status: "idle", currentTask: "等待交易指令" });
  }
}

/** 同步日历员 */
function syncCalendar() {
  // 日历员始终处于工作状态（后端 EconomicCalendarService 持续运行）
  const connected = useMarketStore.getState().connected;
  update(EmployeeRole.CALENDAR_REPORTER, {
    status: connected ? "working" : "idle",
    currentTask: connected ? "监控经济日历事件" : "等待后端连接...",
  });
}

/** 一次性同步所有角色 */
export function syncAll() {
  syncFromHealth();
  syncFromQuotes();
  syncFromPositions();
  syncFromSignals();
  syncCalendar();
}
