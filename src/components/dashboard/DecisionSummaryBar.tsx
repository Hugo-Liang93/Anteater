import { useMemo } from "react";
import { config } from "@/config";
import { getWorkflowByRole } from "@/config/workflows";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";

export function DecisionSummaryBar() {
  const signals = useLiveStore((s) => s.signals);
  const voterStats = useEmployeeStore((s) => s.employees.voter?.stats ?? {});
  const riskStats = useEmployeeStore((s) => s.employees.risk_officer?.stats ?? {});

  const displaySignals = useMemo(() => {
    const preferred = signals.filter((signal) => signal.timeframe === config.defaultTimeframe);
    return preferred.length > 0 ? preferred : signals;
  }, [signals]);

  const voteStrategyNames = useMemo(() => {
    const names = new Set<string>(["consensus"]);
    const votingGroups = Array.isArray(voterStats.voting_groups)
      ? (voterStats.voting_groups as Array<{ name?: string }>)
      : [];
    for (const group of votingGroups) {
      const name = String(group.name ?? "").trim();
      if (name) names.add(name);
    }
    return names;
  }, [voterStats]);

  const votedSignals = useMemo(
    () => displaySignals.filter((signal) => voteStrategyNames.has(signal.strategy) && signal.direction !== "hold"),
    [displaySignals, voteStrategyNames],
  );

  const directSignals = useMemo(
    () => displaySignals.filter((signal) => !voteStrategyNames.has(signal.strategy) && signal.direction !== "hold"),
    [displaySignals, voteStrategyNames],
  );

  const { voteBuy, voteSell, voteDirection } = useMemo(() => {
    let buy = 0;
    let sell = 0;
    for (const signal of votedSignals) {
      if (signal.direction === "buy") buy++;
      if (signal.direction === "sell") sell++;
    }
    return {
      voteBuy: buy,
      voteSell: sell,
      voteDirection: buy > sell ? "偏多" : sell > buy ? "偏空" : buy + sell > 0 ? "分歧" : null,
    };
  }, [votedSignals]);

  const topSignal = displaySignals.reduce<(typeof displaySignals)[number] | null>((best, signal) => {
    if (signal.direction === "hold") return best;
    if (!best) return signal;
    return signal.confidence > best.confidence ? signal : best;
  }, null);

  const positions = useMarketStore((s) => s.positions);
  const totalPnl = positions.reduce((sum, position) => sum + (position.profit ?? 0), 0);

  const calendarEvents = useSignalStore((s) => s.calendarEvents);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const guardActive = riskWindows.some((window) => window.guard_active);
  const nearestEvent = calendarEvents
    .filter((event) => event.countdown_minutes > 0 && event.importance >= 2)
    .sort((a, b) => a.countdown_minutes - b.countdown_minutes)[0] ?? null;

  const health = useSignalStore((s) => s.health);
  const healthStatus = health?.status ?? "unknown";
  const healthColor =
    healthStatus === "healthy" ? "#23e0b3"
    : healthStatus === "degraded" ? "#ffb14a"
    : healthStatus === "unhealthy" ? "#ff667f"
    : "#5a6d7e";

  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const voteTotal = voteBuy + voteSell;
  const riskQueue = Number(riskStats.signals_received ?? 0);
  const directCount = directSignals.length;

  return (
    <div
      className="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-2.5 border-b border-white/6 px-3 backdrop-blur-md"
      style={{ background: "rgba(12,20,32,0.75)" }}
    >
      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: "decision", employeeId: "voter" })}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        <span className="text-[11px] text-text-muted">投票组 {config.defaultTimeframe}</span>
        <span className={`font-mono text-[12px] font-bold ${
          voteDirection === "偏多" ? "text-buy"
          : voteDirection === "偏空" ? "text-sell"
          : "text-text-secondary"
        }`}>
          {voteDirection || "未命中"}
        </span>
        {voteTotal > 0 ? (
          <div className="flex h-1.5 w-14 overflow-hidden rounded-full bg-white/8">
            <div className="h-full bg-buy/60" style={{ width: `${(voteBuy / voteTotal) * 100}%` }} />
            <div className="h-full bg-sell/60" style={{ width: `${(voteSell / voteTotal) * 100}%` }} />
          </div>
        ) : (
          <span className="font-mono text-[10px] text-text-muted">0</span>
        )}
      </button>

      <div className="h-4 w-px bg-white/8" />

      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole("strategist") ?? "strategy", employeeId: "strategist" })}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        <span className="text-[11px] text-text-muted">最强 {config.defaultTimeframe}</span>
        {topSignal ? (
          <>
            <span className="font-mono text-[11px] text-text-secondary">{topSignal.timeframe}</span>
            <span className={`font-mono text-[12px] font-bold ${topSignal.direction === "buy" ? "text-buy" : "text-sell"}`}>
              {topSignal.direction === "buy" ? "BUY" : "SELL"}
            </span>
            <span className="font-mono text-[11px] text-text-muted">
              {(topSignal.confidence * 100).toFixed(0)}%
            </span>
          </>
        ) : (
          <span className="text-[11px] text-text-muted">--</span>
        )}
      </button>

      <div className="h-4 w-px bg-white/8" />

      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole("risk_officer") ?? "decision", employeeId: "risk_officer" })}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        <span className="text-[11px] text-text-muted">风控队列</span>
        <span className="font-mono text-[11px] text-text-secondary">{riskQueue}</span>
        <span className="text-[11px] text-white/35">直达 {directCount}</span>
      </button>

      <div className="h-4 w-px bg-white/8" />

      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole("position_manager") ?? "execution", employeeId: "position_manager" })}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        <span className="text-[11px] text-text-muted">持仓</span>
        <span className="font-mono text-[11px] text-text-secondary">{positions.length} 笔</span>
        {positions.length > 0 && (
          <span className={`font-mono text-[11px] font-semibold ${totalPnl >= 0 ? "text-buy" : "text-sell"}`}>
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
          </span>
        )}
      </button>

      <div className="flex-1" />

      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole("calendar_reporter") ?? "support", employeeId: "calendar_reporter" })}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        {guardActive ? (
          <span className="text-[11px] font-semibold text-warning">Trade Guard</span>
        ) : nearestEvent ? (
          <>
            <span className="text-[11px]" style={{ color: nearestEvent.importance >= 3 ? "#ff5252" : "#ffa726" }}>
              {nearestEvent.importance >= 3 ? "!!!" : "!!"}
            </span>
            <span className="max-w-[120px] truncate text-[11px] text-text-secondary">
              {nearestEvent.event_name}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {nearestEvent.countdown_minutes < 60
                ? `${nearestEvent.countdown_minutes}m`
                : `${Math.round(nearestEvent.countdown_minutes / 60)}h`}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-text-muted">日历平稳</span>
        )}
      </button>

      <div className="h-4 w-px bg-white/8" />

      <button
        onClick={() => openRightPanel({ kind: "employee", workflowId: getWorkflowByRole("inspector") ?? "support", employeeId: "inspector" })}
        className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: healthColor, boxShadow: `0 0 4px ${healthColor}` }}
        />
        <span className="text-[11px] text-text-muted">{healthStatus}</span>
      </button>
    </div>
  );
}
