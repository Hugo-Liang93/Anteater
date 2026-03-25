/**
 * 3D 工作室主场景
 *
 * 真实日夜交替 + R3F Canvas + 角色 + 办公室 + 数据流
 */

import { useRef, useState, useEffect, useCallback, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { employeeConfigs } from "@/config/employees";
import type { EmployeeRoleType } from "@/config/employees";
import { AGENT_POSITIONS, DATA_FLOWS } from "@/config/layout";
import { useEmployeeStore } from "@/store/employees";
import { CharacterModel } from "./CharacterModel";
import { Office3D } from "./Office3D";
import { DataFlowParticle, FlowLine } from "./DataFlow3D";
import { Zones3D } from "./Zones3D";
import { computeDayNight, type DayNightParams } from "@/engine/daynight";
import * as THREE from "three";

/** 动态光照组件 — 每秒更新一次日夜参数（节流，避免每帧创建新对象） */
function DynamicLighting({ params }: { params: DayNightParams }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const cachedParamsRef = useRef<DayNightParams>(params);
  const lastUpdateRef = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastUpdateRef.current > 1000) {
      lastUpdateRef.current = now;
      cachedParamsRef.current = computeDayNight();
    }
    const p = cachedParamsRef.current;

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
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(p.bgColor);
    }
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

/** 稳定的 onClick 工厂 — 避免每次渲染创建新函数击穿 Character3D memo */
function useCharacterClickHandlers() {
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);
  const handlersRef = useRef(new Map<EmployeeRoleType, () => void>());

  // 懒初始化所有角色的 click handler
  const getHandler = useCallback((role: EmployeeRoleType) => {
    let handler = handlersRef.current.get(role);
    if (!handler) {
      handler = () => setSelected(role);
      handlersRef.current.set(role, handler);
    }
    return handler;
  }, [setSelected]);

  return getHandler;
}

const Scene = memo(function Scene({ dayNight }: { dayNight: DayNightParams }) {
  const employees = useEmployeeStore((s) => s.employees);
  const getClickHandler = useCharacterClickHandlers();

  return (
    <>
      <DynamicLighting params={dayNight} />

      {dayNight.isNight && (
        <Stars radius={50} depth={30} count={800} factor={3} fade speed={0.5} />
      )}

      <Zones3D />
      <Office3D dayNight={dayNight} />

      {/* 数据流 */}
      {DATA_FLOWS.map(({ from, to }, i) => {
        const fromPos = AGENT_POSITIONS[from];
        const toPos = AGENT_POSITIONS[to];
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

      {/* 角色 — 使用稳定 onClick 引用，不击穿 memo */}
      {employeeConfigs.map((cfg) => {
        const pos = AGENT_POSITIONS[cfg.id];
        if (!pos) return null;
        return (
          <CharacterModel
            key={cfg.id}
            role={cfg.id}
            position={pos}
            onClick={getClickHandler(cfg.id)}
          />
        );
      })}
    </>
  );
});

export function Studio3D() {
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);
  const [dayNight, setDayNight] = useState(() => computeDayNight());

  useEffect(() => {
    const timer = setInterval(() => setDayNight(computeDayNight()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const bgHex = "#" + dayNight.bgColor.getHexString();

  return (
    <div className="absolute inset-0">
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
          maxDistance={25}
          target={[0, 0, 0.3]}
        />
        <fog attach="fog" args={[dayNight.bgColor, 14, 22]} />
      </Canvas>
    </div>
  );
}
