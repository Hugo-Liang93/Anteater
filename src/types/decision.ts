import type { EmployeeRoleType } from "@/config/employees";
import type { WorkflowId } from "@/config/workflows";

export type DecisionStance = "偏多" | "偏空" | "观望";
export type DecisionEvidenceTone = "positive" | "warning" | "danger" | "neutral";
export type DecisionBriefSource = "heuristic" | "remote" | "fallback";

export interface DecisionFocusContext {
  workflowId: WorkflowId | null;
  employeeRole: EmployeeRoleType | null;
  title: string;
  subtitle: string;
  focusRoles: string[];
}

export interface DecisionMarketContext {
  symbol: string;
  bid?: number;
  ask?: number;
  spread?: number;
  balance?: number;
  equity?: number;
  openPositionCount: number;
  openPnl: number;
}

export interface DecisionSignalContext {
  formalCount: number;
  previewCount: number;
  recentCount: number;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  dominantBias: DecisionStance;
}

export interface DecisionRiskContext {
  activeGuardCount: number;
  highImpactWindowCount: number;
  activeGuardLabels: string[];
  topWarnings: string[];
}

export interface DecisionOperationContext {
  activeRoleCount: number;
  abnormalRoleCount: number;
  disconnectedRoleCount: number;
  queuePressureCount: number;
  queuePressures: Array<{
    name: string;
    utilizationPct: number;
  }>;
}

export interface DecisionSystemContext {
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  currentTasks: Array<{
    role: string;
    status: string;
    task: string;
  }>;
}

export interface DecisionContextEvent {
  source: string;
  target?: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface DecisionContext {
  generatedAt: string;
  focus: DecisionFocusContext;
  market: DecisionMarketContext;
  signals: DecisionSignalContext;
  risks: DecisionRiskContext;
  operations: DecisionOperationContext;
  system: DecisionSystemContext;
  recentEvents: DecisionContextEvent[];
}

export interface DecisionEvidence {
  title: string;
  value: string;
  tone: DecisionEvidenceTone;
}

export interface DecisionBrief {
  focusTitle: string;
  focusSubtitle: string;
  stance: DecisionStance;
  confidence: number;
  summary: string;
  recommendedAction: string;
  actionHint: string;
  evidence: DecisionEvidence[];
  conflicts: string[];
  risks: string[];
  invalidations: string[];
  focusRoles: string[];
  generatedAt: string;
  source: DecisionBriefSource;
  sourceLabel: string;
}
