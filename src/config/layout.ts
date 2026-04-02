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
  { from: "regime_guard", to: "risk_officer" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  { from: "trader", to: "position_manager" },
];

/**
 * 角色在 2D 拓扑图中的位置（比例 0~1）
 *
 * 布局反映真实数据流拓扑：
 * - 主链路（纵向 top→bottom）：采集 → 分析 → 过滤 → 策略 → 统一研判 → 分流决策 → 风控 → 执行
 * - 双路径分叉：先统一进入 regime_guard，再分流到 voter 或直接进入 risk_officer
 * - 支撑模块（右侧证据区）：会计/日历/巡检
 * - 回测独立区（左下角研究区）
 *
 * 设计原则：
 * - 主链路居中偏左（x=0.18~0.55），给右侧支撑区留空间
 * - 纵向紧凑（y 间距约 0.11），减少空白浪费
 * - 双路径分叉明确区分投票路径和直达路径
 */
export const AGENT_POSITIONS_2D: Record<string, { x: number; y: number }> = {
  // ── 主链路（紧凑排列，top padding 给 DecisionSummaryBar 留 0.10） ──
  collector:         { x: 0.36, y: 0.10 },   // 采集
  analyst:           { x: 0.22, y: 0.21 },   // 分析（confirmed）
  live_analyst:      { x: 0.50, y: 0.21 },   // 分析（intrabar）
  filter_guard:      { x: 0.36, y: 0.32 },   // 过滤

  // ── 策略层 ──
  strategist:        { x: 0.22, y: 0.43 },   // 策略（confirmed）
  live_strategist:   { x: 0.50, y: 0.43 },   // 策略（intrabar）

  // ── 双路径分叉 ──
  regime_guard:      { x: 0.36, y: 0.55 },   // 统一研判
  voter:             { x: 0.18, y: 0.70 },   // 投票分支
  risk_officer:      { x: 0.54, y: 0.70 },   // 风控分支 / 汇合点

  // ── 执行 ──
  trader:            { x: 0.30, y: 0.84 },   // 交易
  position_manager:  { x: 0.50, y: 0.84 },   // 仓管

  // ── 支撑模块（右侧证据区） ──
  accountant:        { x: 0.82, y: 0.22 },
  inspector:         { x: 0.82, y: 0.38 },
  calendar_reporter: { x: 0.82, y: 0.56 },

  // ── 左侧独立模块 ──
  backtester:        { x: 0.10, y: 0.68 },   // 回测验证
};

/**
 * 2D 数据流连接 — 反映真实信号流转拓扑
 *
 * 路径 A（voting group）：策略 → 统一研判 → 投票 → 风控 → 执行
 * 路径 B（非 group）：策略 → 统一研判 → 风控 → 执行
 */
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
  ["regime_guard", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签 */
export const ZONE_LABELS = [
  { label: "采 集",   x: 0.36, y: 0.05 },
  { label: "分 析",   x: 0.36, y: 0.16 },
  { label: "过 滤",   x: 0.36, y: 0.27 },
  { label: "策 略",   x: 0.36, y: 0.38 },
  { label: "决 策",   x: 0.36, y: 0.50 },
  { label: "执 行",   x: 0.40, y: 0.79 },
  { label: "支撑证据", x: 0.82, y: 0.10 },
  { label: "研究验证", x: 0.10, y: 0.60 },
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
