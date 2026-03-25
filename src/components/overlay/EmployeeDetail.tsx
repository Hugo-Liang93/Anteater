/**
 * 员工详情浮窗 — 点击工作室中的员工弹出
 *
 * 显示：角色信息、当前任务、角色专属后端数据、最近动作日志。
 */

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { employeeConfigMap, EmployeeRole } from "@/config/employees";
import {
  useEmployeeStore,
  type ActionLog,
  type ActivityStatus,
} from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useLiveStore } from "@/store/live";
import { useSignalStore } from "@/store/signals";

const statusBadge: Record<ActivityStatus, { label: string; cls: string }> = {
  idle: { label: "空闲", cls: "bg-text-muted/20 text-text-muted" },
  working: { label: "工作中", cls: "bg-success/20 text-success" },
  thinking: { label: "思考中", cls: "bg-blue-400/20 text-blue-400" },
  reviewing: { label: "审核中", cls: "bg-purple-400/20 text-purple-400" },
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

  const badge = statusBadge[employee.status];

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-xl border border-border bg-bg-panel shadow-2xl">
      {/* Header */}
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

      {/* 当前任务 */}
      <div className="border-b border-border px-4 py-3">
        <Label>当前任务</Label>
        <p className="mt-1 text-sm text-text-primary">{employee.currentTask}</p>
      </div>

      {/* 角色专属数据 */}
      <RoleSpecificData roleId={selectedId} />

      {/* 统计数据 */}
      {Object.keys(employee.stats).length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <Label>统计</Label>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(employee.stats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-text-muted">{k}</span>
                <span className="font-mono text-text-primary">
                  {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近动作 */}
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
          点击空白处关闭 · 对话功能即将上线
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

/** 角色专属后端数据面板 */
function RoleSpecificData({ roleId }: { roleId: string }) {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const strategies = useSignalStore((s) => s.strategies);
  const indicators = useLiveStore((s) => s.indicators["M5"]);
  const signals = useLiveStore((s) => s.signals);
  const queues = useLiveStore((s) => s.queues);

  let content: React.ReactNode = null;

  switch (roleId) {
    case EmployeeRole.COLLECTOR:
      if (quote) {
        content = (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <KV k="Bid" v={quote.bid.toFixed(2)} color="text-buy" />
            <KV k="Ask" v={quote.ask.toFixed(2)} color="text-sell" />
            <KV k="Spread" v={quote.spread.toFixed(1)} />
          </div>
        );
      }
      break;

    case EmployeeRole.ANALYST:
      if (indicators) {
        const ind = indicators.indicators;
        const keys = Object.keys(ind).slice(0, 8);
        content = (
          <div className="grid grid-cols-2 gap-1 text-xs">
            {keys.map((k) => {
              const vals = ind[k];
              const mainVal = vals ? Object.values(vals).find((v) => v != null) : null;
              return (
                <div key={k} className="flex justify-between">
                  <span className="text-text-muted">{k}</span>
                  <span className="font-mono text-text-primary">
                    {mainVal != null ? (mainVal as number).toFixed(2) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
      break;

    case EmployeeRole.STRATEGIST:
      if (signals.length > 0) {
        content = (
          <div className="space-y-1 text-xs">
            {signals.slice(0, 5).map((s) => (
              <div key={s.signal_id} className="flex justify-between">
                <span className="text-text-muted">{s.strategy}</span>
                <span className={s.direction === "buy" ? "text-buy" : s.direction === "sell" ? "text-sell" : "text-text-muted"}>
                  {s.direction} {(s.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        );
      }
      break;

    case EmployeeRole.VOTER:
      if (signals.length > 0) {
        const buy = signals.filter((s) => s.direction === "buy").length;
        const sell = signals.filter((s) => s.direction === "sell").length;
        const hold = signals.filter((s) => s.direction === "hold").length;
        content = (
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div><div className="text-buy text-lg font-bold">{buy}</div><div className="text-text-muted">买入</div></div>
            <div><div className="text-sell text-lg font-bold">{sell}</div><div className="text-text-muted">卖出</div></div>
            <div><div className="text-text-secondary text-lg font-bold">{hold}</div><div className="text-text-muted">观望</div></div>
          </div>
        );
      }
      break;

    case EmployeeRole.RISK_OFFICER:
      if (queues.length > 0) {
        content = (
          <div className="space-y-1 text-xs">
            {queues.map((q) => (
              <div key={q.name} className="flex justify-between">
                <span className="text-text-muted">{q.name}</span>
                <span className={q.status === "normal" ? "text-success" : "text-warning"}>
                  {q.utilization_pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        );
      }
      break;

    case EmployeeRole.TRADER:
    case EmployeeRole.POSITION_MANAGER:
      if (positions.length > 0) {
        content = (
          <div className="space-y-1 text-xs">
            {positions.map((p) => (
              <div key={p.ticket} className="flex justify-between">
                <span>
                  <span className={p.type === "buy" ? "text-buy" : "text-sell"}>
                    {p.type === "buy" ? "多" : "空"}
                  </span>{" "}
                  {p.volume}手
                </span>
                <span className={p.profit >= 0 ? "text-buy" : "text-sell"}>
                  {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      break;

    case EmployeeRole.ACCOUNTANT:
      if (account) {
        content = (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <KV k="余额" v={`$${account.balance.toFixed(2)}`} />
            <KV k="净值" v={`$${account.equity.toFixed(2)}`} />
            <KV k="保证金" v={`$${account.margin.toFixed(2)}`} />
            <KV k="可用" v={`$${account.free_margin.toFixed(2)}`} />
            <KV k="杠杆" v={`1:${account.leverage}`} />
          </div>
        );
      }
      break;

    default:
      content = <p className="text-xs text-text-muted">{strategies.length} 个策略就绪</p>;
  }

  if (!content) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <Label>实时数据</Label>
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
