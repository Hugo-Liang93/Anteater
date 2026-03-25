/**
 * 员工详情浮窗 — 对齐 UI_SPEC.md Section 5
 *
 * 5.1 基本信息区（名称、状态、区域、品种）
 * 5.2 当前任务区
 * 5.3 核心指标区（角色专属 KPI）
 * 5.4 最近活动
 * 5.5 异常/告警区
 */

import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { employeeConfigMap, EmployeeRole, statusColor } from "@/config/employees";
import {
  useEmployeeStore,
  type ActionLog,
  type ActivityStatus,
} from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useLiveStore } from "@/store/live";
import { useSignalStore } from "@/store/signals";

/** 区域中文名映射 */
const ZONE_LABELS: Record<string, string> = {
  collection: "采集区", analysis: "分析区", strategy: "策略室",
  voting: "投票区", risk: "风控台", trading: "交易台",
  position: "持仓区", accounting: "财务区", inspection: "巡检台", calendar: "日历区",
};

const DEFAULT_BADGE = { label: "未知", cls: "bg-text-muted/20 text-text-muted" };
const statusBadge: Partial<Record<ActivityStatus, { label: string; cls: string }>> = {
  idle: { label: "空闲", cls: "bg-text-muted/20 text-text-muted" },
  working: { label: "工作中", cls: "bg-success/20 text-success" },
  walking: { label: "移动中", cls: "bg-success/20 text-success" },
  thinking: { label: "思考中", cls: "bg-blue-400/20 text-blue-400" },
  judging: { label: "判断中", cls: "bg-blue-400/20 text-blue-400" },
  waiting: { label: "等待中", cls: "bg-text-muted/20 text-text-muted" },
  signal_ready: { label: "信号就绪", cls: "bg-warning/20 text-warning" },
  reviewing: { label: "审核中", cls: "bg-purple-400/20 text-purple-400" },
  approved: { label: "已通过", cls: "bg-success/20 text-success" },
  submitting: { label: "提交中", cls: "bg-blue-400/20 text-blue-400" },
  executed: { label: "已执行", cls: "bg-success/20 text-success" },
  rejected: { label: "已拒绝", cls: "bg-danger/20 text-danger" },
  warning: { label: "警告", cls: "bg-warning/20 text-warning" },
  alert: { label: "告警", cls: "bg-warning/20 text-warning" },
  success: { label: "完成", cls: "bg-success/20 text-success" },
  error: { label: "异常", cls: "bg-danger/20 text-danger" },
  blocked: { label: "已拦截", cls: "bg-danger/20 text-danger" },
  disconnected: { label: "失联", cls: "bg-danger/20 text-danger" },
  reconnecting: { label: "重连中", cls: "bg-warning/20 text-warning" },
};

const logTypeColor: Record<ActionLog["type"], string> = {
  info: "text-text-secondary",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

export function EmployeeDetail() {
  const selectedId = useEmployeeStore((s) => s.selectedEmployee);
  const employee = useEmployeeStore((s) =>
    selectedId ? s.employees[selectedId] : null,
  );
  const close = useEmployeeStore((s) => s.setSelectedEmployee);

  if (!selectedId || !employee) return null;

  const cfg = employeeConfigMap.get(selectedId);
  if (!cfg) return null;

  const badge = statusBadge[employee.status] ?? DEFAULT_BADGE;
  const isAbnormal = employee.status === "error" || employee.status === "alert"
    || employee.status === "blocked" || employee.status === "disconnected"
    || employee.status === "warning";

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-xl border border-border bg-bg-panel shadow-2xl">
      {/* ─── 5.1 基本信息区 ─── */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-bg-primary"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.name[0]}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{cfg.name}</h3>
          <p className="text-xs text-text-muted">{cfg.title}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px]", badge.cls)}>
          {badge.label}
        </span>
        <button
          onClick={() => close(null)}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      {/* 区域 + 品种 + 后端模块 */}
      <div className="flex gap-3 border-b border-border px-4 py-2 text-[10px] text-text-muted">
        <span>{ZONE_LABELS[cfg.zone] ?? cfg.zone}</span>
        <span>·</span>
        <span>XAUUSD</span>
        <span>·</span>
        <span>{cfg.backendComponent}</span>
      </div>

      {/* ─── 5.2 当前任务区 ─── */}
      <div className="border-b border-border px-4 py-3">
        <Label>当前任务</Label>
        <p className="mt-1 text-sm text-text-primary">{employee.currentTask}</p>
      </div>

      {/* ─── 5.3 核心指标区（角色专属） ─── */}
      <RoleMetrics roleId={selectedId} />

      {/* ─── 5.5 异常/告警区 ─── */}
      {isAbnormal && (
        <div className="border-b border-border px-4 py-3">
          <Label>异常信息</Label>
          <div className="mt-1 flex items-start gap-2 rounded-md bg-danger/10 p-2">
            <AlertTriangle size={14} style={{ color: statusColor(employee.status) }} className="mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-medium" style={{ color: statusColor(employee.status) }}>
                {badge.label}
              </span>
              <p className="mt-0.5 text-text-muted">{employee.currentTask}</p>
              {employee.recentActions.length > 0 && employee.recentActions[0]?.type === "error" && (
                <p className="mt-1 text-danger">{employee.recentActions[0].message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5.4 最近活动 ─── */}
      <div className="max-h-40 overflow-y-auto px-4 py-3">
        <Label>最近活动</Label>
        {employee.recentActions.length === 0 ? (
          <p className="mt-1 text-xs text-text-muted">暂无记录</p>
        ) : (
          <div className="mt-1 space-y-1">
            {employee.recentActions.slice(0, 8).map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="shrink-0 text-text-muted">
                  {new Date(log.timestamp).toLocaleTimeString("zh-CN", { hour12: false })}
                </span>
                <span className={logTypeColor[log.type]}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2">
        <p className="text-center text-[10px] text-text-muted">
          点击空白处关闭
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-text-muted">{children}</span>
  );
}

/** 角色专属核心指标面板 — 对齐 UI_SPEC Section 5.3 */
function RoleMetrics({ roleId }: { roleId: string }) {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const connected = useMarketStore((s) => s.connected);
  const strategies = useSignalStore((s) => s.strategies);
  const health = useSignalStore((s) => s.health);
  const indicators = useLiveStore((s) => s.indicators["M5"]);
  const signals = useLiveStore((s) => s.signals);
  const queues = useLiveStore((s) => s.queues);

  let content: React.ReactNode = null;

  switch (roleId) {
    case EmployeeRole.COLLECTOR:
      content = quote ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <KV k="Bid" v={quote.bid.toFixed(2)} color="text-buy" />
            <KV k="Ask" v={quote.ask.toFixed(2)} color="text-sell" />
            <KV k="Spread" v={quote.spread.toFixed(1)} />
          </div>
          <div className="text-[10px] text-text-muted">
            更新时间: {quote.time || "—"}
          </div>
        </div>
      ) : <Empty text="等待行情数据" />;
      break;

    case EmployeeRole.ANALYST:
      if (indicators) {
        const ind = indicators.indicators;
        const rsi = ind["rsi14"]?.["rsi"];
        const atr = ind["atr14"]?.["atr"];
        const adx = ind["adx14"]?.["adx"];
        const macd = ind["macd"]?.["macd"];
        content = (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KV k="RSI(14)" v={rsi != null ? rsi.toFixed(1) : "—"} color={rsi != null && rsi > 70 ? "text-sell" : rsi != null && rsi < 30 ? "text-buy" : undefined} />
              <KV k="ATR(14)" v={atr != null ? atr.toFixed(2) : "—"} />
              <KV k="ADX(14)" v={adx != null ? adx.toFixed(1) : "—"} />
              <KV k="MACD" v={macd != null ? macd.toFixed(4) : "—"} color={macd != null && macd > 0 ? "text-buy" : macd != null && macd < 0 ? "text-sell" : undefined} />
            </div>
            <div className="text-[10px] text-text-muted">
              共 {Object.keys(ind).length} 个指标 · TF: M5
            </div>
          </div>
        );
      } else {
        content = <Empty text="指标计算中..." />;
      }
      break;

    case EmployeeRole.STRATEGIST: {
      const latestSignal = signals[0];
      if (latestSignal) {
        content = (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KV k="最新策略" v={latestSignal.strategy} />
              <KV k="方向" v={latestSignal.direction.toUpperCase()} color={latestSignal.direction === "buy" ? "text-buy" : latestSignal.direction === "sell" ? "text-sell" : undefined} />
              <KV k="置信度" v={`${(latestSignal.confidence * 100).toFixed(0)}%`} />
              <KV k="活跃策略" v={String(strategies.length)} />
            </div>
            {latestSignal.reason && (
              <div className="text-[10px] text-text-muted">原因: {latestSignal.reason}</div>
            )}
          </div>
        );
      } else {
        content = <Empty text={strategies.length > 0 ? `${strategies.length} 个策略评估中` : "等待策略加载"} />;
      }
      break;
    }

    case EmployeeRole.VOTER:
      if (signals.length > 0) {
        // 单次遍历统计方向分布，替代 3 次 filter
        const dirs = signals.reduce(
          (acc, s) => { acc[s.direction] = (acc[s.direction] ?? 0) + 1; return acc; },
          {} as Record<string, number>,
        );
        const buy = dirs["buy"] ?? 0;
        const sell = dirs["sell"] ?? 0;
        const hold = dirs["hold"] ?? 0;
        const total = signals.length;
        content = (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div><div className="text-buy text-lg font-bold">{buy}</div><div className="text-text-muted">买入</div></div>
              <div><div className="text-sell text-lg font-bold">{sell}</div><div className="text-text-muted">卖出</div></div>
              <div><div className="text-text-secondary text-lg font-bold">{hold}</div><div className="text-text-muted">观望</div></div>
            </div>
            <div className="text-[10px] text-text-muted">
              共 {total} 票 · 共识: {buy > sell ? "偏多" : sell > buy ? "偏空" : "分歧"}
            </div>
          </div>
        );
      } else {
        content = <Empty text="等待投票数据" />;
      }
      break;

    case EmployeeRole.RISK_OFFICER: {
      const totalDrops = queues.reduce((s, q) => s + q.drops_oldest + q.drops_newest, 0);
      content = queues.length > 0 ? (
        <div className="space-y-2">
          <div className="space-y-1 text-xs">
            {queues.map((q) => (
              <div key={q.name} className="flex items-center justify-between">
                <span className="text-text-muted">{q.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-bg-secondary">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(q.utilization_pct, 100)}%`,
                      backgroundColor: q.utilization_pct > 80 ? "#ff4757" : q.utilization_pct > 50 ? "#ffa726" : "#00d4aa",
                    }} />
                  </div>
                  <span className={q.status === "normal" ? "text-success" : "text-warning"}>
                    {q.utilization_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {totalDrops > 0 && (
            <div className="text-[10px] text-warning">累计丢弃: {totalDrops} 次</div>
          )}
        </div>
      ) : <Empty text="无队列数据" />;
      break;
    }

    case EmployeeRole.TRADER:
    case EmployeeRole.POSITION_MANAGER:
      if (positions.length > 0) {
        const totalPnL = positions.reduce((s, p) => s + p.profit, 0);
        content = (
          <div className="space-y-2">
            <div className="space-y-1 text-xs">
              {positions.slice(0, 5).map((p) => (
                <div key={p.ticket} className="flex justify-between">
                  <span>
                    <span className={p.type === "buy" ? "text-buy" : "text-sell"}>
                      {p.type === "buy" ? "多" : "空"}
                    </span>{" "}
                    {p.volume}手 @{p.price_open.toFixed(2)}
                  </span>
                  <span className={p.profit >= 0 ? "text-buy" : "text-sell"}>
                    {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-text-muted">总 P&L</span>
              <span className={totalPnL >= 0 ? "text-buy" : "text-sell"}>
                {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
              </span>
            </div>
          </div>
        );
      } else {
        content = <Empty text="无持仓" />;
      }
      break;

    case EmployeeRole.ACCOUNTANT:
      content = account ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <KV k="余额" v={`$${account.balance.toFixed(2)}`} />
          <KV k="净值" v={`$${account.equity.toFixed(2)}`} />
          <KV k="保证金" v={`$${account.margin.toFixed(2)}`} />
          <KV k="可用" v={`$${account.free_margin.toFixed(2)}`} />
          <KV k="盈亏" v={`$${account.profit.toFixed(2)}`} color={account.profit >= 0 ? "text-buy" : "text-sell"} />
          <KV k="杠杆" v={`1:${account.leverage}`} />
        </div>
      ) : <Empty text="等待账户数据" />;
      break;

    case EmployeeRole.INSPECTOR:
      if (health) {
        const comps = Object.entries(health.components);
        const issues = comps.filter(([, c]) => c.status !== "healthy");
        content = (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <KV k="总体状态" v={health.status} color={health.status === "healthy" ? "text-success" : health.status === "degraded" ? "text-warning" : "text-danger"} />
              <KV k="组件数" v={String(comps.length)} />
            </div>
            {issues.length > 0 && (
              <div className="space-y-1">
                {issues.map(([name, comp]) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span className="text-text-muted">{name}</span>
                    <span className="text-warning">{comp.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        content = <Empty text={connected ? "巡检中..." : "等待连接"} />;
      }
      break;

    case EmployeeRole.CALENDAR_REPORTER: {
      const riskWindows = useSignalStore.getState().riskWindows;
      if (riskWindows.length > 0) {
        const now = Date.now();
        const highImpact = riskWindows.filter((w) => w.impact === "high");
        const activeGuards = riskWindows.filter((w) => w.guard_active);
        // 按时间排序，过滤未来事件
        const upcoming = riskWindows
          .map((w) => ({ ...w, ms: new Date(w.datetime).getTime() - now }))
          .filter((w) => w.ms > 0)
          .sort((a, b) => a.ms - b.ms);

        content = (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <KV k="总事件" v={String(riskWindows.length)} />
              <KV k="高影响" v={String(highImpact.length)} color={highImpact.length > 0 ? "text-warning" : undefined} />
              <KV k="防护中" v={String(activeGuards.length)} color={activeGuards.length > 0 ? "text-danger" : undefined} />
            </div>
            {upcoming.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-text-muted">即将公布</div>
                {upcoming.slice(0, 3).map((w, i) => {
                  const timeStr = w.ms < 3600_000
                    ? `${Math.round(w.ms / 60_000)}分钟`
                    : `${Math.round(w.ms / 3600_000)}小时`;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          w.impact === "high" ? "bg-danger" : w.impact === "medium" ? "bg-warning" : "bg-text-muted",
                        )} />
                        <span className="text-text-secondary">{w.event_name}</span>
                        <span className="text-[10px] text-text-muted">{w.currency}</span>
                      </span>
                      <span className={w.ms < 3600_000 ? "font-medium text-warning" : "text-text-muted"}>
                        {timeStr}后
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {activeGuards.length > 0 && (
              <div className="rounded bg-danger/10 p-1.5 text-[10px] text-danger">
                风险防护已激活: {activeGuards.map((w) => w.event_name).join(", ")}
              </div>
            )}
          </div>
        );
      } else {
        content = <Empty text={connected ? "经济日历无近期事件" : "等待连接"} />;
      }
      break;
    }

    default:
      content = <Empty text={`${strategies.length} 个策略就绪`} />;
  }

  if (!content) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <Label>核心指标</Label>
      <div className="mt-1">{content}</div>
    </div>
  );
}

function KV({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div className="text-text-muted">{k}</div>
      <div className={`font-mono ${color ?? "text-text-primary"}`}>{v}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-text-muted">{text}</p>;
}
