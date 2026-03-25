/**
 * 后端数据 → 员工状态同步引擎
 *
 * 每次 syncAll() 用真实后端数据驱动所有 10 个角色的状态。
 * 按 ANIMATION_SPEC.md 映射完整的 ActivityStatus 状态集。
 */

import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useLiveStore } from "@/store/live";

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

export function syncAll() {
  try {
    _syncAllInner();
  } catch (err) {
    console.error("[sync] syncAll error:", err);
  }
}

function _syncAllInner() {
  const { quotes, account, positions, connected } = useMarketStore.getState();
  const { health, strategies, lastLoggedSignalId } = useSignalStore.getState();
  const { indicators, signals, queues } = useLiveStore.getState();
  const quote = quotes["XAUUSD"];
  const m5 = indicators["M5"];

  // ─── 采集员：行情数据 ───
  if (quote) {
    update(EmployeeRole.COLLECTOR, {
      status: "working",
      currentTask: `XAUUSD ${quote.bid.toFixed(2)} / ${quote.ask.toFixed(2)}`,
      stats: { bid: quote.bid, ask: quote.ask, spread: quote.spread },
    });
  } else {
    update(EmployeeRole.COLLECTOR, {
      status: connected ? "idle" : "disconnected",
      currentTask: connected ? "等待行情数据" : "后端未连接",
    });
  }

  // ─── 分析师：指标计算 ───
  if (m5 && m5.indicators) {
    const count = Object.keys(m5.indicators).length;
    const rsi = m5.indicators["rsi14"]?.["rsi"];
    const atr = m5.indicators["atr14"]?.["atr"];
    const rsiStr = rsi != null ? `RSI ${rsi.toFixed(1)}` : "";
    const atrStr = atr != null ? `ATR ${atr.toFixed(2)}` : "";
    const detail = [rsiStr, atrStr].filter(Boolean).join(" | ");
    update(EmployeeRole.ANALYST, {
      status: "working",
      currentTask: `${count} 个指标${detail ? " | " + detail : ""}`,
      stats: { indicators: count, rsi: rsi ?? 0, atr: atr ?? 0 },
    });
  } else if (connected) {
    update(EmployeeRole.ANALYST, { status: "thinking", currentTask: "计算指标中..." });
  } else {
    update(EmployeeRole.ANALYST, { status: "disconnected", currentTask: "等待后端连接" });
  }

  // ─── 策略师：信号评估 ───
  const buySignals = signals.filter((s) => s.direction === "buy");
  const sellSignals = signals.filter((s) => s.direction === "sell");
  if (signals.length > 0) {
    const latest = signals[0]!;
    update(EmployeeRole.STRATEGIST, {
      status: "working",
      currentTask: `${strategies.length} 策略 | ${buySignals.length} 买 ${sellSignals.length} 卖`,
      stats: {
        total_strategies: strategies.length,
        buy_signals: buySignals.length,
        sell_signals: sellSignals.length,
        latest_strategy: latest.strategy,
        latest_confidence: latest.confidence,
      },
    });

    // 推送最新信号到日志
    if (latest.signal_id !== lastLoggedSignalId) {
      useSignalStore.getState().setLastLoggedSignalId(latest.signal_id);
      addAction(EmployeeRole.STRATEGIST, {
        timestamp: Date.now(),
        message: `${latest.strategy} → ${latest.direction} (${(latest.confidence * 100).toFixed(0)}%)`,
        type: latest.direction === "hold" ? "info" : "success",
      });
    }
  } else if (strategies.length > 0) {
    update(EmployeeRole.STRATEGIST, {
      status: "thinking",
      currentTask: `${strategies.length} 个策略评估中`,
      stats: { total_strategies: strategies.length },
    });
  } else {
    update(EmployeeRole.STRATEGIST, { status: "idle", currentTask: "等待策略加载" });
  }

  // ─── 投票主席：投票汇总 ───
  if (signals.length > 0) {
    const dirs = signals.reduce(
      (acc, s) => {
        if (s.direction === "buy") acc.buy++;
        else if (s.direction === "sell") acc.sell++;
        return acc;
      },
      { buy: 0, sell: 0 },
    );
    const consensus = dirs.buy > dirs.sell ? "偏多" : dirs.sell > dirs.buy ? "偏空" : "分歧";
    update(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `${signals.length} 票 | ${consensus} (${dirs.buy}买/${dirs.sell}卖)`,
      stats: { buy: dirs.buy, sell: dirs.sell },
    });
  } else {
    update(EmployeeRole.VOTER, {
      status: strategies.length > 0 ? "thinking" : "idle",
      currentTask: strategies.length > 0 ? `汇总 ${strategies.length} 策略投票` : "等待策略投票",
    });
  }

  // ─── 风控官：风控状态 ───
  const queueDrops = queues.reduce((s, q) => s + q.drops_oldest + q.drops_newest, 0);
  const queueWarning = queues.some((q) => q.status !== "normal");
  if (connected && strategies.length > 0) {
    if (queueDrops > 10) {
      // 严重丢弃 → blocked
      update(EmployeeRole.RISK_OFFICER, {
        status: "blocked",
        currentTask: `风控拦截 | ${queueDrops} 次丢弃`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    } else if (queueWarning) {
      update(EmployeeRole.RISK_OFFICER, {
        status: "alert",
        currentTask: `队列异常 | ${queueDrops} 次丢弃`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    } else {
      update(EmployeeRole.RISK_OFFICER, {
        status: "reviewing",
        currentTask: `风控审核中 | ${queues.length} 队列正常`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    }
  } else {
    update(EmployeeRole.RISK_OFFICER, { status: "idle", currentTask: "待命" });
  }

  // ─── 交易员：交易执行 ───
  if (positions.length > 0) {
    const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
    update(EmployeeRole.TRADER, {
      status: "working",
      currentTask: `${positions.length} 笔持仓 | P&L ${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
      stats: { positions: positions.length, pnl: totalProfit },
    });
  } else {
    const hasSignal = signals.some(
      (s) => s.direction !== "hold" && s.confidence > 0.5,
    );
    update(EmployeeRole.TRADER, {
      status: hasSignal ? "thinking" : "idle",
      currentTask: hasSignal ? "信号评估中，准备执行" : "等待交易信号",
    });
  }

  // ─── 仓管员：持仓监控 ───
  if (positions.length > 0) {
    const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
    const types = positions.map((p) => p.type === "buy" ? "多" : "空").join("/");
    update(EmployeeRole.POSITION_MANAGER, {
      status: "working",
      currentTask: `${positions.length} 仓 (${types}) | ${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
      stats: { positions: positions.length, profit: totalProfit },
    });
  } else {
    update(EmployeeRole.POSITION_MANAGER, { status: "idle", currentTask: "无持仓" });
  }

  // ─── 会计：账户数据 ───
  if (account) {
    const marginPct = account.margin > 0
      ? ((account.free_margin / (account.margin + account.free_margin)) * 100).toFixed(0)
      : "100";
    update(EmployeeRole.ACCOUNTANT, {
      status: "working",
      currentTask: `$${account.equity.toFixed(0)} | 可用${marginPct}%`,
      stats: {
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        free_margin: account.free_margin,
      },
    });
  } else {
    update(EmployeeRole.ACCOUNTANT, {
      status: connected ? "idle" : "disconnected",
      currentTask: connected ? "等待账户数据" : "后端未连接",
    });
  }

  // ─── 日历员 ───
  update(EmployeeRole.CALENDAR_REPORTER, {
    status: connected ? "working" : "disconnected",
    currentTask: connected ? "监控经济日历" : "后端未连接",
  });

  // ─── 巡检员：系统健康 ───
  if (health) {
    const compCount = Object.keys(health.components).length;
    const issues = Object.values(health.components).filter((c) => c.status !== "healthy").length;
    update(EmployeeRole.INSPECTOR, {
      status: issues > 0 ? "alert" : "reviewing",
      currentTask: issues > 0
        ? `${issues}/${compCount} 组件异常`
        : `${compCount} 组件巡检中`,
      stats: { components: compCount, issues },
    });
  } else {
    update(EmployeeRole.INSPECTOR, {
      status: connected ? "thinking" : "disconnected",
      currentTask: connected ? "巡检准备中" : "后端未连接",
    });
  }
}
