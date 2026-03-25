/**
 * WebSocket 消息处理器 — 按 ARCHITECTURE.md 的 Services 层
 *
 * 接收 WS 消息并分发到对应的 Store，
 * 实现 Backend → Mapper → Store 的单向数据流。
 */

import type {
  WsMessage,
  AgentUpdatePayload,
  EventAppendPayload,
  SnapshotPayload,
  SummaryPayload,
} from "@/types/protocol";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useMarketStore } from "@/store/market";
import type { EmployeeRoleType } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";

/** 处理 WebSocket 消息并分发到 Store */
export function handleWsMessage(msg: WsMessage): void {
  switch (msg.type) {
    case "snapshot":
      handleSnapshot(msg.payload as SnapshotPayload);
      break;
    case "agent_update":
      handleAgentUpdate(msg.payload as AgentUpdatePayload);
      break;
    case "event_append":
      handleEventAppend(msg.payload as EventAppendPayload);
      break;
    case "summary_update":
      handleSummaryUpdate(msg.payload as SummaryPayload);
      break;
    case "connection_status":
      handleConnectionStatus(msg.payload as { connected: boolean });
      break;
  }
}

function handleSnapshot(payload: SnapshotPayload): void {
  const empStore = useEmployeeStore.getState();
  const evtStore = useEventStore.getState();

  // 更新所有 agent 状态
  for (const agent of payload.agents) {
    empStore.updateEmployee(agent.role, {
      status: agent.status,
      currentTask: agent.currentTask,
      stats: agent.metrics,
    });
  }

  // 加载历史事件
  for (const event of payload.events) {
    evtStore.appendEvent(event);
  }
}

function handleAgentUpdate(payload: AgentUpdatePayload): void {
  useEmployeeStore.getState().updateEmployee(
    payload.role as EmployeeRoleType,
    {
      status: payload.status as ActivityStatus,
      currentTask: payload.currentTask,
      stats: payload.metrics ?? {},
    },
  );
}

function handleEventAppend(payload: EventAppendPayload): void {
  useEventStore.getState().appendEvent(payload);
}

function handleSummaryUpdate(payload: SummaryPayload): void {
  // 将汇总数据写入 market store 的连接状态
  useMarketStore.getState().setConnected(payload.onlineAgents > 0);
}

function handleConnectionStatus(payload: { connected: boolean }): void {
  useMarketStore.getState().setConnected(payload.connected);
}
