/**
 * 全局事件 Store — 按 ARCHITECTURE.md 要求
 *
 * 统一聚合所有系统事件（信号、状态变更、告警、交易），
 * 供 BottomEventFeed 和未来的事件回放功能消费。
 */

import { create } from "zustand";
import type { StudioEvent } from "@/types/protocol";

const MAX_EVENTS = 200;
let eventSeq = 0;

interface EventStore {
  /** 全局事件列表（最新在前） */
  events: StudioEvent[];

  /** 追加事件 */
  appendEvent: (event: Omit<StudioEvent, "id">) => void;

  /** 清空所有事件 */
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],

  appendEvent: (event) =>
    set((s) => {
      const newEvent: StudioEvent = { ...event, id: `evt-${++eventSeq}` };
      const events = s.events.length >= MAX_EVENTS
        ? [newEvent, ...s.events.slice(0, MAX_EVENTS - 1)]
        : [newEvent, ...s.events];
      return { events };
    }),

  clearEvents: () => set({ events: [] }),
}));

/** 选择最近 N 条事件 */
export const selectRecentEvents = (n: number) =>
  (s: EventStore) => s.events.slice(0, n);
