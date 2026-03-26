/**
 * 实时业务数据 Store
 *
 * 存储指标快照、信号事件、队列状态等后端实时数据，
 * 供 sync 引擎和 UI 面板消费。
 */

import { create } from "zustand";

/** 指标快照（按 timeframe） */
export interface IndicatorData {
  timeframe: string;
  timestamp: string;
  indicators: Record<string, Record<string, number | null>>;
}

/** 信号事件 */
export interface LiveSignal {
  signal_id: string;
  symbol: string;
  timeframe: string;
  strategy: string;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  reason: string;
  scope: string;
  generated_at: string;
}

/** 队列状态 */
export interface QueueInfo {
  name: string;
  size: number;
  max: number;
  utilization_pct: number;
  status: string;
  drops_oldest: number;
  drops_newest: number;
}

interface LiveState {
  /** 指标快照（按 TF） */
  indicators: Record<string, IndicatorData>;
  /** Confirmed 信号 */
  signals: LiveSignal[];
  /** Preview/Armed 信号（intrabar scope） */
  previewSignals: LiveSignal[];
  /** 队列状态 */
  queues: QueueInfo[];
  /** 活跃策略数（在信号中出现的不同策略名） */
  activeStrategies: Set<string>;

  setIndicators: (tf: string, data: IndicatorData) => void;
  setSignals: (signals: LiveSignal[]) => void;
  setPreviewSignals: (signals: LiveSignal[]) => void;
  setQueues: (queues: QueueInfo[]) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  indicators: {},
  signals: [],
  previewSignals: [],
  queues: [],
  activeStrategies: new Set(),

  setIndicators: (tf, data) =>
    set((s) => ({ indicators: { ...s.indicators, [tf]: data } })),

  setSignals: (signals) =>
    set(() => {
      const names = new Set(signals.map((s) => s.strategy));
      return { signals, activeStrategies: names };
    }),

  setPreviewSignals: (previewSignals) => set({ previewSignals }),

  setQueues: (queues) => set({ queues }),
}));

/** 选择器 */
export const selectIndicatorsByTF = (tf: string) =>
  (s: LiveState) => s.indicators[tf];
export const selectSignals = (s: LiveState) => s.signals;
export const selectQueues = (s: LiveState) => s.queues;
export const selectQueueUtilization = (s: LiveState) =>
  s.queues.length > 0
    ? s.queues.reduce((sum, q) => sum + q.utilization_pct, 0) / s.queues.length
    : 0;
