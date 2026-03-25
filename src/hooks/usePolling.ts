import { useEffect } from "react";
import { config } from "@/config";
import {
  fetchAccountInfo,
  fetchHealth,
  fetchIndicators,
  fetchPositions,
  fetchQueues,
  fetchQuote,
  fetchRecentSignals,
  fetchRiskWindows,
  fetchStrategies,
} from "@/api/endpoints";
import {
  normalizeQuote,
  normalizeAccount,
  normalizeHealth,
  normalizeStrategies,
  normalizePositions,
} from "@/api/adapters";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useLiveStore, type LiveSignal, type QueueInfo } from "@/store/live";
import { syncAll } from "@/engine/sync";
import {
  MOCK_QUOTE, MOCK_ACCOUNT, MOCK_POSITIONS, MOCK_HEALTH,
  MOCK_STRATEGIES, MOCK_INDICATORS, MOCK_SIGNALS, MOCK_QUEUES,
  MOCK_RISK_WINDOWS,
} from "@/api/mockData";
import { useEventStore } from "@/store/events";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";
import type { EmployeeRoleType } from "@/config/employees";
import type { StudioEventType, EventLevel } from "@/types/protocol";

/** Mock 事件模板 — 模拟真实交易链路事件 */
const MOCK_EVENT_TEMPLATES: {
  source: EmployeeRoleType;
  type: StudioEventType;
  level: EventLevel;
  message: string;
  status: ActivityStatus;
  task: string;
}[] = [
  { source: "collector",        type: "status_change",     level: "info",    message: "XAUUSD 行情刷新 bid=2345.67",              status: "working",  task: "采集 XAUUSD M5 K线" },
  { source: "analyst",          type: "status_change",     level: "info",    message: "指标计算完成: RSI=58.3, ATR=12.45",        status: "working",  task: "计算技术指标" },
  { source: "strategist",       type: "signal_generated",  level: "success", message: "MA_Cross 产生 BUY 信号 (置信度 0.78)",     status: "signal_ready", task: "策略信号生成" },
  { source: "voter",            type: "vote_completed",    level: "info",    message: "投票结果: 2 BUY / 1 HOLD → 方向 BUY",      status: "judging",  task: "多策略投票" },
  { source: "risk_officer",     type: "risk_approved",     level: "success", message: "风控通过: 仓位 0.1 手在限额内",             status: "approved",  task: "风控审核" },
  { source: "trader",           type: "trade_executed",    level: "success", message: "XAUUSD BUY 0.1 手 @ 2345.67 已成交",       status: "executed",  task: "执行交易" },
  { source: "position_manager", type: "status_change",     level: "info",    message: "持仓更新: 2 笔活跃仓位, 净利 $622.50",     status: "working",  task: "持仓监控" },
  { source: "accountant",       type: "status_change",     level: "info",    message: "账户快照: 余额 $50,000 净值 $51,234",      status: "working",  task: "账户记录" },
  { source: "calendar_reporter",type: "calendar_alert",    level: "warning", message: "⚠ 20:30 非农就业数据即将公布",              status: "warning",  task: "日历监控" },
  { source: "inspector",        type: "status_change",     level: "info",    message: "巡检正常: 全部 7 组件健康",                 status: "working",  task: "系统巡检" },
  { source: "risk_officer",     type: "risk_rejected",     level: "error",   message: "风控拦截: 日内亏损接近限额 (-$480)",        status: "rejected", task: "风控拦截" },
  { source: "collector",        type: "module_error",      level: "error",   message: "MT5 连接中断，尝试重连...",                  status: "error",    task: "MT5 重连" },
  { source: "collector",        type: "module_recovered",  level: "success", message: "MT5 连接已恢复",                             status: "working",  task: "采集 XAUUSD 行情" },
];

let mockEventSeq = 0;
let mockTemplateIdx = 0;

/** 生成一条模拟事件并更新角色状态 */
function emitMockEvent() {
  const tpl = MOCK_EVENT_TEMPLATES[mockTemplateIdx % MOCK_EVENT_TEMPLATES.length]!;
  mockTemplateIdx++;

  useEventStore.getState().appendEvent({
    eventId: `mock-evt-${++mockEventSeq}`,
    type: tpl.type,
    source: tpl.source,
    level: tpl.level,
    message: tpl.message,
    symbol: "XAUUSD",
    createdAt: new Date().toISOString(),
  });

  useEmployeeStore.getState().updateEmployee(tpl.source, {
    status: tpl.status,
    currentTask: tpl.task,
  });
}

/** Mock 模式：填充模拟数据并定期 sync */
function initMockMode() {
  useMarketStore.getState().setQuote(config.symbols[0], MOCK_QUOTE);
  useMarketStore.getState().setAccount(MOCK_ACCOUNT);
  useMarketStore.getState().setPositions(MOCK_POSITIONS);
  useMarketStore.getState().setConnected(true);
  useSignalStore.getState().setHealth(MOCK_HEALTH);
  useSignalStore.getState().setStrategies(MOCK_STRATEGIES);
  useLiveStore.getState().setIndicators("M5", {
    timeframe: "M5",
    timestamp: new Date().toISOString(),
    indicators: MOCK_INDICATORS,
  });
  useLiveStore.getState().setSignals(MOCK_SIGNALS);
  useLiveStore.getState().setQueues(MOCK_QUEUES);
  useSignalStore.getState().setRiskWindows(MOCK_RISK_WINDOWS);

  // 初始注入 3 条事件
  emitMockEvent();
  emitMockEvent();
  emitMockEvent();

  syncAll();
}

export function usePolling() {
  useEffect(() => {
    // Mock 模式：填充数据 + 定期生成事件
    if (config.mockMode) {
      initMockMode();
      // 每 3-6 秒生成一条模拟事件并同步（不再需要独立 sync 定时器）
      const eventTimer = setInterval(() => {
        emitMockEvent();
        syncAll();
      }, 3_000 + Math.random() * 3_000);
      return () => {
        clearInterval(eventTimer);
      };
    }

    let cancelled = false;

    // ─── 行情 & 账户（5s） ───
    const pollMarket = async () => {
      if (cancelled) return;
      try {
        const [quoteRes, accountRes, posRes] = await Promise.allSettled([
          fetchQuote(config.symbols[0]),
          fetchAccountInfo(),
          fetchPositions(),
        ]);

        if (cancelled) return;

        if (quoteRes.status === "fulfilled" && quoteRes.value.success) {
          const quote = normalizeQuote(quoteRes.value);
          if (quote) useMarketStore.getState().setQuote(config.symbols[0], quote);
        }
        if (accountRes.status === "fulfilled" && accountRes.value.success) {
          const account = normalizeAccount(accountRes.value);
          if (account) useMarketStore.getState().setAccount(account);
        }
        if (posRes.status === "fulfilled" && posRes.value.success) {
          const positions = normalizePositions(posRes.value);
          useMarketStore.getState().setPositions(positions);
        }

        const anySuccess = [quoteRes, accountRes, posRes].some(
          (r) => r.status === "fulfilled" && r.value.success,
        );
        useMarketStore.getState().setConnected(anySuccess);
        syncAll();
      } catch {
        useMarketStore.getState().setConnected(false);
      }
    };

    // ─── 健康 & 策略 & 经济日历（5s） ───
    const pollHealth = async () => {
      if (cancelled) return;
      try {
        const [healthRes, stratRes, calRes] = await Promise.allSettled([
          fetchHealth(),
          fetchStrategies(),
          fetchRiskWindows(),
        ]);

        if (cancelled) return;

        if (healthRes.status === "fulfilled") {
          const health = normalizeHealth(healthRes.value);
          if (health) useSignalStore.getState().setHealth(health);
        }
        if (stratRes.status === "fulfilled" && stratRes.value.success) {
          const strats = normalizeStrategies(stratRes.value);
          useSignalStore.getState().setStrategies(strats);
        }
        if (calRes.status === "fulfilled" && calRes.value.success) {
          const raw = calRes.value.data;
          if (Array.isArray(raw)) {
            useSignalStore.getState().setRiskWindows(
              raw.map((w: Record<string, unknown>) => ({
                event_name: String(w.event_name ?? ""),
                currency: String(w.currency ?? ""),
                impact: (["high", "medium", "low"].includes(w.impact as string)
                  ? w.impact : "low") as "high" | "medium" | "low",
                datetime: String(w.datetime ?? ""),
                guard_active: Boolean(w.guard_active),
              })),
            );
          }
        }
        syncAll();
      } catch { /* best effort */ }
    };

    // ─── 指标 & 信号（3s） ───
    const pollLive = async () => {
      if (cancelled) return;
      try {
        const [indRes, sigRes] = await Promise.allSettled([
          fetchIndicators(config.symbols[0], "M5"),
          fetchRecentSignals(config.symbols[0], "M5"),
        ]);

        if (cancelled) return;

        if (indRes.status === "fulfilled" && indRes.value.success && indRes.value.data) {
          const raw = indRes.value.data as unknown;
          if (raw && typeof raw === "object") {
            useLiveStore.getState().setIndicators("M5", {
              timeframe: "M5",
              timestamp: new Date().toISOString(),
              indicators: raw as Record<string, Record<string, number | null>>,
            });
          }
        }

        if (sigRes.status === "fulfilled" && sigRes.value.success) {
          const rawSignals = sigRes.value.data;
          if (Array.isArray(rawSignals)) {
            const signals: LiveSignal[] = rawSignals.map((s: Record<string, unknown>) => ({
              signal_id: String(s.signal_id ?? ""),
              symbol: String(s.symbol ?? ""),
              timeframe: String(s.timeframe ?? ""),
              strategy: String(s.strategy ?? ""),
              direction: (["buy", "sell", "hold"].includes(s.direction as string)
                ? s.direction
                : "hold") as "buy" | "sell" | "hold",
              confidence: Number(s.confidence ?? 0),
              reason: String(s.reason ?? ""),
              scope: String(s.scope ?? ""),
              generated_at: String(s.generated_at ?? ""),
            }));
            useLiveStore.getState().setSignals(signals);
          }
        }
        syncAll();
      } catch { /* best effort */ }
    };

    // ─── 队列（10s） ───
    const pollQueues = async () => {
      if (cancelled) return;
      try {
        const res = await fetchQueues();
        if (cancelled) return;
        if (res.success && res.data != null) {
          const raw = res.data as unknown;
          const rawObj = (typeof raw === "object" && raw !== null) ? raw as Record<string, unknown> : null;
          const queuesSource = rawObj && "queues" in rawObj && typeof rawObj.queues === "object" && rawObj.queues !== null
            ? rawObj.queues as Record<string, Record<string, unknown>>
            : rawObj as Record<string, Record<string, unknown>> | null;
          const queuesObj = queuesSource;
          if (queuesObj) {
            const list: QueueInfo[] = Object.entries(queuesObj).map(([name, q]) => ({
              name,
              size: Number(q.size ?? 0),
              max: Number(q.max ?? 0),
              utilization_pct: Number(q.utilization_pct ?? 0),
              status: String(q.status ?? "unknown"),
              drops_oldest: Number(q.drops_oldest ?? 0),
              drops_newest: Number(q.drops_newest ?? 0),
            }));
            useLiveStore.getState().setQueues(list);
          }
        }
        syncAll();
      } catch { /* best effort */ }
    };

    // 首次立即拉取
    void pollMarket();
    void pollHealth();
    void pollLive();
    void pollQueues();

    const marketTimer = setInterval(() => void pollMarket(), config.polling.account);
    const healthTimer = setInterval(() => void pollHealth(), config.polling.health);
    const liveTimer = setInterval(() => void pollLive(), config.polling.signals);
    const queueTimer = setInterval(() => void pollQueues(), 10_000);
    // syncAll 现在在每个 poll 完成后触发，不再需要独立定时器

    return () => {
      cancelled = true;
      clearInterval(marketTimer);
      clearInterval(healthTimer);
      clearInterval(liveTimer);
      clearInterval(queueTimer);
    };
  }, []);
}
