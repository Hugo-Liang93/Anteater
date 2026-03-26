import type { AccountInfo, Position, HealthStatus, StrategyInfo, Quote } from "@/api/types";
import type { LiveSignal, QueueInfo } from "@/store/live";

export interface RoleMetricsProps {
  quote: Quote | undefined;
  account: AccountInfo | null;
  positions: Position[];
  connected: boolean;
  strategies: StrategyInfo[];
  health: HealthStatus | null;
  signals: LiveSignal[];
  previewSignals: LiveSignal[];
  queues: QueueInfo[];
}
