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
} from "@/api/mockData";

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
  syncAll();
}

export function usePolling() {
  useEffect(() => {
    // Mock 模式：填充数据后只运行 sync
    if (config.mockMode) {
      initMockMode();
      const syncTimer = setInterval(syncAll, 2_000);
      return () => clearInterval(syncTimer);
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
      } catch {
        useMarketStore.getState().setConnected(false);
      }
    };

    // ─── 健康 & 策略（5s） ───
    const pollHealth = async () => {
      if (cancelled) return;
      try {
        const [healthRes, stratRes] = await Promise.allSettled([
          fetchHealth(),
          fetchStrategies(),
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
    const syncTimer = setInterval(syncAll, 2_000);

    return () => {
      cancelled = true;
      clearInterval(marketTimer);
      clearInterval(healthTimer);
      clearInterval(liveTimer);
      clearInterval(queueTimer);
      clearInterval(syncTimer);
    };
  }, []);
}
