/**
 * AI 入口节点 — 左上角，点击打开 AI Brief 面板
 */

import { useUIStore } from "@/store/ui";
import { useLiveStore } from "@/store/live";

export function AIWidget() {
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const signalCount = useLiveStore((s) => s.signals.length);

  return (
    <button
      onClick={() => openRightPanel({ kind: "ai-brief" })}
      className="flex cursor-pointer items-center gap-2 rounded-xl border border-accent/25 px-3 py-2 transition-all hover:border-accent/50 hover:bg-accent/8"
      style={{ background: "rgba(20,33,50,0.85)" }}
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: "linear-gradient(135deg, #34e6c0 0%, #69b3ff 100%)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c1420" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z" />
          <path d="M10 22h4" />
        </svg>
      </div>
      <div className="text-left">
        <div className="text-[12px] font-semibold text-accent">AI 简报</div>
        <div className="font-mono text-[10px] text-text-muted">
          {signalCount > 0 ? `${signalCount} 条信号` : "点击查看"}
        </div>
      </div>
    </button>
  );
}
