const apiBase = import.meta.env.VITE_API_BASE ?? "/api";

export const config = {
  mockMode:
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).has("mock")
      : import.meta.env.VITE_MOCK_MODE === "true",

  apiBase,
  apiKey: import.meta.env.VITE_API_KEY ?? "",

  polling: {
    health: 5_000,
    signals: 3_000,
    account: 5_000,
    indicators: 3_000,
  },

  sseEndpoint: `${apiBase}/studio/stream`,
  wsEndpoint: `${
    typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"
  }//${typeof window !== "undefined" ? window.location.host : "localhost:8808"}/ws/studio`,

  decision: {
    provider: (import.meta.env.VITE_DECISION_PROVIDER ?? "hybrid") as "heuristic" | "remote" | "hybrid",
    briefPath: import.meta.env.VITE_DECISION_BRIEF_PATH ?? "/decision/brief",
    modelLabel: import.meta.env.VITE_DECISION_MODEL_LABEL ?? "远程模型",
    requestTimeoutMs: Number(import.meta.env.VITE_DECISION_TIMEOUT_MS ?? 12_000),
  },

  symbols: ["XAUUSD"] as const,
  timeframes: ["M5", "M15", "M30", "H1", "H4", "D1"] as const,
  defaultTimeframe: "M5" as const,
  enableDayNight: false,
} as const;

export type Symbol = (typeof config.symbols)[number];
export type Timeframe = (typeof config.timeframes)[number];
