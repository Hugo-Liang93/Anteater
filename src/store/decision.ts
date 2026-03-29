import { create } from "zustand";
import type { DecisionBriefSource, DecisionStance } from "@/types/decision";

export type DecisionRecordStatus = "adopted" | "deferred" | "dismissed";

export interface DecisionRecord {
  id: string;
  createdAt: number;
  focus: string;
  stance: DecisionStance;
  confidence: number;
  action: string;
  summary: string;
  status: DecisionRecordStatus;
  source: DecisionBriefSource;
  sourceLabel: string;
}

interface DecisionState {
  records: DecisionRecord[];
  addRecord: (record: Omit<DecisionRecord, "id" | "createdAt">) => void;
}

let decisionSeq = 0;

export const useDecisionStore = create<DecisionState>((set) => ({
  records: [],
  addRecord: (record) =>
    set((state) => ({
      records: [
        {
          ...record,
          id: `decision-${++decisionSeq}`,
          createdAt: Date.now(),
        },
        ...state.records,
      ].slice(0, 12),
    })),
}));
