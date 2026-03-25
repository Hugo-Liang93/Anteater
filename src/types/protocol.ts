/**
 * 统一协议类型 — 按 ARCHITECTURE.md / API_CONTRACT.md
 *
 * 前端只消费 StudioAgent 和 StudioEvent，
 * 不直接依赖后端原始结构，由 Mapper 层负责转换。
 */

import type { EmployeeRoleType } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";

// ─── StudioAgent ───

/** 统一的 Agent 协议对象 */
export interface StudioAgent {
  /** 角色 ID */
  role: EmployeeRoleType;
  /** 当前状态 */
  status: ActivityStatus;
  /** 当前任务描述 */
  currentTask: string;
  /** 角色相关指标 */
  metrics: Record<string, number | string>;
  /** 上次更新时间戳 */
  lastUpdate: number;
}

// ─── StudioEvent ───

/** 事件严重级别 */
export type EventSeverity = "info" | "success" | "warning" | "error";

/** 事件类型枚举 */
export type StudioEventType =
  | "signal_generated"
  | "vote_completed"
  | "risk_approved"
  | "risk_rejected"
  | "trade_submitted"
  | "trade_executed"
  | "trade_rejected"
  | "position_opened"
  | "position_closed"
  | "module_error"
  | "module_recovered"
  | "connection_lost"
  | "connection_restored"
  | "calendar_alert"
  | "status_change"
  | "action"; // 通用动作日志

/** 统一的事件协议对象 */
export interface StudioEvent {
  /** 唯一事件 ID */
  id: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件类型 */
  type: StudioEventType;
  /** 来源角色 */
  source: EmployeeRoleType;
  /** 目标角色（可选，用于链路事件） */
  target?: EmployeeRoleType;
  /** 事件消息 */
  message: string;
  /** 严重级别 */
  severity: EventSeverity;
}

// ─── WebSocket Protocol ───

/** WebSocket 消息类型 */
export type WsMessageType =
  | "snapshot"
  | "agent_update"
  | "event_append"
  | "summary_update"
  | "connection_status"
  | "pong";

/** WebSocket 消息 */
export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
  timestamp?: string;
}

/** snapshot 消息载荷 */
export interface SnapshotPayload {
  agents: StudioAgent[];
  events: StudioEvent[];
}

/** agent_update 消息载荷 */
export interface AgentUpdatePayload {
  role: EmployeeRoleType;
  status: ActivityStatus;
  currentTask: string;
  metrics?: Record<string, number | string>;
}

/** event_append 消息载荷 */
export type EventAppendPayload = Omit<StudioEvent, "id">;

/** summary_update 消息载荷 */
export interface SummaryPayload {
  onlineAgents: number;
  alertCount: number;
  pendingSignals: number;
  totalPositions: number;
  equity: number;
}
