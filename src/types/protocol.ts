/**
 * 统一协议类型 — 严格对齐 API_CONTRACT.md
 *
 * 前端只消费 StudioAgent 和 StudioEvent，
 * 不直接依赖后端原始结构，由 Mapper 层负责转换。
 */

import type { ActivityStatus } from "@/store/employees";

// ─── StudioAgent — 对齐 API_CONTRACT Section 2.1 ───

/** 告警级别 */
export type AlertLevel = "none" | "info" | "warning" | "error";

/** 统一的 Agent 协议对象 */
export interface StudioAgent {
  /** 角色 ID（对应后端 agent id 字符串，前端映射到 EmployeeRoleType） */
  id: string;
  /** 角色显示名 */
  name: string;
  /** 对应后端模块 */
  module: string;
  /** 工作区域 */
  zone: string;
  /** 当前状态 */
  status: ActivityStatus;
  /** 当前任务描述 */
  task: string;
  /** 关联品种 */
  symbol?: string;
  /** 角色相关指标 */
  metrics?: Record<string, string | number | boolean | null>;
  /** 告警级别 */
  alertLevel?: AlertLevel;
  /** 上次更新时间 (ISO 8601) */
  updatedAt: string;
}

// ─── StudioEvent — 对齐 API_CONTRACT Section 2.2 ───

/** 事件级别 — 合约定义 info|warning|error，扩展 success 用于前端展示 */
export type EventLevel = "info" | "success" | "warning" | "error";

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
  | "action";

/** 统一的事件协议对象 */
export interface StudioEvent {
  /** 唯一事件 ID */
  eventId: string;
  /** 事件类型 */
  type: StudioEventType | string;
  /** 来源角色 */
  source: string;
  /** 目标角色（可选） */
  target?: string;
  /** 关联品种 */
  symbol?: string;
  /** 事件级别 */
  level: EventLevel;
  /** 事件消息 */
  message: string;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
}

// ─── WebSocket Protocol — 对齐 API_CONTRACT Section 5 ───

/** WebSocket 消息类型 */
export type WsMessageType =
  | "snapshot"
  | "agent_update"
  | "event_append"
  | "summary_update"
  | "connection_status"
  | "heartbeat"
  | "pong";

/** WebSocket 消息 */
export interface WsMessage {
  type: WsMessageType | string;
  payload: unknown;
}

/** snapshot 消息载荷 — 对齐 API_CONTRACT Section 5.3 */
export interface SnapshotPayload {
  agents: StudioAgent[];
  events: StudioEvent[];
  summary: SummaryPayload;
}

/** agent_update 消息载荷 — 对齐 API_CONTRACT Section 5.4 (same shape as StudioAgent) */
export type AgentUpdatePayload = StudioAgent;

/** event_append 消息载荷 — 对齐 API_CONTRACT Section 5.5 (same shape as StudioEvent) */
export type EventAppendPayload = StudioEvent;

/** summary_update 消息载荷 — 对齐 API_CONTRACT Section 5.6 */
export interface SummaryPayload {
  account: string;
  symbol: string;
  environment: string;
  health: string;
  activeAgents: number;
  alertCount: number;
  wsConnected: boolean;
  updatedAt: string;
}

/** connection_status 消息载荷 — 对齐 API_CONTRACT Section 5.7 */
export interface ConnectionStatusPayload {
  backendConnected: boolean;
  mt5Connected: boolean;
  status: string;
  updatedAt: string;
}
