import { FlowTopology } from "../dashboard/FlowTopology";
import { DecisionSummaryBar } from "../dashboard/DecisionSummaryBar";

export function CenterStage() {
  return (
    <div className="relative min-h-0 min-w-0 overflow-clip bg-[#0c1420]">
      <FlowTopology />
      <DecisionSummaryBar />
    </div>
  );
}
