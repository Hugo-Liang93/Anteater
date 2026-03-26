/**
 * 后端数据 → 员工状态同步引擎 — 按 ARCHITECTURE.md 解耦设计
 *
 * syncAll() 从各 store 收集输入，传递给纯函数 computeSync()，
 * 再将结果批量写入 employee store。
 * computeSync() 本身不直接依赖 store，可独立测试。
 *
 * 当 Studio SSE 连接成功时，后端直接推送真实 agent 状态，
 * syncAll() 自动降级为 no-op，避免推测状态覆盖真实状态。
 */

// ── SSE 降级开关 ──────────────────────────────────────────────
// SSE 连上后 sync 推导自动跳过；断线后恢复推导作为 fallback。
let _studioSSEActive = false;
export function setStudioSSEActive(active: boolean) { _studioSSEActive = active; }

import { config } from "@/config";
import { EmployeeRole, type EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useLiveStore, type LiveSignal, type QueueInfo } from "@/store/live";
import { useEventStore } from "@/store/events";
import type { Quote, AccountInfo, Position, HealthStatus, RiskWindow, StrategyInfo } from "@/api/types";

// ─── Sync 输入类型（解耦 store 依赖） ───

export interface SyncInput {
  quote: Quote | undefined;
  account: AccountInfo | null;
  positions: Position[];
  connected: boolean;
  health: HealthStatus | null;
  strategies: StrategyInfo[];
  riskWindows: RiskWindow[];
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
}

/** 纯函数：根据输入计算所有角色的状态补丁 */
export function computeSync(input: SyncInput): SyncOutput {
  const { quote, account, positions, connected, health, strategies, riskWindows, lastLoggedSignalId, indicators, signals, queues } = input;
  const patches = new Map<EmployeeRoleType, SyncPatch>();
  let newSignalLog: SyncOutput["newSignalLog"] = null;
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

  // ─── 分析师（多 TF 感知）───
  const activeTFs = Object.keys(indicators).filter((tf) => indicators[tf]?.indicators);
  const defaultInd = indicators[config.defaultTimeframe];
  if (activeTFs.length > 0) {
    const totalCount = activeTFs.reduce((s, tf) => s + Object.keys(indicators[tf]?.indicators ?? {}).length, 0);
    const rsi = defaultInd?.indicators?.["rsi14"]?.["rsi"];
    const atr = defaultInd?.indicators?.["atr14"]?.["atr"];
    const detail = [
      `${activeTFs.length} TF`,
      rsi != null ? `RSI ${rsi.toFixed(1)}` : "",
      atr != null ? `ATR ${atr.toFixed(2)}` : "",
    ].filter(Boolean).join(" | ");
    patches.set(EmployeeRole.ANALYST, {
      status: "working",
      currentTask: `${totalCount} 指标 | ${detail}`,
      stats: { indicators: totalCount, active_tfs: activeTFs.length, rsi: rsi ?? 0, atr: atr ?? 0 },
    });
  } else if (connected) {
    patches.set(EmployeeRole.ANALYST, { status: "thinking", currentTask: "计算指标中...", stats: {} });
  } else {
    patches.set(EmployeeRole.ANALYST, { status: "disconnected", currentTask: "等待后端连接", stats: {} });
  }

  // ─── 策略师（多 TF 感知）───
  const buySignals = signals.filter((s) => s.direction === "buy");
  const sellSignals = signals.filter((s) => s.direction === "sell");
  const signalTFs = [...new Set(signals.map((s) => s.timeframe).filter(Boolean))];
  const latest = signals[0];
  if (latest) {
    const tfSummary = signalTFs.length > 1 ? ` | ${signalTFs.length} TF` : latest.timeframe ? ` | ${latest.timeframe}` : "";
    patches.set(EmployeeRole.STRATEGIST, {
      status: "working",
      currentTask: `${strategies.length} 策略 | ${buySignals.length} 买 ${sellSignals.length} 卖${tfSummary}`,
      stats: {
        total_strategies: strategies.length,
        buy_signals: buySignals.length,
        sell_signals: sellSignals.length,
        signal_tfs: signalTFs.length,
        latest_strategy: latest.strategy,
        latest_timeframe: latest.timeframe,
        latest_confidence: latest.confidence,
      },
    });
    if (latest.signal_id !== lastLoggedSignalId) {
      newSignalLog = {
        role: EmployeeRole.STRATEGIST,
        message: `${latest.timeframe} ${latest.strategy} → ${latest.direction} (${(latest.confidence * 100).toFixed(0)}%)`,
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

  // ─── 实时策略员（SSE 断线时 fallback） ───
  patches.set(EmployeeRole.LIVE_STRATEGIST, {
    status: signals.length > 0 ? "working" : "idle",
    currentTask: signals.length > 0 ? "盘中策略评估中" : "等待盘中快照",
    stats: {},
  });

  // ─── 实时分析员（SSE 断线时 fallback） ───
  patches.set(EmployeeRole.LIVE_ANALYST, {
    status: connected ? "working" : "idle",
    currentTask: connected ? "盘中指标计算中" : "等待连接",
    stats: {},
  });

  // ─── 审核员（SSE 断线时 fallback） ───
  patches.set(EmployeeRole.AUDITOR, {
    status: signals.length > 0 ? "reviewing" : "idle",
    currentTask: signals.length > 0 ? "信号过滤审核中" : "等待指标快照",
    stats: {},
  });

  // ─── 投票主席（多 TF 感知）───
  if (signals.length > 0) {
    const dirs = signals.reduce(
      (acc, s) => { if (s.direction === "buy") acc.buy++; else if (s.direction === "sell") acc.sell++; return acc; },
      { buy: 0, sell: 0 },
    );
    const consensus = dirs.buy > dirs.sell ? "偏多" : dirs.sell > dirs.buy ? "偏空" : "分歧";
    const tfStr = signalTFs.length > 1 ? ` | ${signalTFs.join("/")}` : "";
    patches.set(EmployeeRole.VOTER, {
      status: "working",
      currentTask: `${signals.length} 票 | ${consensus} (${dirs.buy}买/${dirs.sell}卖)${tfStr}`,
      stats: { buy: dirs.buy, sell: dirs.sell, signal_tfs: signalTFs.length },
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
  if (!connected) {
    patches.set(EmployeeRole.CALENDAR_REPORTER, {
      status: "disconnected", currentTask: "后端未连接", stats: {},
    });
  } else if (riskWindows.length > 0) {
    const now = Date.now();
    const highImpact = riskWindows.filter((w) => w.impact === "high");
    const activeGuards = riskWindows.filter((w) => w.guard_active);
    // 找最近的高影响事件
    const nearest = highImpact
      .map((w) => ({ ...w, ms: new Date(w.scheduled_at || w.datetime).getTime() - now }))
      .filter((w) => w.ms > 0)
      .sort((a, b) => a.ms - b.ms)[0];

    let status: ActivityStatus;
    let task: string;

    if (activeGuards.length > 0) {
      // 风险防护已激活 → 警告状态
      status = "warning";
      const guardNames = activeGuards.map((w) => w.event_name).join(", ");
      task = `⚠ 风险防护中: ${guardNames}`;
    } else if (nearest && nearest.ms < 60 * 60_000) {
      // 1 小时内有高影响事件 → 警戒
      const mins = Math.round(nearest.ms / 60_000);
      status = "alert";
      task = `${nearest.event_name} ${mins}分钟后公布`;
    } else if (nearest) {
      // 有高影响事件但较远 → 正常监控
      const hours = Math.round(nearest.ms / 3600_000);
      status = "working";
      task = `监控 ${riskWindows.length} 事件 | 最近: ${nearest.event_name} (${hours}h)`;
    } else {
      status = "working";
      task = `监控 ${riskWindows.length} 经济事件`;
    }

    patches.set(EmployeeRole.CALENDAR_REPORTER, {
      status,
      currentTask: task,
      stats: {
        total_events: riskWindows.length,
        high_impact: highImpact.length,
        active_guards: activeGuards.length,
        nearest_event: nearest?.event_name ?? "",
        nearest_mins: nearest ? Math.round(nearest.ms / 60_000) : -1,
      },
    });
  } else {
    patches.set(EmployeeRole.CALENDAR_REPORTER, {
      status: "working", currentTask: "经济日历无近期事件", stats: { total_events: 0 },
    });
  }

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

  return { patches, newSignalLog };
}

// ─── 入口：从 store 收集输入 → 计算 → 写回 ───

export function syncAll() {
  // SSE 连接时后端直接推送真实状态，跳过推导避免覆盖
  if (_studioSSEActive) return;

  try {
    const { quotes, account, positions, connected } = useMarketStore.getState();
    const { health, strategies, riskWindows, lastLoggedSignalId } = useSignalStore.getState();
    const { indicators, signals, queues } = useLiveStore.getState();

    const input: SyncInput = {
      quote: quotes["XAUUSD"],
      account, positions, connected,
      health, strategies, riskWindows, lastLoggedSignalId,
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
        type: "signal_generated",
        source: output.newSignalLog.role,
        message: output.newSignalLog.message,
        level: output.newSignalLog.type === "success" ? "success" : "info",
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[sync] syncAll error:", err);
  }
}
