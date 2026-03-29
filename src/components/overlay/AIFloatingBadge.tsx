import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";

/**
 * AI 浮动徽章 — 3D 场景左上角
 *
 * 只显示后端投票结论（VotingEngine 的共识结果），不做前端伪聚合。
 * 如果没有投票数据，显示确认信号数量。
 * 点击打开右侧 AI Brief 面板。
 */
export function AIFloatingBadge() {
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const voterStats = useEmployeeStore((s) => s.employees.voter?.stats ?? {});
  const signalCount = useLiveStore((s) => s.signals.length);

  // 从后端投票员的 stats 取结论，这是 VotingEngine 的真实输出
  const consensusDir = String(voterStats.consensus_direction ?? "");
  const buyVotes = Number(voterStats.buy ?? voterStats.buy_votes ?? 0);
  const sellVotes = Number(voterStats.sell ?? voterStats.sell_votes ?? 0);

  let label: string;
  let cls: string;
  if (consensusDir === "buy") { label = "偏多"; cls = "text-emerald-300"; }
  else if (consensusDir === "sell") { label = "偏空"; cls = "text-rose-300"; }
  else if (buyVotes > 0 || sellVotes > 0) { label = "观望"; cls = "text-white/60"; }
  else { label = "等待"; cls = "text-white/40"; }

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20">
      <button
        onClick={() => openRightPanel({ kind: "ai-brief" })}
        className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-[#101b29]/88 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-lg transition-colors hover:border-white/18 hover:bg-[#142131]/92"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#34e6c0_0%,#69b3ff_100%)] text-[#09111c]">
          <Brain size={14} />
        </div>
        <div className="min-w-0 text-left">
          <div className={cn("text-[13px] font-medium leading-tight", cls)}>{label}</div>
          <div className="font-data text-[11px] text-white/40">
            {signalCount > 0 ? `${signalCount} 信号` : "—"}
          </div>
        </div>
      </button>
    </div>
  );
}
