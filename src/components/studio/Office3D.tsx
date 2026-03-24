/**
 * 3D 交易部门场景 — 暖色调
 *
 * 温暖的木质办公室：
 * - 四面墙体（带窗户透入阳光）
 * - 暖色木地板
 * - 窗外绿树和蓝天
 * - 多屏交易工位
 * - LED行情墙
 * - 暖色照明
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

// ─── 墙体 ───

function Wall({ position, size, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#f5ede3" side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── 窗户（透出阳光） ───

function Window({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* 窗框 */}
      <mesh>
        <boxGeometry args={[1.6, 0.9, 0.08]} />
        <meshStandardMaterial color="#8d7b68" />
      </mesh>
      {/* 玻璃 */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.4, 0.75]} />
        <meshStandardMaterial
          color="#a8d8ea"
          transparent
          opacity={0.3}
          emissive="#ffe8c0"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* 窗格十字 */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.04, 0.75, 0.02]} />
        <meshStandardMaterial color="#8d7b68" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.4, 0.04, 0.02]} />
        <meshStandardMaterial color="#8d7b68" />
      </mesh>
      {/* 阳光光柱 */}
      <pointLight
        position={[0, 0, 1.5]}
        intensity={0.6}
        distance={5}
        color="#ffe4b5"
        castShadow={false}
      />
    </group>
  );
}

// ─── 窗外树木 ───

function OutdoorTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 树干 */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#8d6e53" />
      </mesh>
      {/* 树冠（3层球） */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#5a8a4a" />
      </mesh>
      <mesh position={[-0.2, 1.3, 0.1]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#6a9a5a" />
      </mesh>
      <mesh position={[0.15, 1.4, -0.1]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#4a7a3a" />
      </mesh>
    </group>
  );
}

// ─── 交易工位 ───

function TradingDesk({ position, screens = 2, deskColor = "#a08060" }: {
  position: [number, number, number];
  screens?: number;
  deskColor?: string;
}) {
  const screenWidth = 0.42;
  const totalWidth = screens * screenWidth + (screens - 1) * 0.06;

  return (
    <group position={position}>
      {/* 木桌面 */}
      <mesh position={[0, 0.52, 0]} receiveShadow castShadow>
        <boxGeometry args={[totalWidth + 0.3, 0.04, 0.55]} />
        <meshStandardMaterial color={deskColor} />
      </mesh>
      {/* 桌腿 */}
      {[
        [-(totalWidth + 0.2) / 2, 0.26, -0.22],
        [(totalWidth + 0.2) / 2, 0.26, -0.22],
        [-(totalWidth + 0.2) / 2, 0.26, 0.22],
        [(totalWidth + 0.2) / 2, 0.26, 0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.05, 0.52, 0.05]} />
          <meshStandardMaterial color="#6b5240" />
        </mesh>
      ))}
      {/* 显示器 */}
      {Array.from({ length: screens }).map((_, i) => {
        const offsetX = (i - (screens - 1) / 2) * (screenWidth + 0.06);
        return (
          <group key={i} position={[offsetX, 0.55, -0.15]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[screenWidth, 0.3, 0.025]} />
              <meshStandardMaterial color="#2a2a2e" />
            </mesh>
            <mesh position={[0, 0.25, 0.014]}>
              <planeGeometry args={[screenWidth - 0.04, 0.25]} />
              <meshStandardMaterial color="#0a1510" emissive="#003a28" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <boxGeometry args={[0.04, 0.14, 0.04]} />
              <meshStandardMaterial color="#3a3a3e" />
            </mesh>
            <mesh position={[0, 0.01, 0.05]}>
              <boxGeometry args={[0.15, 0.02, 0.1]} />
              <meshStandardMaterial color="#3a3a3e" />
            </mesh>
          </group>
        );
      })}
      {/* 键盘 */}
      <mesh position={[0, 0.545, 0.1]}>
        <boxGeometry args={[0.35, 0.01, 0.12]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
    </group>
  );
}

// ─── LED行情墙 ───

function TickerWall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 背板（矮墙高度内） */}
      <mesh>
        <boxGeometry args={[6, 1.0, 0.08]} />
        <meshStandardMaterial color="#3a3028" />
      </mesh>
      {/* 3 块屏幕 */}
      {[-1.8, 0, 1.8].map((ox, i) => (
        <mesh key={i} position={[ox, 0.05, 0.05]}>
          <planeGeometry args={[1.5, 0.6]} />
          <meshStandardMaterial
            color="#050e08"
            emissive={["#003322", "#002244", "#003322"][i]}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      {/* LED 滚动条 */}
      <mesh position={[0, -0.38, 0.05]}>
        <planeGeometry args={[5.6, 0.1]} />
        <meshStandardMaterial color="#001100" emissive="#00d4aa" emissiveIntensity={0.25} />
      </mesh>
      <Text position={[0, 0.4, 0.06]} fontSize={0.09} color="#ffe4b5" anchorX="center" font={undefined}>
        XAUUSD TRADING STUDIO
      </Text>
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
      <meshStandardMaterial color={color} transparent opacity={0.08} />
    </mesh>
  );
}

// ─── 盆栽 ───

function PottedPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 花盆 */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.24, 8]} />
        <meshStandardMaterial color="#8d6e53" />
      </mesh>
      {/* 泥土 */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 8]} />
        <meshStandardMaterial color="#5a4030" />
      </mesh>
      {/* 叶子 */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#6a9a5a" />
      </mesh>
      <mesh position={[0.08, 0.55, 0.05]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#5a8a4a" />
      </mesh>
    </group>
  );
}

// ─── 工位布局 ───

const DESKS: { pos: [number, number, number]; screens: number; deskColor?: string }[] = [
  { pos: [-3, 0, -1], screens: 3, deskColor: "#a08060" },
  { pos: [-1, 0, -1], screens: 3, deskColor: "#9a7a5a" },
  { pos: [1, 0, -1.5], screens: 3, deskColor: "#a08060" },
  { pos: [1, 0, 0.2], screens: 2, deskColor: "#9a7a5a" },
  { pos: [3, 0, -1], screens: 2, deskColor: "#8a6a4a" },
  { pos: [3, 0, 1], screens: 2, deskColor: "#a08060" },
  { pos: [1, 0, 2], screens: 2, deskColor: "#9a7a5a" },
  { pos: [-2.5, 0, 2], screens: 1, deskColor: "#a08060" },
  { pos: [-1, 0, 2], screens: 1, deskColor: "#9a7a5a" },
];

const ROOM_W = 12;
const ROOM_D = 10;
const WALL_H = 1.2; // 矮墙，俯瞰时能看到室内

export function Office3D() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(16, 32, "#c8b8a0", "#d4c4ac");
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    return grid;
  }, []);

  return (
    <>
      {/* 木地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W + 2, ROOM_D + 2]} />
        <meshStandardMaterial color="#c4a882" />
      </mesh>
      <primitive object={gridHelper} />

      {/* 无天花板 — 俯瞰视角 */}

      {/* ─── 四面矮墙 ─── */}
      {/* 后墙（行情墙所在） */}
      <Wall position={[0, WALL_H / 2, -(ROOM_D / 2 + 0.5)]} size={[ROOM_W + 2, WALL_H]} />
      {/* 前墙 */}
      <Wall position={[0, WALL_H / 2, ROOM_D / 2 + 0.5]} size={[ROOM_W + 2, WALL_H]} />
      {/* 左墙 */}
      <Wall position={[-(ROOM_W / 2 + 1), WALL_H / 2, 0]} size={[ROOM_D + 2, WALL_H]} rotation={[0, Math.PI / 2, 0]} />
      {/* 右墙 */}
      <Wall position={[ROOM_W / 2 + 1, WALL_H / 2, 0]} size={[ROOM_D + 2, WALL_H]} rotation={[0, Math.PI / 2, 0]} />

      {/* ─── 窗户（嵌在矮墙中） ─── */}
      <Window position={[-(ROOM_W / 2 + 0.95), 0.7, -2]} rotation={[0, Math.PI / 2, 0]} />
      <Window position={[-(ROOM_W / 2 + 0.95), 0.7, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Window position={[ROOM_W / 2 + 0.95, 0.7, -2]} rotation={[0, -Math.PI / 2, 0]} />
      <Window position={[ROOM_W / 2 + 0.95, 0.7, 1]} rotation={[0, -Math.PI / 2, 0]} />

      {/* ─── 窗外树木 ─── */}
      <OutdoorTree position={[-(ROOM_W / 2 + 2.5), 0, -2.5]} />
      <OutdoorTree position={[-(ROOM_W / 2 + 3.2), 0, 0.5]} />
      <OutdoorTree position={[-(ROOM_W / 2 + 2.0), 0, 1.8]} />
      <OutdoorTree position={[ROOM_W / 2 + 2.5, 0, -1.5]} />
      <OutdoorTree position={[ROOM_W / 2 + 3.0, 0, 1.5]} />

      {/* ─── 阳光（从窗户方向） ─── */}
      <directionalLight
        position={[-8, 6, 0]}
        intensity={0.5}
        color="#ffe8c0"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight
        position={[8, 6, 0]}
        intensity={0.3}
        color="#ffe0b0"
      />

      {/* 地板区域色带 */}
      <FloorStripe position={[-3, 0.005, -1]} size={[2.8, 2.2]} color="#4fc3f7" />
      <FloorStripe position={[-1, 0.005, -1]} size={[2.4, 2.2]} color="#ab47bc" />
      <FloorStripe position={[1, 0.005, -0.6]} size={[2.8, 3.6]} color="#ffb74d" />
      <FloorStripe position={[3, 0.005, 0]} size={[2.4, 4]} color="#ef5350" />
      <FloorStripe position={[-0.5, 0.005, 2]} size={[6, 2.2]} color="#78909c" />

      {/* LED行情墙（贴在后矮墙上） */}
      <TickerWall position={[0, 0.65, -(ROOM_D / 2 + 0.35)]} />

      {/* 暖色区域照明（无遮挡，从上方打光） */}
      <pointLight position={[-3, 4, -1]} intensity={0.4} distance={8} color="#ffe4b5" />
      <pointLight position={[1, 4, -0.5]} intensity={0.4} distance={8} color="#ffe4b5" />
      <pointLight position={[3, 4, 0]} intensity={0.4} distance={8} color="#ffe4b5" />
      <pointLight position={[0, 4, 2]} intensity={0.3} distance={8} color="#ffe4b5" />

      {/* 盆栽 */}
      <PottedPlant position={[-5.5, 0, -3.5]} />
      <PottedPlant position={[5.5, 0, -3.5]} />
      <PottedPlant position={[-5.5, 0, 3.5]} />
      <PottedPlant position={[5.5, 0, 3.5]} />
      <PottedPlant position={[0, 0, 3.8]} />

      {/* 交易工位 */}
      {DESKS.map((d, i) => (
        <TradingDesk key={i} position={d.pos} screens={d.screens} deskColor={d.deskColor} />
      ))}
    </>
  );
}
