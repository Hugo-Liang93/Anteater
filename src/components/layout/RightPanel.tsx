import { lazy, Suspense } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, type RightPanelState } from "@/store/ui";
import { EmployeeDetail } from "../overlay/EmployeeDetail";

const LazyAIBriefPanel = lazy(() => import("../overlay/AIBriefPanel"));
const LazyAIWorkbenchPanel = lazy(() => import("../overlay/AIWorkbenchPanel"));

// ─── Panel content renderer ───

function PanelContent({
  panel,
  onClose,
}: {
  panel: Exclude<RightPanelState, { kind: "closed" }>;
  onClose: () => void;
}) {
  switch (panel.kind) {
    case "workflow":
    case "employee":
      return <EmployeeDetail />;

    case "ai-brief":
      return (
        <Suspense
          fallback={
            <div className="flex h-full flex-col">
              <PanelHeader title="AI 简报" onClose={onClose} />
              <div className="flex flex-1 items-center justify-center text-sm text-white/40">
                正在加载...
              </div>
            </div>
          }
        >
          <LazyAIBriefPanel onClose={onClose} />
        </Suspense>
      );

    case "ai-workbench":
      return (
        <Suspense
          fallback={
            <div className="flex h-full flex-col">
              <PanelHeader title="AI 工作台" onClose={onClose} />
              <div className="flex flex-1 items-center justify-center text-sm text-white/40">
                正在加载...
              </div>
            </div>
          }
        >
          <LazyAIWorkbenchPanel onClose={onClose} />
        </Suspense>
      );
  }
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
      <span className="text-sm font-medium text-white/80">{title}</span>
      <button
        onClick={onClose}
        className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/8 hover:text-white/70"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─── RightPanel ───

export function RightPanel() {
  const rightPanel = useUIStore((s) => s.rightPanel);
  const closeRightPanel = useUIStore((s) => s.closeRightPanel);

  const isOpen = rightPanel.kind !== "closed";
  const isWide = rightPanel.kind === "ai-workbench";

  return (
    <aside
      className={cn(
        "min-h-0 overflow-hidden border-l border-white/8 bg-[#0d1723]/95",
        isOpen ? (isWide ? "w-[540px]" : "w-[380px]") : "w-0 border-l-0",
      )}
    >
      {isOpen && (
        <div
          className="flex h-full w-[380px] flex-col"
          style={isWide ? { width: 540 } : undefined}
        >
          <PanelContent
            panel={rightPanel as Exclude<RightPanelState, { kind: "closed" }>}
            onClose={closeRightPanel}
          />
        </div>
      )}
    </aside>
  );
}
