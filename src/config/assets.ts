/**
 * 资源清单配置 — 对齐 ASSET_GUIDE.md
 *
 * 统一管理所有外部资源路径、角色外观、状态图标映射。
 * 当 GLB 模型可用时，只需修改此文件的路径即可切换。
 */

import type { EmployeeRoleType } from "./employees";
import type { ActivityStatus } from "@/store/employees";

// ─── 资源基础路径 ───

export const ASSET_BASE = {
  models: "/models",
  textures: "/textures",
  icons: "/icons",
} as const;

// ─── 角色模型资源 ───

export interface CharacterModelAsset {
  /** GLB 模型路径（null 表示使用程序化生成） */
  modelPath: string | null;
  /** 版本号 */
  version: number;
}

/** 角色模型资源映射 — 当前全部使用程序化生成 */
export const CHARACTER_MODELS: Record<EmployeeRoleType, CharacterModelAsset> = {
  collector:         { modelPath: null, version: 1 },
  analyst:           { modelPath: null, version: 1 },
  strategist:        { modelPath: null, version: 1 },
  voter:             { modelPath: null, version: 1 },
  risk_officer:      { modelPath: null, version: 1 },
  trader:            { modelPath: null, version: 1 },
  position_manager:  { modelPath: null, version: 1 },
  accountant:        { modelPath: null, version: 1 },
  calendar_reporter: { modelPath: null, version: 1 },
  inspector:         { modelPath: null, version: 1 },
};

// ─── 场景道具资源 ───

export interface PropAsset {
  /** GLB 模型路径（null 表示使用程序化生成） */
  modelPath: string | null;
  version: number;
}

export const SCENE_PROPS: Record<string, PropAsset> = {
  desk_basic:     { modelPath: null, version: 1 },
  desk_multi:     { modelPath: null, version: 1 },
  monitor_single: { modelPath: null, version: 1 },
  monitor_triple: { modelPath: null, version: 1 },
  ticker_wall:    { modelPath: null, version: 1 },
  plant_pot:      { modelPath: null, version: 1 },
  floor_base:     { modelPath: null, version: 1 },
  wall_segment:   { modelPath: null, version: 1 },
  window_frame:   { modelPath: null, version: 1 },
};

// ─── 角色外观配置（统一来源，3D/2D 共用） ───

export type HairStyle = "short" | "long" | "bald" | "spiky" | "ponytail";

export interface CharacterAppearance {
  /** 衬衫/上衣颜色 */
  shirt: string;
  /** 裤子颜色 */
  pants: string;
  /** 头发颜色 */
  hair: string;
  /** 皮肤颜色 */
  skin: string;
  /** 发型 */
  hairStyle: HairStyle;
  /** 手持道具标识（用于 2D 绘制） */
  propType: string;
}

/**
 * 角色外观映射 — 对齐 CHARACTER_ROSTER.md 颜色规范
 *
 * 采集员: 蓝(Blue)     分析师: 绿(Green)     策略师: 紫(Purple)
 * 投票主席: 金(Gold)    风控官: 红(Red)       交易员: 金(Warm Gold)
 * 仓管员: 青(Teal)     会计: 蓝灰(Blue-grey) 日历员: 紫罗兰(Violet)
 * 巡检员: 青(Cyan)
 */
export const CHARACTER_APPEARANCES: Record<EmployeeRoleType, CharacterAppearance> = {
  collector: {
    shirt: "#4298d4", pants: "#37474f", hair: "#5d4037", skin: "#ffe0c0",
    hairStyle: "short", propType: "box",
  },
  analyst: {
    shirt: "#4caf50", pants: "#263238", hair: "#212121", skin: "#ffe0c0",
    hairStyle: "spiky", propType: "monitor",
  },
  strategist: {
    shirt: "#ab47bc", pants: "#37474f", hair: "#3e2723", skin: "#ffd8b0",
    hairStyle: "long", propType: "monitor",
  },
  voter: {
    shirt: "#fdd835", pants: "#455a64", hair: "#424242", skin: "#ffe0c0",
    hairStyle: "bald", propType: "gavel",
  },
  risk_officer: {
    shirt: "#ef5350", pants: "#263238", hair: "#1a1a2e", skin: "#e8c4a0",
    hairStyle: "short", propType: "shield",
  },
  trader: {
    shirt: "#f9a825", pants: "#37474f", hair: "#4e342e", skin: "#ffe0c0",
    hairStyle: "short", propType: "briefcase",
  },
  position_manager: {
    shirt: "#26a69a", pants: "#37474f", hair: "#3e2723", skin: "#ffd8b0",
    hairStyle: "ponytail", propType: "clipboard",
  },
  accountant: {
    shirt: "#78909c", pants: "#263238", hair: "#616161", skin: "#ffe0c0",
    hairStyle: "short", propType: "calculator",
  },
  calendar_reporter: {
    shirt: "#7e57c2", pants: "#37474f", hair: "#4a148c", skin: "#e8c4a0",
    hairStyle: "long", propType: "calendar",
  },
  inspector: {
    shirt: "#26c6da", pants: "#37474f", hair: "#5d4037", skin: "#ffe0c0",
    hairStyle: "bald", propType: "magnifier",
  },
};

// ─── 状态图标映射 ───

/** 状态图标定义（lucide-react 图标名 + 可选 SVG 路径） */
export interface StatusIconDef {
  /** lucide-react 图标名（程序化 fallback） */
  lucideIcon: string;
  /** SVG 文件路径（null 表示使用 lucide fallback） */
  svgPath: string | null;
  /** 图标颜色（跟随 statusColor） */
  label: string;
}

/** 状态图标映射 — 按 ASSET_GUIDE 的 status_*.svg 规范 */
export const STATUS_ICONS: Partial<Record<ActivityStatus, StatusIconDef>> = {
  idle:          { lucideIcon: "Coffee",        svgPath: null, label: "空闲" },
  working:       { lucideIcon: "Cog",           svgPath: null, label: "工作中" },
  thinking:      { lucideIcon: "Brain",         svgPath: null, label: "思考中" },
  judging:       { lucideIcon: "Scale",         svgPath: null, label: "判断中" },
  reviewing:     { lucideIcon: "ClipboardCheck", svgPath: null, label: "审核中" },
  warning:       { lucideIcon: "AlertTriangle", svgPath: null, label: "警告" },
  alert:         { lucideIcon: "AlertTriangle", svgPath: null, label: "告警" },
  error:         { lucideIcon: "XCircle",       svgPath: null, label: "异常" },
  success:       { lucideIcon: "CheckCircle",   svgPath: null, label: "完成" },
  blocked:       { lucideIcon: "ShieldOff",     svgPath: null, label: "拦截" },
  disconnected:  { lucideIcon: "WifiOff",       svgPath: null, label: "失联" },
  reconnecting:  { lucideIcon: "RefreshCw",     svgPath: null, label: "重连" },
  approved:      { lucideIcon: "ThumbsUp",      svgPath: null, label: "已通过" },
  executed:      { lucideIcon: "Zap",           svgPath: null, label: "已执行" },
  rejected:      { lucideIcon: "Ban",           svgPath: null, label: "已拒绝" },
  submitting:    { lucideIcon: "Upload",        svgPath: null, label: "提交中" },
  signal_ready:  { lucideIcon: "Radio",         svgPath: null, label: "信号就绪" },
};

// ─── 工具函数 ───

/** 检查角色是否有外部 GLB 模型 */
export function hasExternalModel(role: EmployeeRoleType): boolean {
  return CHARACTER_MODELS[role]?.modelPath != null;
}

/** 获取角色模型路径（null 则使用程序化） */
export function getModelPath(role: EmployeeRoleType): string | null {
  const asset = CHARACTER_MODELS[role];
  if (!asset?.modelPath) return null;
  return `${ASSET_BASE.models}/characters/${asset.modelPath}`;
}

/** 获取道具模型路径 */
export function getPropPath(propName: string): string | null {
  const asset = SCENE_PROPS[propName];
  if (!asset?.modelPath) return null;
  return `${ASSET_BASE.models}/props/${asset.modelPath}`;
}
