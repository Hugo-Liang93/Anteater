export function dirColor(dir: string): string {
  if (dir === "buy") return "text-buy";
  if (dir === "sell") return "text-sell";
  return "text-text-muted";
}

export function confColor(conf: number): string {
  if (conf >= 0.75) return "text-success";
  if (conf >= 0.55) return "text-text-primary";
  return "text-text-muted";
}

export function extractBlocks(raw: unknown): Record<string, number> {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, number>;
  }
  return {};
}

export function indColor(name: string, value: number | null): string | undefined {
  if (value == null) return undefined;
  if (name.includes("rsi")) return value > 70 ? "text-sell" : value < 30 ? "text-buy" : undefined;
  if (name.includes("macd")) return value > 0 ? "text-buy" : value < 0 ? "text-sell" : undefined;
  return undefined;
}

export function fmtVal(v: number | null | undefined): string {
  if (v == null) return "--";
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}
