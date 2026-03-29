/**
 * MT5Services API 响应类型定义
 * 与后端 src/api/schemas.py 对齐
 */

export interface ApiError {
  code: string;
  message: string;
  suggested_action?: string | null;
  details?: Record<string, unknown>;
}

/** 通用 API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata: Record<string, unknown> | null;
}

/** 报价 */
export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: string;
}

/** OHLC K线 */
export interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume: number;
  real_volume: number;
}

/** 账户信息 */
export interface AccountInfo {
  login: number;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  profit: number;
  currency: string;
  leverage: number;
  server: string;
}

/** 持仓 */
export interface Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  price_open: number;
  price_current: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  time: string;
  comment: string;
}

/** 指标快照 */
export interface IndicatorSnapshot {
  symbol: string;
  timeframe: string;
  timestamp: string;
  scope: "confirmed" | "intrabar";
  indicators: Record<string, Record<string, number | null>>;
}

/** 信号事件 */
export interface SignalEvent {
  symbol: string;
  timeframe: string;
  strategy: string;
  signal_state: string;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  scope: "confirmed" | "intrabar";
  timestamp: string;
}

/** 策略信息 */
export interface StrategyInfo {
  name: string;
  category: string;
  preferred_scopes: string[];
  required_indicators: string[];
  regime_affinity: Record<string, number>;
}

/** 健康检查结果 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  components: Record<
    string,
    {
      status: string;
      message?: string;
      last_check?: string;
    }
  >;
  uptime_seconds: number;
}

/** 队列监控 */
export interface QueueStatus {
  channel: string;
  size: number;
  capacity: number;
  usage_pct: number;
  drops: number;
}

/** 经济日历风险窗口 */
export interface RiskWindow {
  event_uid: string;
  event_name: string;
  source: string;
  country: string;
  currency: string;
  importance: number;
  impact: "high" | "medium" | "low";
  session_bucket: string;
  window_start: string;
  window_end: string;
  scheduled_at: string;
  scheduled_at_local: string;
  /** @deprecated 用 scheduled_at 代替 */
  datetime: string;
  guard_active: boolean;
}

/** 精简日历事件（/economic/calendar/enriched） */
export interface EnrichedCalendarEvent {
  event_uid: string;
  event_name: string;
  country: string;
  currency: string;
  importance: number;
  status: string;
  scheduled_at: string;
  scheduled_at_local: string | null;
  countdown_minutes: number;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  gold_impact: {
    above_forecast: "利多" | "利空";
    below_forecast: "利多" | "利空";
    bullish_pct: number | null;
    avg_30m_range: number | null;
    sample_count: number;
    source: "historical" | "static";
  } | null;
}

// ─── 回测 ───

export type BacktestJobStatus = "pending" | "running" | "completed" | "failed";

export interface BacktestJob {
  run_id: string;
  status: BacktestJobStatus;
  job_type: "backtest" | "optimization" | "walk_forward";
  config_summary: Record<string, unknown>;
  submitted_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: number;
  error: string | null;
}

export interface BacktestMetricsSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  expectancy: number;
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_duration: number;
  avg_win: number;
  avg_loss: number;
  avg_bars_held: number;
  total_pnl: number;
  total_pnl_pct: number;
  calmar_ratio: number;
  max_consecutive_wins?: number;
  max_consecutive_losses?: number;
}

export interface BacktestResultConfig {
  symbol: string;
  timeframe: string;
  start_time: string;
  end_time: string;
  strategies?: string[] | null;
  initial_balance?: number;
  min_confidence?: number;
  warmup_bars?: number;
  strategy_params?: Record<string, unknown>;
  strategy_params_per_tf?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface BacktestResult {
  run_id: string;
  config: BacktestResultConfig;
  started_at: string;
  completed_at: string;
  metrics: BacktestMetricsSummary;
  param_set: Record<string, unknown>;
  trades?: unknown[];
  equity_curve?: [string, number][];
  metrics_by_regime?: Record<string, BacktestMetricsSummary>;
  metrics_by_strategy?: Record<string, BacktestMetricsSummary>;
  metrics_by_confidence?: Record<string, BacktestMetricsSummary>;
  filter_stats?: Record<string, unknown> | null;
  signal_evaluations?: unknown[] | null;
}

export interface OptimizationResultSummary {
  run_id: string;
  metrics: BacktestMetricsSummary;
  config: BacktestResultConfig;
  param_set: Record<string, unknown>;
}

export interface WalkForwardSplitSummary {
  split_index: number;
  best_params: Record<string, unknown>;
  in_sample_sharpe: number;
  out_of_sample_sharpe: number;
}

export interface WalkForwardResultSummary {
  run_id: string;
  n_splits: number;
  overfitting_ratio: number;
  consistency_rate: number;
  aggregate_metrics: Pick<
    BacktestMetricsSummary,
    "total_trades" | "win_rate" | "sharpe_ratio" | "max_drawdown" | "total_pnl" | "profit_factor"
  >;
  splits: WalkForwardSplitSummary[];
}

export interface BacktestPendingResult {
  run_id: string;
  status: "pending" | "running";
  progress?: number;
}

export type BacktestRunResult =
  | BacktestResult
  | OptimizationResultSummary[]
  | WalkForwardResultSummary
  | BacktestPendingResult;

export type RecommendationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "rolled_back";

export interface BacktestRecommendationChange {
  section: string;
  key: string;
  old_value: number | null;
  new_value: number;
  change_pct: number;
}

export interface BacktestRecommendation {
  rec_id: string;
  source_run_id: string;
  status: RecommendationStatus;
  changes: BacktestRecommendationChange[];
  overfitting_ratio: number;
  consistency_rate: number;
  oos_sharpe: number;
  oos_win_rate: number;
  oos_total_trades: number;
  rationale: string;
  created_at: string;
  approved_at?: string | null;
  applied_at?: string | null;
  rolled_back_at?: string | null;
  backup_path?: string | null;
}

export interface BacktestConfigDefaults {
  defaults: Record<string, unknown>;
  supported: {
    search_modes: string[];
    sort_metrics: string[];
    run_fields: string[];
    optimize_fields: string[];
    walk_forward_fields: string[];
  };
}

export interface BacktestParamSpaceTemplate {
  timeframe: string;
  requested_strategies: string[];
  resolved_strategies: string[];
  baseline_strategy_params: Record<string, number>;
  param_space: Record<string, unknown[]>;
  notes: string[];
}

export interface BacktestRunPayload {
  symbol: string;
  timeframe: string;
  start_time: string;
  end_time: string;
  strategies?: string[];
  strategy_params?: Record<string, unknown>;
  strategy_params_per_tf?: Record<string, Record<string, unknown>>;
  regime_affinity_overrides?: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

export interface BacktestOptimizePayload extends BacktestRunPayload {
  param_space: Record<string, unknown[]>;
  search_mode?: string;
  max_combinations?: number;
  sort_metric?: string;
}

export interface WalkForwardPayload extends BacktestOptimizePayload {
  n_splits?: number;
  train_ratio?: number;
  anchored?: boolean;
}

/** 信号质量 */
export interface SignalQuality {
  strategy: string;
  total: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_pnl: number;
}

export interface SignalMonitoringPayload {
  symbol: string;
  timeframe: string;
  regime: Record<string, unknown>;
  quality: Record<string, unknown>;
}
