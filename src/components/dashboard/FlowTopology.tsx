/**
 * 2D 数据流拓扑图 — CenterStage 的核心内容
 *
 * 四层叠加：
 * - ZoneBands（z-0）：区域泳道背景色带
 * - FlowLines（z-1）：SVG 数据流连线
 * - AgentNode（z-2）：角色/模块卡片，绝对定位
 * - CalendarWidget / AIWidget（z-2）：独立面板
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { AGENT_POSITIONS_2D } from "@/config/layout";
import {
  EmployeeRole,
  employeeConfigs,
  type EmployeeRoleType,
} from "@/config/employees";
import { ZoneBands } from "./ZoneBands";
import { FlowLines } from "./FlowLines";
import { AgentNode } from "./AgentNode";
import { CalendarWidget } from "./CalendarWidget";
import { AIWidget } from "./AIWidget";

/** 过滤掉坐标为负数的隐藏节点 */
const MAIN_CHAIN_ROLES = employeeConfigs
  .filter((config) => config.presentation === "employee")
  .map((c) => c.id)
  .filter((role) => {
    const pos = AGENT_POSITIONS_2D[role];
    return pos && pos.x >= 0 && pos.y >= 0;
  });

const SUPPORT_MODULE_ROLES: EmployeeRoleType[] = [
  EmployeeRole.ACCOUNTANT,
  EmployeeRole.INSPECTOR,
];

const RESEARCH_MODULE_ROLES: EmployeeRoleType[] = [EmployeeRole.BACKTESTER];

export function FlowTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) },
      );
    }
  }, []);

  useEffect(() => {
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateSize]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Layer 0: zone backgrounds */}
      <ZoneBands />

      {/* Layer 1: SVG flow lines */}
      {size.width > 0 && size.height > 0 && (
        <FlowLines width={size.width} height={size.height} />
      )}

      {/* Layer 2: main-chain nodes */}
      {MAIN_CHAIN_ROLES.map((role) => {
        const pos = AGENT_POSITIONS_2D[role];
        if (!pos) return null;
        return (
          <div
            key={role}
            className="absolute z-[2]"
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <AgentNode role={role as EmployeeRoleType} />
          </div>
        );
      })}

      {/* AI 入口 */}
      <div className="absolute z-[2]" style={{ left: 16, top: 64 }}>
        <AIWidget />
      </div>

      {/* 研究验证区 */}
      <div className="absolute z-[2] flex w-[160px] flex-col gap-1.5" style={{ left: 10, bottom: 12 }}>
        <SectionBadge title="研究验证" subtitle="用于验证，不推进交易" />
        {RESEARCH_MODULE_ROLES.map((role) => (
          <AgentNode key={role} role={role} />
        ))}
      </div>

      {/* 支撑证据区 */}
      <div className="absolute z-[2] flex w-[240px] flex-col gap-1.5" style={{ right: 10, top: 52 }}>
        <SectionBadge title="支撑证据" subtitle="供风控与策略读取" />
        <div className="grid grid-cols-1 gap-1.5">
          {SUPPORT_MODULE_ROLES.map((role) => (
            <AgentNode key={role} role={role} />
          ))}
        </div>
        <CalendarWidget />
      </div>
    </div>
  );
}

function SectionBadge({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#132133]/88 px-3 py-2 backdrop-blur-sm">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-white/76">{title}</div>
      <div className="mt-0.5 text-[10px] text-white/38">{subtitle}</div>
    </div>
  );
}
