/**
 * SVG 数据流连线层 — 12 条贝塞尔曲线 + 箭头 + 流动动画
 *
 * 覆盖整个拓扑容器，pointer-events: none（不拦截鼠标事件）。
 * 活跃流线（源/目标 working）显示流动虚线动画。
 */

import { memo, useMemo } from "react";
import { DATA_FLOWS_2D, AGENT_POSITIONS_2D } from "@/config/layout";
import type { EmployeeRoleType } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";

interface FlowLinesProps {
  width: number;
  height: number;
}

const ACTIVE_STATUSES = new Set([
  "working", "walking", "thinking", "judging", "reviewing",
  "signal_ready", "approved", "executed", "success", "submitting",
]);

const DECISION_BRANCH_EDGES = new Set([
  "regime_guard->voter",
  "regime_guard->risk_officer",
  "voter->risk_officer",
]);

/** 生成源节点底部到目标节点顶部的贝塞尔曲线 */
function buildPath(
  sx: number, sy: number,
  tx: number, ty: number,
  biasX = 0,
): string {
  const dy = ty - sy;
  const cy = dy * 0.45;
  return `M ${sx} ${sy} C ${sx + biasX} ${sy + cy}, ${tx + biasX} ${ty - cy}, ${tx} ${ty}`;
}

function getEdgeBias(fromRole: string, toRole: string): number {
  if (fromRole === "regime_guard" && toRole === "voter") return -32;
  if (fromRole === "regime_guard" && toRole === "risk_officer") return 32;
  if (fromRole === "voter" && toRole === "risk_officer") return 20;
  return 0;
}

export const FlowLines = memo(function FlowLines({ width, height }: FlowLinesProps) {
  const employees = useEmployeeStore((s) => s.employees);

  const paths = useMemo(() => {
    if (width === 0 || height === 0) return [];
    return DATA_FLOWS_2D.map(([fromRole, toRole]) => {
      const from = AGENT_POSITIONS_2D[fromRole];
      const to = AGENT_POSITIONS_2D[toRole];
      if (!from || !to) return null;
      const sx = from.x * width;
      const sy = from.y * height + 20; // offset below node center
      const tx = to.x * width;
      const ty = to.y * height - 20;   // offset above node center
      return {
        fromRole,
        toRole,
        d: buildPath(sx, sy, tx, ty, getEdgeBias(fromRole, toRole)),
      };
    }).filter(Boolean) as { fromRole: string; toRole: string; d: string }[];
  }, [width, height]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1]"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 8 6"
          refX="7"
          refY="3"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 8 3 L 0 6 z" fill="rgba(255,255,255,0.18)" />
        </marker>
        <marker
          id="flow-arrow-active"
          viewBox="0 0 8 6"
          refX="7"
          refY="3"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 8 3 L 0 6 z" fill="#23e0b3" fillOpacity={0.6} />
        </marker>
      </defs>
      {paths.map(({ fromRole, toRole, d }) => {
        const fromStatus = employees[fromRole as EmployeeRoleType]?.status ?? "idle";
        const toStatus = employees[toRole as EmployeeRoleType]?.status ?? "idle";
        const isActive = ACTIVE_STATUSES.has(fromStatus) || ACTIVE_STATUSES.has(toStatus);
        const isDecisionBranch = DECISION_BRANCH_EDGES.has(`${fromRole}->${toRole}`);
        const stroke = isActive
          ? "#23e0b3"
          : isDecisionBranch
            ? "rgba(35,224,179,0.34)"
            : "rgba(255,255,255,0.08)";
        const strokeWidth = isActive ? 1.8 : isDecisionBranch ? 1.6 : 1.2;
        const strokeDasharray = isActive ? "6 4" : isDecisionBranch ? "6 5" : "4 6";
        const strokeOpacity = isActive ? 0.55 : isDecisionBranch ? 0.82 : 0.35;
        const markerEnd = isActive || isDecisionBranch ? "url(#flow-arrow-active)" : "url(#flow-arrow)";
        return (
          <path
            key={`${fromRole}-${toRole}`}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeOpacity={strokeOpacity}
            markerEnd={markerEnd}
            style={isActive ? {
              animation: "flow-dash 1.2s linear infinite",
            } : undefined}
          />
        );
      })}
      <style>{`
        @keyframes flow-dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </svg>
  );
});
