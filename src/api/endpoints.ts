/**
 * MT5Services API 端点封装
 * 按领域分组，返回类型与后端对齐
 */

import { apiClient } from "./client";
import type {
  AccountInfo,
  BacktestConfigDefaults,
  BacktestOptimizePayload,
  BacktestParamSpaceTemplate,
  BacktestRecommendation,
  BacktestRunResult,
  BacktestRunPayload,
  HealthStatus,
  OhlcBar,
  Position,
  Quote,
  QueueStatus,
  RiskWindow,
  SignalMonitoringPayload,
  StrategyInfo,
  WalkForwardPayload,
} from "./types";
import type { DecisionBrief, DecisionContext } from "@/types/decision";

// ─── 市场数据 ───

export function fetchQuote(symbol: string) {
  return apiClient.get<Quote>(`/quote?symbol=${symbol}`);
}

export function fetchOhlc(symbol: string, timeframe: string, limit = 100) {
  return apiClient.get<OhlcBar[]>(
    `/ohlc?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`,
  );
}

// ─── 账户 ───

export function fetchAccountInfo() {
  return apiClient.get<AccountInfo>("/account/info");
}

export function fetchPositions() {
  return apiClient.get<Position[]>("/account/positions");
}

// ─── 指标 ───

export function fetchIndicators(symbol: string, timeframe: string) {
  return apiClient.get<Record<string, Record<string, unknown>>>(
    `/indicators/${symbol}/${timeframe}`,
  );
}

export function fetchIndicatorList() {
  return apiClient.get<string[]>("/indicators/list");
}

// ─── 信号 ───

export function fetchRecentSignals(symbol: string, timeframe?: string, scope?: string) {
  let params = `/signals/recent?symbol=${symbol}`;
  if (timeframe) params += `&timeframe=${timeframe}`;
  if (scope) params += `&scope=${scope}`;
  return apiClient.get<unknown>(params);
}

export function fetchStrategies() {
  return apiClient.get<StrategyInfo[]>("/signals/strategies");
}

export function fetchSignalQuality(symbol: string, timeframe: string) {
  return apiClient.get<SignalMonitoringPayload>(
    `/signals/monitoring/quality/${symbol}/${timeframe}`,
  );
}

// ─── 监控 ───

export function fetchHealth() {
  return apiClient.get<HealthStatus>("/monitoring/health");
}

export function fetchQueues() {
  return apiClient.get<QueueStatus[]>("/monitoring/queues");
}

// ─── 经济日历 ───

export function fetchRiskWindows() {
  return apiClient.get<RiskWindow[]>("/economic/calendar/risk-windows");
}

export function fetchCalendarEnriched(hours = 48, importanceMin = 2) {
  return apiClient.get<import("./types").EnrichedCalendarEvent[]>(
    `/economic/calendar/enriched?hours=${hours}&importance_min=${importanceMin}`,
  );
}

// ─── 交易 ───

export function fetchTradePrecheck(params: {
  symbol: string;
  direction: "buy" | "sell";
  volume?: number;
}) {
  return apiClient.post<unknown>("/trade/precheck", params);
}

// ─── 回测 ───

export function fetchBacktestJobs() {
  return apiClient.get<import("./types").BacktestJob[]>("/backtest/jobs");
}

export function fetchBacktestResult(runId: string) {
  return apiClient.get<BacktestRunResult>(`/backtest/results/${runId}`);
}

export function fetchBacktestConfigDefaults() {
  return apiClient.get<BacktestConfigDefaults>("/backtest/config/defaults");
}

export function fetchBacktestParamSpaceTemplate(params: {
  timeframe: string;
  strategies?: string[];
}) {
  const search = new URLSearchParams({ timeframe: params.timeframe });
  if (params.strategies && params.strategies.length > 0) {
    search.set("strategies", params.strategies.join(","));
  }
  return apiClient.get<BacktestParamSpaceTemplate>(
    `/backtest/config/param-space-template?${search.toString()}`,
  );
}

export function submitBacktest(params: BacktestRunPayload) {
  return apiClient.post<{ run_id: string }>("/backtest/run", params);
}

export function submitOptimize(params: BacktestOptimizePayload) {
  return apiClient.post<{ run_id: string }>("/backtest/optimize", params);
}

export function submitWalkForward(params: WalkForwardPayload) {
  return apiClient.post<{ run_id: string }>("/backtest/walk-forward", params);
}

export function generateRecommendation(walkForwardRunId: string) {
  return apiClient.post<BacktestRecommendation>("/backtest/recommendations/generate", {
    walk_forward_run_id: walkForwardRunId,
  });
}

export function fetchRecommendations() {
  return apiClient.get<BacktestRecommendation[]>("/backtest/recommendations");
}

export function fetchRecommendation(recId: string) {
  return apiClient.get<BacktestRecommendation>(`/backtest/recommendations/${recId}`);
}

export function approveRecommendation(recId: string, reason = "") {
  return apiClient.post<unknown>(`/backtest/recommendations/${recId}/approve`, { reason });
}

export function applyRecommendation(recId: string) {
  return apiClient.post<unknown>(`/backtest/recommendations/${recId}/apply`);
}

export function rollbackRecommendation(recId: string) {
  return apiClient.post<unknown>(`/backtest/recommendations/${recId}/rollback`);
}

// ─── Studio 协议端点 (API_CONTRACT) ───

export function fetchStudioAgents() {
  return apiClient.get<unknown>("/studio/agents");
}

export function fetchStudioEvents(limit = 50) {
  return apiClient.get<unknown>(`/studio/events?limit=${limit}`);
}

export function fetchStudioSummary() {
  return apiClient.get<unknown>("/studio/summary");
}

export function fetchStudioAgentDetail(agentId: string) {
  return apiClient.get<unknown>(`/studio/agents/${agentId}`);
}

export function requestDecisionBrief(
  context: DecisionContext,
  path: string,
  signal?: AbortSignal,
) {
  return apiClient.post<DecisionBrief>(
    path,
    { context },
    { signal },
  );
}
