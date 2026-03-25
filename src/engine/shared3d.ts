/**
 * 3D 共享资源注册表
 *
 * 集中管理 Three.js 几何体和材质的创建与复用，
 * 避免组件中内联创建导致的重复实例和 GC 压力。
 *
 * 设计原则：
 * - 所有静态几何体/材质在模块加载时创建一次
 * - 按语义分组（office / character / accessory / zone / flow）
 * - 需要每实例独立动画的材质提供 clone 工厂
 * - 提供 dispose() 方法用于整体清理（HMR / 卸载）
 */

import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  几 何 体 注 册 表
// ═══════════════════════════════════════════════════════════════

/** 办公室场景几何体 */
export const OfficeGeo = {
  // 窗户
  windowFrame: new THREE.BoxGeometry(1.6, 0.9, 0.08),
  windowGlass: new THREE.PlaneGeometry(1.4, 0.75),
  windowBarV: new THREE.BoxGeometry(0.04, 0.75, 0.02),
  windowBarH: new THREE.BoxGeometry(1.4, 0.04, 0.02),
  // 树木
  treeTrunk: new THREE.CylinderGeometry(0.06, 0.1, 0.8, 6),
  treeCrown1: new THREE.SphereGeometry(0.5, 8, 8),
  treeCrown2: new THREE.SphereGeometry(0.35, 8, 8),
  treeCrown3: new THREE.SphereGeometry(0.3, 8, 8),
  // 桌子
  deskLeg: new THREE.BoxGeometry(0.05, 0.52, 0.05),
  monitorShell: new THREE.BoxGeometry(0.42, 0.3, 0.025),
  monitorStand: new THREE.BoxGeometry(0.04, 0.14, 0.04),
  monitorBase: new THREE.BoxGeometry(0.15, 0.02, 0.1),
  keyboard: new THREE.BoxGeometry(0.35, 0.01, 0.12),
  // 行情墙
  tickerBoard: new THREE.BoxGeometry(6, 1.0, 0.08),
  tickerScreen: new THREE.PlaneGeometry(1.5, 0.6),
  tickerLed: new THREE.PlaneGeometry(5.6, 0.1),
  // 盆栽
  potBody: new THREE.CylinderGeometry(0.12, 0.1, 0.24, 8),
  potSoil: new THREE.CylinderGeometry(0.11, 0.11, 0.02, 8),
  potLeaf1: new THREE.SphereGeometry(0.18, 8, 8),
  potLeaf2: new THREE.SphereGeometry(0.12, 8, 8),
} as const;

/** 角色几何体 */
export const CharGeo = {
  head: new THREE.SphereGeometry(0.3, 16, 16),
  hairTop: new THREE.SphereGeometry(0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bangs: new THREE.BoxGeometry(0.5, 0.1, 0.1),
  eyeWhite: new THREE.SphereGeometry(0.06, 8, 8),
  pupil: new THREE.SphereGeometry(0.035, 8, 8),
  eyeHighlight: new THREE.SphereGeometry(0.012, 6, 6),
  blush: new THREE.SphereGeometry(0.04, 8, 8),
  mouth: new THREE.SphereGeometry(0.025, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  body: new THREE.CapsuleGeometry(0.16, 0.28, 8, 16),
  arm: new THREE.CapsuleGeometry(0.055, 0.12, 6, 8),
  hand: new THREE.SphereGeometry(0.05, 8, 8),
  leg: new THREE.CapsuleGeometry(0.06, 0.12, 6, 8),
  shoe: new THREE.BoxGeometry(0.1, 0.06, 0.14),
  statusLight: new THREE.SphereGeometry(0.05, 8, 8),
  selectRing: new THREE.RingGeometry(0.35, 0.5, 32),
  successRing: new THREE.RingGeometry(0.3, 0.4, 32),
  warningRing: new THREE.RingGeometry(0.25, 0.35, 32),
  // 配件
  headphonePad: new THREE.BoxGeometry(0.06, 0.1, 0.08),
  headphoneBand: new THREE.CapsuleGeometry(0.02, 0.5, 4, 8),
  mic: new THREE.CapsuleGeometry(0.015, 0.1, 4, 6),
  glassLens: new THREE.TorusGeometry(0.065, 0.01, 6, 12),
  glassBridge: new THREE.BoxGeometry(0.06, 0.01, 0.01),
  badge: new THREE.CylinderGeometry(0.04, 0.04, 0.01, 12),
  tabletBody: new THREE.BoxGeometry(0.12, 0.16, 0.015),
  tabletScreen: new THREE.BoxGeometry(0.1, 0.13, 0.002),
  traderButton: new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8),
} as const;

/** 数据流几何体 */
export const FlowGeo = {
  particle: new THREE.SphereGeometry(0.06, 8, 8),
} as const;

// ═══════════════════════════════════════════════════════════════
//  材 质 注 册 表
// ═══════════════════════════════════════════════════════════════

/** 办公室材质 */
export const OfficeMat = {
  wall: new THREE.MeshStandardMaterial({ color: "#f5ede3", side: THREE.DoubleSide }),
  windowFrame: new THREE.MeshStandardMaterial({ color: "#8d7b68" }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: "#8d6e53" }),
  treeCrown: [
    new THREE.MeshStandardMaterial({ color: "#5a8a4a" }),
    new THREE.MeshStandardMaterial({ color: "#6a9a5a" }),
    new THREE.MeshStandardMaterial({ color: "#4a7a3a" }),
  ] as const,
  deskWood: [
    new THREE.MeshStandardMaterial({ color: "#a08060" }),
    new THREE.MeshStandardMaterial({ color: "#9a7a5a" }),
    new THREE.MeshStandardMaterial({ color: "#8a6a4a" }),
  ] as const,
  deskLeg: new THREE.MeshStandardMaterial({ color: "#6b5240" }),
  monitorShell: new THREE.MeshStandardMaterial({ color: "#2a2a2e" }),
  monitorStand: new THREE.MeshStandardMaterial({ color: "#3a3a3e" }),
  keyboard: new THREE.MeshStandardMaterial({ color: "#404040" }),
  tickerBoard: new THREE.MeshStandardMaterial({ color: "#3a3028" }),
  tickerScreens: [
    new THREE.MeshStandardMaterial({ color: "#050e08", emissive: "#003322", emissiveIntensity: 0.5 }),
    new THREE.MeshStandardMaterial({ color: "#050e08", emissive: "#002244", emissiveIntensity: 0.5 }),
    new THREE.MeshStandardMaterial({ color: "#050e08", emissive: "#003322", emissiveIntensity: 0.5 }),
  ] as const,
  tickerLed: new THREE.MeshStandardMaterial({ color: "#001100", emissive: "#00d4aa", emissiveIntensity: 0.25 }),
  floor: new THREE.MeshStandardMaterial({ color: "#c4a882" }),
  potBody: new THREE.MeshStandardMaterial({ color: "#8d6e53" }),
  potSoil: new THREE.MeshStandardMaterial({ color: "#5a4030" }),
  potLeaf: [
    new THREE.MeshStandardMaterial({ color: "#6a9a5a" }),
    new THREE.MeshStandardMaterial({ color: "#5a8a4a" }),
  ] as const,
} as const;

/** 角色共享材质 */
export const CharMat = {
  shoe: new THREE.MeshStandardMaterial({ color: "#3a3a3a" }),
  eye: new THREE.MeshStandardMaterial({ color: "#1a1a2e" }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: "#ffffff" }),
  eyeHighlight: new THREE.MeshStandardMaterial({
    color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.5,
  }),
  blush: new THREE.MeshStandardMaterial({
    color: "#ffb0b0", transparent: true, opacity: 0.4,
  }),
  mouth: new THREE.MeshStandardMaterial({ color: "#e07070" }),
  statusLightDefault: new THREE.MeshStandardMaterial({
    color: "#5a6d7e", emissive: "#5a6d7e", emissiveIntensity: 0.3,
  }),
  selectRing: new THREE.MeshStandardMaterial({
    color: "#00d4aa", emissive: "#00d4aa", emissiveIntensity: 1.5,
    transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  }),
  // 配件材质
  headphoneDark: new THREE.MeshStandardMaterial({ color: "#37474f" }),
  headphoneBand: new THREE.MeshStandardMaterial({ color: "#546e7a" }),
  headphoneMic: new THREE.MeshStandardMaterial({ color: "#455a64" }),
  glassFrame: new THREE.MeshStandardMaterial({ color: "#90a4ae", metalness: 0.6 }),
  badgeRed: new THREE.MeshStandardMaterial({
    color: "#ff5252", emissive: "#ff5252", emissiveIntensity: 0.3, metalness: 0.4,
  }),
  tabletBody: new THREE.MeshStandardMaterial({ color: "#263238" }),
  tabletScreen: new THREE.MeshStandardMaterial({
    color: "#4dd0e1", emissive: "#4dd0e1", emissiveIntensity: 0.5,
  }),
  traderButton: new THREE.MeshStandardMaterial({
    color: "#f9a825", emissive: "#f9a825", emissiveIntensity: 0.4, metalness: 0.5,
  }),
} as const;

/** 效果材质模板 — 需要 clone 的（每实例独立动画） */
export const CharMatTemplates = {
  successRing: new THREE.MeshStandardMaterial({
    color: "#66bb6a", emissive: "#66bb6a", emissiveIntensity: 2,
    transparent: true, opacity: 0, side: THREE.DoubleSide,
  }),
  warningRing: new THREE.MeshStandardMaterial({
    color: "#ffa726", emissive: "#ffa726", emissiveIntensity: 1.5,
    transparent: true, opacity: 0, side: THREE.DoubleSide,
  }),
} as const;

// ═══════════════════════════════════════════════════════════════
//  工 厂 函 数
// ═══════════════════════════════════════════════════════════════

/** 创建桌面材质（按 deskColor 查找共享材质） */
export function getDeskMaterial(color?: string): THREE.MeshStandardMaterial {
  switch (color) {
    case "#9a7a5a": return OfficeMat.deskWood[1];
    case "#8a6a4a": return OfficeMat.deskWood[2];
    default: return OfficeMat.deskWood[0];
  }
}

/** 创建屏幕发光材质（monitorGlow 为动态值，需按 glow 级别缓存） */
const _monitorScreenCache = new Map<number, THREE.MeshStandardMaterial>();
export function getMonitorScreenMat(glow: number): THREE.MeshStandardMaterial {
  // 量化到 0.05 步长以限制实例数
  const key = Math.round(glow * 20) / 20;
  let mat = _monitorScreenCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: "#0a1510", emissive: "#003a28", emissiveIntensity: key,
    });
    _monitorScreenCache.set(key, mat);
  }
  return mat;
}

/** 创建窗户玻璃材质（颜色随日夜变化，需按周期缓存） */
const _windowGlassCache = new Map<string, THREE.MeshStandardMaterial>();
export function getWindowGlassMat(
  color: THREE.Color, isNight: boolean,
): THREE.MeshStandardMaterial {
  const key = `${color.getHexString()}_${isNight ? 1 : 0}`;
  let mat = _windowGlassCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color, transparent: true, opacity: 0.35,
      emissive: color, emissiveIntensity: isNight ? 0.05 : 0.2,
    });
    _windowGlassCache.set(key, mat);
  }
  return mat;
}

/** 创建地板色带材质 */
const _floorStripeCache = new Map<string, THREE.MeshStandardMaterial>();
export function getFloorStripeMat(color: string): THREE.MeshStandardMaterial {
  let mat = _floorStripeCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.08 });
    _floorStripeCache.set(color, mat);
  }
  return mat;
}

// ═══════════════════════════════════════════════════════════════
//  清 理
// ═══════════════════════════════════════════════════════════════

/** 释放所有注册表资源（HMR 时调用） */
export function disposeAllShared3D() {
  const disposeMap = (obj: Record<string, unknown>) => {
    for (const v of Object.values(obj)) {
      if (v instanceof THREE.BufferGeometry) v.dispose();
      else if (v instanceof THREE.Material) v.dispose();
      else if (Array.isArray(v)) v.forEach((item) => {
        if (item instanceof THREE.Material) item.dispose();
      });
    }
  };
  disposeMap(OfficeGeo);
  disposeMap(CharGeo);
  disposeMap(FlowGeo);
  disposeMap(OfficeMat);
  disposeMap(CharMat);
  disposeMap(CharMatTemplates);
  for (const mat of _monitorScreenCache.values()) mat.dispose();
  for (const mat of _windowGlassCache.values()) mat.dispose();
  for (const mat of _floorStripeCache.values()) mat.dispose();
  _monitorScreenCache.clear();
  _windowGlassCache.clear();
  _floorStripeCache.clear();
}
