/**
 * MT5Services API 端点封装
 * 按领域分组，返回类型与后端对齐
 */

import { apiClient } from "./client";
import type {
  AccountInfo,
  HealthStatus,
  IndicatorSnapshot,
  Position,
  Quote,
  QueueStatus,
  RiskWindow,
  SignalQuality,
  StrategyInfo,
} from "./types";

// ─── 市场数据 ───

export function fetchQuote(symbol: string) {
  return apiClient.get<Quote>(`/quote?symbol=${symbol}`);
}

export function fetchOhlc(symbol: string, timeframe: string, count = 100) {
  return apiClient.get<unknown>(
    `/ohlc?symbol=${symbol}&timeframe=${timeframe}&count=${count}`,
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
  return apiClient.get<IndicatorSnapshot>(
    `/indicators/${symbol}/${timeframe}`,
  );
}

export function fetchIndicatorList() {
  return apiClient.get<unknown[]>("/indicators/list");
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
  return apiClient.get<SignalQuality[]>(
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
  return apiClient.get<import("./types").BacktestResult>(`/backtest/results/${runId}`);
}

export function submitBacktest(params: { symbol: string; timeframe: string; strategy: string; start_date: string; end_date: string }) {
  return apiClient.post<{ run_id: string }>("/backtest/run", params);
}

export function submitOptimize(params: { symbol: string; timeframe: string; strategy: string; start_date: string; end_date: string }) {
  return apiClient.post<{ run_id: string }>("/backtest/optimize", params);
}

export function submitWalkForward(params: { symbol: string; timeframe: string; strategy: string; start_date: string; end_date: string }) {
  return apiClient.post<{ run_id: string }>("/backtest/walk-forward", params);
}

export function fetchRecommendations(runId: string) {
  return apiClient.get<import("./types").BacktestRecommendation[]>(`/backtest/recommendations?run_id=${runId}`);
}

export function fetchRecommendation(recId: string) {
  return apiClient.get<import("./types").BacktestRecommendation>(`/backtest/recommendations/${recId}`);
}

export function approveRecommendation(recId: string) {
  return apiClient.post<unknown>(`/backtest/recommendations/${recId}/approve`);
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
