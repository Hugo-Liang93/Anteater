/**
 * 后端数据 → 员工状态同步引擎
 *
 * 每个角色都必须在每次 syncAll() 中获得完整的 status + currentTask 更新。
 * 不允许只更新 status 而留 currentTask 为默认值。
 */

import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";

function update(
  role: EmployeeRoleType,
  patch: Partial<Omit<import("@/store/employees").EmployeeState, "role">>,
) {
  useEmployeeStore.getState().updateEmployee(role, patch);
}

/** 一次性同步所有角色 */
export function syncAll() {
  const { quotes, account, positions, connected } = useMarketStore.getState();
  const { health, strategies } = useSignalStore.getState();
  const quote = quotes["XAUUSD"];

  // ─── 采集员 ───
  if (quote) {
    update(EmployeeRole.COLLECTOR, {
      status: "working",
      currentTask: `采集 XAUUSD | ${quote.bid.toFixed(2)} / ${quote.ask.toFixed(2)}`,
      stats: { spread: quote.spread, bid: quote.bid, ask: quote.ask },
    });
  } else {
    update(EmployeeRole.COLLECTOR, {
      status: connected ? "idle" : "error",
      currentTask: connected ? "已连接，等待行情数据" : "后端未连接",
    });
  }

  // ─── 分析师 ───
  const indicatorComp = health?.components?.["indicator_calculation"];
  if (indicatorComp) {
    const ok = indicatorComp.status === "healthy";
    update(EmployeeRole.ANALYST, {
      status: ok ? "working" : "alert",
      currentTask: ok
        ? "计算技术指标 | 21 个指标运行中"
        : `指标计算异常: ${indicatorComp.status}`,
    });
  } else if (connected) {
    update(EmployeeRole.ANALYST, {
      status: "working",
      currentTask: "计算技术指标中...",
    });
  } else {
    update(EmployeeRole.ANALYST, {
      status: "idle",
      currentTask: "等待后端连接",
    });
  }

  // ─── 策略师 ───
  if (strategies.length > 0) {
    update(EmployeeRole.STRATEGIST, {
      status: "working",
      currentTask: `${strategies.length} 个策略运行中`,
      stats: { total_strategies: strategies.length },
    });
  } else {
    update(EmployeeRole.STRATEGIST, {
      status: connected ? "idle" : "idle",
      currentTask: connected ? "等待策略加载" : "等待后端连接",
    });
  }

  // ─── 投票主席 ───
  if (strategies.length > 0) {
    update(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `汇总 ${strategies.length} 个策略投票`,
    });
  } else {
    update(EmployeeRole.VOTER, {
      status: "idle",
      currentTask: "等待策略投票",
    });
  }

  // ─── 风控官 ───
  const riskOk = connected && strategies.length > 0;
  update(EmployeeRole.RISK_OFFICER, {
    status: riskOk ? "working" : "idle",
    currentTask: riskOk ? "风控规则监控中" : "待命",
  });

  // ─── 交易员 ───
  if (positions.length > 0) {
    update(EmployeeRole.TRADER, {
      status: "working",
      currentTask: `${positions.length} 笔订单执行中`,
    });
  } else {
    update(EmployeeRole.TRADER, {
      status: riskOk ? "idle" : "idle",
      currentTask: riskOk ? "等待交易信号" : "待命",
    });
  }

  // ─── 仓管员 ───
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
    });
  }

  // ─── 会计 ───
  if (account) {
    update(EmployeeRole.ACCOUNTANT, {
      status: "working",
      currentTask: `余额 $${account.balance.toFixed(0)} | 净值 $${account.equity.toFixed(0)}`,
      stats: { balance: account.balance, equity: account.equity, margin: account.margin },
    });
  } else {
    update(EmployeeRole.ACCOUNTANT, {
      status: "idle",
      currentTask: "等待账户数据",
    });
  }

  // ─── 日历员 ───
  update(EmployeeRole.CALENDAR_REPORTER, {
    status: connected ? "working" : "idle",
    currentTask: connected ? "监控经济日历事件" : "等待后端连接",
  });

  // ─── 巡检员 ───
  if (health) {
    const ok = health.status === "healthy";
    update(EmployeeRole.INSPECTOR, {
      status: ok ? "working" : "alert",
      currentTask: ok ? "系统运行正常" : `系统状态: ${health.status}`,
    });
  } else {
    update(EmployeeRole.INSPECTOR, {
      status: connected ? "working" : "idle",
      currentTask: connected ? "巡检系统组件中" : "等待后端连接",
    });
  }
}
