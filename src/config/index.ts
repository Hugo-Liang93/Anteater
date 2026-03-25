/** 应用配置 — 通过 Vite proxy 转发到 MT5Services 后端 */
export const config = {
  /** API 基础路径（Vite dev server proxy 会将 /api → http://localhost:8808/v1） */
  apiBase: "/api",

  /** 轮询间隔（ms） */
  polling: {
    /** 健康状态、组件状态 */
    health: 5_000,
    /** 信号 & 策略状态 */
    signals: 3_000,
    /** 持仓 & 账户 */
    account: 5_000,
    /** 指标快照 */
    indicators: 3_000,
  },

  /** SSE 实时流端点 */
  sseEndpoint: "/api/stream",

  /** WebSocket 实时通道端点 */
  wsEndpoint: `${typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"}//${typeof window !== "undefined" ? window.location.host : "localhost:8808"}/ws/studio`,

  /** 交易品种（与后端 app.ini 对齐） */
  symbols: ["XAUUSD"] as const,

  /** 时间框架（与后端 app.ini 对齐） */
  timeframes: ["M1", "M5", "M15", "H1", "D1"] as const,
} as const;

export type Symbol = (typeof config.symbols)[number];
export type Timeframe = (typeof config.timeframes)[number];
