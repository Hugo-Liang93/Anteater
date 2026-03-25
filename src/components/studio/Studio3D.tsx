/**
 * 3D 工作室主场景
 *
 * 真实日夜交替 + R3F Canvas + 角色 + 办公室 + 数据流
 */

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { employeeConfigs } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";
import { Character3D } from "./Character3D";
import { Office3D } from "./Office3D";
import { DataFlowParticle, FlowLine } from "./DataFlow3D";
import { computeDayNight, type DayNightParams } from "@/engine/daynight";
import type { EmployeeRoleType } from "@/config/employees";
import * as THREE from "three";

/** 角色位置 */
const POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  collector:         [-3, 0, -0.4],
  analyst:           [-1, 0, -0.4],
  strategist:        [1, 0, -0.9],
  voter:             [1, 0, 0.8],
  risk_officer:      [3, 0, -0.4],
  trader:            [3, 0, 1.6],
  position_manager:  [1, 0, 2.6],
  accountant:        [-2.5, 0, 2.6],
  calendar_reporter: [-3.5, 0, 1.6],
  inspector:         [-1, 0, 2.6],
};

/** 数据流 */
const FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  { from: "collector", to: "analyst" },
  { from: "analyst", to: "strategist" },
  { from: "strategist", to: "voter" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  { from: "trader", to: "position_manager" },
];

/** 动态光照组件 — 每帧根据真实时间更新 */
function DynamicLighting({ params }: { params: DayNightParams }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();

  useFrame(() => {
    const p = computeDayNight();

    if (ambientRef.current) {
      ambientRef.current.color.copy(p.ambientColor);
      ambientRef.current.intensity = p.ambientIntensity;
    }
    if (sunRef.current) {
      sunRef.current.color.copy(p.sunColor);
      sunRef.current.intensity = p.sunIntensity;
      sunRef.current.position.y = p.sunY;
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(p.hemiSkyColor);
      hemiRef.current.groundColor.copy(p.hemiGroundColor);
    }
    // 雾色
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(p.bgColor);
    }
    // 背景色
    scene.background = p.bgColor;
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={params.ambientIntensity} color={params.ambientColor} />
      <directionalLight
        ref={sunRef}
        position={[3, params.sunY, 3]}
        intensity={params.sunIntensity}
        color={params.sunColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <hemisphereLight ref={hemiRef} args={[params.hemiSkyColor, params.hemiGroundColor, 0.3]} />
    </>
  );
}

function Scene({ dayNight }: { dayNight: DayNightParams }) {
  const employees = useEmployeeStore((s) => s.employees);
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  return (
    <>
      <DynamicLighting params={dayNight} />

      {/* 夜间星空 */}
      {dayNight.isNight && (
        <Stars radius={50} depth={30} count={800} factor={3} fade speed={0.5} />
      )}

      {/* 办公室（传入日夜参数） */}
      <Office3D dayNight={dayNight} />

      {/* 数据流 */}
      {FLOWS.map(({ from, to }, i) => {
        const fromPos = POSITIONS[from];
        const toPos = POSITIONS[to];
        const fromEmp = employees[from];
        const toEmp = employees[to];
        const fromStatus = fromEmp?.status ?? "idle";
        const isActive = fromStatus !== "idle";
        const isHighlight = fromStatus === "success" || toEmp?.status === "success";
        return (
          <group key={i}>
            <FlowLine from={fromPos} to={toPos} highlight={isHighlight} />
            <DataFlowParticle
              from={fromPos}
              to={toPos}
              active={isActive}
              sourceStatus={fromStatus}
              targetStatus={toEmp?.status}
            />
          </group>
        );
      })}

      {/* 角色 */}
      {employeeConfigs.map((cfg) => {
        const pos = POSITIONS[cfg.id];
        if (!pos) return null;
        return (
          <Character3D
            key={cfg.id}
            role={cfg.id}
            position={pos}
            onClick={() => setSelected(cfg.id)}
          />
        );
      })}
    </>
  );
}

export function Studio3D() {
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);
  const [dayNight, setDayNight] = useState(() => computeDayNight());

  // 每 30 秒更新一次日夜参数（用于初始渲染和 React 状态）
  useEffect(() => {
    const timer = setInterval(() => setDayNight(computeDayNight()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const bgHex = "#" + dayNight.bgColor.getHexString();

  return (
    <div className="absolute inset-0">
      {/* 时段指示器 */}
      <div className="absolute left-2 top-2 z-10 rounded-md bg-black/30 px-2 py-1 text-[10px] text-white/70 backdrop-blur-sm">
        {dayNight.periodName} {dayNight.isNight ? "🌙" : "☀️"}
      </div>
      <Canvas
        shadows
        camera={{ position: [0, 12, 4], fov: 45, near: 0.1, far: 50 }}
        onPointerMissed={() => setSelected(null)}
        style={{ background: bgHex }}
      >
        <Scene dayNight={dayNight} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={0.2}
          minDistance={5}
          maxDistance={20}
          target={[0, 0, 0.5]}
        />
        <fog attach="fog" args={[dayNight.bgColor, 14, 22]} />
      </Canvas>
    </div>
  );
}
