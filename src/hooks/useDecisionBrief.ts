import { useEffect, useMemo, useState } from "react";
import { requestDecisionBrief } from "@/api/endpoints";
import { config } from "@/config";
import {
  buildDecisionContext,
  buildHeuristicDecisionBrief,
  normalizeDecisionBrief,
  type DecisionDeskInput,
} from "@/lib/decisionDesk";
import type { DecisionBrief } from "@/types/decision";

interface DecisionBriefState {
  brief: DecisionBrief;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDecisionBrief(input: DecisionDeskInput): DecisionBriefState {
  const [version, setVersion] = useState(0);
  const context = useMemo(() => buildDecisionContext(input), [input]);
  const fallback = useMemo(() => buildHeuristicDecisionBrief(context), [context]);
  const [state, setState] = useState<Omit<DecisionBriefState, "refresh">>(() => ({
    brief: fallback,
    loading: false,
    error: null,
  }));

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      brief: fallback,
      error: null,
      loading: config.decision.provider !== "heuristic",
    }));

    if (config.decision.provider === "heuristic") {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), config.decision.requestTimeoutMs);
    const debounce = window.setTimeout(async () => {
      const result = await requestDecisionBrief(
        context,
        config.decision.briefPath,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      if (result.success && result.data) {
        setState({
          brief: normalizeDecisionBrief(result.data, fallback, "remote", config.decision.modelLabel),
          loading: false,
          error: null,
        });
        return;
      }

      setState({
        brief: normalizeDecisionBrief(
          null,
          fallback,
          "fallback",
          `${config.decision.modelLabel} 回退`,
        ),
        loading: false,
        error: result.error?.message ?? "远程决策接口不可用，已回退到规则推导。",
      });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      window.clearTimeout(debounce);
    };
  }, [context, fallback, version]);

  return {
    ...state,
    refresh: () => setVersion((current) => current + 1),
  };
}
