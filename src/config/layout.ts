/**
 * 场景布局配置 — 按 ARCHITECTURE.md 要求独立管理
 *
 * 所有 3D 场景中的坐标、区域定义集中在此，
 * 避免硬编码在组件中。
 */

import type { EmployeeRoleType } from "./employees";

/** 角色在 3D 场景中的位置 — S 形流水线布局
 *
 * Row 1 (Z=-2.5, L→R): collector → analyst → strategist
 * Row 2 (Z= 0.5, R→L): voter → risk_officer → trader
 * Row 3 (Z= 3.0):      position_manager / accountant / inspector / calendar_reporter
 */
export const AGENT_POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  // ── Row 1: 采集 → 分析 → 策略 ──
  collector:         [-3.5, 0, -2.5],
  analyst:           [0,    0, -2.5],
  strategist:        [3.5,  0, -2.5],
  // ── Row 2: 投票 → 风控 → 交易（S 形回流） ──
  voter:             [3.5,  0,  0.5],
  risk_officer:      [0,    0,  0.5],
  trader:            [-3.5, 0,  0.5],
  // ── Row 3: 支持角色各占独立区域 ──
  position_manager:  [-3.5, 0,  3.0],
  accountant:        [-1,   0,  3.0],
  inspector:         [1.5,  0,  3.0],
  calendar_reporter: [4,    0,  3.0],
};

/** 数据流连接定义（从 → 到，按交易主链路 S 形顺序） */
export const DATA_FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  // Row 1 L→R
  { from: "collector", to: "analyst" },
  { from: "analyst", to: "strategist" },
  // 转弯 Row 1→Row 2
  { from: "strategist", to: "voter" },
  // Row 2 R→L
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  // 转弯 Row 2→Row 3
  { from: "trader", to: "position_manager" },
];

/** 角色在 2D Canvas 中的位置（比例 0~1，对齐 3D S 形布局） */
export const AGENT_POSITIONS_2D: Record<string, { x: number; y: number }> = {
  // Row 1 L→R
  collector:         { x: 0.15, y: 0.18 },
  analyst:           { x: 0.45, y: 0.18 },
  strategist:        { x: 0.75, y: 0.18 },
  // Row 2 R→L
  voter:             { x: 0.75, y: 0.48 },
  risk_officer:      { x: 0.45, y: 0.48 },
  trader:            { x: 0.15, y: 0.48 },
  // Row 3
  position_manager:  { x: 0.15, y: 0.78 },
  accountant:        { x: 0.38, y: 0.78 },
  inspector:         { x: 0.60, y: 0.78 },
  calendar_reporter: { x: 0.83, y: 0.78 },
};

/** 2D 数据流连接（对齐 S 形流水线） */
export const DATA_FLOWS_2D: [string, string][] = [
  ["collector", "analyst"],
  ["analyst", "strategist"],
  ["strategist", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签（对齐 S 形 3 行布局） */
export const ZONE_LABELS = [
  // Row 1
  { label: "采 集 区", x: 0.15, y: 0.08 },
  { label: "分 析 区", x: 0.45, y: 0.08 },
  { label: "策 略 室", x: 0.75, y: 0.08 },
  // Row 2
  { label: "投 票 区", x: 0.75, y: 0.38 },
  { label: "风 控 台", x: 0.45, y: 0.38 },
  { label: "交 易 台", x: 0.15, y: 0.38 },
  // Row 3
  { label: "持 仓 区", x: 0.15, y: 0.68 },
  { label: "财 务 区", x: 0.38, y: 0.68 },
  { label: "巡 检 台", x: 0.60, y: 0.68 },
  { label: "日 历 区", x: 0.83, y: 0.68 },
] as const;

/** 3D 场景功能区域定义 */
export interface Zone3D {
  id: string;
  label: string;
  /** 区域中心位置 [x, y, z] */
  center: [number, number, number];
  /** 区域尺寸 [width, depth] */
  size: [number, number];
  /** 区域地面颜色 */
  color: string;
}

export const SCENE_ZONES: Zone3D[] = [
  // ── Row 1: 流水线输入 ──
  { id: "collection", label: "采集区", center: [-3.5, 0, -2.5], size: [2.5, 2.5], color: "#4298d4" },
  { id: "analysis",   label: "分析区", center: [0,    0, -2.5], size: [2.5, 2.5], color: "#4caf50" },
  { id: "strategy",   label: "策略室", center: [3.5,  0, -2.5], size: [2.5, 2.5], color: "#ab47bc" },
  // ── Row 2: 流水线执行（S 形回流） ──
  { id: "voting",     label: "投票区", center: [3.5,  0,  0.5], size: [2.5, 2.5], color: "#7e57c2" },
  { id: "risk",       label: "风控台", center: [0,    0,  0.5], size: [2.5, 2.5], color: "#ef5350" },
  { id: "trading",    label: "交易台", center: [-3.5, 0,  0.5], size: [2.5, 2.5], color: "#f9a825" },
  // ── Row 3: 支持角色（各自独立区域） ──
  { id: "position",   label: "持仓区", center: [-3.5, 0,  3.0], size: [2.2, 2.0], color: "#26a69a" },
  { id: "accounting", label: "财务区", center: [-1,   0,  3.0], size: [2.2, 2.0], color: "#42a5f5" },
  { id: "inspection", label: "巡检台", center: [1.5,  0,  3.0], size: [2.2, 2.0], color: "#ffa726" },
  { id: "calendar",   label: "日历区", center: [4,    0,  3.0], size: [2.2, 2.0], color: "#78909c" },
];
