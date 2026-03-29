import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { useBacktestStore } from "@/store/backtest";
import {
  applyRecommendation,
  approveRecommendation,
  fetchBacktestConfigDefaults,
  fetchBacktestParamSpaceTemplate,
  fetchBacktestJobs,
  fetchBacktestResult,
  fetchRecommendations,
  generateRecommendation,
  rollbackRecommendation,
  submitBacktest,
  submitOptimize,
  submitWalkForward,
} from "@/api/endpoints";
import type {
  BacktestConfigDefaults,
  BacktestJob,
  BacktestMetricsSummary,
  BacktestRecommendation,
  BacktestResult,
  BacktestRunResult,
  WalkForwardResultSummary,
} from "@/api/types";
import { Empty, KV, Label } from "./shared";

type TabKey = "config" | "jobs" | "result" | "recs";

interface ConfigForm {
  symbol: string;
  timeframe: string;
  startTime: string;
  endTime: string;
  strategiesText: string;
  initialBalance: string;
  minConfidence: string;
  warmupBars: string;
  riskPercent: string;
  maxPositions: string;
  minVolume: string;
  maxVolume: string;
  maxVolumePerOrder: string;
  maxVolumePerSymbol: string;
  maxVolumePerDay: string;
  dailyLossLimitPct: string;
  maxTradesPerDay: string;
  maxTradesPerHour: string;
  searchMode: string;
  maxCombinations: string;
  sortMetric: string;
  nSplits: string;
  trainRatio: string;
  anchored: boolean;
  strategyParamsText: string;
  strategyParamsPerTfText: string;
  paramSpaceText: string;
  extraConfigText: string;
}

interface ParamSpaceRow {
  key: string;
  valuesText: string;
}

const JOB_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending: { label: "排队中", cls: "bg-text-muted/20 text-text-muted" },
  running: { label: "运行中", cls: "bg-blue-400/20 text-blue-400" },
  completed: { label: "已完成", cls: "bg-success/20 text-success" },
  failed: { label: "失败", cls: "bg-danger/20 text-danger" },
};

const REC_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending: { label: "待审批", cls: "bg-warning/20 text-warning" },
  approved: { label: "已审批", cls: "bg-blue-400/20 text-blue-400" },
  rejected: { label: "已拒绝", cls: "bg-danger/20 text-danger" },
  applied: { label: "已应用", cls: "bg-success/20 text-success" },
  rolled_back: { label: "已回滚", cls: "bg-text-muted/20 text-text-muted" },
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 180);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

function createInitialForm(): ConfigForm {
  const range = defaultDateRange();
  return {
    symbol: "XAUUSD",
    timeframe: "H1",
    startTime: range.start,
    endTime: range.end,
    strategiesText: "",
    initialBalance: "",
    minConfidence: "",
    warmupBars: "",
    riskPercent: "",
    maxPositions: "",
    minVolume: "",
    maxVolume: "",
    maxVolumePerOrder: "",
    maxVolumePerSymbol: "",
    maxVolumePerDay: "",
    dailyLossLimitPct: "",
    maxTradesPerDay: "",
    maxTradesPerHour: "",
    searchMode: "grid",
    maxCombinations: "",
    sortMetric: "sharpe_ratio",
    nSplits: "5",
    trainRatio: "0.7",
    anchored: false,
    strategyParamsText: "{}",
    strategyParamsPerTfText: "{}",
    paramSpaceText: "{}",
    extraConfigText: "{}",
  };
}

function parseJsonObject(
  raw: string,
  label: string,
): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // handled below
  }
  throw new Error(`${label} 必须是 JSON 对象`);
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`数值字段格式错误: ${value}`);
  }
  return parsed;
}

function parseStrategies(value: string): string[] | undefined {
  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function inferScalarValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  const parsed = Number(trimmed);
  if (!Number.isNaN(parsed) && trimmed !== "") {
    return parsed;
  }
  return trimmed;
}

function parseParamValueList(raw: string): unknown[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(inferScalarValue);
}

function readParamSpaceRows(raw: string): {
  rows: ParamSpaceRow[];
  error: string;
} {
  const text = raw.trim();
  if (!text) return { rows: [], error: "" };
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { rows: [], error: "param_space 必须是 JSON 对象" };
    }
    const rows = Object.entries(parsed).map(([key, values]) => ({
      key,
      valuesText: Array.isArray(values) ? values.map((value) => String(value)).join(", ") : "",
    }));
    return { rows, error: "" };
  } catch {
    return { rows: [], error: "param_space JSON 解析失败，请先修正或重新载入模板" };
  }
}

function rowsToParamSpace(rows: ParamSpaceRow[]): Record<string, unknown[]> {
  const next: Record<string, unknown[]> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    const values = parseParamValueList(row.valuesText);
    if (values.length > 0) {
      next[key] = values;
    }
  }
  return next;
}

function isBacktestResult(result: BacktestRunResult): result is BacktestResult {
  return typeof result === "object" && result !== null && "metrics" in result && "config" in result;
}

function isOptimizationResultList(
  result: BacktestRunResult,
): result is BacktestResult[] {
  return Array.isArray(result);
}

function isWalkForwardSummary(
  result: BacktestRunResult,
): result is WalkForwardResultSummary {
  return typeof result === "object" && result !== null && "aggregate_metrics" in result;
}

function isPendingResult(
  result: BacktestRunResult,
): result is { run_id: string; status: "pending" | "running"; progress?: number } {
  return typeof result === "object" && result !== null && "status" in result;
}

function metricColor(value: number, goodThreshold = 0): string | undefined {
  if (value > goodThreshold) return "text-buy";
  if (value < goodThreshold) return "text-sell";
  return undefined;
}

function jobTypeLabel(jobType: BacktestJob["job_type"]): string {
  if (jobType === "backtest") return "回测";
  if (jobType === "optimization") return "优化";
  return "前推验证";
}

export function BacktesterMetrics() {
  const jobs = useBacktestStore((s) => s.jobs);
  const results = useBacktestStore((s) => s.results);
  const recommendations = useBacktestStore((s) => s.recommendations);
  const selectedJobId = useBacktestStore((s) => s.selectedJobId);
  const loading = useBacktestStore((s) => s.loading);

  const [tab, setTab] = useState<TabKey>("config");
  const [defaults, setDefaults] = useState<BacktestConfigDefaults | null>(null);
  const [form, setForm] = useState<ConfigForm>(() => createInitialForm());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autoFollowRunId, setAutoFollowRunId] = useState<string | null>(null);

  useEffect(() => {
    void refreshJobs();
    void loadDefaults();
  }, []);

  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === "pending" || job.status === "running",
    );
    if (!hasActiveJobs && !autoFollowRunId) return undefined;

    const timer = window.setInterval(() => {
      void refreshJobs({ silent: true });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [jobs, autoFollowRunId]);

  useEffect(() => {
    if (!autoFollowRunId) return;
    const job = jobs.find((item) => item.run_id === autoFollowRunId);
    if (!job) return;

    if (job.status === "completed") {
      setMessage(`${jobTypeLabel(job.job_type)}任务已完成，正在加载结果`);
      setAutoFollowRunId(null);
      useBacktestStore.getState().setSelectedJobId(job.run_id);
      setTab("result");
      if (!results[job.run_id]) {
        void fetchBacktestResult(job.run_id).then((res) => {
          if (res.success && res.data) {
            useBacktestStore.getState().setResult(job.run_id, res.data);
          }
        });
      }
      return;
    }

    if (job.status === "failed") {
      setError(job.error || `${jobTypeLabel(job.job_type)}任务失败`);
      setAutoFollowRunId(null);
      setTab("jobs");
    }
  }, [autoFollowRunId, jobs, results]);

  async function loadDefaults() {
    const res = await fetchBacktestConfigDefaults();
    if (!res.success || !res.data) return;
    const data = res.data;
    setDefaults(data);
    setForm((prev) => ({
      ...prev,
      initialBalance:
        prev.initialBalance || stringifyDefault(data.defaults.initial_balance),
      minConfidence:
        prev.minConfidence || stringifyDefault(data.defaults.min_confidence),
      warmupBars:
        prev.warmupBars || stringifyDefault(data.defaults.warmup_bars),
      riskPercent:
        prev.riskPercent || stringifyDefault(data.defaults.risk_percent),
      maxPositions:
        prev.maxPositions || stringifyDefault(data.defaults.max_positions),
      minVolume:
        prev.minVolume || stringifyDefault(data.defaults.min_volume),
      maxVolume:
        prev.maxVolume || stringifyDefault(data.defaults.max_volume),
      maxVolumePerOrder:
        prev.maxVolumePerOrder || stringifyDefault(data.defaults.max_volume_per_order),
      maxVolumePerSymbol:
        prev.maxVolumePerSymbol || stringifyDefault(data.defaults.max_volume_per_symbol),
      maxVolumePerDay:
        prev.maxVolumePerDay || stringifyDefault(data.defaults.max_volume_per_day),
      dailyLossLimitPct:
        prev.dailyLossLimitPct || stringifyDefault(data.defaults.daily_loss_limit_pct),
      maxTradesPerDay:
        prev.maxTradesPerDay || stringifyDefault(data.defaults.max_trades_per_day),
      maxTradesPerHour:
        prev.maxTradesPerHour || stringifyDefault(data.defaults.max_trades_per_hour),
      searchMode:
        prev.searchMode || stringifyDefault(data.defaults.search_mode, "grid"),
      maxCombinations:
        prev.maxCombinations || stringifyDefault(data.defaults.max_combinations),
      sortMetric:
        prev.sortMetric || stringifyDefault(data.defaults.sort_metric, "sharpe_ratio"),
    }));
  }

  async function refreshJobs(options?: { silent?: boolean }) {
    if (!options?.silent) {
      useBacktestStore.getState().setLoading(true);
    }
    try {
      const res = await fetchBacktestJobs();
      if (res.success && res.data) {
        useBacktestStore.getState().setJobs(res.data);
      }
    } finally {
      if (!options?.silent) {
        useBacktestStore.getState().setLoading(false);
      }
    }
  }

  async function refreshRecommendations() {
    const res = await fetchRecommendations();
    if (res.success && res.data) {
      useBacktestStore.getState().setRecommendations(res.data);
    }
  }

  async function loadParamSpaceTemplate() {
    setError("");
    setMessage("");
    useBacktestStore.getState().setLoading(true);
    try {
      const strategies = parseStrategies(form.strategiesText);
      const res = await fetchBacktestParamSpaceTemplate({
        timeframe: form.timeframe.trim(),
        strategies,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.toString() ?? "加载参数模板失败");
      }

      const template = res.data;
      setForm((prev) => ({
        ...prev,
        strategiesText:
          prev.strategiesText.trim() || template.resolved_strategies.join(","),
        paramSpaceText: JSON.stringify(template.param_space, null, 2),
      }));

      if (template.resolved_strategies.length === 0) {
        setMessage("当前 timeframe 没有匹配到可生成模板的策略");
      } else if (Object.keys(template.param_space).length === 0) {
        setMessage(
          `已解析 ${template.resolved_strategies.length} 个策略，但当前没有可直接复用的参数模板`,
        );
      } else {
        setMessage(
          `已载入 ${template.resolved_strategies.length} 个策略的参数范围模板`,
        );
      }
    } catch (templateError) {
      setError(
        templateError instanceof Error ? templateError.message : "加载参数模板失败",
      );
    } finally {
      useBacktestStore.getState().setLoading(false);
    }
  }

  async function submit(mode: "backtest" | "optimization" | "walk_forward") {
    setError("");
    setMessage("");
    useBacktestStore.getState().setLoading(true);
    try {
      const strategyParams = parseJsonObject(form.strategyParamsText, "strategy_params");
      const strategyParamsPerTf = parseJsonObject(
        form.strategyParamsPerTfText,
        "strategy_params_per_tf",
      );
      const extraConfig = parseJsonObject(form.extraConfigText, "advanced config");
      const basePayload: {
        symbol: string;
        timeframe: string;
        start_time: string;
        end_time: string;
        strategies?: string[];
        initial_balance?: number;
        min_confidence?: number;
        warmup_bars?: number;
        strategy_params: Record<string, unknown>;
        strategy_params_per_tf: Record<string, Record<string, unknown>>;
        [key: string]: unknown;
      } = {
        symbol: form.symbol.trim(),
        timeframe: form.timeframe.trim(),
        start_time: form.startTime,
        end_time: form.endTime,
        strategy_params: strategyParams,
        strategy_params_per_tf: strategyParamsPerTf as Record<string, Record<string, unknown>>,
        ...extraConfig,
      };
      const strategies = parseStrategies(form.strategiesText);
      if (strategies) basePayload.strategies = strategies;

      const initialBalance = parseOptionalNumber(form.initialBalance);
      if (initialBalance !== undefined) basePayload.initial_balance = initialBalance;
      const minConfidence = parseOptionalNumber(form.minConfidence);
      if (minConfidence !== undefined) basePayload.min_confidence = minConfidence;
      const warmupBars = parseOptionalNumber(form.warmupBars);
      if (warmupBars !== undefined) basePayload.warmup_bars = warmupBars;
      const riskPercent = parseOptionalNumber(form.riskPercent);
      if (riskPercent !== undefined) basePayload.risk_percent = riskPercent;
      const maxPositions = parseOptionalNumber(form.maxPositions);
      if (maxPositions !== undefined) basePayload.max_positions = Math.trunc(maxPositions);
      const minVolume = parseOptionalNumber(form.minVolume);
      if (minVolume !== undefined) basePayload.min_volume = minVolume;
      const maxVolume = parseOptionalNumber(form.maxVolume);
      if (maxVolume !== undefined) basePayload.max_volume = maxVolume;
      const maxVolumePerOrder = parseOptionalNumber(form.maxVolumePerOrder);
      if (maxVolumePerOrder !== undefined) basePayload.max_volume_per_order = maxVolumePerOrder;
      const maxVolumePerSymbol = parseOptionalNumber(form.maxVolumePerSymbol);
      if (maxVolumePerSymbol !== undefined) basePayload.max_volume_per_symbol = maxVolumePerSymbol;
      const maxVolumePerDay = parseOptionalNumber(form.maxVolumePerDay);
      if (maxVolumePerDay !== undefined) basePayload.max_volume_per_day = maxVolumePerDay;
      const dailyLossLimitPct = parseOptionalNumber(form.dailyLossLimitPct);
      if (dailyLossLimitPct !== undefined) basePayload.daily_loss_limit_pct = dailyLossLimitPct;
      const maxTradesPerDay = parseOptionalNumber(form.maxTradesPerDay);
      if (maxTradesPerDay !== undefined) basePayload.max_trades_per_day = Math.trunc(maxTradesPerDay);
      const maxTradesPerHour = parseOptionalNumber(form.maxTradesPerHour);
      if (maxTradesPerHour !== undefined) basePayload.max_trades_per_hour = Math.trunc(maxTradesPerHour);

      if (mode === "backtest") {
        const response = await submitBacktest(basePayload);
        if (!response.success) {
          throw new Error(response.error?.toString() ?? "回测任务提交失败");
        }
        if (response.data?.run_id) {
          setAutoFollowRunId(response.data.run_id);
        }
        setMessage("回测任务已提交");
      } else {
        const paramSpace = parseJsonObject(form.paramSpaceText, "param_space");
        const optimizePayload: {
          symbol: string;
          timeframe: string;
          start_time: string;
          end_time: string;
          strategies?: string[];
          initial_balance?: number;
          min_confidence?: number;
          warmup_bars?: number;
          strategy_params: Record<string, unknown>;
          strategy_params_per_tf: Record<string, Record<string, unknown>>;
          param_space: Record<string, unknown[]>;
          search_mode?: string;
          max_combinations?: number;
          sort_metric?: string;
          n_splits?: number;
          train_ratio?: number;
          anchored?: boolean;
          [key: string]: unknown;
        } = {
          ...basePayload,
          param_space: paramSpace as Record<string, unknown[]>,
        };
        const searchMode = form.searchMode.trim();
        if (searchMode) optimizePayload.search_mode = searchMode;
        const maxCombinations = parseOptionalNumber(form.maxCombinations);
        if (maxCombinations !== undefined) {
          optimizePayload.max_combinations = Math.trunc(maxCombinations);
        }
        const sortMetric = form.sortMetric.trim();
        if (sortMetric) optimizePayload.sort_metric = sortMetric;

        if (mode === "optimization") {
          const response = await submitOptimize(optimizePayload);
          if (!response.success) {
            throw new Error(response.error?.toString() ?? "优化任务提交失败");
          }
          if (response.data?.run_id) {
            setAutoFollowRunId(response.data.run_id);
          }
          setMessage("优化任务已提交");
        } else {
          const nSplits = parseOptionalNumber(form.nSplits);
          if (nSplits !== undefined) optimizePayload.n_splits = Math.trunc(nSplits);
          const trainRatio = parseOptionalNumber(form.trainRatio);
          if (trainRatio !== undefined) optimizePayload.train_ratio = trainRatio;
          optimizePayload.anchored = form.anchored;
          const response = await submitWalkForward(optimizePayload);
          if (!response.success) {
            throw new Error(response.error?.toString() ?? "Walk-Forward 任务提交失败");
          }
          if (response.data?.run_id) {
            setAutoFollowRunId(response.data.run_id);
          }
          setMessage("Walk-Forward 任务已提交");
        }
      }

      setTab("jobs");
      await refreshJobs();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "提交任务失败",
      );
    } finally {
      useBacktestStore.getState().setLoading(false);
    }
  }

  async function selectJob(runId: string) {
    useBacktestStore.getState().setSelectedJobId(runId);
    setTab("result");
    if (results[runId]) return;
    const res = await fetchBacktestResult(runId);
    if (res.success && res.data) {
      useBacktestStore.getState().setResult(runId, res.data);
    }
  }

  async function loadJobRecommendations(runId: string) {
    useBacktestStore.getState().setSelectedJobId(runId);
    setTab("recs");
    await refreshRecommendations();
  }

  async function generateForWalkForward(runId: string) {
    setError("");
    setMessage("");
    useBacktestStore.getState().setLoading(true);
    try {
      const res = await generateRecommendation(runId);
      if (!res.success) {
        throw new Error(res.error?.toString() ?? "生成推荐失败");
      }
      useBacktestStore.getState().setSelectedJobId(runId);
      setMessage("参数推荐已生成");
      setTab("recs");
      await refreshRecommendations();
    } catch (genError) {
      setError(genError instanceof Error ? genError.message : "生成推荐失败");
    } finally {
      useBacktestStore.getState().setLoading(false);
    }
  }

  const selectedResult = selectedJobId ? results[selectedJobId] : null;
  const filteredRecommendations = selectedJobId
    ? recommendations.filter((rec) => rec.source_run_id === selectedJobId)
    : recommendations;

  return (
    <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
      <div className="flex gap-1 text-[10px]">
        {(["config", "jobs", "result", "recs"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded px-2 py-0.5 transition-colors",
              tab === key
                ? "bg-accent/20 text-accent"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {{ config: "配置台", jobs: "任务队列", result: "结果分析", recs: "参数推荐" }[key]}
          </button>
        ))}
        <button
          onClick={() => void refreshJobs()}
          disabled={loading}
          className="ml-auto rounded px-2 py-0.5 text-text-muted hover:text-accent disabled:opacity-50"
        >
          {loading ? "..." : "刷新"}
        </button>
      </div>

      {message && (
        <div className="rounded border border-success/20 bg-success/10 px-2 py-1 text-[10px] text-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-danger/20 bg-danger/10 px-2 py-1 text-[10px] text-danger">
          {error}
        </div>
      )}

      {tab === "config" && (
        <ConfigPanel
          form={form}
          defaults={defaults}
          loading={loading}
          onChange={setForm}
          onLoadTemplate={() => void loadParamSpaceTemplate()}
          onRun={() => void submit("backtest")}
          onOptimize={() => void submit("optimization")}
          onWalkForward={() => void submit("walk_forward")}
        />
      )}

      {tab === "jobs" && (
        <div className="space-y-1.5">
          {jobs.length === 0 ? (
            <Empty text="暂无回测任务，先到配置台提交一条任务" />
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {jobs.map((job) => (
                <JobCard
                  key={job.run_id}
                  job={job}
                  onView={() => void selectJob(job.run_id)}
                  onRecs={() => void loadJobRecommendations(job.run_id)}
                  onGenerate={() => void generateForWalkForward(job.run_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "result" && (
        selectedResult ? (
          <ResultPanel result={selectedResult} />
        ) : (
          <Empty text="先从任务队列里选择一个结果" />
        )
      )}

      {tab === "recs" && (
        <RecommendationList
          recs={filteredRecommendations}
          onRefresh={() => void refreshRecommendations()}
        />
      )}
    </div>
  );
}

function stringifyDefault(value: unknown, fallback = ""): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;
  return fallback;
}

function ConfigPanel({
  form,
  defaults,
  loading,
  onChange,
  onLoadTemplate,
  onRun,
  onOptimize,
  onWalkForward,
}: {
  form: ConfigForm;
  defaults: BacktestConfigDefaults | null;
  loading: boolean;
  onChange: Dispatch<SetStateAction<ConfigForm>>;
  onLoadTemplate: () => void;
  onRun: () => void;
  onOptimize: () => void;
  onWalkForward: () => void;
}) {
  const supportedCount =
    (defaults?.supported.run_fields.length ?? 0) +
    (defaults?.supported.optimize_fields.length ?? 0) +
    (defaults?.supported.walk_forward_fields.length ?? 0);
  const searchModes = defaults?.supported.search_modes ?? ["grid", "random"];
  const sortMetrics = defaults?.supported.sort_metrics ?? [
    "sharpe_ratio",
    "sortino_ratio",
    "calmar_ratio",
    "profit_factor",
    "win_rate",
    "total_pnl",
    "expectancy",
  ];

  return (
    <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1 text-[10px]">
      <CollapsibleSection
        title={"基础配置"}
        defaultOpen={true}
        badge={
          defaults
            ? `默认项 ${Object.keys(defaults.defaults).length} / 支持字段 ${supportedCount}`
            : undefined
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="交易品种">
            <input
              value={form.symbol}
              onChange={(e) => onChange((s) => ({ ...s, symbol: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="时间周期">
            <select
              value={form.timeframe}
              onChange={(e) => onChange((s) => ({ ...s, timeframe: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            >
              {config.timeframes.map((timeframe) => (
                <option key={timeframe} value={timeframe}>
                  {timeframe}
                </option>
              ))}
            </select>
          </Field>
          <Field label="开始日期">
            <input
              type="date"
              value={form.startTime}
              onChange={(e) => onChange((s) => ({ ...s, startTime: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="结束日期">
            <input
              type="date"
              value={form.endTime}
              onChange={(e) => onChange((s) => ({ ...s, endTime: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
        </div>
        <Field label="策略列表（逗号分隔）">
          <input
            value={form.strategiesText}
            onChange={(e) => onChange((s) => ({ ...s, strategiesText: e.target.value }))}
            placeholder={"留空 = 全策略"}
            className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary placeholder:text-text-muted"
          />
        </Field>
      </CollapsibleSection>

      <CollapsibleSection title={"运行参数"} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="初始资金">
            <input
              value={form.initialBalance}
              onChange={(e) => onChange((s) => ({ ...s, initialBalance: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="最低置信度">
            <input
              value={form.minConfidence}
              onChange={(e) => onChange((s) => ({ ...s, minConfidence: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="预热 K 线数">
            <input
              value={form.warmupBars}
              onChange={(e) => onChange((s) => ({ ...s, warmupBars: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="搜索模式">
            <select
              value={form.searchMode}
              onChange={(e) => onChange((s) => ({ ...s, searchMode: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            >
              {searchModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>
          <Field label="最大组合数">
            <input
              value={form.maxCombinations}
              onChange={(e) => onChange((s) => ({ ...s, maxCombinations: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="排序指标">
            <select
              value={form.sortMetric}
              onChange={(e) => onChange((s) => ({ ...s, sortMetric: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            >
              {sortMetrics.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
          </Field>
          <Field label="前推切分数">
            <input
              value={form.nSplits}
              onChange={(e) => onChange((s) => ({ ...s, nSplits: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="训练比例">
            <input
              value={form.trainRatio}
              onChange={(e) => onChange((s) => ({ ...s, trainRatio: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
        </div>
        <label className="mt-2 flex items-center gap-2 text-text-secondary">
          <input
            type="checkbox"
            checked={form.anchored}
            onChange={(e) => onChange((s) => ({ ...s, anchored: e.target.checked }))}
          />
          使用锚定窗口
        </label>
      </CollapsibleSection>

      <CollapsibleSection title={"风控限制"} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="单笔风险百分比">
            <input
              value={form.riskPercent}
              onChange={(e) => onChange((s) => ({ ...s, riskPercent: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="最大持仓数">
            <input
              value={form.maxPositions}
              onChange={(e) => onChange((s) => ({ ...s, maxPositions: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="最小手数">
            <input
              value={form.minVolume}
              onChange={(e) => onChange((s) => ({ ...s, minVolume: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="最大手数">
            <input
              value={form.maxVolume}
              onChange={(e) => onChange((s) => ({ ...s, maxVolume: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="单笔最大手数">
            <input
              value={form.maxVolumePerOrder}
              onChange={(e) => onChange((s) => ({ ...s, maxVolumePerOrder: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="单品种最大手数">
            <input
              value={form.maxVolumePerSymbol}
              onChange={(e) => onChange((s) => ({ ...s, maxVolumePerSymbol: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="单日最大手数">
            <input
              value={form.maxVolumePerDay}
              onChange={(e) => onChange((s) => ({ ...s, maxVolumePerDay: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="日亏损上限 %">
            <input
              value={form.dailyLossLimitPct}
              onChange={(e) => onChange((s) => ({ ...s, dailyLossLimitPct: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="单日最大交易数">
            <input
              value={form.maxTradesPerDay}
              onChange={(e) => onChange((s) => ({ ...s, maxTradesPerDay: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
          <Field label="单小时最大交易数">
            <input
              value={form.maxTradesPerHour}
              onChange={(e) => onChange((s) => ({ ...s, maxTradesPerHour: e.target.value }))}
              className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
            />
          </Field>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={"高级配置"} defaultOpen={false}>
        <div className="mb-2 flex items-center justify-between rounded border border-border/50 bg-bg-panel/40 px-2 py-2">
          <div>
            <div className="text-text-primary">参数范围模板</div>
            <div className="text-text-muted">
              按当前周期、策略和 `signal.ini` 生效参数生成 `param_space`
            </div>
          </div>
          <button
            type="button"
            onClick={onLoadTemplate}
            disabled={loading}
            className="rounded border border-accent/30 px-2 py-1 text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loading ? "加载中..." : "载入模板"}
          </button>
        </div>
        <JsonField
          label="strategy_params（全局参数）"
          value={form.strategyParamsText}
          onChange={(value) => onChange((s) => ({ ...s, strategyParamsText: value }))}
        />
        <JsonField
          label="strategy_params_per_tf（按周期参数）"
          value={form.strategyParamsPerTfText}
          onChange={(value) => onChange((s) => ({ ...s, strategyParamsPerTfText: value }))}
        />
        <ParamSpaceEditor
          value={form.paramSpaceText}
          onChange={(value) => onChange((s) => ({ ...s, paramSpaceText: value }))}
        />
        <JsonField
          label="advanced_config（附加配置）"
          value={form.extraConfigText}
          onChange={(value) => onChange((s) => ({ ...s, extraConfigText: value }))}
        />
      </CollapsibleSection>

      <div className="grid grid-cols-3 gap-2">
        <ActionButton disabled={loading} tone="accent" onClick={onRun}>
          提交回测
        </ActionButton>
        <ActionButton disabled={loading} tone="warning" onClick={onOptimize}>
          提交优化
        </ActionButton>
        <ActionButton disabled={loading} tone="success" onClick={onWalkForward}>
          提交前推
        </ActionButton>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded border border-border/50 bg-bg-panel/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <Label>{title}</Label>
          {badge && <span className="text-text-muted">{badge}</span>}
        </div>
        <span className="text-text-muted">展开 / 收起</span>
      </summary>
      <div className="border-t border-border/50 px-2 py-2">{children}</div>
    </details>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-text-muted">{label}</div>
      {children}
    </label>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-2 block">
      <div className="mb-1 text-text-muted">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded bg-bg-secondary px-2 py-1 font-mono text-text-primary"
      />
    </label>
  );
}

function ParamSpaceEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [{ rows, error }, setState] = useState(() => readParamSpaceRows(value));

  useEffect(() => {
    setState(readParamSpaceRows(value));
  }, [value]);

  function updateRows(nextRows: ParamSpaceRow[]) {
    setState({ rows: nextRows, error: "" });
    onChange(stringifyJson(rowsToParamSpace(nextRows)));
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-text-muted">param_space</div>
          <div className="text-text-muted">
            每行一个参数，值用逗号分隔；数字和布尔值会自动识别
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateRows([...rows, { key: "", valuesText: "" }])}
          className="rounded border border-border/50 px-2 py-1 text-text-primary transition-colors hover:border-accent hover:text-accent"
        >
          新增参数
        </button>
      </div>

      {error ? (
        <div className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-warning">
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 px-2 py-2 text-text-muted">
          暂无参数范围。可以先点“载入模板”，或手动新增参数。
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={`${row.key}-${index}`} className="grid grid-cols-[1.2fr_1.8fr_auto] gap-2">
              <input
                value={row.key}
                onChange={(e) => {
                  const nextRows = [...rows];
                  nextRows[index] = { ...row, key: e.target.value };
                  updateRows(nextRows);
                }}
                placeholder="supertrend__adx_threshold"
                className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
              />
              <input
                value={row.valuesText}
                onChange={(e) => {
                  const nextRows = [...rows];
                  nextRows[index] = { ...row, valuesText: e.target.value };
                  updateRows(nextRows);
                }}
                placeholder="18, 21, 24"
                className="w-full rounded bg-bg-secondary px-2 py-1 text-text-primary"
              />
              <button
                type="button"
                onClick={() => updateRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                className="rounded border border-danger/30 px-2 py-1 text-danger transition-colors hover:bg-danger/10"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <details className="rounded border border-border/50 bg-bg-panel/30">
        <summary className="cursor-pointer px-2 py-2 text-text-muted">
          查看原始 JSON
        </summary>
        <div className="border-t border-border/50 px-2 py-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className="w-full rounded bg-bg-secondary px-2 py-1 font-mono text-text-primary"
          />
        </div>
      </details>
    </div>
  );
}

function ActionButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "accent" | "warning" | "success";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const cls =
    tone === "accent"
      ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
        : "border-success/30 bg-success/10 text-success hover:bg-success/20";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded border px-2 py-1.5 font-medium transition-colors disabled:opacity-50",
        cls,
      )}
    >
      {children}
    </button>
  );
}

function JobCard({
  job,
  onView,
  onRecs,
  onGenerate,
}: {
  job: BacktestJob;
  onView: () => void;
  onRecs: () => void;
  onGenerate: () => void;
}) {
  const style = JOB_STATUS_STYLE[job.status] ?? {
    label: job.status,
    cls: "bg-text-muted/20 text-text-muted",
  };
  const summary = [
    job.config_summary.symbol,
    job.config_summary.timeframe,
    job.config_summary.search_mode,
  ]
    .filter((item) => typeof item === "string" && item.length > 0)
    .join(" | ");
  const progressPct = Math.max(0, Math.min(job.progress ?? 0, 1)) * 100;

  return (
    <div className="rounded border border-border/50 px-2 py-1.5 text-[10px]">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text-primary">{jobTypeLabel(job.job_type)}</span>
        <span className={cn("rounded-full px-1.5 py-0.5", style.cls)}>{style.label}</span>
      </div>
      <div className="mt-0.5 text-text-muted">{summary || job.run_id}</div>
      {job.status === "running" && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      <div className="mt-1 flex gap-2">
        {job.status === "completed" && (
          <>
            <button onClick={onView} className="text-accent hover:underline">
              查看分析
            </button>
            <button onClick={onRecs} className="text-warning hover:underline">
              参数推荐
            </button>
            {job.job_type === "walk_forward" && (
              <button onClick={onGenerate} className="text-success hover:underline">
                生成建议
              </button>
            )}
          </>
        )}
      </div>
      {job.status === "failed" && job.error && (
        <div className="mt-1 text-danger">{job.error}</div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: BacktestRunResult }) {
  if (isOptimizationResultList(result)) {
    return <OptimizationResultPanel results={result} />;
  }
  if (isWalkForwardSummary(result)) {
    return <WalkForwardPanel result={result} />;
  }
  if (isPendingResult(result)) {
    return (
      <div className="space-y-2">
        <Empty text={`任务状态：${JOB_STATUS_STYLE[result.status]?.label ?? result.status}`} />
        {typeof result.progress === "number" && (
          <div className="text-[10px] text-text-muted">
            进度 {(result.progress * 100).toFixed(0)}%
          </div>
        )}
      </div>
    );
  }

  if (!isBacktestResult(result)) {
    return <Empty text="结果格式暂不支持展示" />;
  }

  const metrics = result.metrics;
  const strategies = result.config.strategies?.join(", ") || "全部策略";
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-text-muted">
        研究标的 {result.config.symbol} / 周期 {result.config.timeframe} / 策略 {strategies}
      </div>
      <MetricsGrid metrics={metrics} />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <KV k="参数项数" v={String(Object.keys(result.param_set ?? {}).length)} />
        <KV k="交易数" v={String(metrics.total_trades)} />
      </div>
    </div>
  );
}

function OptimizationResultPanel({ results }: { results: BacktestResult[] }) {
  if (results.length === 0) return <Empty text="优化结果为空" />;
  const best = results[0]!;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-text-muted">共返回 {results.length} 组优化结果，当前先展示最佳组合</div>
      <ResultPanel result={best} />
    </div>
  );
}

function WalkForwardPanel({ result }: { result: WalkForwardResultSummary }) {
  const metrics = result.aggregate_metrics;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-text-muted">
        前推验证 {result.n_splits} 段 | 过拟合系数 {result.overfitting_ratio.toFixed(2)} | 一致性{" "}
        {(result.consistency_rate * 100).toFixed(0)}%
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <KV k="交易数" v={String(metrics.total_trades)} />
        <KV k="胜率" v={`${(metrics.win_rate * 100).toFixed(1)}%`} color={metricColor(metrics.win_rate, 0.5)} />
        <KV k="夏普" v={metrics.sharpe_ratio.toFixed(2)} color={metricColor(metrics.sharpe_ratio, 1)} />
        <KV k="净利润" v={`$${metrics.total_pnl.toFixed(2)}`} color={metricColor(metrics.total_pnl)} />
        <KV k="最大回撤" v={`${(metrics.max_drawdown * 100).toFixed(1)}%`} color="text-sell" />
        <KV k="盈亏比" v={metrics.profit_factor.toFixed(2)} color={metricColor(metrics.profit_factor, 1.5)} />
      </div>
      <div className="space-y-1">
        {result.splits.slice(0, 4).map((split) => (
          <div key={split.split_index} className="rounded bg-bg-secondary px-2 py-1 text-[10px]">
            第 {split.split_index + 1} 段 | 样本内 {split.in_sample_sharpe.toFixed(2)} | 样本外{" "}
            {split.out_of_sample_sharpe.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: BacktestMetricsSummary }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <KV k="交易数" v={String(metrics.total_trades)} />
      <KV k="胜率" v={`${(metrics.win_rate * 100).toFixed(1)}%`} color={metricColor(metrics.win_rate, 0.5)} />
      <KV k="夏普" v={metrics.sharpe_ratio.toFixed(2)} color={metricColor(metrics.sharpe_ratio, 1)} />
      <KV k="净利润" v={`$${metrics.total_pnl.toFixed(2)}`} color={metricColor(metrics.total_pnl)} />
      <KV k="最大回撤" v={`${(metrics.max_drawdown * 100).toFixed(1)}%`} color="text-sell" />
      <KV k="盈亏比" v={metrics.profit_factor.toFixed(2)} color={metricColor(metrics.profit_factor, 1.5)} />
    </div>
  );
}

function RecommendationList({
  recs,
  onRefresh,
}: {
  recs: BacktestRecommendation[];
  onRefresh: () => void;
}) {
  async function handleApprove(recId: string) {
    await approveRecommendation(recId, "");
    onRefresh();
  }

  async function handleApply(recId: string) {
    await applyRecommendation(recId);
    onRefresh();
  }

  async function handleRollback(recId: string) {
    await rollbackRecommendation(recId);
    onRefresh();
  }

  if (recs.length === 0) {
    return <Empty text="当前任务暂无推荐，先从前推任务生成建议" />;
  }

  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto">
      {recs.map((rec) => {
        const style = REC_STATUS_STYLE[rec.status] ?? {
          label: rec.status,
          cls: "bg-text-muted/20 text-text-muted",
        };
        return (
          <div key={rec.rec_id} className="rounded border border-border/50 px-2 py-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">{rec.changes.length} 项参数变更</span>
              <span className={cn("rounded-full px-1.5 py-0.5", style.cls)}>{style.label}</span>
            </div>
            <div className="mt-0.5 text-text-muted">
              样本外 Sharpe {rec.oos_sharpe.toFixed(2)} | 过拟合系数 {rec.overfitting_ratio.toFixed(2)} | 一致性{" "}
              {(rec.consistency_rate * 100).toFixed(0)}%
            </div>
            <div className="mt-1 space-y-0.5">
              {rec.changes.slice(0, 3).map((change) => (
                <div key={`${change.section}.${change.key}`} className="flex justify-between gap-2 text-text-secondary">
                  <span className="truncate">{change.section}.{change.key}</span>
                  <span className="shrink-0">
                    <span className="text-text-muted">{formatValue(change.old_value)}</span>
                    <span className="mx-1 text-accent">→</span>
                    <span className="text-text-primary">{formatValue(change.new_value)}</span>
                    <span className={cn("ml-1", change.change_pct >= 0 ? "text-buy" : "text-sell")}>
                      {change.change_pct >= 0 ? "+" : ""}
                      {change.change_pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-text-muted">{rec.rationale}</div>
            <div className="mt-1.5 flex gap-2">
              {rec.status === "pending" && (
                <button
                  onClick={() => void handleApprove(rec.rec_id)}
                  className="rounded bg-warning/20 px-2 py-1 text-warning hover:bg-warning/30"
                >
                  审批通过
                </button>
              )}
              {rec.status === "approved" && (
                <button
                  onClick={() => void handleApply(rec.rec_id)}
                  className="rounded bg-success/20 px-2 py-1 text-success hover:bg-success/30"
                >
                  应用
                </button>
              )}
              {rec.status === "applied" && (
                <button
                  onClick={() => void handleRollback(rec.rec_id)}
                  className="rounded bg-text-muted/20 px-2 py-1 text-text-muted hover:bg-text-muted/30"
                >
                  回滚
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(value: number | null): string {
  if (value == null) return "null";
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}
