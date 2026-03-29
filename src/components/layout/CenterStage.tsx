import { lazy, Suspense } from "react";
import { AIFloatingBadge } from "../overlay/AIFloatingBadge";

const LazyStudio3D = lazy(() =>
  import("../studio/Studio3D").then((module) => ({
    default: module.Studio3D,
  })),
);

export function CenterStage() {
  return (
    <div className="relative min-h-0 min-w-0 overflow-clip bg-[#101923]">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(255,218,167,0.14),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_20%,rgba(9,17,28,0.16)_100%)]" />
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            正在加载工作室场景...
          </div>
        }
      >
        <LazyStudio3D />
      </Suspense>
      {/* AI floating badge — z-20, only interactive element overlaying canvas */}
      <AIFloatingBadge />
    </div>
  );
}
