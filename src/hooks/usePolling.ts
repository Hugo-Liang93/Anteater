import { useEffect, useRef } from "react";
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

export function usePolling() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // ─── 行情 & 账户（5s） ───
    const pollMarket = async () => {
      try {
        const [quoteRes, accountRes, posRes] = await Promise.allSettled([
          fetchQuote(config.symbols[0]),
          fetchAccountInfo(),
          fetchPositions(),
        ]);

        if (quoteRes.status === "fulfilled" && quoteRes.value.success) {
          const quote = normalizeQuote(quoteRes.value as never);
          if (quote) useMarketStore.getState().setQuote(config.symbols[0], quote);
        }
        if (accountRes.status === "fulfilled" && accountRes.value.success) {
          const account = normalizeAccount(accountRes.value as never);
          if (account) useMarketStore.getState().setAccount(account);
        }
        if (posRes.status === "fulfilled" && posRes.value.success) {
          const positions = normalizePositions(posRes.value as never);
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
      try {
        const [healthRes, stratRes] = await Promise.allSettled([
          fetchHealth(),
          fetchStrategies(),
        ]);

        if (healthRes.status === "fulfilled") {
          const health = normalizeHealth(healthRes.value);
          if (health) useSignalStore.getState().setHealth(health);
        }
        if (stratRes.status === "fulfilled" && stratRes.value.success) {
          const strats = normalizeStrategies(stratRes.value as never);
          useSignalStore.getState().setStrategies(strats);
        }
      } catch { /* best effort */ }
    };

    // ─── 指标 & 信号（3s） ───
    const pollLive = async () => {
      try {
        const [indRes, sigRes] = await Promise.allSettled([
          fetchIndicators(config.symbols[0], "M5"),
          fetchRecentSignals(config.symbols[0], "M5"),
        ]);

        if (indRes.status === "fulfilled" && indRes.value.success && indRes.value.data) {
          const raw = indRes.value.data as unknown as Record<string, unknown>;
          useLiveStore.getState().setIndicators("M5", {
            timeframe: "M5",
            timestamp: new Date().toISOString(),
            indicators: raw as Record<string, Record<string, number | null>>,
          });
        }

        if (sigRes.status === "fulfilled" && sigRes.value.success) {
          const rawSignals = sigRes.value.data;
          if (Array.isArray(rawSignals)) {
            const signals: LiveSignal[] = rawSignals.map((s: Record<string, unknown>) => ({
              signal_id: (s.signal_id as string) ?? "",
              symbol: (s.symbol as string) ?? "",
              timeframe: (s.timeframe as string) ?? "",
              strategy: (s.strategy as string) ?? "",
              direction: (s.direction as "buy" | "sell" | "hold") ?? "hold",
              confidence: (s.confidence as number) ?? 0,
              reason: (s.reason as string) ?? "",
              scope: (s.scope as string) ?? "",
              generated_at: (s.generated_at as string) ?? "",
            }));
            useLiveStore.getState().setSignals(signals);
          }
        }
      } catch { /* best effort */ }
    };

    // ─── 队列（10s） ───
    const pollQueues = async () => {
      try {
        const res = await fetchQueues();
        if (res.success && res.data) {
          const raw = res.data as unknown as Record<string, unknown>;
          const queuesObj = (raw.queues ?? raw) as Record<string, Record<string, unknown>>;
          const list: QueueInfo[] = Object.entries(queuesObj).map(([name, q]) => ({
            name,
            size: (q.size as number) ?? 0,
            max: (q.max as number) ?? 0,
            utilization_pct: (q.utilization_pct as number) ?? 0,
            status: (q.status as string) ?? "unknown",
            drops_oldest: (q.drops_oldest as number) ?? 0,
            drops_newest: (q.drops_newest as number) ?? 0,
          }));
          useLiveStore.getState().setQueues(list);
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
      clearInterval(marketTimer);
      clearInterval(healthTimer);
      clearInterval(liveTimer);
      clearInterval(queueTimer);
      clearInterval(syncTimer);
      started.current = false;
    };
  }, []);
}
