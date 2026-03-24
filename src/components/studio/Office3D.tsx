/**
 * 3D 办公室场景
 *
 * 地板网格 + 工位桌椅 + 区域标记
 */

import { useMemo } from "react";
import * as THREE from "three";

/** 桌子组件 */
function Desk({ position, color = "#2a3f52" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* 桌面 */}
      <mesh position={[0, 0.55, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.8, 0.05, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 桌腿 */}
      {[[-0.35, 0, -0.2], [0.35, 0, -0.2], [-0.35, 0, 0.2], [0.35, 0, 0.2]].map((p, i) => (
        <mesh key={i} position={[p[0]!, 0.27, p[2]!]} castShadow>
          <boxGeometry args={[0.04, 0.54, 0.04]} />
          <meshStandardMaterial color="#1e3044" />
        </mesh>
      ))}
      {/* 显示器 */}
      <mesh position={[0, 0.82, -0.1]}>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a2634" />
      </mesh>
      {/* 屏幕 */}
      <mesh position={[0, 0.83, -0.085]}>
        <planeGeometry args={[0.44, 0.29]} />
        <meshStandardMaterial color="#0a1a2a" emissive="#003322" emissiveIntensity={0.3} />
      </mesh>
      {/* 显示器支架 */}
      <mesh position={[0, 0.63, -0.1]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#1e3044" />
      </mesh>
    </group>
  );
}

/** 地面区域标记 */
function ZoneMarker({ position, size, color }: {
  position: [number, number, number];
  size: [number, number];
  color: string;
  label: string;
}) {
  return (
    <group position={position}>
      {/* 区域地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* 边线 */}
      <lineSegments position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(size[0], size[1])]} />
        <lineBasicMaterial color={color} transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

/** 工位配置 */
const DESKS: { pos: [number, number, number]; color?: string }[] = [
  { pos: [-3, 0, -1], color: "#1e5a7a" },     // 采集区
  { pos: [-1, 0, -1], color: "#4a2a6a" },      // 分析区
  { pos: [1, 0, -1.5], color: "#6a4a1a" },     // 策略室
  { pos: [1, 0, 0.2] },                         // 投票
  { pos: [3, 0, -1], color: "#6a2a2a" },        // 风控
  { pos: [3, 0, 1], color: "#2a5a2a" },         // 交易
  { pos: [1, 0, 2] },                            // 仓位
  { pos: [-2.5, 0, 2] },                         // 会计
  { pos: [-1, 0, 2] },                           // 巡检
];

const ZONES: { pos: [number, number, number]; size: [number, number]; color: string; label: string }[] = [
  { pos: [-3, 0, -1], size: [2.5, 2], color: "#4fc3f7", label: "采集区" },
  { pos: [-1, 0, -1], size: [2, 2], color: "#ab47bc", label: "分析区" },
  { pos: [1, 0, -0.5], size: [2.5, 3], color: "#ffb74d", label: "策略室" },
  { pos: [3, 0, 0], size: [2, 3.5], color: "#ef5350", label: "风控/交易" },
  { pos: [-1, 0, 2], size: [5, 2], color: "#78909c", label: "支持区" },
];

export function Office3D() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(14, 28, "#1a2634", "#141e28");
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    return grid;
  }, []);

  return (
    <>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#0d151d" />
      </mesh>

      {/* 网格 */}
      <primitive object={gridHelper} />

      {/* 区域标记 */}
      {ZONES.map((z, i) => (
        <ZoneMarker key={i} position={z.pos} size={z.size} color={z.color} label={z.label} />
      ))}

      {/* 桌子 */}
      {DESKS.map((d, i) => (
        <Desk key={i} position={d.pos} color={d.color} />
      ))}
    </>
  );
}
