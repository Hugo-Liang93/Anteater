/**
 * RiskPanel -- 风控准入
 *
 * 拆分展示市场状态与风控状态，避免休市时出现“可交易”的误导文案。
 */

import { config } from "@/config";
import type { EnrichedCalendarEvent, RiskWindow } from "@/api/types";
import { isLikelyMarketClosed } from "@/lib/marketStatus";
import { cn } from "@/lib/utils";
import { selectEmployee, useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { Section, PanelShell } from "./shared";
import { safeNumOrNull } from "@/components/overlay/metrics/utils";

export function RiskPanel() {
  const symbol = config.symbols[0];
  const timeframe = config.defaultTimeframe;
  const filterGuard = useEmployeeStore(selectEmployee("filter_guard"));
  const regimeGuard = useEmployeeStore(selectEmployee("regime_guard"));
  const riskOfficer = useEmployeeStore(selectEmployee("risk_officer"));
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const calendarEvents = useSignalStore((s) => s.calendarEvents);
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const latestBar = useMarketStore((s) => s.latestOhlcBars[`${symbol}:${timeframe}`]);
  const connected = useMarketStore((s) => s.connected);

  const blockedRoles = [filterGuard, regimeGuard, riskOfficer].filter(
    (employee) =>
      employee &&
      (employee.status === "blocked" ||
        employee.status === "error" ||
        employee.status === "rejected"),
  );
  const riskBlocked = blockedRoles.length > 0;
  const marketClosed = isLikelyMarketClosed({
    connected,
    quoteTime: quote?.time,
    barTime: latestBar?.time,
    timeframe,
  });

  return (
    <PanelShell title="风控准入">
        <Section title="状态总览">
          <div className="grid grid-cols-2 gap-1.5">
            <StatusCard
              label="市场状态"
              value={marketClosed ? "休市" : connected ? "开盘" : "链路异常"}
              tone={marketClosed ? "warning" : connected ? "positive" : "danger"}
              detail={
                marketClosed
                  ? `基于 ${timeframe} 行情停更判定`
                  : connected
                    ? "报价与 K 线链路正常"
                    : "报价或账户链路未连通"
              }
            />
            <StatusCard
              label="风控状态"
              value={riskBlocked ? "已阻断" : "未阻断"}
              tone={riskBlocked ? "danger" : "positive"}
              detail={
                riskBlocked
                  ? `${blockedRoles.length} 个模块处于阻断态`
                  : marketClosed
                    ? "市场休市中，当前仅表示风控链路未阻断"
                    : "当前未发现 filter/regime/executor 阻断"
              }
            />
          </div>
        </Section>

        <Section title="过滤条件">
          <FilterStats stats={filterGuard?.stats} status={filterGuard?.status} />
        </Section>

        <Section title="市场研判 (Regime)">
          <RegimeStats stats={regimeGuard?.stats} status={regimeGuard?.status} />
        </Section>

        <Section title="经济日历保护">
          <CalendarGuardInfo riskWindows={riskWindows} calendarEvents={calendarEvents} />
        </Section>

        <Section title="风控审批">
          <RiskApprovalStats stats={riskOfficer?.stats} status={riskOfficer?.status} />
        </Section>
    </PanelShell>
  );
}

function StatusCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: "positive" | "danger" | "warning";
  detail: string;
}) {
  const borderCls =
    tone === "danger"
      ? "border-rose-400/20 bg-rose-400/5"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-400/5"
        : "border-emerald-400/20 bg-emerald-400/5";
  const dotCls =
    tone === "danger"
      ? "bg-rose-400"
      : tone === "warning"
        ? "bg-amber-400"
        : "bg-emerald-400";
  const textCls =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warning"
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", borderCls)}>
      <div className="mb-1 flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotCls)} />
        <span className="text-[11px] uppercase tracking-wide text-white/45">{label}</span>
      </div>
      <div className={cn("text-[14px] font-medium", textCls)}>{value}</div>
      <div className="mt-1 text-[11px] text-white/40">{detail}</div>
    </div>
  );
}

function FilterStats({
  stats,
  status,
}: {
  stats?: Record<string, unknown>;
  status?: string;
}) {
  const confirmedPassed = safeNumOrNull(stats?.confirmed_passed) ?? 0;
  const confirmedBlocked = safeNumOrNull(stats?.confirmed_blocked) ?? 0;
  const intrabarPassed = safeNumOrNull(stats?.intrabar_passed) ?? 0;
  const intrabarBlocked = safeNumOrNull(stats?.intrabar_blocked) ?? 0;
  const totalSnapshots =
    safeNumOrNull(stats?.total_snapshots) ??
    confirmedPassed + confirmedBlocked + intrabarPassed + intrabarBlocked;
  const totalPassed =
    safeNumOrNull(stats?.total_passed) ?? confirmedPassed + intrabarPassed;
  const passRate =
    safeNumOrNull(stats?.pass_rate) ??
    (totalSnapshots > 0 ? totalPassed / totalSnapshots : null);
  const blockReasons = normalizeBlockReasons(stats);

  return (
    <div className="space-y-1.5">
      {passRate != null && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-white/50">通过率</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(passRate * 100, 100)}%`,
                backgroundColor:
                  passRate > 0.7 ? "#00d4aa" : passRate > 0.4 ? "#ffa726" : "#ff4757",
              }}
            />
          </div>
          <span className="font-mono text-[13px] text-white/70">
            {(passRate * 100).toFixed(0)}%
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <StatBox label="确认通过" value={confirmedPassed} tone="positive" />
        <StatBox label="确认阻断" value={confirmedBlocked} tone="danger" />
        <StatBox label="盘中通过" value={intrabarPassed} tone="positive" />
        <StatBox label="盘中阻断" value={intrabarBlocked} tone="danger" />
      </div>

      {blockReasons && Object.keys(blockReasons).length > 0 && (
        <div className="rounded-md border border-rose-400/10 bg-rose-400/5 px-2 py-1.5">
          <span className="text-[11px] text-rose-300/60">阻断原因</span>
          {Object.entries(blockReasons).map(([reason, count]) => (
            <div key={reason} className="flex items-center justify-between text-[13px]">
              <span className="text-white/50">{reason}</span>
              <span className="font-mono text-rose-300/80">{String(count)}</span>
            </div>
          ))}
        </div>
      )}

      {status && status !== "working" && status !== "idle" && (
        <div className="text-[11px] text-white/30">状态: {status}</div>
      )}
    </div>
  );
}

function RegimeStats({
  stats,
  status,
}: {
  stats?: Record<string, unknown>;
  status?: string;
}) {
  const regimeType = typeof stats?.regime_type === "string" ? stats.regime_type : null;
  const stability =
    safeNumOrNull(stats?.stability) ??
    extractAverageRegimeStability(stats?.regime_details);
  const adx = safeNumOrNull(stats?.adx);

  const regimeLabel: Record<string, string> = {
    trending: "趋势",
    ranging: "震荡",
    breakout: "突破",
    uncertain: "不确定",
  };

  const regimeColor: Record<string, string> = {
    trending: "text-emerald-400",
    ranging: "text-sky-400",
    breakout: "text-amber-400",
    uncertain: "text-white/50",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
        <span
          className={cn(
            "text-[14px] font-medium",
            regimeType ? regimeColor[regimeType] ?? "text-white/50" : "text-white/30",
          )}
        >
          {regimeType ? regimeLabel[regimeType] ?? regimeType : "等待数据"}
        </span>
        {stability != null && (
          <span className="ml-auto text-[11px] text-white/30">
            稳定度 {(stability * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {adx != null && (
        <div className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5">
          <span className="text-[13px] text-white/50">ADX</span>
          <span className="font-mono text-[13px] text-white/70">{adx.toFixed(1)}</span>
        </div>
      )}

      {status === "blocked" && (
        <div className="text-[13px] text-rose-300/80">当前 Regime 不支持放行，策略已跳过</div>
      )}
      {status === "reviewing" && (
        <div className="text-[13px] text-white/45">Regime 正在参与当前准入判断</div>
      )}
    </div>
  );
}

function CalendarGuardInfo({
  riskWindows,
  calendarEvents,
}: {
  riskWindows: RiskWindow[];
  calendarEvents: EnrichedCalendarEvent[];
}) {
  const activeGuards = riskWindows.filter((window) => window.guard_active);
  const upcomingHigh = calendarEvents
    .filter((event) => event.importance >= 3 && event.countdown_minutes > 0)
    .sort((a, b) => a.countdown_minutes - b.countdown_minutes)
    .slice(0, 3);

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2",
          activeGuards.length > 0
            ? "border-rose-400/15 bg-rose-400/5"
            : "border-white/6 bg-white/[0.02]",
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            activeGuards.length > 0 ? "bg-rose-400" : "bg-emerald-400",
          )}
        />
        <span className="text-[13px] text-white/60">
          {activeGuards.length > 0
            ? `${activeGuards.length} 个保护窗口激活`
            : "无激活保护"}
        </span>
      </div>

      {upcomingHigh.length > 0 && (
        <div className="space-y-1">
          {upcomingHigh.map((event) => (
            <div
              key={event.event_uid}
              className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-white/60">
                {event.event_name}
              </span>
              <span
                className={cn(
                  "ml-2 shrink-0 text-[11px]",
                  event.countdown_minutes < 60 ? "font-medium text-amber-400" : "text-white/35",
                )}
              >
                {formatCountdown(event.countdown_minutes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {upcomingHigh.length === 0 && activeGuards.length === 0 && (
        <p className="text-[13px] text-white/30">近期无高影响事件</p>
      )}
    </div>
  );
}

function RiskApprovalStats({
  stats,
  status,
}: {
  stats?: Record<string, unknown>;
  status?: string;
}) {
  const signalsReceived = safeNumOrNull(stats?.signals_received);
  const signalsPassed = safeNumOrNull(stats?.signals_passed);
  const signalsBlocked = safeNumOrNull(stats?.signals_blocked);
  const approvalRate =
    safeNumOrNull(stats?.approval_rate) ??
    (signalsReceived != null && signalsReceived > 0 && signalsPassed != null
      ? signalsPassed / signalsReceived
      : null);
  const totalChecks = safeNumOrNull(stats?.total_checks) ?? signalsReceived;
  const recentBlocks =
    safeNumOrNull(stats?.recent_blocks) ??
    safeNumOrNull(stats?.risk_blocks) ??
    signalsBlocked;
  const blockReason =
    typeof stats?.last_block_reason === "string"
      ? stats.last_block_reason
      : firstSkipReason(stats?.skip_reasons);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {approvalRate != null && (
          <StatBox
            label="批准率"
            value={`${(approvalRate * 100).toFixed(0)}%`}
            tone={approvalRate > 0.7 ? "positive" : approvalRate > 0.4 ? "warning" : "danger"}
            raw
          />
        )}
        {totalChecks != null && <StatBox label="审批次数" value={totalChecks} tone="neutral" />}
        {recentBlocks != null && (
          <StatBox
            label="近期阻断"
            value={recentBlocks}
            tone={recentBlocks > 0 ? "danger" : "neutral"}
          />
        )}
      </div>

      {blockReason && (
        <div className="rounded-md border border-rose-400/10 bg-rose-400/5 px-2 py-1.5 text-[13px] text-rose-300/70">
          最近阻断: {blockReason}
        </div>
      )}

      {status === "approved" && (
        <div className="text-[13px] text-emerald-300/70">最近一轮信号已通过执行风控</div>
      )}
      {status === "reviewing" && (
        <div className="text-[13px] text-white/45">当前仍有信号在等待风控审核</div>
      )}
      {status === "blocked" && (
        <div className="text-[13px] text-rose-300/70">当前有信号被执行风控阻断</div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
  raw,
}: {
  label: string;
  value: number | string | null;
  tone: "positive" | "danger" | "warning" | "neutral";
  raw?: boolean;
}) {
  if (value == null) return null;

  const borderCls =
    tone === "danger"
      ? "border-rose-400/10"
      : tone === "warning"
        ? "border-amber-400/10"
        : tone === "positive"
          ? "border-emerald-400/10"
          : "border-white/6";
  const valueCls =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "positive"
          ? "text-emerald-300"
          : "text-white/70";

  return (
    <div className={cn("rounded-md border bg-white/[0.02] px-2 py-1.5", borderCls)}>
      <div className="text-[11px] text-white/35">{label}</div>
      <div className={cn("font-mono text-[14px] font-medium", valueCls)}>
        {raw ? value : typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function normalizeBlockReasons(stats?: Record<string, unknown>): Record<string, number> | null {
  const direct = toNumberMap(stats?.block_reasons);
  if (direct && Object.keys(direct).length > 0) {
    return direct;
  }

  const merged = mergeNumberMaps(
    toNumberMap(stats?.confirmed_blocks),
    toNumberMap(stats?.intrabar_blocks),
  );
  return Object.keys(merged).length > 0 ? merged : null;
}

function toNumberMap(value: unknown): Record<string, number> | null {
  if (typeof value !== "object" || value == null) {
    return null;
  }

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number") {
      result[key] = raw;
    }
  }
  return result;
}

function mergeNumberMaps(
  ...maps: Array<Record<string, number> | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [key, value] of Object.entries(map)) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

function extractAverageRegimeStability(value: unknown): number | null {
  if (typeof value !== "object" || value == null) {
    return null;
  }

  const entries = Object.values(value).filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item != null,
  );
  const samples = entries
    .map((item) => safeNumOrNull(item.stability_multiplier))
    .filter((item): item is number => item != null);

  if (samples.length === 0) {
    return null;
  }

  const normalized = samples.map((value) => Math.min(Math.max((value - 1) / 0.2, 0), 1));
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function firstSkipReason(value: unknown): string | null {
  if (typeof value !== "object" || value == null) {
    return null;
  }

  const entries = Object.entries(value).filter(([, count]) => typeof count === "number" && count > 0);
  const first = entries[0];
  return first ? first[0] : null;
}


function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "已过";
  if (minutes < 60) return `${Math.round(minutes)}分钟`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}小时`;
  return `${Math.round(minutes / 1440)}天`;
}
