import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** 手动刷新：用最新 store 数据重新计算 */
  refresh: () => void;
}

/**
 * AI 决策摘要 hook — 快照模式
 *
 * 设计理念：交易员需要一个稳定可阅读的决策参考，而非每 3 秒跳动的实时数据。
 * - 首次挂载时用当前数据生成一次 brief
 * - 之后只在用户主动调用 refresh() 时用最新数据重新生成
 * - 不自动跟随轮询更新，避免内容持续跳动
 */
export function useDecisionBrief(input: DecisionDeskInput): DecisionBriefState {
  // 保留最新 input 引用，refresh 时使用
  const latestInputRef = useRef(input);
  latestInputRef.current = input;

  // 快照：只在 refresh 时更新
  const [snapshotInput, setSnapshotInput] = useState(input);

  const context = useMemo(() => buildDecisionContext(snapshotInput), [snapshotInput]);
  const fallback = useMemo(() => buildHeuristicDecisionBrief(context), [context]);

  const [state, setState] = useState<Omit<DecisionBriefState, "refresh">>(() => ({
    brief: fallback,
    loading: false,
    error: null,
  }));

  // 当 fallback 变化时（仅在 snapshotInput 变化后），更新 brief
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
  }, [context, fallback]);

  const refresh = useCallback(() => {
    // 用最新的 store 数据重新生成快照
    setSnapshotInput({ ...latestInputRef.current });
  }, []);

  return { ...state, refresh };
}
