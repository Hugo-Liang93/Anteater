/**
 * PositionsPanel -- 持仓执行
 *
 * SecondaryPanel 的 "positions" section。
 * 聚合 trader + position_manager + accountant 数据，
 * 展示账户概况、当前持仓、执行状态、仓位跟踪。
 */

import { useMarketStore } from "@/store/market";
import { useEmployeeStore, selectEmployee } from "@/store/employees";
import { cn } from "@/lib/utils";
import { Section, PanelShell } from "./shared";
import { safeNumOrNull } from "@/components/overlay/metrics/utils";

// ─── Main Component ───

export function PositionsPanel() {
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const trader = useEmployeeStore(selectEmployee("trader"));
  const positionManager = useEmployeeStore(selectEmployee("position_manager"));

  const totalPnL = positions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <PanelShell title="持仓执行">
        {/* Section 1: Account Overview */}
        <Section title="账户概况">
          {account ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <AccountStat label="余额" value={`$${account.balance.toFixed(2)}`} />
                <AccountStat label="净值" value={`$${account.equity.toFixed(2)}`} />
                <AccountStat label="保证金" value={`$${account.margin.toFixed(2)}`} />
                <AccountStat label="可用保证金" value={`$${account.free_margin.toFixed(2)}`} />
              </div>

              <div className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2">
                <span className="text-[13px] text-white/50">杠杆</span>
                <span className="font-mono text-[13px] text-white/70">
                  1:{account.leverage}
                </span>
              </div>

              {/* Margin Level */}
              <MarginLevelBar account={account} />
            </div>
          ) : (
            <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-4 text-center">
              <p className="text-[13px] text-white/40">等待账户数据连接</p>
            </div>
          )}
        </Section>

        {/* Section 2: Current Positions */}
        <Section title={`当前持仓 (${positions.length})`}>
          {positions.length > 0 ? (
            <div className="space-y-1.5">
              {/* Total PnL header */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2",
                  totalPnL >= 0
                    ? "border-emerald-400/15 bg-emerald-400/5"
                    : "border-rose-400/15 bg-rose-400/5",
                )}
              >
                <span className="text-[13px] text-white/50">总浮盈</span>
                <span
                  className={cn(
                    "font-mono text-[14px] font-medium",
                    totalPnL >= 0 ? "text-emerald-300" : "text-rose-300",
                  )}
                >
                  {totalPnL >= 0 ? "+" : ""}
                  {totalPnL.toFixed(2)}
                </span>
              </div>

              {/* Individual positions */}
              {positions.map((pos) => (
                <div
                  key={pos.ticket}
                  className="rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-bold",
                          pos.type === "buy"
                            ? "bg-emerald-400/15 text-emerald-400"
                            : "bg-rose-400/15 text-rose-400",
                        )}
                      >
                        {pos.type === "buy" ? "多" : "空"}
                      </span>
                      <span className="font-mono text-[13px] text-white/70">
                        {pos.volume}手
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[13px] font-medium",
                        pos.profit >= 0 ? "text-emerald-300" : "text-rose-300",
                      )}
                    >
                      {pos.profit >= 0 ? "+" : ""}
                      {pos.profit.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/35">
                    <span>开仓 {pos.price_open.toFixed(2)}</span>
                    <span>现价 {pos.price_current.toFixed(2)}</span>
                  </div>

                  {(pos.sl > 0 || pos.tp > 0) && (
                    <div className="mt-0.5 flex items-center gap-3 text-[11px]">
                      {pos.sl > 0 && (
                        <span className="text-rose-300/50">SL {pos.sl.toFixed(2)}</span>
                      )}
                      {pos.tp > 0 && (
                        <span className="text-emerald-300/50">TP {pos.tp.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-4 text-center">
              <p className="text-[13px] text-white/40">当前无持仓</p>
            </div>
          )}
        </Section>

        {/* Section 3: Execution Status */}
        <Section title="执行状态">
          <ExecutionStats stats={trader?.stats} status={trader?.status} />
        </Section>

        {/* Section 4: Position Tracking */}
        <Section title="仓位跟踪">
          <TrackingStats stats={positionManager?.stats} status={positionManager?.status} />
        </Section>
    </PanelShell>
  );
}

// ─── Sub-Components ───

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/6 bg-white/[0.02] px-2 py-1.5">
      <div className="text-[11px] text-white/35">{label}</div>
      <div className="font-mono text-[14px] font-medium text-white/80">{value}</div>
    </div>
  );
}

function MarginLevelBar({ account }: { account: import("@/api/types").AccountInfo }) {
  const marginLevel =
    account.margin > 0 ? (account.equity / account.margin) * 100 : null;

  if (marginLevel == null) {
    return (
      <div className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2">
        <span className="text-[13px] text-white/50">保证金水位</span>
        <span className="text-[13px] text-white/30">无保证金占用</span>
      </div>
    );
  }

  const levelColor =
    marginLevel > 500
      ? "text-emerald-300"
      : marginLevel > 200
        ? "text-amber-300"
        : "text-rose-300";

  const barColor =
    marginLevel > 500 ? "#00d4aa" : marginLevel > 200 ? "#ffa726" : "#ff4757";

  return (
    <div className="rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-white/50">保证金水位</span>
        <span className={cn("font-mono text-[13px] font-medium", levelColor)}>
          {marginLevel.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(marginLevel / 10, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

function ExecutionStats({
  stats,
  status,
}: {
  stats?: Record<string, unknown>;
  status?: string;
}) {
  const executionCount = safeNumOrNull(stats?.execution_count);
  const fillRate = safeNumOrNull(stats?.fill_rate);
  const pendingEntries = safeNumOrNull(stats?.pending_entries);

  const hasData = executionCount != null || fillRate != null || pendingEntries != null;

  return (
    <div className="space-y-1.5">
      {hasData ? (
        <div className="grid grid-cols-2 gap-1.5">
          {executionCount != null && (
            <MiniStat label="执行次数" value={executionCount.toLocaleString()} />
          )}
          {fillRate != null && (
            <MiniStat
              label="成交率"
              value={`${(fillRate * 100).toFixed(0)}%`}
              tone={fillRate > 0.9 ? "positive" : fillRate > 0.5 ? "neutral" : "danger"}
            />
          )}
          {pendingEntries != null && (
            <MiniStat
              label="等待确认"
              value={String(pendingEntries)}
              tone={pendingEntries > 0 ? "warning" : "neutral"}
            />
          )}
        </div>
      ) : (
        <StatusLine status={status} fallback="等待执行数据" />
      )}
    </div>
  );
}

function TrackingStats({
  stats,
  status,
}: {
  stats?: Record<string, unknown>;
  status?: string;
}) {
  const trackedPositions = safeNumOrNull(stats?.tracked_positions);
  const slSet = safeNumOrNull(stats?.sl_set);
  const tpSet = safeNumOrNull(stats?.tp_set);
  const trailingActive = safeNumOrNull(stats?.trailing_active);

  const hasData = trackedPositions != null || slSet != null || tpSet != null;

  return (
    <div className="space-y-1.5">
      {hasData ? (
        <div className="grid grid-cols-2 gap-1.5">
          {trackedPositions != null && (
            <MiniStat label="跟踪仓位" value={String(trackedPositions)} />
          )}
          {slSet != null && (
            <MiniStat label="已设 SL" value={String(slSet)} tone="positive" />
          )}
          {tpSet != null && (
            <MiniStat label="已设 TP" value={String(tpSet)} tone="positive" />
          )}
          {trailingActive != null && (
            <MiniStat label="追踪止损" value={String(trailingActive)} />
          )}
        </div>
      ) : (
        <StatusLine status={status} fallback="等待跟踪数据" />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "danger" | "warning" | "neutral";
}) {
  const valueCls =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "warning"
          ? "text-amber-300"
          : "text-white/70";

  return (
    <div className="rounded-md border border-white/6 bg-white/[0.02] px-2 py-1.5">
      <div className="text-[11px] text-white/35">{label}</div>
      <div className={cn("font-mono text-[13px] font-medium", valueCls)}>{value}</div>
    </div>
  );
}

function StatusLine({ status, fallback }: { status?: string; fallback: string }) {
  const statusLabels: Record<string, string> = {
    working: "工作中",
    idle: "空闲",
    waiting: "等待中",
    executed: "已执行",
    submitting: "提交中",
  };

  return (
    <div className="rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[13px] text-white/40">
      {status ? statusLabels[status] ?? status : fallback}
    </div>
  );
}

