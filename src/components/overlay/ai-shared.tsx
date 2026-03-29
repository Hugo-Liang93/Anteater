/**
 * AI 面板共享组件与 Hook
 *
 * 提取自 AIBriefPanel / AIWorkbenchPanel 中重复的常量、组件、数据构建逻辑。
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type DecisionDeskInput } from "@/lib/decisionDesk";
import { useUIStore, selectSelectedEmployee } from "@/store/ui";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useEventStore } from "@/store/events";
import type { DecisionEvidenceTone } from "@/types/decision";

// ─── Shared constants ───

export const EVIDENCE_TONE: Record<DecisionEvidenceTone, string> = {
  positive: "border-emerald-400/18 bg-emerald-400/8 text-emerald-200",
  warning: "border-amber-400/18 bg-amber-400/8 text-amber-200",
  danger: "border-rose-400/18 bg-rose-400/8 text-rose-200",
  neutral: "border-white/8 bg-black/10 text-white/72",
};

// ─── Shared components ───

export function ActionButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "positive" | "warning" | "neutral";
  onClick: () => void;
}) {
  const cls =
    tone === "positive"
      ? "border-emerald-400/18 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
      : tone === "warning"
        ? "border-amber-400/18 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
        : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]";

  return (
    <button
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", cls)}
    >
      {label}
    </button>
  );
}

// ─── Shared hook ───

/**
 * Consolidates all 14 store subscriptions needed to build DecisionDeskInput.
 * Both AIBriefPanel and AIWorkbenchPanel use identical liveInput construction.
 */
export function useDecisionInput(): DecisionDeskInput {
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const selectedEmployee = useUIStore(selectSelectedEmployee);
  const employees = useEmployeeStore((s) => s.employees);
  const indicators = useLiveStore((s) => s.indicators);
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const queues = useLiveStore((s) => s.queues);
  const quote = useMarketStore((s) => s.quotes.XAUUSD);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const recentSignals = useSignalStore((s) => s.recentSignals);
  const health = useSignalStore((s) => s.health);
  const events = useEventStore((s) => s.events);

  return useMemo<DecisionDeskInput>(
    () => ({
      selectedWorkflow,
      selectedEmployee,
      employees,
      indicators,
      signals,
      previewSignals,
      queues,
      quote,
      account,
      positions,
      riskWindows,
      recentSignals,
      health,
      events,
    }),
    [
      account,
      employees,
      events,
      health,
      indicators,
      positions,
      previewSignals,
      queues,
      quote,
      recentSignals,
      riskWindows,
      selectedEmployee,
      selectedWorkflow,
      signals,
    ],
  );
}
