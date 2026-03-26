/**
 * 回测员详情面板
 *
 * - 回测任务列表（状态 + 进度）
 * - 快速启动回测按钮
 * - 选中任务的结果详情（KPI 指标）
 * - 参数推荐审批流程
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useBacktestStore } from "@/store/backtest";
import {
  fetchBacktestJobs, fetchBacktestResult,
  submitBacktest, fetchRecommendations,
  approveRecommendation, applyRecommendation,
} from "@/api/endpoints";
import type { BacktestJob, BacktestResult, BacktestRecommendation } from "@/api/types";
import { KV, Empty } from "./shared";

// ─── 状态颜色 ───

const JOB_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "排队中", cls: "bg-text-muted/20 text-text-muted" },
  running:   { label: "运行中", cls: "bg-blue-400/20 text-blue-400" },
  completed: { label: "已完成", cls: "bg-success/20 text-success" },
  failed:    { label: "失败",   cls: "bg-danger/20 text-danger" },
};

const REC_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending:     { label: "待审批", cls: "bg-warning/20 text-warning" },
  approved:    { label: "已审批", cls: "bg-blue-400/20 text-blue-400" },
  applied:     { label: "已应用", cls: "bg-success/20 text-success" },
  rolled_back: { label: "已回滚", cls: "bg-text-muted/20 text-text-muted" },
};

// ─── 主面板 ───

export function BacktesterMetrics() {
  const jobs = useBacktestStore((s) => s.jobs);
  const results = useBacktestStore((s) => s.results);
  const recommendations = useBacktestStore((s) => s.recommendations);
  const selectedJobId = useBacktestStore((s) => s.selectedJobId);
  const loading = useBacktestStore((s) => s.loading);

  const [tab, setTab] = useState<"jobs" | "result" | "recs">("jobs");

  // 加载任务列表
  const refreshJobs = useCallback(async () => {
    useBacktestStore.getState().setLoading(true);
    try {
      const res = await fetchBacktestJobs();
      if (res.success && res.data) useBacktestStore.getState().setJobs(res.data);
    } finally {
      useBacktestStore.getState().setLoading(false);
    }
  }, []);

  // 快速启动回测
  const quickRun = useCallback(async () => {
    useBacktestStore.getState().setLoading(true);
    try {
      await submitBacktest({
        symbol: "XAUUSD", timeframe: "H1", strategy: "",
        start_date: "", end_date: "",
      });
      await refreshJobs();
    } finally {
      useBacktestStore.getState().setLoading(false);
    }
  }, [refreshJobs]);

  // 查看结果
  const viewResult = useCallback(async (runId: string) => {
    useBacktestStore.getState().setSelectedJobId(runId);
    setTab("result");
    if (!results[runId]) {
      const res = await fetchBacktestResult(runId);
      if (res.success && res.data) useBacktestStore.getState().setResult(runId, res.data);
    }
  }, [results]);

  // 加载推荐
  const loadRecs = useCallback(async (runId: string) => {
    setTab("recs");
    const res = await fetchRecommendations(runId);
    if (res.success && res.data) useBacktestStore.getState().setRecommendations(res.data);
  }, []);

  const selectedResult = selectedJobId ? results[selectedJobId] : null;

  return (
    <div className="space-y-2">
      {/* Tab 切换 */}
      <div className="flex gap-1 text-[10px]">
        {(["jobs", "result", "recs"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "jobs") void refreshJobs(); }}
            className={cn("rounded px-2 py-0.5 transition-colors",
              tab === t ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text-primary")}>
            {{ jobs: "任务", result: "结果", recs: "推荐" }[t]}
          </button>
        ))}
        <button onClick={refreshJobs} disabled={loading}
          className="ml-auto rounded px-2 py-0.5 text-text-muted hover:text-accent disabled:opacity-50">
          {loading ? "..." : "刷新"}
        </button>
      </div>

      {/* ── 任务列表 ── */}
      {tab === "jobs" && (
        <div className="space-y-1.5">
          <button onClick={quickRun} disabled={loading}
            className="w-full rounded border border-accent/30 bg-accent/10 px-2 py-1.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
            快速回测 XAUUSD H1
          </button>

          {jobs.length === 0 ? (
            <Empty text="暂无回测任务，点击上方按钮启动" />
          ) : (
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {jobs.map((job) => (
                <JobCard key={job.run_id} job={job}
                  onView={() => void viewResult(job.run_id)}
                  onRecs={() => void loadRecs(job.run_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 结果详情 ── */}
      {tab === "result" && (
        selectedResult ? <ResultDetail result={selectedResult} /> : <Empty text="选择一个已完成任务查看结果" />
      )}

      {/* ── 推荐列表 ── */}
      {tab === "recs" && (
        recommendations.length > 0
          ? <RecommendationList recs={recommendations} />
          : <Empty text="暂无参数推荐" />
      )}
    </div>
  );
}

// ─── 子组件 ───

function JobCard({ job, onView, onRecs }: { job: BacktestJob; onView: () => void; onRecs: () => void }) {
  const s = JOB_STATUS_STYLE[job.status] ?? JOB_STATUS_STYLE.pending!;
  return (
    <div className="rounded border border-border/50 px-2 py-1.5 text-[10px]">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text-primary">
          {job.job_type === "backtest" ? "回测" : job.job_type === "optimize" ? "优化" : "WF验证"}
        </span>
        <span className={cn("rounded-full px-1.5 py-0.5", s.cls)}>{s.label}</span>
      </div>
      <div className="mt-0.5 text-text-muted">{job.config_summary || job.run_id.slice(0, 8)}</div>
      {job.status === "running" && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg-secondary">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${job.progress}%` }} />
        </div>
      )}
      {job.status === "completed" && (
        <div className="mt-1 flex gap-2">
          <button onClick={onView} className="text-accent hover:underline">查看结果</button>
          <button onClick={onRecs} className="text-warning hover:underline">推荐</button>
        </div>
      )}
      {job.status === "failed" && job.error && (
        <div className="mt-1 text-danger">{job.error}</div>
      )}
    </div>
  );
}

function ResultDetail({ result }: { result: BacktestResult }) {
  const pnlColor = result.net_profit >= 0 ? "text-buy" : "text-sell";
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-text-muted">
        {result.symbol} {result.timeframe} | {result.strategy || "全部策略"} | {result.start_date} ~ {result.end_date}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <KV k="交易数" v={String(result.total_trades)} />
        <KV k="胜率" v={`${(result.win_rate * 100).toFixed(1)}%`} color={result.win_rate > 0.5 ? "text-buy" : "text-sell"} />
        <KV k="夏普" v={result.sharpe_ratio.toFixed(2)} color={result.sharpe_ratio > 1 ? "text-buy" : undefined} />
        <KV k="净利润" v={`$${result.net_profit.toFixed(2)}`} color={pnlColor} />
        <KV k="最大回撤" v={`${(result.max_drawdown * 100).toFixed(1)}%`} color="text-sell" />
        <KV k="盈亏比" v={result.profit_factor.toFixed(2)} color={result.profit_factor > 1.5 ? "text-buy" : undefined} />
      </div>
    </div>
  );
}

function RecommendationList({ recs }: { recs: BacktestRecommendation[] }) {
  const handleApprove = async (recId: string) => {
    await approveRecommendation(recId);
    const res = await fetchRecommendations(recs[0]?.run_id ?? "");
    if (res.success && res.data) useBacktestStore.getState().setRecommendations(res.data);
  };
  const handleApply = async (recId: string) => {
    await applyRecommendation(recId);
    const res = await fetchRecommendations(recs[0]?.run_id ?? "");
    if (res.success && res.data) useBacktestStore.getState().setRecommendations(res.data);
  };

  return (
    <div className="max-h-40 space-y-1.5 overflow-y-auto">
      {recs.map((rec) => {
        const s = REC_STATUS_STYLE[rec.status] ?? REC_STATUS_STYLE.pending!;
        return (
          <div key={rec.rec_id} className="rounded border border-border/50 px-2 py-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">{rec.changes.length} 项参数变更</span>
              <span className={cn("rounded-full px-1.5 py-0.5", s.cls)}>{s.label}</span>
            </div>
            <div className="mt-0.5 text-text-muted">
              过拟合: {rec.overfitting_ratio.toFixed(2)} | 一致性: {(rec.consistency_rate * 100).toFixed(0)}%
            </div>
            {/* 参数变更列表 */}
            <div className="mt-1 space-y-0.5">
              {rec.changes.slice(0, 3).map((c, i) => (
                <div key={i} className="flex justify-between text-text-secondary">
                  <span>{c.param}</span>
                  <span>
                    <span className="text-text-muted">{c.old_value}</span>
                    <span className="mx-1 text-accent">→</span>
                    <span className="text-text-primary">{c.new_value}</span>
                    <span className={cn("ml-1", c.change_pct > 0 ? "text-buy" : "text-sell")}>
                      {c.change_pct > 0 ? "+" : ""}{c.change_pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
              {rec.changes.length > 3 && (
                <div className="text-text-muted">+{rec.changes.length - 3} 更多...</div>
              )}
            </div>
            {/* 操作按钮 */}
            {rec.status === "pending" && (
              <button onClick={() => void handleApprove(rec.rec_id)}
                className="mt-1.5 w-full rounded bg-warning/20 px-2 py-1 text-warning hover:bg-warning/30">
                审批通过
              </button>
            )}
            {rec.status === "approved" && (
              <button onClick={() => void handleApply(rec.rec_id)}
                className="mt-1.5 w-full rounded bg-success/20 px-2 py-1 text-success hover:bg-success/30">
                应用到生产
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
