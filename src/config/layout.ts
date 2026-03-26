/**
 * 场景布局配置 — 温暖卡通工作室
 *
 * 矩形办公室（三面墙，前面开放），大屏贴后墙。
 * 工位面向大屏，数据流从后排向前排流动。
 */

import type { EmployeeRoleType } from "./employees";

/** 不渲染 3D 角色的组件 — 改为大屏面板展示 */
export const SCREEN_ONLY_AGENTS: ReadonlySet<EmployeeRoleType> = new Set([
  "calendar_reporter",  // → 大屏日历面板
  "accountant",         // → 大屏账户面板
]);

/**
 * 角色 3D 坐标 — 后墙大屏 + U 形工位
 *
 *  后墙 ──── 大屏 ──── inspector(机器人)
 *
 *  Row 1 (Z=-3.2): collector               ← 采集
 *  Row 2 (Z=-1.5): analyst / live_analyst   ← 分析
 *  Row 3 (Z= 0.2): strategist / filter / live_strategist ← 策略
 *  Row 4 (Z= 2.0): regime / voter / risk   ← 决策
 *  Row 5 (Z= 3.8): trader / pos_mgr        ← 执行
 */
export const AGENT_POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  // ── Row 1: 采集（大屏正前方，独占中心） ──
  collector:         [0,    0, -3.2],
  // ── Row 2: 分析（对称两侧） ──
  analyst:           [-2.2, 0, -1.5],
  live_analyst:      [2.2,  0, -1.5],
  // ── Row 3: 过滤 + 策略（三人一排） ──
  strategist:        [-3.2, 0,  0.2],
  filter_guard:      [0,    0,  0.2],
  live_strategist:   [3.2,  0,  0.2],
  // ── Row 4: 研判 + 决策（三人一排） ──
  regime_guard:      [-2.8, 0,  2.0],
  voter:             [0,    0,  2.0],
  risk_officer:      [2.8,  0,  2.0],
  // ── Row 5: 执行 + 支持 ──
  trader:            [-2.0, 0,  3.8],
  position_manager:  [2.0,  0,  3.8],
  // inspector（机器人巡检员）放在大屏前右侧
  inspector:         [4.8,  0, -3.0],
  // backtester（回测员）放在大屏前左侧
  backtester:        [-4.8, 0, -3.0],
  // accountant 在大屏展示，不渲染角色
  accountant:        [5.0,  0,  2.0],
  // calendar_reporter 不在场景中渲染角色，但保留坐标供数据流计算
  calendar_reporter: [5.0,  0, -3.2],
};

/** 数据流连接定义 — 按实际交易链路顺序 */
export const DATA_FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  { from: "collector", to: "analyst" },
  { from: "collector", to: "live_analyst" },
  { from: "analyst", to: "filter_guard" },
  { from: "live_analyst", to: "filter_guard" },
  { from: "filter_guard", to: "strategist" },
  { from: "filter_guard", to: "live_strategist" },
  { from: "strategist", to: "regime_guard" },
  { from: "live_strategist", to: "regime_guard" },
  { from: "regime_guard", to: "voter" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  { from: "trader", to: "position_manager" },
];

/** 角色在 2D Canvas 中的位置（比例 0~1） */
export const AGENT_POSITIONS_2D: Record<string, { x: number; y: number }> = {
  collector:         { x: 0.50, y: 0.08 },
  analyst:           { x: 0.30, y: 0.22 },
  live_analyst:      { x: 0.70, y: 0.22 },
  strategist:        { x: 0.22, y: 0.38 },
  filter_guard:      { x: 0.50, y: 0.38 },
  live_strategist:   { x: 0.78, y: 0.38 },
  regime_guard:      { x: 0.25, y: 0.55 },
  voter:             { x: 0.50, y: 0.55 },
  risk_officer:      { x: 0.75, y: 0.55 },
  trader:            { x: 0.30, y: 0.75 },
  position_manager:  { x: 0.70, y: 0.75 },
  inspector:         { x: 0.92, y: 0.12 },
  accountant:        { x: 0.08, y: 0.08 },  // 大屏
  calendar_reporter: { x: 0.92, y: 0.08 },
  backtester:        { x: 0.08, y: 0.12 },
};

/** 2D 数据流连接 */
export const DATA_FLOWS_2D: [string, string][] = [
  ["collector", "analyst"],
  ["collector", "live_analyst"],
  ["analyst", "filter_guard"],
  ["live_analyst", "filter_guard"],
  ["filter_guard", "strategist"],
  ["filter_guard", "live_strategist"],
  ["strategist", "regime_guard"],
  ["live_strategist", "regime_guard"],
  ["regime_guard", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签 */
export const ZONE_LABELS = [
  { label: "采 集 区", x: 0.50, y: 0.03 },
  { label: "分 析 区", x: 0.50, y: 0.16 },
  { label: "策 略 区", x: 0.50, y: 0.30 },
  { label: "研 判 区", x: 0.50, y: 0.46 },
  { label: "执 行 区", x: 0.50, y: 0.65 },
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
  { id: "collection", label: "采集区", center: [0,    0, -3.2], size: [3.0, 1.6], color: "#4298d4" },
  { id: "analysis",   label: "分析区", center: [0,    0, -1.5], size: [6.5, 1.6], color: "#4caf50" },
  { id: "strategy",   label: "策略区", center: [0,    0,  0.2], size: [8.5, 1.6], color: "#ab47bc" },
  { id: "decision",   label: "决策区", center: [0,    0,  2.0], size: [7.5, 1.6], color: "#ef5350" },
  { id: "execution",  label: "执行区", center: [0,    0,  3.8], size: [6.0, 1.6], color: "#f9a825" },
];
