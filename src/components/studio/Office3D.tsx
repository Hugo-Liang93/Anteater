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
 *
 * 所有几何体/材质均从 engine/shared3d.ts 共享注册表获取。
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { DayNightParams } from "@/engine/daynight";
import {
  OfficeGeo, OfficeMat,
  getDeskMaterial, getMonitorScreenMat, getWindowGlassMat, getFloorStripeMat,
} from "@/engine/shared3d";

// ─── 室内灯位置（模块级常量，避免每次渲染重建数组） ───
const INDOOR_LIGHT_POSITIONS: [number, number, number][] = [
  [-3, 4, -1], [1, 4, -0.5], [3, 4, 0], [0, 4, 2],
];

// ─── 墙体 ───

function Wall({ position, size, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: [number, number, number];
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(...size), [size]);
  return (
    <mesh position={position} rotation={rotation} receiveShadow
      geometry={geo} material={OfficeMat.wall}
    />
  );
}

// ─── 窗户（透出阳光） ───

function Window({ position, rotation = [0, 0, 0] as [number, number, number], dayNight }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  dayNight: DayNightParams;
}) {
  const glassMat = getWindowGlassMat(dayNight.windowGlassColor, dayNight.isNight);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={OfficeGeo.windowFrame} material={OfficeMat.windowFrame} />
      <mesh position={[0, 0, 0.02]} geometry={OfficeGeo.windowGlass} material={glassMat} />
      <mesh position={[0, 0, 0.05]} geometry={OfficeGeo.windowBarV} material={OfficeMat.windowFrame} />
      <mesh position={[0, 0, 0.05]} geometry={OfficeGeo.windowBarH} material={OfficeMat.windowFrame} />
      <pointLight
        position={[0, 0, 1.5]}
        intensity={dayNight.windowLightIntensity}
        distance={5}
        color={dayNight.isNight ? "#2a3060" : "#ffe4b5"}
        castShadow={false}
      />
    </group>
  );
}

// ─── 窗外树木 ───

function OutdoorTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} geometry={OfficeGeo.treeTrunk} material={OfficeMat.treeTrunk} />
      <mesh position={[0, 1.0, 0]} geometry={OfficeGeo.treeCrown1} material={OfficeMat.treeCrown[0]} />
      <mesh position={[-0.2, 1.3, 0.1]} geometry={OfficeGeo.treeCrown2} material={OfficeMat.treeCrown[1]} />
      <mesh position={[0.15, 1.4, -0.1]} geometry={OfficeGeo.treeCrown3} material={OfficeMat.treeCrown[2]} />
    </group>
  );
}

// ─── 交易工位 ───

function TradingDesk({ position, screens = 2, deskColor = "#a08060", monitorGlow = 0.35 }: {
  position: [number, number, number];
  screens?: number;
  deskColor?: string;
  monitorGlow?: number;
}) {
  const screenWidth = 0.42;
  const totalWidth = screens * screenWidth + (screens - 1) * 0.06;
  const deskMat = getDeskMaterial(deskColor);
  const screenMat = getMonitorScreenMat(monitorGlow);
  const deskTopGeo = useMemo(
    () => new THREE.BoxGeometry(totalWidth + 0.3, 0.04, 0.55),
    [totalWidth],
  );
  const screenGeo = useMemo(
    () => new THREE.PlaneGeometry(screenWidth - 0.04, 0.25),
    [],
  );

  return (
    <group position={position}>
      {/* 木桌面 */}
      <mesh position={[0, 0.52, 0]} receiveShadow castShadow geometry={deskTopGeo} material={deskMat} />
      {/* 桌腿 */}
      {[
        [-(totalWidth + 0.2) / 2, 0.26, -0.22],
        [(totalWidth + 0.2) / 2, 0.26, -0.22],
        [-(totalWidth + 0.2) / 2, 0.26, 0.22],
        [(totalWidth + 0.2) / 2, 0.26, 0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow
          geometry={OfficeGeo.deskLeg} material={OfficeMat.deskLeg}
        />
      ))}
      {/* 显示器 */}
      {Array.from({ length: screens }).map((_, i) => {
        const offsetX = (i - (screens - 1) / 2) * (screenWidth + 0.06);
        return (
          <group key={i} position={[offsetX, 0.55, -0.15]}>
            <mesh position={[0, 0.25, 0]} geometry={OfficeGeo.monitorShell} material={OfficeMat.monitorShell} />
            <mesh position={[0, 0.25, 0.014]} geometry={screenGeo} material={screenMat} />
            <mesh position={[0, 0.07, 0]} geometry={OfficeGeo.monitorStand} material={OfficeMat.monitorStand} />
            <mesh position={[0, 0.01, 0.05]} geometry={OfficeGeo.monitorBase} material={OfficeMat.monitorStand} />
          </group>
        );
      })}
      {/* 键盘 */}
      <mesh position={[0, 0.545, 0.1]} geometry={OfficeGeo.keyboard} material={OfficeMat.keyboard} />
    </group>
  );
}

// ─── LED行情墙 ───

function TickerWall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={OfficeGeo.tickerBoard} material={OfficeMat.tickerBoard} />
      {([-1.8, 0, 1.8] as const).map((ox, i) => (
        <mesh key={i} position={[ox, 0.05, 0.05]}
          geometry={OfficeGeo.tickerScreen} material={OfficeMat.tickerScreens[i]}
        />
      ))}
      <mesh position={[0, -0.38, 0.05]} geometry={OfficeGeo.tickerLed} material={OfficeMat.tickerLed} />
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
  const geo = useMemo(() => new THREE.PlaneGeometry(...size), [size]);
  const mat = getFloorStripeMat(color);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow
      geometry={geo} material={mat}
    />
  );
}

// ─── 盆栽 ───

function PottedPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} geometry={OfficeGeo.potBody} material={OfficeMat.potBody} />
      <mesh position={[0, 0.25, 0]} geometry={OfficeGeo.potSoil} material={OfficeMat.potSoil} />
      <mesh position={[0, 0.45, 0]} geometry={OfficeGeo.potLeaf1} material={OfficeMat.potLeaf[0]} />
      <mesh position={[0.08, 0.55, 0.05]} geometry={OfficeGeo.potLeaf2} material={OfficeMat.potLeaf[1]} />
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
const ROOM_FLOOR = new THREE.PlaneGeometry(ROOM_W + 2, ROOM_D + 2);
const WALL_H = 1.2;

export function Office3D({ dayNight }: { dayNight: DayNightParams }) {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(16, 32, "#c8b8a0", "#d4c4ac");
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    return grid;
  }, []);

  // 组件卸载时释放 GridHelper
  useEffect(() => {
    return () => {
      gridHelper.geometry.dispose();
      const mat = gridHelper.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    };
  }, [gridHelper]);

  return (
    <>
      {/* 木地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow
        geometry={ROOM_FLOOR} material={OfficeMat.floor}
      />
      <primitive object={gridHelper} />

      {/* ─── 四面矮墙 ─── */}
      <Wall position={[0, WALL_H / 2, -(ROOM_D / 2 + 0.5)]} size={[ROOM_W + 2, WALL_H]} />
      <Wall position={[0, WALL_H / 2, ROOM_D / 2 + 0.5]} size={[ROOM_W + 2, WALL_H]} />
      <Wall position={[-(ROOM_W / 2 + 1), WALL_H / 2, 0]} size={[ROOM_D + 2, WALL_H]} rotation={[0, Math.PI / 2, 0]} />
      <Wall position={[ROOM_W / 2 + 1, WALL_H / 2, 0]} size={[ROOM_D + 2, WALL_H]} rotation={[0, Math.PI / 2, 0]} />

      {/* ─── 窗户 ─── */}
      <Window position={[-(ROOM_W / 2 + 0.95), 0.7, -2]} rotation={[0, Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[-(ROOM_W / 2 + 0.95), 0.7, 1]} rotation={[0, Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[ROOM_W / 2 + 0.95, 0.7, -2]} rotation={[0, -Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[ROOM_W / 2 + 0.95, 0.7, 1]} rotation={[0, -Math.PI / 2, 0]} dayNight={dayNight} />

      {/* ─── 窗外树木 ─── */}
      <OutdoorTree position={[-(ROOM_W / 2 + 2.5), 0, -2.5]} />
      <OutdoorTree position={[-(ROOM_W / 2 + 3.2), 0, 0.5]} />
      <OutdoorTree position={[-(ROOM_W / 2 + 2.0), 0, 1.8]} />
      <OutdoorTree position={[ROOM_W / 2 + 2.5, 0, -1.5]} />
      <OutdoorTree position={[ROOM_W / 2 + 3.0, 0, 1.5]} />

      {/* ─── 窗外阳光 ─── */}
      <directionalLight
        position={[-8, dayNight.sunY, 0]}
        intensity={dayNight.windowLightIntensity * 0.8}
        color={dayNight.sunColor}
        castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}
      />
      <directionalLight
        position={[8, dayNight.sunY, 0]}
        intensity={dayNight.windowLightIntensity * 0.5}
        color={dayNight.sunColor}
      />

      {/* 地板区域色带 */}
      <FloorStripe position={[-3, 0.005, -1]} size={[2.8, 2.2]} color="#4fc3f7" />
      <FloorStripe position={[-1, 0.005, -1]} size={[2.4, 2.2]} color="#ab47bc" />
      <FloorStripe position={[1, 0.005, -0.6]} size={[2.8, 3.6]} color="#ffb74d" />
      <FloorStripe position={[3, 0.005, 0]} size={[2.4, 4]} color="#ef5350" />
      <FloorStripe position={[-0.5, 0.005, 2]} size={[6, 2.2]} color="#78909c" />

      {/* LED行情墙 */}
      <TickerWall position={[0, 0.65, -(ROOM_D / 2 + 0.35)]} />

      {/* 室内照明 */}
      {INDOOR_LIGHT_POSITIONS.map((p, i) => (
        <pointLight
          key={i}
          position={p}
          intensity={dayNight.isNight ? 0.55 : 0.3}
          distance={8}
          color={dayNight.isNight ? "#ffd080" : "#ffe4b5"}
        />
      ))}

      {/* 盆栽 */}
      <PottedPlant position={[-5.5, 0, -3.5]} />
      <PottedPlant position={[5.5, 0, -3.5]} />
      <PottedPlant position={[-5.5, 0, 3.5]} />
      <PottedPlant position={[5.5, 0, 3.5]} />
      <PottedPlant position={[0, 0, 3.8]} />

      {/* 交易工位 */}
      {DESKS.map((d, i) => (
        <TradingDesk key={i} position={d.pos} screens={d.screens} deskColor={d.deskColor} monitorGlow={dayNight.monitorEmissive} />
      ))}
    </>
  );
}
