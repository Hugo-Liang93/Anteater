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

  setSignals: (raw) =>
    set((s) => {
      // 每个 (strategy, timeframe) 只保留最新一条，去除历史流水重复
      const signals = dedupeLatest(raw);
      // 跳过无实质变化的更新：长度相同且首条 signal_id 一致
      const first = signals[0];
      const prevFirst = s.signals[0];
      if (
        signals.length === s.signals.length &&
        first != null && prevFirst != null &&
        first.signal_id === prevFirst.signal_id
      ) {
        return s;
      }
      const names = new Set(signals.map((sig) => sig.strategy));
      return { signals, activeStrategies: names };
    }),

  setPreviewSignals: (raw) =>
    set((s) => {
      const previewSignals = dedupeLatest(raw);
      const first = previewSignals[0];
      const prevFirst = s.previewSignals[0];
      if (
        previewSignals.length === s.previewSignals.length &&
        first != null && prevFirst != null &&
        first.signal_id === prevFirst.signal_id
      ) {
        return s;
      }
      return { previewSignals };
    }),

  setQueues: (queues) => set({ queues }),
}));

/**
 * 对每个 (strategy, timeframe) 只保留 generated_at 最新的一条。
 * 后端 /signals/recent 返回的是历史流水（每次 bar close 每个策略都产生一条），
 * 前端只需要展示每个策略当前的最新判断。
 */
function dedupeLatest(signals: LiveSignal[]): LiveSignal[] {
  const map = new Map<string, LiveSignal>();
  for (const s of signals) {
    const key = `${s.strategy}__${s.timeframe}`;
    const existing = map.get(key);
    if (!existing || s.generated_at > existing.generated_at) {
      map.set(key, s);
    }
  }
  return [...map.values()].sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

/** 选择器 */
export const selectIndicatorsByTF = (tf: string) =>
  (s: LiveState) => s.indicators[tf];
export const selectSignals = (s: LiveState) => s.signals;
export const selectQueues = (s: LiveState) => s.queues;
export const selectQueueUtilization = (s: LiveState) =>
  s.queues.length > 0
    ? s.queues.reduce((sum, q) => sum + q.utilization_pct, 0) / s.queues.length
    : 0;
