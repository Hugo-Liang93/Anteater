import { lazy, Suspense } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useStudioSSE } from "@/hooks/useStudioSSE";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomEventFeed } from "./BottomEventFeed";
import { EmployeeDetail } from "../overlay/EmployeeDetail";
import { AIDecisionDeck } from "../overlay/AIDecisionDeck";

const LazyStudio3D = lazy(() =>
  import("../studio/Studio3D").then((module) => ({
    default: module.Studio3D,
  })),
);

export function AppShell() {
  usePolling();
  useStudioSSE();

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,rgba(35,224,179,0.08),transparent_28%),linear-gradient(180deg,#09111c_0%,#0c1420_100%)]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden p-3 pt-2">
        <div className="flex flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-[#0e1622]/72 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <Sidebar />
          <main className="relative flex-1 overflow-hidden bg-[#101923]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(255,218,167,0.14),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_20%,rgba(9,17,28,0.16)_100%)]" />
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-bg-primary text-sm text-text-muted">
                  正在加载工作室场景...
                </div>
              }
            >
              <LazyStudio3D />
            </Suspense>
            <AIDecisionDeck />
            <EmployeeDetail />
          </main>
        </div>
      </div>
      <BottomEventFeed />
    </div>
  );
}
