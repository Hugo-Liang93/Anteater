/**
 * Studio 协议适配器 — 对齐 API_CONTRACT.md Section 7
 *
 * 负责：
 * - 后端字段重命名 → 前端协议对象
 * - 非法 status 回退到 "idle"
 * - alertLevel 缺省填 "none"
 * - 时间空值使用当前时间
 */

import type { StudioAgent, StudioEvent, SummaryPayload, ConnectionStatusPayload } from "@/types/protocol";
import type { ActivityStatus } from "@/store/employees";

/** API_CONTRACT Section 6.1 定义的合法 status 集合 */
const VALID_STATUSES = new Set<string>([
  "idle", "working", "walking", "thinking", "waiting", "judging", "signal_ready",
  "reviewing", "approved", "submitting", "executed", "rejected",
  "warning", "alert", "success", "error", "blocked", "disconnected", "reconnecting",
]);

/** 验证 status 值，非法值回退到 fallback */
export function normalizeStatus(raw: unknown, fallback: ActivityStatus = "idle"): ActivityStatus {
  if (typeof raw === "string" && VALID_STATUSES.has(raw)) {
    return raw as ActivityStatus;
  }
  return fallback;
}

/** 安全取 string */
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** 安全取 number */
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

/** 确保 ISO8601 时间字符串 */
function isoTime(v: unknown): string {
  if (typeof v === "string" && v.length > 0) return v;
  return new Date().toISOString();
}

/** 是否为 object */
function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// ─── StudioAgent 适配器 ───

export function normalizeStudioAgent(raw: unknown): StudioAgent | null {
  if (!isObj(raw)) return null;

  return {
    id: str(raw.id) || str(raw.role),
    name: str(raw.name),
    module: str(raw.module),
    zone: str(raw.zone),
    status: normalizeStatus(raw.status),
    task: str(raw.task) || str(raw.currentTask),
    symbol: typeof raw.symbol === "string" ? raw.symbol : undefined,
    metrics: isObj(raw.metrics) ? raw.metrics as Record<string, string | number | boolean | null> : undefined,
    alertLevel: (raw.alertLevel === "info" || raw.alertLevel === "warning" || raw.alertLevel === "error")
      ? raw.alertLevel
      : "none",
    updatedAt: isoTime(raw.updatedAt),
  };
}

/** 批量适配 agent 数组 */
export function normalizeStudioAgents(raw: unknown): StudioAgent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeStudioAgent).filter((a): a is StudioAgent => a !== null);
}

// ─── StudioEvent 适配器 ───

export function normalizeStudioEvent(raw: unknown): StudioEvent | null {
  if (!isObj(raw)) return null;

  return {
    eventId: str(raw.eventId) || str(raw.id) || `evt-${Date.now()}`,
    type: str(raw.type, "action"),
    source: str(raw.source),
    target: typeof raw.target === "string" ? raw.target : undefined,
    symbol: typeof raw.symbol === "string" ? raw.symbol : undefined,
    level: (raw.level === "info" || raw.level === "warning" || raw.level === "error" || raw.level === "success")
      ? raw.level
      : "info",
    message: str(raw.message),
    createdAt: isoTime(raw.createdAt),
  };
}

/** 批量适配 event 数组 */
export function normalizeStudioEvents(raw: unknown): StudioEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeStudioEvent).filter((e): e is StudioEvent => e !== null);
}

// ─── Summary 适配器 ───

export function normalizeSummary(raw: unknown): SummaryPayload {
  if (!isObj(raw)) {
    return {
      account: "", symbol: "", environment: "", health: "unknown",
      activeAgents: 0, alertCount: 0, wsConnected: false, updatedAt: new Date().toISOString(),
    };
  }
  return {
    account: str(raw.account),
    symbol: str(raw.symbol),
    environment: str(raw.environment),
    health: str(raw.health, "unknown"),
    activeAgents: num(raw.activeAgents),
    alertCount: num(raw.alertCount),
    wsConnected: raw.wsConnected === true,
    updatedAt: isoTime(raw.updatedAt),
  };
}

// ─── ConnectionStatus 适配器 ───

export function normalizeConnectionStatus(raw: unknown): ConnectionStatusPayload {
  if (!isObj(raw)) {
    return { backendConnected: false, mt5Connected: false, status: "disconnected", updatedAt: new Date().toISOString() };
  }
  return {
    backendConnected: raw.backendConnected === true || raw.connected === true,
    mt5Connected: raw.mt5Connected === true,
    status: str(raw.status, "unknown"),
    updatedAt: isoTime(raw.updatedAt),
  };
}
