/**
 * 回测状态 Store
 */

import { create } from "zustand";
import type { BacktestJob, BacktestRecommendation, BacktestRunResult } from "@/api/types";

interface BacktestState {
  jobs: BacktestJob[];
  results: Record<string, BacktestRunResult>;
  recommendations: BacktestRecommendation[];
  selectedJobId: string | null;
  loading: boolean;

  setJobs: (jobs: BacktestJob[]) => void;
  setResult: (runId: string, result: BacktestRunResult) => void;
  setRecommendations: (recs: BacktestRecommendation[]) => void;
  setSelectedJobId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useBacktestStore = create<BacktestState>((set) => ({
  jobs: [],
  results: {},
  recommendations: [],
  selectedJobId: null,
  loading: false,

  setJobs: (jobs) => set({ jobs }),
  setResult: (runId, result) => set((s) => ({ results: { ...s.results, [runId]: result } })),
  setRecommendations: (recommendations) => set({ recommendations }),
  setSelectedJobId: (selectedJobId) => set({ selectedJobId }),
  setLoading: (loading) => set({ loading }),
}));
