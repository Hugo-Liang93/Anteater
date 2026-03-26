/**
 * MT5Services API 响应类型定义
 * 与后端 src/api/schemas.py 对齐
 */

/** 通用 API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  error_code: string | null;
  metadata: Record<string, unknown> | null;
}

/** 报价 */
export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: string;
}

/** OHLC K线 */
export interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume: number;
  real_volume: number;
}

/** 账户信息 */
export interface AccountInfo {
  login: number;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  profit: number;
  currency: string;
  leverage: number;
  server: string;
}

/** 持仓 */
export interface Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  price_open: number;
  price_current: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  time: string;
  comment: string;
}

/** 指标快照 */
export interface IndicatorSnapshot {
  symbol: string;
  timeframe: string;
  timestamp: string;
  scope: "confirmed" | "intrabar";
  indicators: Record<string, Record<string, number | null>>;
}

/** 信号事件 */
export interface SignalEvent {
  symbol: string;
  timeframe: string;
  strategy: string;
  signal_state: string;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  scope: "confirmed" | "intrabar";
  timestamp: string;
}

/** 策略信息 */
export interface StrategyInfo {
  name: string;
  category: string;
  preferred_scopes: string[];
  required_indicators: string[];
  regime_affinity: Record<string, number>;
}

/** 健康检查结果 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  components: Record<
    string,
    {
      status: string;
      message?: string;
      last_check?: string;
    }
  >;
  uptime_seconds: number;
}

/** 队列监控 */
export interface QueueStatus {
  channel: string;
  size: number;
  capacity: number;
  usage_pct: number;
  drops: number;
}

/** 经济日历风险窗口 */
export interface RiskWindow {
  event_uid: string;
  event_name: string;
  source: string;
  country: string;
  currency: string;
  importance: number;
  impact: "high" | "medium" | "low";
  session_bucket: string;
  window_start: string;
  window_end: string;
  scheduled_at: string;
  scheduled_at_local: string;
  /** @deprecated 用 scheduled_at 代替 */
  datetime: string;
  guard_active: boolean;
}

/** 精简日历事件（/economic/calendar/enriched） */
export interface EnrichedCalendarEvent {
  event_uid: string;
  event_name: string;
  country: string;
  currency: string;
  importance: number;
  status: string;
  scheduled_at: string;
  scheduled_at_local: string | null;
  countdown_minutes: number;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  gold_impact: {
    above_forecast: "利多" | "利空";
    below_forecast: "利多" | "利空";
    bullish_pct: number | null;
    avg_30m_range: number | null;
    sample_count: number;
    source: "historical" | "static";
  } | null;
}

/** 信号质量 */
export interface SignalQuality {
  strategy: string;
  total: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_pnl: number;
}
