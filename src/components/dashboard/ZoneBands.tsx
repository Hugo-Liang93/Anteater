/**
 * 区域泳道背景 — 水平色带 + 区域标签
 *
 * 纯视觉层（z-0），所有节点和流线渲染在其上方。
 * 主链路区域占中左部，右侧为支撑证据区，左下为研究验证区。
 */

import { ZONE_LABELS } from "@/config/layout";

/**
 * 泳道定义：主链路（左侧）按纵向流程分段 + 支撑区（右侧）独立色带
 * 与 AGENT_POSITIONS_2D 紧凑布局对齐
 */
const ZONE_BANDS: { top: number; bottom: number; left: number; right: number; color: string }[] = [
  // 主链路纵向分段（紧凑）
  { top: 0.03, bottom: 0.16, left: 0, right: 0.66, color: "#4298d4" },  // 采集
  { top: 0.16, bottom: 0.27, left: 0, right: 0.66, color: "#4caf50" },  // 分析
  { top: 0.27, bottom: 0.38, left: 0, right: 0.66, color: "#ff8a65" },  // 过滤
  { top: 0.38, bottom: 0.50, left: 0, right: 0.66, color: "#ab47bc" },  // 策略
  { top: 0.50, bottom: 0.78, left: 0, right: 0.66, color: "#ef5350" },  // 决策
  { top: 0.78, bottom: 0.97, left: 0, right: 0.66, color: "#f9a825" },  // 执行
  // 右侧支撑证据区
  { top: 0.06, bottom: 0.97, left: 0.69, right: 1.0, color: "#78909c" },
  // 左侧研究验证区
  { top: 0.56, bottom: 0.97, left: 0.00, right: 0.18, color: "#ff7043" },
];

export function ZoneBands() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {ZONE_BANDS.map((band, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: `${band.top * 100}%`,
            height: `${(band.bottom - band.top) * 100}%`,
            left: `${band.left * 100}%`,
            width: `${(band.right - band.left) * 100}%`,
            background: `linear-gradient(90deg, ${band.color}06 0%, transparent 40%, transparent 60%, ${band.color}06 100%)`,
            borderBottom: i < ZONE_BANDS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : undefined,
          }}
        />
      ))}
      {/* 支撑区左侧分隔线 */}
      <div
        className="absolute"
        style={{
          left: "69%",
          top: "6%",
          bottom: "3%",
          width: 1,
          background: "rgba(255,255,255,0.04)",
        }}
      />
      {ZONE_LABELS.map((z, i) => (
        <div
          key={i}
          className="absolute text-text-muted"
          style={{
            left: `${z.x * 100}%`,
            top: `${z.y * 100}%`,
            transform: "translateX(-50%)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 3,
            opacity: 0.30,
          }}
        >
          {z.label}
        </div>
      ))}
    </div>
  );
}
