/**
 * 日夜交替引擎
 *
 * 根据本地真实时间计算场景光照参数。
 * 每帧插值过渡，营造自然的日夜循环。
 *
 * 时段划分（24h）：
 *   05-07  黎明：天空从深蓝渐变到暖粉，阳光从地平线升起
 *   07-09  早晨：金色阳光，暖色调
 *   09-16  白天：明亮暖白光
 *   16-18  黄昏：橙红夕阳
 *   18-20  傍晚：深橙→深蓝过渡
 *   20-05  夜晚：深蓝色调，月光，显示器发光突出
 */

import * as THREE from "three";
import { config } from "@/config";

export interface DayNightParams {
  /** 背景/雾色 */
  bgColor: THREE.Color;
  /** 环境光颜色 */
  ambientColor: THREE.Color;
  /** 环境光强度 */
  ambientIntensity: number;
  /** 太阳光颜色 */
  sunColor: THREE.Color;
  /** 太阳光强度 */
  sunIntensity: number;
  /** 太阳位置 Y */
  sunY: number;
  /** 窗户光强度 */
  windowLightIntensity: number;
  /** 窗户玻璃色 */
  windowGlassColor: THREE.Color;
  /** 显示器发光强度 */
  monitorEmissive: number;
  /** 半球光天空色 */
  hemiSkyColor: THREE.Color;
  /** 半球光地面色 */
  hemiGroundColor: THREE.Color;
  /** 是否夜晚 */
  isNight: boolean;
  /** 当前时段名 */
  periodName: string;
}

interface Keyframe {
  hour: number;
  bg: string;
  ambient: string;
  ambientI: number;
  sun: string;
  sunI: number;
  sunY: number;
  windowI: number;
  windowGlass: string;
  monitorE: number;
  hemiSky: string;
  hemiGround: string;
  night: boolean;
  name: string;
}

const KEYFRAMES: Keyframe[] = [
  { hour: 0,  bg: "#0a0e1a", ambient: "#1a2040", ambientI: 0.15, sun: "#2a3060", sunI: 0.0,  sunY: -2, windowI: 0.0,  windowGlass: "#0a1530", monitorE: 0.8, hemiSky: "#0a1530", hemiGround: "#0a0a15", night: true,  name: "深夜" },
  { hour: 5,  bg: "#1a1535", ambient: "#2a2050", ambientI: 0.2,  sun: "#4a3060", sunI: 0.1,  sunY: 0,  windowI: 0.1,  windowGlass: "#2a2050", monitorE: 0.6, hemiSky: "#2a2050", hemiGround: "#1a1025", night: true,  name: "凌晨" },
  { hour: 6,  bg: "#c8808a", ambient: "#e0a090", ambientI: 0.35, sun: "#ffa070", sunI: 0.4,  sunY: 2,  windowI: 0.3,  windowGlass: "#ffb090", monitorE: 0.4, hemiSky: "#e0a090", hemiGround: "#8a6050", night: false, name: "黎明" },
  { hour: 7,  bg: "#e0c0a0", ambient: "#ffe0b0", ambientI: 0.45, sun: "#ffc880", sunI: 0.55, sunY: 4,  windowI: 0.5,  windowGlass: "#ffe0b0", monitorE: 0.35, hemiSky: "#ffe4b5", hemiGround: "#b09070", night: false, name: "早晨" },
  { hour: 9,  bg: "#e8ddd0", ambient: "#fff5e6", ambientI: 0.5,  sun: "#ffe8cc", sunI: 0.6,  sunY: 8,  windowI: 0.6,  windowGlass: "#ffe8c0", monitorE: 0.3, hemiSky: "#ffe4b5", hemiGround: "#c4a882", night: false, name: "上午" },
  { hour: 12, bg: "#eae2d5", ambient: "#fffaf0", ambientI: 0.55, sun: "#fff0d8", sunI: 0.65, sunY: 10, windowI: 0.65, windowGlass: "#fff0d8", monitorE: 0.25, hemiSky: "#fff0e0", hemiGround: "#c8b090", night: false, name: "正午" },
  { hour: 16, bg: "#e8ddd0", ambient: "#fff5e6", ambientI: 0.5,  sun: "#ffe0b0", sunI: 0.55, sunY: 6,  windowI: 0.55, windowGlass: "#ffe0b0", monitorE: 0.3, hemiSky: "#ffe4b5", hemiGround: "#c4a882", night: false, name: "下午" },
  { hour: 17, bg: "#d8a070", ambient: "#f0b080", ambientI: 0.4,  sun: "#ff9050", sunI: 0.5,  sunY: 3,  windowI: 0.5,  windowGlass: "#ffa060", monitorE: 0.35, hemiSky: "#f0a060", hemiGround: "#906040", night: false, name: "黄昏" },
  { hour: 18.5,bg:"#6a3040", ambient: "#804050", ambientI: 0.25, sun: "#c04040", sunI: 0.2,  sunY: 1,  windowI: 0.2,  windowGlass: "#603040", monitorE: 0.5, hemiSky: "#503040", hemiGround: "#2a1520", night: false, name: "傍晚" },
  { hour: 20, bg: "#0e1225", ambient: "#1a2040", ambientI: 0.18, sun: "#2a3060", sunI: 0.05, sunY: -1, windowI: 0.05, windowGlass: "#101830", monitorE: 0.7, hemiSky: "#101830", hemiGround: "#0a0a15", night: true,  name: "夜晚" },
  { hour: 24, bg: "#0a0e1a", ambient: "#1a2040", ambientI: 0.15, sun: "#2a3060", sunI: 0.0,  sunY: -2, windowI: 0.0,  windowGlass: "#0a1530", monitorE: 0.8, hemiSky: "#0a1530", hemiGround: "#0a0a15", night: true,  name: "深夜" },
];

function lerpColor(a: string, b: string, t: number): THREE.Color {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 根据当前本地时间计算光照参数。enableDayNight=false 时锁定正午。 */
export function computeDayNight(now?: Date): DayNightParams {
  const d = now ?? new Date();
  const hourFrac = config.enableDayNight ? d.getHours() + d.getMinutes() / 60 : 12;

  // 找到前后两个关键帧
  let prev = KEYFRAMES[0] ?? KEYFRAMES[KEYFRAMES.length - 1]!;
  let next = KEYFRAMES[1] ?? prev;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const cur = KEYFRAMES[i];
    const nxt = KEYFRAMES[i + 1];
    if (cur && nxt && hourFrac >= cur.hour && hourFrac < nxt.hour) {
      prev = cur;
      next = nxt;
      break;
    }
  }

  const range = next.hour - prev.hour;
  const t = range > 0 ? (hourFrac - prev.hour) / range : 0;

  return {
    bgColor: lerpColor(prev.bg, next.bg, t),
    ambientColor: lerpColor(prev.ambient, next.ambient, t),
    ambientIntensity: lerp(prev.ambientI, next.ambientI, t),
    sunColor: lerpColor(prev.sun, next.sun, t),
    sunIntensity: lerp(prev.sunI, next.sunI, t),
    sunY: lerp(prev.sunY, next.sunY, t),
    windowLightIntensity: lerp(prev.windowI, next.windowI, t),
    windowGlassColor: lerpColor(prev.windowGlass, next.windowGlass, t),
    monitorEmissive: lerp(prev.monitorE, next.monitorE, t),
    hemiSkyColor: lerpColor(prev.hemiSky, next.hemiSky, t),
    hemiGroundColor: lerpColor(prev.hemiGround, next.hemiGround, t),
    isNight: lerp(prev.night ? 1 : 0, next.night ? 1 : 0, t) > 0.5,
    periodName: t < 0.5 ? prev.name : next.name,
  };
}
