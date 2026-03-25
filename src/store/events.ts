/**
 * 全局事件 Store — 对齐 API_CONTRACT + ARCHITECTURE.md
 *
 * 统一聚合所有系统事件，使用 StudioEvent 协议对象。
 */

import { create } from "zustand";
import type { StudioEvent } from "@/types/protocol";

const MAX_EVENTS = 200;
let eventSeq = 0;

interface EventStore {
  /** 全局事件列表（最新在前） */
  events: StudioEvent[];

  /** 追加事件（接受完整 StudioEvent 或不含 eventId 的新事件） */
  appendEvent: (event: StudioEvent | Omit<StudioEvent, "eventId">) => void;

  /** 清空所有事件 */
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],

  appendEvent: (event) =>
    set((s) => {
      const newEvent: StudioEvent = "eventId" in event
        ? event
        : { ...event, eventId: `evt-${++eventSeq}` };
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
