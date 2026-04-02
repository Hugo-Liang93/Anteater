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
import type { QueueInfo } from "@/store/live";

/** 安全取 number 值 */
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

/** 安全取 string 值 */
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** 从 quote API 响应中提取规范化的 Quote */
export function normalizeQuote(res: ApiResponse<unknown>): Quote | null {
  const d = res.data as Record<string, unknown> | null;
  if (!d) return null;

  const bid = num(d.bid);
  const ask = num(d.ask);

  return {
    symbol: str(d.symbol, "XAUUSD"),
    bid,
    ask,
    last: num(d.last),
    volume: num(d.volume),
    // spread 不在 QuoteModel 中，从 metadata 取或从 bid/ask 计算
    spread: d.spread != null
      ? num(d.spread)
      : res.metadata?.spread != null
        ? num(res.metadata.spread)
        : ask - bid,
    time: str(d.time),
  };
}

/** 从 account API 响应中提取规范化的 AccountInfo
 *
 * 后端 AccountInfoModel 只有 margin_free，无 profit/server。
 * profit 从 metadata 取（或 0），server 从 metadata 取。
 */
export function normalizeAccount(res: ApiResponse<unknown>): AccountInfo | null {
  const d = res.data as Record<string, unknown> | null;
  if (!d) return null;

  const meta = res.metadata as Record<string, unknown> | null;

  return {
    login: num(d.login),
    balance: num(d.balance),
    equity: num(d.equity),
    margin: num(d.margin),
    // 后端字段名为 margin_free
    free_margin: d.free_margin != null ? num(d.free_margin) : num(d.margin_free),
    // profit 不在 AccountInfoModel 中，从 equity-balance 推算
    profit: d.profit != null ? num(d.profit) : num(d.equity) - num(d.balance),
    currency: str(d.currency, "USD"),
    leverage: num(d.leverage),
    // server 不在 AccountInfoModel 中，从 metadata 取
    server: d.server != null
      ? str(d.server)
      : meta?.server != null
        ? str(meta.server)
        : meta?.account_alias != null
          ? str(meta.account_alias)
          : "",
  };
}

/**
 * 从 health API 响应中提取规范化的 HealthStatus
 *
 * 注意：/monitoring/health 返回的是裸对象（无 ApiResponse 包装），
 * 结构为 { overall_status, components: { name: { metric: { status, ... } } } }
 */
export function normalizeHealth(raw: unknown): HealthStatus | null {
  if (!raw || typeof raw !== "object") return null;

  const d = raw as Record<string, unknown>;

  // 兼容两种格式：ApiResponse 包装 或 裸对象
  const body = (typeof d.data === "object" && d.data !== null ? d.data : d) as Record<string, unknown>;
  const overallStatus = str(body.overall_status, "unknown");
  const components: HealthStatus["components"] = {};

  const comps = body.components;
  if (comps && typeof comps === "object") {
    for (const [name, metrics] of Object.entries(comps as Record<string, unknown>)) {
      if (!metrics || typeof metrics !== "object") continue;
      let worstStatus = "healthy";
      for (const metric of Object.values(metrics as Record<string, unknown>)) {
        if (!metric || typeof metric !== "object") continue;
        const s = (metric as Record<string, unknown>).status;
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
    // 验证对象形状
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (typeof obj.name === "string") {
        return {
          name: obj.name,
          category: str(obj.category),
          preferred_scopes: Array.isArray(obj.preferred_scopes) ? obj.preferred_scopes as string[] : [],
          required_indicators: Array.isArray(obj.required_indicators) ? obj.required_indicators as string[] : [],
          regime_affinity: (obj.regime_affinity && typeof obj.regime_affinity === "object")
            ? obj.regime_affinity as Record<string, number>
            : {},
        } satisfies StrategyInfo;
      }
    }
    return { name: "unknown", category: "", preferred_scopes: [], required_indicators: [], regime_affinity: {} };
  });
}

/**
 * 从 /monitoring/queues 响应中提取队列列表
 *
 * 后端返回 { queues: { name: {...} }, summary, threads, intrabar }，
 * 需要展平为 QueueInfo[]。
 */
export function normalizeQueues(res: ApiResponse<unknown>): QueueInfo[] {
  const d = res.data;
  if (!d || typeof d !== "object") return [];

  const rawObj = d as Record<string, unknown>;
  const queuesSource = (
    rawObj.queues != null && typeof rawObj.queues === "object"
      ? rawObj.queues
      : rawObj
  ) as Record<string, unknown>;

  const list: QueueInfo[] = [];
  for (const [name, q] of Object.entries(queuesSource)) {
    if (!q || typeof q !== "object") continue;
    const qObj = q as Record<string, unknown>;
    // 跳过非队列字段（summary, threads, intrabar 等）
    if (qObj.size === undefined && qObj.max === undefined) continue;
    list.push({
      name,
      size: num(qObj.size),
      max: num(qObj.max),
      utilization_pct: num(qObj.utilization_pct),
      status: str(qObj.status, "unknown"),
      drops_oldest: num(qObj.drops_oldest),
      drops_newest: num(qObj.drops_newest),
    });
  }
  return list;
}

/** 后端 positions type 是数字 (0=buy, 1=sell)，规范化 */
export function normalizePositions(res: ApiResponse<unknown>): Position[] {
  const d = res.data;
  if (!Array.isArray(d)) return [];

  return d
    .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
    .map((p) => ({
      ticket: num(p.ticket),
      symbol: str(p.symbol),
      type: p.type === 0 ? "buy" as const : "sell" as const,
      volume: num(p.volume),
      price_open: num(p.price_open),
      price_current: num(p.price_current),
      sl: num(p.sl),
      tp: num(p.tp),
      profit: num(p.profit),
      swap: num(p.swap),
      time: str(p.time),
      comment: str(p.comment),
    }));
}
