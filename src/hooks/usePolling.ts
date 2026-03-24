import { useEffect, useRef } from "react";
import { config } from "@/config";
import {
  fetchAccountInfo,
  fetchHealth,
  fetchPositions,
  fetchQuote,
  fetchStrategies,
} from "@/api/endpoints";
import { normalizeQuote, normalizeAccount, normalizeHealth, normalizeStrategies, normalizePositions } from "@/api/adapters";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { syncAll } from "@/engine/sync";

/**
 * 后台轮询 hook — 挂载后自动开始轮询 MT5Services API，
 * 将数据写入 Zustand store，再通过 syncAll() 映射到员工状态。
 */
export function usePolling() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // ─── 行情 & 账户 ───
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
        // 任何一个请求成功返回即视为已连接
        const anySuccess = [quoteRes, accountRes, posRes].some(
          (r) => r.status === "fulfilled" && r.value.success,
        );
        useMarketStore.getState().setConnected(anySuccess);
      } catch {
        useMarketStore.getState().setConnected(false);
      }
    };

    // ─── 健康 & 策略 ───
    const pollSignals = async () => {
      try {
        const [healthRes, stratRes] = await Promise.allSettled([
          fetchHealth(),
          fetchStrategies(),
        ]);

        if (healthRes.status === "fulfilled") {
          // /monitoring/health 返回裸对象（无 ApiResponse 包装）
          const health = normalizeHealth(healthRes.value);
          if (health) useSignalStore.getState().setHealth(health);
        }
        if (stratRes.status === "fulfilled" && stratRes.value.success) {
          const strats = normalizeStrategies(stratRes.value as never);
          useSignalStore.getState().setStrategies(strats);
        }
      } catch {
        /* best effort */
      }
    };

    // 首次立即拉取
    void pollMarket();
    void pollSignals();

    const marketTimer = setInterval(() => {
      void pollMarket();
    }, config.polling.account);
    const signalTimer = setInterval(() => {
      void pollSignals();
    }, config.polling.signals);

    // 同步引擎：以较低频率将 store 数据映射到员工状态
    const syncTimer = setInterval(syncAll, 2_000);

    return () => {
      clearInterval(marketTimer);
      clearInterval(signalTimer);
      clearInterval(syncTimer);
      started.current = false;
    };
  }, []);
}
