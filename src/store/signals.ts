import { create } from "zustand";
import type { HealthStatus, RiskWindow, SignalEvent, StrategyInfo } from "@/api/types";

interface SignalState {
  /** 最近信号事件（按 strategy key） */
  recentSignals: SignalEvent[];
  /** 策略列表 */
  strategies: StrategyInfo[];
  /** 系统健康 */
  health: HealthStatus | null;
  /** 经济日历风险窗口 */
  riskWindows: RiskWindow[];
  /** 上次推送到日志的信号 ID，避免重复 */
  lastLoggedSignalId: string;

  setRecentSignals: (signals: SignalEvent[]) => void;
  pushSignal: (signal: SignalEvent) => void;
  setStrategies: (list: StrategyInfo[]) => void;
  setHealth: (h: HealthStatus) => void;
  setRiskWindows: (windows: RiskWindow[]) => void;
  setLastLoggedSignalId: (id: string) => void;
}

const MAX_RECENT = 200;

export const useSignalStore = create<SignalState>((set) => ({
  recentSignals: [],
  strategies: [],
  health: null,
  riskWindows: [],
  lastLoggedSignalId: "",

  setRecentSignals: (signals) => set({ recentSignals: signals }),
  pushSignal: (signal) =>
    set((s) => ({
      recentSignals: [signal, ...s.recentSignals].slice(0, MAX_RECENT),
    })),
  setStrategies: (strategies) => set({ strategies }),
  setHealth: (health) => set({ health }),
  setRiskWindows: (riskWindows) => set({ riskWindows }),
  setLastLoggedSignalId: (lastLoggedSignalId) => set({ lastLoggedSignalId }),
}));

/** 选择器 */
export const selectStrategies = (s: SignalState) => s.strategies;
export const selectHealth = (s: SignalState) => s.health;
export const selectHealthStatus = (s: SignalState) => s.health?.status ?? "unknown";
export const selectRecentSignals = (s: SignalState) => s.recentSignals;
export const selectRiskWindows = (s: SignalState) => s.riskWindows;
