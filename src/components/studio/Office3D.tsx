/**
 * 3D 交易部门场景
 *
 * 模拟真实的公司交易部门：
 * - 多屏交易工位（弧形排列）
 * - 大型LED行情墙
 * - 玻璃隔断分区
 * - 风控台（红色警示灯）
 * - 天花板照明
 * - 地板分区色带
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

// ─── 交易工位（多屏） ───

function TradingDesk({ position, screens = 2, color = "#2a3f52" }: {
  position: [number, number, number];
  screens?: number;
  color?: string;
}) {
  const screenWidth = 0.42;
  const totalWidth = screens * screenWidth + (screens - 1) * 0.06;

  return (
    <group position={position}>
      {/* 弧形桌面 */}
      <mesh position={[0, 0.52, 0]} receiveShadow castShadow>
        <boxGeometry args={[totalWidth + 0.3, 0.04, 0.55]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 桌腿 */}
      {[
        [-(totalWidth + 0.2) / 2, 0.26, -0.22],
        [(totalWidth + 0.2) / 2, 0.26, -0.22],
        [-(totalWidth + 0.2) / 2, 0.26, 0.22],
        [(totalWidth + 0.2) / 2, 0.26, 0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 0.52, 0.04]} />
          <meshStandardMaterial color="#1a2634" />
        </mesh>
      ))}
      {/* 多屏显示器 */}
      {Array.from({ length: screens }).map((_, i) => {
        const offsetX = (i - (screens - 1) / 2) * (screenWidth + 0.06);
        return (
          <group key={i} position={[offsetX, 0.55, -0.15]}>
            {/* 显示器外壳 */}
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[screenWidth, 0.3, 0.025]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
            {/* 屏幕（发光） */}
            <mesh position={[0, 0.25, 0.014]}>
              <planeGeometry args={[screenWidth - 0.04, 0.25]} />
              <meshStandardMaterial
                color="#051510"
                emissive="#004433"
                emissiveIntensity={0.4}
              />
            </mesh>
            {/* 支架 */}
            <mesh position={[0, 0.07, 0]}>
              <boxGeometry args={[0.04, 0.14, 0.04]} />
              <meshStandardMaterial color="#1a2634" />
            </mesh>
            {/* 底座 */}
            <mesh position={[0, 0.01, 0.05]}>
              <boxGeometry args={[0.15, 0.02, 0.1]} />
              <meshStandardMaterial color="#1a2634" />
            </mesh>
          </group>
        );
      })}
      {/* 键盘 */}
      <mesh position={[0, 0.545, 0.1]}>
        <boxGeometry args={[0.35, 0.01, 0.12]} />
        <meshStandardMaterial color="#263238" />
      </mesh>
    </group>
  );
}

// ─── LED行情墙 ───

function TickerWall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 墙体 */}
      <mesh>
        <boxGeometry args={[8, 2.8, 0.12]} />
        <meshStandardMaterial color="#0d151d" />
      </mesh>
      {/* 大屏幕 (3块) */}
      {[-2.2, 0, 2.2].map((ox, i) => (
        <mesh key={i} position={[ox, 0.2, 0.07]}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshStandardMaterial
            color="#020e08"
            emissive={["#003322", "#002244", "#003322"][i]}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      {/* LED 滚动条 */}
      <mesh position={[0, -1.15, 0.07]}>
        <planeGeometry args={[7.5, 0.18]} />
        <meshStandardMaterial color="#001100" emissive="#00d4aa" emissiveIntensity={0.3} />
      </mesh>
      {/* 标题 */}
      <Text
        position={[0, 1.2, 0.08]}
        fontSize={0.15}
        color="#00d4aa"
        anchorX="center"
        font={undefined}
      >
        XAUUSD TRADING STUDIO
      </Text>
    </group>
  );
}

// ─── 玻璃隔断 ───

function GlassPartition({ position, size }: {
  position: [number, number, number];
  size: [number, number];
}) {
  return (
    <group position={position}>
      {/* 玻璃面 */}
      <mesh>
        <boxGeometry args={[size[0], size[1], 0.03]} />
        <meshStandardMaterial color="#1a3040" transparent opacity={0.15} />
      </mesh>
      {/* 金属框 - 顶 */}
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={[size[0], 0.03, 0.05]} />
        <meshStandardMaterial color="#37474f" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* 金属框 - 底 */}
      <mesh position={[0, -size[1] / 2, 0]}>
        <boxGeometry args={[size[0], 0.03, 0.05]} />
        <meshStandardMaterial color="#37474f" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ─── 风控警示灯 ───

function WarningLight({ position, active }: {
  position: [number, number, number];
  active: boolean;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={active ? "#ff4757" : "#3a1a1a"}
        emissive={active ? "#ff0000" : "#000000"}
        emissiveIntensity={active ? 1.5 : 0}
      />
    </mesh>
  );
}

// ─── 天花板灯 ───

function CeilingLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.2, 0.04, 0.15]} />
        <meshStandardMaterial color="#e0e0e0" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <pointLight intensity={0.4} distance={6} color="#e8edf2" position={[0, -0.1, 0]} />
    </group>
  );
}

// ─── 地板区域色带 ───

function FloorStripe({ position, size, color }: {
  position: [number, number, number];
  size: [number, number];
  color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} transparent opacity={0.06} />
    </mesh>
  );
}

// ─── 工位布局 ───

const DESKS: { pos: [number, number, number]; screens: number; color?: string }[] = [
  // 采集区
  { pos: [-3, 0, -1], screens: 3, color: "#1e3a4a" },
  // 分析区
  { pos: [-1, 0, -1], screens: 3, color: "#2a1a3a" },
  // 策略室（双排）
  { pos: [1, 0, -1.5], screens: 3, color: "#3a2a1a" },
  { pos: [1, 0, 0.2], screens: 2, color: "#3a3a1a" },
  // 风控台
  { pos: [3, 0, -1], screens: 2, color: "#3a1a1a" },
  // 交易台
  { pos: [3, 0, 1], screens: 2, color: "#1a3a1a" },
  // 支持区
  { pos: [1, 0, 2], screens: 2 },
  { pos: [-2.5, 0, 2], screens: 1 },
  { pos: [-1, 0, 2], screens: 1 },
];

export function Office3D() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(16, 32, "#1a2634", "#111a22");
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    return grid;
  }, []);

  return (
    <>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#0b1118" />
      </mesh>
      <primitive object={gridHelper} />

      {/* 地板区域色带 */}
      <FloorStripe position={[-3, 0.005, -1]} size={[2.8, 2.2]} color="#4fc3f7" />
      <FloorStripe position={[-1, 0.005, -1]} size={[2.4, 2.2]} color="#ab47bc" />
      <FloorStripe position={[1, 0.005, -0.6]} size={[2.8, 3.6]} color="#ffb74d" />
      <FloorStripe position={[3, 0.005, 0]} size={[2.4, 4]} color="#ef5350" />
      <FloorStripe position={[-0.5, 0.005, 2]} size={[6, 2.2]} color="#78909c" />

      {/* LED行情墙 */}
      <TickerWall position={[0, 1.6, -3.5]} />

      {/* 玻璃隔断 */}
      <GlassPartition position={[-0.1, 1.0, -1]} size={[0.03, 1.8]} />
      <GlassPartition position={[2.1, 1.0, -0.6]} size={[0.03, 1.8]} />
      <GlassPartition position={[0, 0.9, 0.9]} size={[8, 0.03]} />

      {/* 风控警示灯 */}
      <WarningLight position={[3.8, 1.6, -1.5]} active={false} />
      <WarningLight position={[3.8, 1.4, -1.5]} active={false} />

      {/* 天花板灯 */}
      <CeilingLight position={[-2, 3.2, -1]} />
      <CeilingLight position={[1, 3.2, -1]} />
      <CeilingLight position={[3, 3.2, 0]} />
      <CeilingLight position={[-0.5, 3.2, 2]} />

      {/* 交易工位 */}
      {DESKS.map((d, i) => (
        <TradingDesk key={i} position={d.pos} screens={d.screens} color={d.color} />
      ))}
    </>
  );
}
