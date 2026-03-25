/**
 * 后端数据 → 员工状态同步引擎 — 按 ARCHITECTURE.md 解耦设计
 *
 * syncAll() 从各 store 收集输入，传递给纯函数 computeSync()，
 * 再将结果批量写入 employee store。
 * computeSync() 本身不直接依赖 store，可独立测试。
 */

import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useLiveStore, type LiveSignal, type QueueInfo } from "@/store/live";
import { useEventStore } from "@/store/events";
import type { Quote, AccountInfo, Position, HealthStatus, StrategyInfo } from "@/api/types";

// ─── Sync 输入类型（解耦 store 依赖） ───

export interface SyncInput {
  quote: Quote | undefined;
  account: AccountInfo | null;
  positions: Position[];
  connected: boolean;
  health: HealthStatus | null;
  strategies: StrategyInfo[];
  lastLoggedSignalId: string;
  indicators: Record<string, { indicators: Record<string, Record<string, number | null>> }>;
  signals: LiveSignal[];
  queues: QueueInfo[];
}

export interface SyncPatch {
  status: ActivityStatus;
  currentTask: string;
  stats: Record<string, number | string>;
}

export interface SyncOutput {
  patches: Map<EmployeeRoleType, SyncPatch>;
  newSignalLog: { role: EmployeeRoleType; message: string; type: "info" | "success"; signalId: string } | null;
  events: { source: EmployeeRoleType; message: string; severity: "info" | "success" | "warning" | "error" }[];
}

/** 纯函数：根据输入计算所有角色的状态补丁 */
export function computeSync(input: SyncInput): SyncOutput {
  const { quote, account, positions, connected, health, strategies, lastLoggedSignalId, indicators, signals, queues } = input;
  const patches = new Map<EmployeeRoleType, SyncPatch>();
  const events: SyncOutput["events"] = [];
  let newSignalLog: SyncOutput["newSignalLog"] = null;
  const m5 = indicators["M5"];

  // ─── 采集员 ───
  if (quote) {
    patches.set(EmployeeRole.COLLECTOR, {
      status: "working",
      currentTask: `XAUUSD ${quote.bid.toFixed(2)} / ${quote.ask.toFixed(2)}`,
      stats: { bid: quote.bid, ask: quote.ask, spread: quote.spread },
    });
  } else {
    patches.set(EmployeeRole.COLLECTOR, {
      status: connected ? "idle" : "disconnected",
      currentTask: connected ? "等待行情数据" : "后端未连接",
      stats: {},
    });
  }

  // ─── 分析师 ───
  if (m5 && m5.indicators) {
    const count = Object.keys(m5.indicators).length;
    const rsi = m5.indicators["rsi14"]?.["rsi"];
    const atr = m5.indicators["atr14"]?.["atr"];
    const rsiStr = rsi != null ? `RSI ${rsi.toFixed(1)}` : "";
    const atrStr = atr != null ? `ATR ${atr.toFixed(2)}` : "";
    const detail = [rsiStr, atrStr].filter(Boolean).join(" | ");
    patches.set(EmployeeRole.ANALYST, {
      status: "working",
      currentTask: `${count} 个指标${detail ? " | " + detail : ""}`,
      stats: { indicators: count, rsi: rsi ?? 0, atr: atr ?? 0 },
    });
  } else if (connected) {
    patches.set(EmployeeRole.ANALYST, { status: "thinking", currentTask: "计算指标中...", stats: {} });
  } else {
    patches.set(EmployeeRole.ANALYST, { status: "disconnected", currentTask: "等待后端连接", stats: {} });
  }

  // ─── 策略师 ───
  const buySignals = signals.filter((s) => s.direction === "buy");
  const sellSignals = signals.filter((s) => s.direction === "sell");
  if (signals.length > 0) {
    const latest = signals[0]!;
    patches.set(EmployeeRole.STRATEGIST, {
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
    if (latest.signal_id !== lastLoggedSignalId) {
      newSignalLog = {
        role: EmployeeRole.STRATEGIST,
        message: `${latest.strategy} → ${latest.direction} (${(latest.confidence * 100).toFixed(0)}%)`,
        type: latest.direction === "hold" ? "info" : "success",
        signalId: latest.signal_id,
      };
    }
  } else if (strategies.length > 0) {
    patches.set(EmployeeRole.STRATEGIST, {
      status: "thinking",
      currentTask: `${strategies.length} 个策略评估中`,
      stats: { total_strategies: strategies.length },
    });
  } else {
    patches.set(EmployeeRole.STRATEGIST, { status: "idle", currentTask: "等待策略加载", stats: {} });
  }

  // ─── 投票主席 ───
  if (signals.length > 0) {
    const dirs = signals.reduce(
      (acc, s) => { if (s.direction === "buy") acc.buy++; else if (s.direction === "sell") acc.sell++; return acc; },
      { buy: 0, sell: 0 },
    );
    const consensus = dirs.buy > dirs.sell ? "偏多" : dirs.sell > dirs.buy ? "偏空" : "分歧";
    patches.set(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `${signals.length} 票 | ${consensus} (${dirs.buy}买/${dirs.sell}卖)`,
      stats: { buy: dirs.buy, sell: dirs.sell },
    });
  } else {
    patches.set(EmployeeRole.VOTER, {
      status: strategies.length > 0 ? "thinking" : "idle",
      currentTask: strategies.length > 0 ? `汇总 ${strategies.length} 策略投票` : "等待策略投票",
      stats: {},
    });
  }

  // ─── 风控官 ───
  const queueDrops = queues.reduce((s, q) => s + q.drops_oldest + q.drops_newest, 0);
  const queueWarning = queues.some((q) => q.status !== "normal");
  if (connected && strategies.length > 0) {
    if (queueDrops > 10) {
      patches.set(EmployeeRole.RISK_OFFICER, {
        status: "blocked", currentTask: `风控拦截 | ${queueDrops} 次丢弃`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    } else if (queueWarning) {
      patches.set(EmployeeRole.RISK_OFFICER, {
        status: "alert", currentTask: `队列异常 | ${queueDrops} 次丢弃`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    } else {
      patches.set(EmployeeRole.RISK_OFFICER, {
        status: "reviewing", currentTask: `风控审核中 | ${queues.length} 队列正常`,
        stats: { queues: queues.length, drops: queueDrops },
      });
    }
  } else {
    patches.set(EmployeeRole.RISK_OFFICER, { status: "idle", currentTask: "待命", stats: {} });
  }

  // ─── 交易员 ───
  if (positions.length > 0) {
    const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
    patches.set(EmployeeRole.TRADER, {
      status: "working",
      currentTask: `${positions.length} 笔持仓 | P&L ${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
      stats: { positions: positions.length, pnl: totalProfit },
    });
  } else {
    const hasSignal = signals.some((s) => s.direction !== "hold" && s.confidence > 0.5);
    patches.set(EmployeeRole.TRADER, {
      status: hasSignal ? "thinking" : "idle",
      currentTask: hasSignal ? "信号评估中，准备执行" : "等待交易信号",
      stats: {},
    });
  }

  // ─── 仓管员 ───
  if (positions.length > 0) {
    const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
    const types = positions.map((p) => p.type === "buy" ? "多" : "空").join("/");
    patches.set(EmployeeRole.POSITION_MANAGER, {
      status: "working",
      currentTask: `${positions.length} 仓 (${types}) | ${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
      stats: { positions: positions.length, profit: totalProfit },
    });
  } else {
    patches.set(EmployeeRole.POSITION_MANAGER, { status: "idle", currentTask: "无持仓", stats: {} });
  }

  // ─── 会计 ───
  if (account) {
    const marginPct = account.margin > 0
      ? ((account.free_margin / (account.margin + account.free_margin)) * 100).toFixed(0) : "100";
    patches.set(EmployeeRole.ACCOUNTANT, {
      status: "working",
      currentTask: `$${account.equity.toFixed(0)} | 可用${marginPct}%`,
      stats: { balance: account.balance, equity: account.equity, margin: account.margin, free_margin: account.free_margin },
    });
  } else {
    patches.set(EmployeeRole.ACCOUNTANT, {
      status: connected ? "idle" : "disconnected",
      currentTask: connected ? "等待账户数据" : "后端未连接", stats: {},
    });
  }

  // ─── 日历员 ───
  patches.set(EmployeeRole.CALENDAR_REPORTER, {
    status: connected ? "working" : "disconnected",
    currentTask: connected ? "监控经济日历" : "后端未连接", stats: {},
  });

  // ─── 巡检员 ───
  if (health) {
    const compCount = Object.keys(health.components).length;
    const issues = Object.values(health.components).filter((c) => c.status !== "healthy").length;
    patches.set(EmployeeRole.INSPECTOR, {
      status: issues > 0 ? "alert" : "reviewing",
      currentTask: issues > 0 ? `${issues}/${compCount} 组件异常` : `${compCount} 组件巡检中`,
      stats: { components: compCount, issues },
    });
  } else {
    patches.set(EmployeeRole.INSPECTOR, {
      status: connected ? "thinking" : "disconnected",
      currentTask: connected ? "巡检准备中" : "后端未连接", stats: {},
    });
  }

  return { patches, newSignalLog, events };
}

// ─── 入口：从 store 收集输入 → 计算 → 写回 ───

export function syncAll() {
  try {
    const { quotes, account, positions, connected } = useMarketStore.getState();
    const { health, strategies, lastLoggedSignalId } = useSignalStore.getState();
    const { indicators, signals, queues } = useLiveStore.getState();

    const input: SyncInput = {
      quote: quotes["XAUUSD"],
      account, positions, connected,
      health, strategies, lastLoggedSignalId,
      indicators, signals, queues,
    };

    const output = computeSync(input);

    // 批量写入 employee store
    const empStore = useEmployeeStore.getState();
    for (const [role, patch] of output.patches) {
      empStore.updateEmployee(role, patch);
    }

    // 处理新信号日志
    if (output.newSignalLog) {
      useSignalStore.getState().setLastLoggedSignalId(output.newSignalLog.signalId);
      empStore.addAction(output.newSignalLog.role, {
        timestamp: Date.now(),
        message: output.newSignalLog.message,
        type: output.newSignalLog.type,
      });
      // 同时推送到全局事件流
      useEventStore.getState().appendEvent({
        timestamp: Date.now(),
        type: "signal_generated",
        source: output.newSignalLog.role,
        message: output.newSignalLog.message,
        severity: output.newSignalLog.type === "success" ? "success" : "info",
      });
    }
  } catch (err) {
    console.error("[sync] syncAll error:", err);
  }
}
