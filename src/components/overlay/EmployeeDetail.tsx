/**
 * 员工详情浮窗 — 对齐 UI_SPEC.md Section 5
 *
 * 5.1 基本信息区（名称、状态、区域、品种）
 * 5.2 当前任务区
 * 5.3 核心指标区（角色专属 KPI）— 各角色拆分到 metrics/ 独立文件
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
import { Label } from "./metrics/shared";

// ── 角色 Metrics 组件 ──
import { CollectorMetrics } from "./metrics/CollectorMetrics";
import { AnalystMetrics } from "./metrics/AnalystMetrics";
import { LiveAnalystMetrics } from "./metrics/LiveAnalystMetrics";
import { StrategistMetrics } from "./metrics/StrategistMetrics";
import { LiveStrategistMetrics } from "./metrics/LiveStrategistMetrics";
import { FilterGuardMetrics } from "./metrics/FilterGuardMetrics";
import { RegimeGuardMetrics } from "./metrics/RegimeGuardMetrics";
import { VoterMetrics } from "./metrics/VoterMetrics";
import { RiskOfficerMetrics } from "./metrics/RiskOfficerMetrics";
import { TraderMetrics } from "./metrics/TraderMetrics";
import {
  PositionManagerMetrics,
  AccountantMetrics,
  InspectorMetrics,
  CalendarReporterMetrics,
} from "./metrics/SupportMetrics";
import { BacktesterMetrics } from "./metrics/BacktesterMetrics";

/** 区域中文名映射 */
const ZONE_LABELS: Record<string, string> = {
  collection: "采集区", analysis: "分析区", filter: "过滤区",
  strategy: "策略区", regime: "研判区", decision: "决策区", support: "支持区",
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

/** 角色专属核心指标面板 — dispatch 到独立组件 */
function RoleMetrics({ roleId }: { roleId: string }) {
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const connected = useMarketStore((s) => s.connected);
  const strategies = useSignalStore((s) => s.strategies);
  const health = useSignalStore((s) => s.health);
  const signals = useLiveStore((s) => s.signals);
  const previewSignals = useLiveStore((s) => s.previewSignals);
  const queues = useLiveStore((s) => s.queues);

  const props = { quote, account, positions, connected, strategies, health, signals, previewSignals, queues };

  let content: React.ReactNode = null;

  switch (roleId) {
    case EmployeeRole.COLLECTOR:
      content = <CollectorMetrics {...props} />;
      break;
    case EmployeeRole.ANALYST:
      content = <AnalystMetrics />;
      break;
    case EmployeeRole.LIVE_ANALYST:
      content = <LiveAnalystMetrics />;
      break;
    case EmployeeRole.STRATEGIST:
      content = <StrategistMetrics {...props} />;
      break;
    case EmployeeRole.LIVE_STRATEGIST:
      content = <LiveStrategistMetrics {...props} />;
      break;
    case EmployeeRole.FILTER_GUARD:
      content = <FilterGuardMetrics />;
      break;
    case EmployeeRole.REGIME_GUARD:
      content = <RegimeGuardMetrics />;
      break;
    case EmployeeRole.VOTER:
      content = <VoterMetrics {...props} />;
      break;
    case EmployeeRole.RISK_OFFICER:
      content = <RiskOfficerMetrics />;
      break;
    case EmployeeRole.TRADER:
      content = <TraderMetrics {...props} />;
      break;
    case EmployeeRole.POSITION_MANAGER:
      content = <PositionManagerMetrics {...props} />;
      break;
    case EmployeeRole.ACCOUNTANT:
      content = <AccountantMetrics {...props} />;
      break;
    case EmployeeRole.INSPECTOR:
      content = <InspectorMetrics {...props} />;
      break;
    case EmployeeRole.CALENDAR_REPORTER:
      content = <CalendarReporterMetrics {...props} />;
      break;
    case EmployeeRole.BACKTESTER:
      content = <BacktesterMetrics />;
      break;
  }

  if (!content) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <Label>核心指标</Label>
      <div className="mt-1">{content}</div>
    </div>
  );
}
