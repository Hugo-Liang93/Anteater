/**
 * 场景布局配置 — 按 ARCHITECTURE.md 要求独立管理
 *
 * 所有 3D 场景中的坐标、区域定义集中在此，
 * 避免硬编码在组件中。
 */

import type { EmployeeRoleType } from "./employees";

/**
 * 角色在 3D 场景中的位置 — 错行流水线布局
 *
 * Row 1 (Z=-4.0):  collector
 * Row 2 (Z=-2.0):  analyst(confirmed)   live_analyst(intrabar)    ← 两条分支并行
 * Row 3 (Z= 0.0):  strategist → auditor                          ← 汇合 + 审核
 * Row 4 (Z= 2.0):  voter → risk_officer → trader                 ← 执行链路
 * Row 5 (Z= 4.5):  position_manager / accountant / inspector / calendar_reporter
 */
export const AGENT_POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  // ── Row 1: 数据入口 ──
  collector:         [0,    0, -4.0],
  // ── Row 2: 两条分析分支（confirmed 左 / intrabar 右）──
  analyst:           [-2.5, 0, -2.0],
  live_analyst:      [2.5,  0, -2.0],
  // ── Row 3: 策略(confirmed 左 / intrabar 右) ──
  strategist:        [-2.5, 0,  0.0],
  live_strategist:   [2.5,  0,  0.0],
  // ── Row 3.5: 审核（汇合点） ──
  auditor:           [0,    0,  1.0],
  // ── Row 4: 投票 → 风控 → 交易 ──
  voter:             [-3.0, 0,  3.0],
  risk_officer:      [0,    0,  3.0],
  trader:            [3.0,  0,  3.0],
  // ── Row 5: 支持角色 ──
  position_manager:  [-3.5, 0,  5.5],
  accountant:        [-1.2, 0,  5.5],
  inspector:         [1.2,  0,  5.5],
  calendar_reporter: [3.5,  0,  5.5],
};

/** 数据流连接定义 — 按交易链路顺序 */
export const DATA_FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  // 采集 → 两条分析分支
  { from: "collector", to: "analyst" },
  { from: "collector", to: "live_analyst" },
  // 分析 → 对应策略
  { from: "analyst", to: "strategist" },
  { from: "live_analyst", to: "live_strategist" },
  // 两条策略 → 审核汇合
  { from: "strategist", to: "auditor" },
  { from: "live_strategist", to: "auditor" },
  // 审核 → 投票 → 风控 → 交易
  { from: "auditor", to: "voter" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  // 交易 → 仓管
  { from: "trader", to: "position_manager" },
];

/** 角色在 2D Canvas 中的位置（比例 0~1） */
export const AGENT_POSITIONS_2D: Record<string, { x: number; y: number }> = {
  // Row 1
  collector:         { x: 0.50, y: 0.08 },
  // Row 2
  analyst:           { x: 0.25, y: 0.22 },
  live_analyst:      { x: 0.75, y: 0.22 },
  // Row 3
  strategist:        { x: 0.25, y: 0.36 },
  live_strategist:   { x: 0.75, y: 0.36 },
  // Row 3.5
  auditor:           { x: 0.50, y: 0.48 },
  // Row 4
  voter:             { x: 0.20, y: 0.60 },
  risk_officer:      { x: 0.50, y: 0.60 },
  trader:            { x: 0.80, y: 0.60 },
  // Row 5
  position_manager:  { x: 0.15, y: 0.82 },
  accountant:        { x: 0.38, y: 0.82 },
  inspector:         { x: 0.62, y: 0.82 },
  calendar_reporter: { x: 0.85, y: 0.82 },
};

/** 2D 数据流连接 */
export const DATA_FLOWS_2D: [string, string][] = [
  ["collector", "analyst"],
  ["collector", "live_analyst"],
  ["analyst", "strategist"],
  ["live_analyst", "live_strategist"],
  ["strategist", "auditor"],
  ["live_strategist", "auditor"],
  ["auditor", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签 */
export const ZONE_LABELS = [
  { label: "采 集 区", x: 0.50, y: 0.02 },
  { label: "确认分析", x: 0.25, y: 0.16 },
  { label: "盘中分析", x: 0.75, y: 0.16 },
  { label: "确认策略", x: 0.25, y: 0.30 },
  { label: "盘中策略", x: 0.75, y: 0.30 },
  { label: "审 核 区", x: 0.50, y: 0.42 },
  { label: "投 票 区", x: 0.20, y: 0.54 },
  { label: "风 控 台", x: 0.50, y: 0.54 },
  { label: "交 易 台", x: 0.80, y: 0.54 },
  { label: "持 仓 区", x: 0.15, y: 0.76 },
  { label: "财 务 区", x: 0.38, y: 0.76 },
  { label: "巡 检 台", x: 0.62, y: 0.76 },
  { label: "日 历 区", x: 0.85, y: 0.76 },
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
  // ── Row 1 ──
  { id: "collection",    label: "采集区",   center: [0,    0, -4.0], size: [3.0, 2.0], color: "#4298d4" },
  // ── Row 2: 两个分析区并排 ──
  { id: "analysis",      label: "确认分析", center: [-2.5, 0, -2.0], size: [3.0, 2.0], color: "#4caf50" },
  { id: "analysis_live", label: "盘中分析", center: [2.5,  0, -2.0], size: [3.0, 2.0], color: "#66bb6a" },
  // ── Row 3: 两个策略区并排 ──
  { id: "strategy",      label: "确认策略", center: [-2.5, 0,  0.0], size: [3.0, 2.0], color: "#ab47bc" },
  { id: "strategy_live", label: "盘中策略", center: [2.5,  0,  0.0], size: [3.0, 2.0], color: "#ce93d8" },
  // ── Row 3.5: 审核（汇合） ──
  { id: "audit",         label: "审核区",   center: [0,    0,  1.0], size: [3.0, 1.8], color: "#ff8a65" },
  // ── Row 4: 投票 → 风控 → 交易 ──
  { id: "voting",        label: "投票区",   center: [-3.0, 0,  3.0], size: [2.5, 2.0], color: "#7e57c2" },
  { id: "risk",          label: "风控台",   center: [0,    0,  3.0], size: [2.5, 2.0], color: "#ef5350" },
  { id: "trading",       label: "交易台",   center: [3.0,  0,  3.0], size: [2.5, 2.0], color: "#f9a825" },
  // ── Row 5: 支持角色 ──
  { id: "position",      label: "持仓区",   center: [-3.5, 0,  5.5], size: [2.2, 2.0], color: "#26a69a" },
  { id: "accounting",    label: "财务区",   center: [-1.2, 0,  5.5], size: [2.2, 2.0], color: "#42a5f5" },
  { id: "inspection",    label: "巡检台",   center: [1.2,  0,  5.5], size: [2.2, 2.0], color: "#ffa726" },
  { id: "calendar",      label: "日历区",   center: [3.5,  0,  5.5], size: [2.2, 2.0], color: "#78909c" },
];
