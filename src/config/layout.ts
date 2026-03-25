/**
 * 场景布局配置 — 按 ARCHITECTURE.md 要求独立管理
 *
 * 所有 3D 场景中的坐标、区域定义集中在此，
 * 避免硬编码在组件中。
 */

import type { EmployeeRoleType } from "./employees";

/** 角色在 3D 场景中的位置 */
export const AGENT_POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  collector:         [-3, 0, -0.4],
  analyst:           [-1, 0, -0.4],
  strategist:        [1, 0, -0.9],
  voter:             [1, 0, 0.8],
  risk_officer:      [3, 0, -0.4],
  trader:            [3, 0, 1.6],
  position_manager:  [1, 0, 2.6],
  accountant:        [-2.5, 0, 2.6],
  calendar_reporter: [-3.5, 0, 1.6],
  inspector:         [-1, 0, 2.6],
};

/** 数据流连接定义（从 → 到，按交易主链路顺序） */
export const DATA_FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  { from: "collector", to: "analyst" },
  { from: "analyst", to: "strategist" },
  { from: "strategist", to: "voter" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  { from: "trader", to: "position_manager" },
];

/** 角色在 2D Canvas 中的位置（比例 0~1） */
export const AGENT_POSITIONS_2D: Record<string, { x: number; y: number }> = {
  collector:         { x: 0.10, y: 0.28 },
  analyst:           { x: 0.32, y: 0.28 },
  strategist:        { x: 0.56, y: 0.22 },
  voter:             { x: 0.56, y: 0.42 },
  risk_officer:      { x: 0.80, y: 0.28 },
  trader:            { x: 0.80, y: 0.52 },
  position_manager:  { x: 0.56, y: 0.72 },
  accountant:        { x: 0.16, y: 0.72 },
  calendar_reporter: { x: 0.10, y: 0.52 },
  inspector:         { x: 0.36, y: 0.72 },
};

/** 2D 数据流连接 */
export const DATA_FLOWS_2D: [string, string][] = [
  ["collector", "analyst"],
  ["analyst", "strategist"],
  ["strategist", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签 */
export const ZONE_LABELS = [
  { label: "采 集 区", x: 0.10, y: 0.12 },
  { label: "分 析 区", x: 0.32, y: 0.12 },
  { label: "策 略 室", x: 0.56, y: 0.09 },
  { label: "风 控 台", x: 0.80, y: 0.14 },
  { label: "交 易 台", x: 0.80, y: 0.42 },
  { label: "持 仓 区", x: 0.56, y: 0.60 },
  { label: "支 持 区", x: 0.20, y: 0.58 },
] as const;
