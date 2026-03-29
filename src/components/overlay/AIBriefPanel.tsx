import { Brain, RefreshCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDecisionBrief } from "@/hooks/useDecisionBrief";
import { useDecisionStore, type DecisionRecordStatus } from "@/store/decision";
import { useUIStore } from "@/store/ui";
import { EVIDENCE_TONE, ActionButton, useDecisionInput } from "./ai-shared";

interface AIBriefPanelProps {
  onClose: () => void;
}

export default function AIBriefPanel({ onClose }: AIBriefPanelProps) {
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const addRecord = useDecisionStore((s) => s.addRecord);

  const liveInput = useDecisionInput();
  const { brief, loading, error, refresh } = useDecisionBrief(liveInput);

  const recordAction = (status: DecisionRecordStatus) => {
    addRecord({
      focus: brief.focusTitle,
      stance: brief.stance,
      confidence: brief.confidence,
      action: brief.recommendedAction,
      summary: brief.summary,
      status,
      source: brief.source,
      sourceLabel: brief.sourceLabel,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#34e6c0_0%,#69b3ff_100%)] text-[#09111c]">
            <Brain size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs tracking-[0.18em] text-white/35">AI 决策摘要</p>
            <h3 className="truncate font-display text-base tracking-[0.06em] text-white">
              {brief.focusTitle}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={refresh}
            className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
            title="重新生成"
          >
            <RefreshCcw size={12} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="text-sm text-white/48">{brief.focusSubtitle}</p>

        {/* Stance + Confidence */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-2xl tracking-[0.08em] text-white">
            {brief.stance}
          </span>
          <span className="font-data text-sm text-white/62">{brief.confidence}%</span>
        </div>

        {/* Summary */}
        <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs tracking-[0.14em] text-white/35">
            <Sparkles size={10} />
            {brief.sourceLabel}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-white/80">{brief.summary}</p>
          <p className="mt-1 text-xs leading-5 text-white/48">{brief.actionHint}</p>
          {error && <p className="mt-1 text-xs leading-5 text-amber-300">{error}</p>}
        </div>

        {/* Evidence cards */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {brief.evidence.map((item) => (
            <div
              key={item.title}
              className={cn("rounded-xl border px-2.5 py-2", EVIDENCE_TONE[item.tone])}
            >
              <div className="text-xs text-white/35">{item.title}</div>
              <div className="mt-0.5 text-sm leading-5">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton label="采纳" tone="positive" onClick={() => recordAction("adopted")} />
          <ActionButton label="暂缓" tone="warning" onClick={() => recordAction("deferred")} />
          <ActionButton label="忽略" tone="neutral" onClick={() => recordAction("dismissed")} />
        </div>

        {/* Expand to workbench */}
        <button
          onClick={() => openRightPanel({ kind: "ai-workbench" })}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-center text-sm text-white/68 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
        >
          展开工作台
        </button>
      </div>
    </div>
  );
}

