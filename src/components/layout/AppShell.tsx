import { usePolling } from "@/hooks/usePolling";
import { useStudioSSE } from "@/hooks/useStudioSSE";
import { TopBar } from "./TopBar";
import { NavRail } from "./NavRail";
import { SecondaryPanel } from "./SecondaryPanel";
import { CenterStage } from "./CenterStage";
import { RightPanel } from "./RightPanel";
import { StatusStrip } from "./StatusStrip";

export function AppShell() {
  usePolling();
  useStudioSSE();

  return (
    <div className="grid h-screen overflow-hidden grid-rows-[48px_1fr_32px] grid-cols-[56px_auto_1fr_auto] bg-[radial-gradient(circle_at_top,rgba(35,224,179,0.08),transparent_28%),linear-gradient(180deg,#09111c_0%,#0c1420_100%)]">
      {/* NavRail — spans all 3 rows on the far left */}
      <div className="row-span-3">
        <NavRail />
      </div>

      {/* TopBar — spans remaining 3 columns */}
      <header className="col-span-3">
        <TopBar />
      </header>

      {/* Main content row */}
      <SecondaryPanel />
      <CenterStage />
      <RightPanel />

      {/* StatusStrip — spans remaining 3 columns */}
      <footer className="col-span-3">
        <StatusStrip />
      </footer>
    </div>
  );
}
