import { cn } from "@/lib/utils";
import { config } from "@/config";
import { useMarketStore } from "@/store/market";
import { useSignalStore, selectRiskWindows } from "@/store/signals";
import { useEmployeeStore } from "@/store/employees";

type NoticeTone = "neutral" | "warning" | "danger";

function buildGlobalNotice({
  connected,
  healthStatus,
  riskWindows,
  marginState,
  marginLevel,
}: {
  connected: boolean;
  healthStatus?: string;
  riskWindows: import("@/api/types").RiskWindow[];
  marginState?: string;
  marginLevel?: number;
}): { tone: NoticeTone; text: string } {
  if (!connected) {
    return { tone: "danger", text: "STREAM OFFLINE" };
  }

  if (marginState === "critical" || marginState === "danger") {
    const suffix = marginLevel != null ? ` ${Math.round(marginLevel)}%` : "";
    return { tone: "danger", text: `MARGIN WATCH${suffix}` };
  }

  if (riskWindows.some((w) => w.guard_active)) {
    return { tone: "warning", text: "NEWS GUARD ACTIVE" };
  }

  if (healthStatus === "degraded") {
    return { tone: "warning", text: "SYSTEM DEGRADED" };
  }

  if (healthStatus === "unhealthy") {
    return { tone: "danger", text: "SYSTEM UNHEALTHY" };
  }

  return { tone: "neutral", text: config.mockMode ? "MOCK SESSION" : "SYSTEM NOMINAL" };
}

export function TopBar() {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const connected = useMarketStore((s) => s.connected);
  const health = useSignalStore((s) => s.health);
  const riskWindows = useSignalStore(selectRiskWindows);
  const accountantStats = useEmployeeStore((s) => s.employees.accountant?.stats ?? {});

  const marginGuard =
    typeof accountantStats.margin_guard === "object" && accountantStats.margin_guard !== null
      ? (accountantStats.margin_guard as { state?: string; margin_level?: number })
      : null;

  const notice = buildGlobalNotice({
    connected,
    healthStatus: health?.status,
    riskWindows,
    marginState: marginGuard?.state,
    marginLevel: marginGuard?.margin_level,
  });

  const noticeTone =
    notice.tone === "danger"
      ? "text-danger"
      : notice.tone === "warning"
        ? "text-warning"
        : "text-text-secondary";

  return (
    <header className="relative z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-white/8 bg-[#0a111b]/90 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="font-display text-[36px] font-semibold leading-none tracking-[0.12em] text-accent">
          ANTEATER
        </div>
        <div className="text-[15px] text-white/45">Trading Studio</div>
        <span
          className={cn(
            "rounded-xl px-3 py-1 text-xs font-semibold tracking-[0.18em]",
            config.mockMode
              ? "bg-warning/15 text-warning"
              : "bg-success/15 text-success",
          )}
        >
          {config.mockMode ? "MOCK" : "LIVE"}
        </span>
      </div>

      <div className="flex items-center gap-8 font-data text-[15px]">
        <div className="flex items-baseline gap-3">
          <span className="font-semibold tracking-[0.08em] text-white">XAUUSD</span>
          {quote ? (
            <>
              <span className="text-buy">{quote.bid.toFixed(2)}</span>
              <span className="text-white/40">/</span>
              <span className="text-sell">{quote.ask.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-white/35">--.--</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-white/45">
          <span>spread</span>
          <span className="text-white/75">{quote?.spread?.toFixed(1) ?? "--"}</span>
        </div>

        <div className="flex items-center gap-2 text-white/45">
          <span>余额</span>
          <span className="text-[18px] font-semibold text-white">
            ${account?.balance.toFixed(2) ?? "--"}
          </span>
        </div>
      </div>

      <div className={cn("min-w-[180px] text-right font-display text-[18px] tracking-[0.14em]", noticeTone)}>
        {notice.text}
      </div>
    </header>
  );
}
