/**
 * Mock 数据 — 对齐 TASKS Phase D2
 *
 * 提供离线开发用的模拟数据，无需后端即可演示完整 UI。
 * 通过 config.mockMode 开关控制。
 */

import type { Quote, AccountInfo, Position, HealthStatus, RiskWindow, StrategyInfo } from "./types";
import type { LiveSignal, QueueInfo } from "@/store/live";

export const MOCK_QUOTE: Quote = {
  symbol: "XAUUSD",
  bid: 2345.67,
  ask: 2345.89,
  spread: 0.22,
  time: new Date().toISOString(),
};

export const MOCK_ACCOUNT: AccountInfo = {
  login: 12345678,
  balance: 50000.00,
  equity: 51234.56,
  margin: 2500.00,
  free_margin: 48734.56,
  profit: 1234.56,
  currency: "USD",
  leverage: 100,
  server: "Demo-MT5",
};

export const MOCK_POSITIONS: Position[] = [
  {
    ticket: 10001,
    symbol: "XAUUSD",
    type: "buy",
    volume: 0.1,
    price_open: 2340.50,
    price_current: 2345.67,
    sl: 2330.00,
    tp: 2360.00,
    profit: 517.00,
    swap: -2.30,
    time: new Date(Date.now() - 3600000).toISOString(),
    comment: "MA_Cross_Buy",
  },
  {
    ticket: 10002,
    symbol: "XAUUSD",
    type: "sell",
    volume: 0.05,
    price_open: 2348.00,
    price_current: 2345.89,
    sl: 2355.00,
    tp: 2335.00,
    profit: 105.50,
    swap: -1.10,
    time: new Date(Date.now() - 1800000).toISOString(),
    comment: "RSI_Overbought",
  },
];

export const MOCK_HEALTH: HealthStatus = {
  status: "healthy",
  components: {
    BackgroundIngestor: { status: "healthy" },
    UnifiedIndicatorManager: { status: "healthy" },
    SignalModule: { status: "healthy" },
    VotingEngine: { status: "healthy" },
    FilterChain: { status: "healthy" },
    TradeExecutor: { status: "healthy" },
    MonitoringManager: { status: "healthy" },
  },
  uptime_seconds: 86400,
};

export const MOCK_STRATEGIES: StrategyInfo[] = [
  { name: "MA_Cross", category: "trend", preferred_scopes: ["confirmed"], required_indicators: ["ema20", "ema50"], regime_affinity: { trending: 0.8 } },
  { name: "RSI_Reversal", category: "mean_reversion", preferred_scopes: ["confirmed"], required_indicators: ["rsi14"], regime_affinity: { ranging: 0.9 } },
  { name: "MACD_Divergence", category: "momentum", preferred_scopes: ["confirmed"], required_indicators: ["macd"], regime_affinity: { trending: 0.7 } },
];

export const MOCK_INDICATORS: Record<string, Record<string, number | null>> = {
  rsi14: { rsi: 58.3 },
  atr14: { atr: 12.45 },
  adx14: { adx: 32.1 },
  cci20: { cci: -45.2 },
  macd: { macd: 0.0023, signal: 0.0018, histogram: 0.0005 },
  ema20: { ema: 2344.12 },
  ema50: { ema: 2341.56 },
  supertrend14: { direction: 1 },
};

export const MOCK_SIGNALS: LiveSignal[] = [
  {
    signal_id: "sig-001",
    symbol: "XAUUSD",
    timeframe: "M5",
    strategy: "MA_Cross",
    direction: "buy",
    confidence: 0.78,
    reason: "EMA20 crossed above EMA50",
    scope: "confirmed",
    generated_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    signal_id: "sig-002",
    symbol: "XAUUSD",
    timeframe: "M5",
    strategy: "RSI_Reversal",
    direction: "hold",
    confidence: 0.45,
    reason: "RSI in neutral zone",
    scope: "confirmed",
    generated_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    signal_id: "sig-003",
    symbol: "XAUUSD",
    timeframe: "M5",
    strategy: "MACD_Divergence",
    direction: "buy",
    confidence: 0.65,
    reason: "MACD histogram positive",
    scope: "confirmed",
    generated_at: new Date().toISOString(),
  },
];

export const MOCK_QUEUES: QueueInfo[] = [
  { name: "signal_queue", size: 3, max: 100, utilization_pct: 3, status: "normal", drops_oldest: 0, drops_newest: 0 },
  { name: "trade_queue", size: 1, max: 50, utilization_pct: 2, status: "normal", drops_oldest: 0, drops_newest: 0 },
  { name: "monitor_queue", size: 5, max: 200, utilization_pct: 2.5, status: "normal", drops_oldest: 0, drops_newest: 0 },
];

/** 模拟经济日历风险窗口 — 包含不同影响级别和时间距离 */
export const MOCK_RISK_WINDOWS: RiskWindow[] = [
  {
    event_name: "Non-Farm Payrolls",
    currency: "USD",
    impact: "high",
    datetime: new Date(Date.now() + 45 * 60_000).toISOString(), // 45 分钟后
    guard_active: true,
  },
  {
    event_name: "CPI Year-over-Year",
    currency: "USD",
    impact: "high",
    datetime: new Date(Date.now() + 3 * 3600_000).toISOString(), // 3 小时后
    guard_active: false,
  },
  {
    event_name: "Initial Jobless Claims",
    currency: "USD",
    impact: "medium",
    datetime: new Date(Date.now() + 6 * 3600_000).toISOString(), // 6 小时后
    guard_active: false,
  },
  {
    event_name: "ECB Interest Rate Decision",
    currency: "EUR",
    impact: "high",
    datetime: new Date(Date.now() + 24 * 3600_000).toISOString(), // 明天
    guard_active: false,
  },
];
