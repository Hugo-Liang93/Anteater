import { useUIStore, selectActiveNav } from "@/store/ui";
import { cn } from "@/lib/utils";
import { MarketPanel } from "../panels/MarketPanel";
import { SignalsPanel } from "../panels/SignalsPanel";
import { RiskPanel } from "../panels/RiskPanel";
import { PositionsPanel } from "../panels/PositionsPanel";
import { SystemPanel } from "../panels/SystemPanel";

export function SecondaryPanel() {
  const section = useUIStore(selectActiveNav);
  const isOpen = section !== null;

  return (
    <aside
      className={cn(
        "min-h-0 min-w-0 overflow-hidden border-r border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98)_0%,rgba(10,17,28,0.98)_100%)]",
        isOpen ? "w-[320px]" : "w-0 border-r-0",
      )}
    >
      {isOpen && (
        <div className="flex h-full w-[320px] flex-col overflow-hidden">
          {section === "market" && <MarketPanel />}
          {section === "signals" && <SignalsPanel />}
          {section === "risk" && <RiskPanel />}
          {section === "positions" && <PositionsPanel />}
          {section === "system" && <SystemPanel />}
        </div>
      )}
    </aside>
  );
}
