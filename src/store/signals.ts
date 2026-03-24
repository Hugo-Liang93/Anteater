import { create } from "zustand";
import type { HealthStatus, SignalEvent, StrategyInfo } from "@/api/types";

interface SignalState {
  /** 最近信号事件（按 strategy key） */
  recentSignals: SignalEvent[];
  /** 策略列表 */
  strategies: StrategyInfo[];
  /** 系统健康 */
  health: HealthStatus | null;

  setRecentSignals: (signals: SignalEvent[]) => void;
  pushSignal: (signal: SignalEvent) => void;
  setStrategies: (list: StrategyInfo[]) => void;
  setHealth: (h: HealthStatus) => void;
}

const MAX_RECENT = 200;

export const useSignalStore = create<SignalState>((set) => ({
  recentSignals: [],
  strategies: [],
  health: null,

  setRecentSignals: (signals) => set({ recentSignals: signals }),
  pushSignal: (signal) =>
    set((s) => ({
      recentSignals: [signal, ...s.recentSignals].slice(0, MAX_RECENT),
    })),
  setStrategies: (strategies) => set({ strategies }),
  setHealth: (health) => set({ health }),
}));
