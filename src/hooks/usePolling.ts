import { useEffect } from "react";
import { config } from "@/config";
import {
  fetchAccountInfo,
  fetchHealth,
  fetchIndicators,
  fetchOhlc,
  fetchPositions,
  fetchQueues,
  fetchQuote,
  fetchRecentSignals,
  fetchRiskWindows,
  fetchStrategies,
  fetchCalendarEnriched,
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
import { syncAll, isStudioSSEActive } from "@/engine/sync";
import type { RiskWindow } from "@/api/types";

export function usePolling() {
  useEffect(() => {
    if (config.mockMode) return; // Mock 模式不轮询

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

        // 需要行情+账户都成功才算真正连接
        const quoteOk = quoteRes.status === "fulfilled" && quoteRes.value.success;
        const accountOk = accountRes.status === "fulfilled" && accountRes.value.success;
        useMarketStore.getState().setConnected(quoteOk && accountOk);
        if (!isStudioSSEActive()) syncAll();
      } catch {
        useMarketStore.getState().setConnected(false);
      }
    };

    // ─── 健康 & 经济日历（5s） + 策略列表（60s，几乎不变）───
    let lastStrategyFetch = 0;
    const STRATEGY_INTERVAL = 60_000;
    const pollHealth = async () => {
      if (cancelled) return;
      try {
        const now = Date.now();
        const needStrategies = now - lastStrategyFetch >= STRATEGY_INTERVAL;
        const [healthRes, stratRes, calRes, enrichedRes] = await Promise.allSettled([
          fetchHealth(),
          needStrategies ? fetchStrategies() : Promise.resolve(null),
          fetchRiskWindows(),
          fetchCalendarEnriched(48, 2),
        ]);

        if (cancelled) return;

        if (healthRes.status === "fulfilled") {
          const health = normalizeHealth(healthRes.value);
          if (health) useSignalStore.getState().setHealth(health);
        }
        if (
          needStrategies &&
          stratRes.status === "fulfilled" &&
          stratRes.value?.success
        ) {
          const strats = normalizeStrategies(stratRes.value);
          useSignalStore.getState().setStrategies(strats);
          lastStrategyFetch = now;
        }
        if (calRes.status === "fulfilled" && calRes.value.success) {
          const raw = calRes.value.data;
          if (Array.isArray(raw)) {
            useSignalStore.getState().setRiskWindows(
              raw.map((w: RiskWindow) => {
                const importance = Number(w.importance ?? 1);
                const impact: "high" | "medium" | "low" =
                  importance >= 3 ? "high" : importance >= 2 ? "medium" : "low";
                const scheduledAt = String(w.scheduled_at ?? "");
                const now = Date.now();
                const windowStart = String(w.window_start ?? "");
                const windowEnd = String(w.window_end ?? "");
                const guardActive = windowStart && windowEnd
                  ? now >= new Date(windowStart).getTime() && now <= new Date(windowEnd).getTime()
                  : false;
                return {
                  event_uid: String(w.event_uid ?? ""),
                  event_name: String(w.event_name ?? ""),
                  source: String(w.source ?? ""),
                  country: String(w.country ?? ""),
                  currency: String(w.currency ?? ""),
                  importance,
                  impact,
                  session_bucket: String(w.session_bucket ?? ""),
                  window_start: windowStart,
                  window_end: windowEnd,
                  scheduled_at: scheduledAt,
                  scheduled_at_local: String(w.scheduled_at_local ?? ""),
                  datetime: scheduledAt,
                  guard_active: guardActive,
                };
              }),
            );
          }
        }
        if (enrichedRes.status === "fulfilled" && enrichedRes.value.success) {
          const enriched = enrichedRes.value.data;
          if (Array.isArray(enriched)) {
            useSignalStore.getState().setCalendarEvents(enriched);
          }
        }
        if (!isStudioSSEActive()) syncAll();
      } catch { /* best effort */ }
    };

    // ─── 指标 & 信号（3s） ───
    // 指标：拉取所有配置的 TF；信号：不传 TF 拉取全部
    const INDICATOR_TFS = config.timeframes;
    const STATUS_TF = config.defaultTimeframe;
    const pollLive = async () => {
      if (cancelled) return;
      try {
        const indPromises = INDICATOR_TFS.map((tf) =>
          fetchIndicators(config.symbols[0], tf).then((res) => ({ tf, res })),
        );
        const [sigRes, latestOhlcRes, ...indResults] = await Promise.allSettled([
          fetchRecentSignals(config.symbols[0], undefined, "all"),
          fetchOhlc(config.symbols[0], STATUS_TF, 1),
          ...indPromises,
        ]);

        if (cancelled) return;

        // 指标：按 TF 写入 store
        if (latestOhlcRes.status === "fulfilled" && latestOhlcRes.value.success) {
          const bars = latestOhlcRes.value.data;
          const latestBar = Array.isArray(bars) ? bars[bars.length - 1] : null;
          if (latestBar) {
            useMarketStore.getState().setLatestOhlcBar(
              config.symbols[0],
              STATUS_TF,
              latestBar,
            );
          }
        }

        const store = useLiveStore.getState();
        for (const result of indResults) {
          if (result.status === "fulfilled") {
            const { tf, res } = result.value as { tf: string; res: { success: boolean; data: unknown } };
            if (res.success && res.data && typeof res.data === "object") {
              store.setIndicators(tf, {
                timeframe: tf,
                timestamp: new Date().toISOString(),
                indicators: res.data as Record<string, Record<string, number | null>>,
              });
            }
          }
        }

        // 信号：scope=all → 按 scope 拆分 + 按配置的 TF 过滤
        if (sigRes.status === "fulfilled") {
          const sigValue = sigRes.value as { success: boolean; data: unknown };
          if (sigValue.success) {
            const rawSignals = sigValue.data;
            if (Array.isArray(rawSignals)) {
              const validTFs = new Set<string>(config.timeframes);
              const allSignals: LiveSignal[] = rawSignals
                .map((s: Record<string, unknown>) => ({
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
                }))
                .filter((s) => validTFs.has(s.timeframe));
              store.setSignals(allSignals.filter((s) => s.scope === "confirmed"));
              store.setPreviewSignals(allSignals.filter((s) => s.scope !== "confirmed"));
            }
          }
        }
        if (!isStudioSSEActive()) syncAll();
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
        if (!isStudioSSEActive()) syncAll();
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
