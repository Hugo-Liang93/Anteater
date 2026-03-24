/**
 * 后端响应适配器
 *
 * MT5Services API 的实际响应结构与前端类型定义有差异：
 * - quote: spread 在 metadata 中而非 data 中
 * - account: margin_free → free_margin，缺少 profit/server
 * - health: 结构与简化的 HealthStatus 不同
 *
 * 这里做统一规范化，避免在 UI 层到处做空值判断。
 */

import type { AccountInfo, ApiResponse, HealthStatus, Position, Quote, StrategyInfo } from "./types";

/** 从 quote API 响应中提取规范化的 Quote */
export function normalizeQuote(res: ApiResponse<Record<string, unknown>>): Quote | null {
  const d = res.data;
  if (!d) return null;

  return {
    symbol: (d.symbol as string) ?? "XAUUSD",
    bid: (d.bid as number) ?? 0,
    ask: (d.ask as number) ?? 0,
    spread: ((d.spread as number) ?? (res.metadata?.spread as number) ?? 0),
    time: (d.time as string) ?? "",
  };
}

/** 从 account API 响应中提取规范化的 AccountInfo */
export function normalizeAccount(res: ApiResponse<Record<string, unknown>>): AccountInfo | null {
  const d = res.data;
  if (!d) return null;

  return {
    login: (d.login as number) ?? 0,
    balance: (d.balance as number) ?? 0,
    equity: (d.equity as number) ?? 0,
    margin: (d.margin as number) ?? 0,
    free_margin: (d.free_margin as number) ?? (d.margin_free as number) ?? 0,
    profit: (d.profit as number) ?? 0,
    currency: (d.currency as string) ?? "USD",
    leverage: (d.leverage as number) ?? 0,
    server: (d.server as string) ?? (res.metadata?.server as string) ?? "",
  };
}

/**
 * 从 health API 响应中提取规范化的 HealthStatus
 *
 * 注意：/monitoring/health 返回的是裸对象（无 ApiResponse 包装），
 * 结构为 { overall_status, components: { name: { metric: { status, ... } } } }
 */
export function normalizeHealth(raw: unknown): HealthStatus | null {
  const d = raw as Record<string, unknown> | null;
  if (!d) return null;

  // 兼容两种格式：ApiResponse 包装 或 裸对象
  const body = (d.data as Record<string, unknown>) ?? d;
  const overallStatus = (body.overall_status as string) ?? "unknown";
  const components: HealthStatus["components"] = {};

  const comps = body.components as Record<string, Record<string, unknown>> | undefined;
  if (comps) {
    for (const [name, metrics] of Object.entries(comps)) {
      let worstStatus = "healthy";
      for (const metric of Object.values(metrics as Record<string, Record<string, unknown>>)) {
        const s = metric.status as string;
        if (s === "critical" || s === "unhealthy") worstStatus = "unhealthy";
        else if (s === "warning" && worstStatus === "healthy") worstStatus = "degraded";
      }
      components[name] = { status: worstStatus };
    }
  }

  return {
    status: overallStatus === "healthy" ? "healthy"
      : overallStatus === "warning" ? "degraded"
      : "unhealthy",
    components,
    uptime_seconds: 0,
  };
}

/** 后端 strategies 返回字符串数组，规范化为 StrategyInfo[] */
export function normalizeStrategies(res: ApiResponse<unknown>): StrategyInfo[] {
  const d = res.data;
  if (!Array.isArray(d)) return [];

  return d.map((item: unknown) => {
    if (typeof item === "string") {
      return {
        name: item,
        category: "",
        preferred_scopes: [],
        required_indicators: [],
        regime_affinity: {},
      };
    }
    return item as StrategyInfo;
  });
}

/** 后端 positions type 是数字 (0=buy, 1=sell)，规范化 */
export function normalizePositions(res: ApiResponse<unknown>): Position[] {
  const d = res.data;
  if (!Array.isArray(d)) return [];

  return d.map((p: Record<string, unknown>) => ({
    ticket: (p.ticket as number) ?? 0,
    symbol: (p.symbol as string) ?? "",
    type: p.type === 0 ? "buy" as const : "sell" as const,
    volume: (p.volume as number) ?? 0,
    price_open: (p.price_open as number) ?? 0,
    price_current: (p.price_current as number) ?? 0,
    sl: (p.sl as number) ?? 0,
    tp: (p.tp as number) ?? 0,
    profit: (p.profit as number) ?? 0,
    swap: (p.swap as number) ?? 0,
    time: (p.time as string) ?? "",
    comment: (p.comment as string) ?? "",
  }));
}
