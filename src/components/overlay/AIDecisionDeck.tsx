import { useMemo } from "react";
import { Brain, RefreshCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DecisionDeskInput } from "@/lib/decisionDesk";
import { useDecisionBrief } from "@/hooks/useDecisionBrief";
import { useDecisionStore, type DecisionRecordStatus } from "@/store/decision";
import { useEmployeeStore } from "@/store/employees";
import { useEventStore } from "@/store/events";
import { useLiveStore } from "@/store/live";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";

const EVIDENCE_TONE = {
  positive: "border-emerald-400/18 bg-emerald-400/8 text-emerald-200",
  warning: "border-amber-400/18 bg-amber-400/8 text-amber-200",
  danger: "border-rose-400/18 bg-rose-400/8 text-rose-200",
  neutral: "border-white/8 bg-black/10 text-white/72",
} as const;

const RECORD_STATUS_META: Record<
  DecisionRecordStatus,
  { label: string; cls: string }
> = {
  adopted: { label: "已采纳", cls: "bg-emerald-400/15 text-emerald-200" },
  deferred: { label: "已暂缓", cls: "bg-amber-400/15 text-amber-200" },
  dismissed: { label: "已忽略", cls: "bg-white/10 text-white/62" },
};

export function AIDecisionDeck() {
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const selectedEmployee = useEmployeeStore((s) => s.selectedEmployee);
  const aiWorkbenchOpen = useUIStore((s) => s.aiWorkbenchOpen);
  const setAiWorkbenchOpen = useUIStore((s) => s.setAiWorkbenchOpen);
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
  const records = useDecisionStore((s) => s.records);
  const addRecord = useDecisionStore((s) => s.addRecord);

  const input = useMemo<DecisionDeskInput>(
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

  const { brief, loading, error, refresh } = useDecisionBrief(input);

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
    <>
      <div className="pointer-events-auto absolute left-4 top-4 z-40 w-[336px] rounded-[22px] border border-white/10 bg-[#101b29]/92 p-4 shadow-[0_20px_54px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34e6c0_0%,#69b3ff_100%)] text-[#09111c]">
              <Brain size={20} />
            </div>
            <div>
              <p className="text-[11px] tracking-[0.18em] text-white/35">AI 决策摘要</p>
              <h3 className="font-display text-[20px] tracking-[0.08em] text-white">
                {brief.focusTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/62 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              title="重新生成建议"
            >
              <RefreshCcw size={14} className={cn(loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setAiWorkbenchOpen(true)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/72 transition-colors hover:border-white/16 hover:bg-white/[0.08]"
            >
              展开工作台
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-white/48">{brief.focusSubtitle}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <SummaryStat title="当前结论" value={brief.stance} />
          <SummaryStat title="置信度" value={`${brief.confidence}%`} />
          <SummaryStat
            title="核心依据"
            value={brief.evidence.slice(0, 2).map((item) => item.title).join(" / ") || "暂无"}
          />
          <SummaryStat title="下一步建议" value={brief.recommendedAction} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.16em] text-white/35">
              <Sparkles size={12} />
              建议摘要
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/60">
              {brief.sourceLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/80">{brief.summary}</p>
          <p className="mt-2 text-[12px] leading-5 text-white/48">{brief.actionHint}</p>
          {error && <p className="mt-2 text-[12px] leading-5 text-amber-300">{error}</p>}
        </div>
      </div>

      {aiWorkbenchOpen && (
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 z-45 rounded-[28px] border border-white/10 bg-[#0f1826]/96 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] tracking-[0.18em] text-white/35">AI 决策工作台</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/65">
                  {brief.sourceLabel}
                </span>
              </div>
              <h3 className="mt-1 font-display text-[26px] tracking-[0.08em] text-white">
                {brief.focusTitle}
              </h3>
              <p className="mt-2 text-sm text-white/48">{brief.focusSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
                title="重新生成建议"
              >
                <RefreshCcw size={16} className={cn(loading && "animate-spin")} />
              </button>
              <button
                onClick={() => setAiWorkbenchOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/60 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1.1fr_0.9fr] gap-5 px-5 py-4">
            <div className="space-y-4">
              <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.18em] text-white/35">当前结论</div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="font-display text-[28px] tracking-[0.1em] text-white">
                        {brief.stance}
                      </span>
                      <span className="font-data text-[15px] text-white/62">{brief.confidence}%</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-right">
                    <div className="text-[11px] text-white/35">下一步建议</div>
                    <div className="mt-1 text-sm text-white">{brief.recommendedAction}</div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/80">{brief.summary}</p>
                <p className="mt-2 text-[12px] leading-5 text-white/48">{brief.actionHint}</p>
                {error && <p className="mt-2 text-[12px] leading-5 text-amber-300">{error}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {brief.focusRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/68"
                    >
                      {role}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton label="采纳建议" tone="positive" onClick={() => recordAction("adopted")} />
                  <ActionButton label="暂缓处理" tone="warning" onClick={() => recordAction("deferred")} />
                  <ActionButton label="忽略建议" tone="neutral" onClick={() => recordAction("dismissed")} />
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                <div className="text-[11px] tracking-[0.18em] text-white/35">证据面板</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {brief.evidence.map((item) => (
                    <div
                      key={item.title}
                      className={cn("rounded-2xl border px-3 py-3", EVIDENCE_TONE[item.tone])}
                    >
                      <div className="text-[11px] text-white/35">{item.title}</div>
                      <div className="mt-1 text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <WorkbenchList title="冲突因素" items={brief.conflicts} emptyText="当前没有明显的方向冲突。" />
              <WorkbenchList title="风险提示" items={brief.risks} emptyText="当前没有新增高优先级风险提示。" />
              <WorkbenchList title="失效条件" items={brief.invalidations} emptyText="当前没有额外失效条件。" />

              <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] tracking-[0.18em] text-white/35">决策记录</div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 font-data text-[10px] text-white/55">
                    {records.length}
                  </span>
                </div>

                {records.length === 0 ? (
                  <p className="mt-3 text-sm text-white/45">当前还没有建议处理记录。</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {records.slice(0, 5).map((record) => {
                      const meta = RECORD_STATUS_META[record.status];
                      return (
                        <div
                          key={record.id}
                          className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-white">{record.focus}</div>
                              <div className="mt-1 text-[11px] text-white/38">
                                {new Date(record.createdAt).toLocaleTimeString("zh-CN", {
                                  hour12: false,
                                })}
                              </div>
                            </div>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px]", meta.cls)}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-[12px] leading-5 text-white/68">
                            {record.stance} / {record.action} / {record.confidence}% / {record.sourceLabel}
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-white/45">
                            {record.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3">
      <div className="text-[11px] text-white/35">{title}</div>
      <div className="mt-1 text-sm leading-6 text-white">{value}</div>
    </div>
  );
}

function ActionButton({
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
      className={cn("rounded-full border px-3 py-2 text-[12px] transition-colors", cls)}
    >
      {label}
    </button>
  );
}

function WorkbenchList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
      <div className="text-[11px] tracking-[0.18em] text-white/35">{title}</div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm leading-6 text-white/72"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
