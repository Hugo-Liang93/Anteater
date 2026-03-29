/**
 * WebSocket 消息处理器 — 对齐 API_CONTRACT.md
 *
 * 使用 studioAdapters 安全解析所有 payload，
 * 不使用 unsafe `as` 类型断言。
 */

import type { WsMessage } from "@/types/protocol";
import {
  normalizeStudioAgent,
  normalizeStudioAgents,
  normalizeStudioEvent,
  normalizeStudioEvents,
  normalizeSummary,
  normalizeConnectionStatus,
} from "@/api/studioAdapters";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useMarketStore } from "@/store/market";
import type { EmployeeRoleType } from "@/config/employees";

/** 处理 WebSocket 消息并安全分发到 Store */
export function handleWsMessage(msg: WsMessage): void {
  switch (msg.type) {
    case "snapshot":
      handleSnapshot(msg.payload);
      break;
    case "agent_update":
      handleAgentUpdate(msg.payload);
      break;
    case "event_append":
      handleEventAppend(msg.payload);
      break;
    case "summary_update":
      handleSummaryUpdate(msg.payload);
      break;
    case "connection_status":
      handleConnectionStatus(msg.payload);
      break;
    // unknown types silently ignored (API_CONTRACT Section 8)
  }
}

function handleSnapshot(payload: unknown): void {
  if (payload == null || typeof payload !== "object") return;
  const raw = payload as Record<string, unknown>;

  // 安全解析 agents — 批量写入，避免 N 次 setState
  const agents = normalizeStudioAgents(raw.agents);
  if (agents.length > 0) {
    useEmployeeStore.setState((s) => {
      const updated = { ...s.employees };
      for (const agent of agents) {
        const role = agent.id as EmployeeRoleType;
        if (updated[role]) {
          updated[role] = {
            ...updated[role],
            status: agent.status,
            currentTask: agent.task,
            stats: agent.metrics ?? {},
            lastUpdate: Date.now(),
          };
        }
      }
      return { employees: updated };
    });
  }

  // 安全解析 events — 批量写入，避免 N 次 setState
  const events = normalizeStudioEvents(raw.events);
  if (events.length > 0) {
    useEventStore.setState((s) => {
      const incoming: import("@/types/protocol").StudioEvent[] = events.map((e) => ({
        eventId: e.eventId,
        type: e.type,
        source: e.source,
        target: e.target,
        symbol: e.symbol,
        level: e.level,
        message: e.message,
        createdAt: e.createdAt,
      }));
      const merged = [...incoming.reverse(), ...s.events];
      return { events: merged.slice(0, 200) };
    });
  }

  // 安全解析 summary
  if (raw.summary != null) {
    const summary = normalizeSummary(raw.summary);
    useMarketStore.getState().setConnected(summary.activeAgents > 0);
  }
}

function handleAgentUpdate(payload: unknown): void {
  const agent = normalizeStudioAgent(payload);
  if (!agent) return;

  useEmployeeStore.getState().updateEmployee(agent.id as EmployeeRoleType, {
    status: agent.status,
    currentTask: agent.task,
    stats: agent.metrics ?? {},
  });
}

function handleEventAppend(payload: unknown): void {
  const event = normalizeStudioEvent(payload);
  if (!event) return;

  useEventStore.getState().appendEvent({
    eventId: event.eventId,
    type: event.type,
    source: event.source,
    target: event.target,
    symbol: event.symbol,
    level: event.level,
    message: event.message,
    createdAt: event.createdAt,
  });
}

function handleSummaryUpdate(payload: unknown): void {
  const summary = normalizeSummary(payload);
  useMarketStore.getState().setConnected(summary.activeAgents > 0);
}

function handleConnectionStatus(payload: unknown): void {
  const status = normalizeConnectionStatus(payload);
  useMarketStore.getState().setConnected(status.backendConnected);
}
