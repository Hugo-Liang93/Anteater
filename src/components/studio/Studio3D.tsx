/**
 * 3D 工作室主场景
 *
 * 真实日夜交替 + R3F Canvas + 角色 + 办公室 + 数据流
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { employeeConfigs } from "@/config/employees";
import type { EmployeeRoleType } from "@/config/employees";
import { AGENT_POSITIONS, DATA_FLOWS, SCREEN_ONLY_AGENTS } from "@/config/layout";
import { useEmployeeStore } from "@/store/employees";
import { CharacterModel } from "./CharacterModel";
import { RobotInspector } from "./RobotInspector";
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

/** 单条数据流线 — 通过 ref 读取 employee 状态，不触发 React 重渲染 */
import type { EmployeeState } from "@/store/employees";

function DataFlowLine({ from, to, fromPos, toPos, employeesRef }: {
  from: EmployeeRoleType; to: EmployeeRoleType;
  fromPos: [number, number, number]; toPos: [number, number, number];
  employeesRef: React.RefObject<Record<EmployeeRoleType, EmployeeState>>;
}) {
  const fromStatus = employeesRef.current?.[from]?.status ?? "idle";
  const toStatus = employeesRef.current?.[to]?.status ?? "idle";
  const isActive = fromStatus !== "idle";
  const isHighlight = fromStatus === "success" || toStatus === "success";
  return (
    <group>
      <FlowLine from={fromPos} to={toPos} highlight={isHighlight} />
      <DataFlowParticle from={fromPos} to={toPos} active={isActive} sourceStatus={fromStatus} targetStatus={toStatus} />
    </group>
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
  const getClickHandler = useCharacterClickHandlers();

  // 数据流状态通过 ref 订阅，不触发 React 重渲染（由 useFrame 驱动视觉更新）
  const employeesRef = useRef(useEmployeeStore.getState().employees);
  useEffect(() => {
    return useEmployeeStore.subscribe((s) => {
      employeesRef.current = s.employees;
    });
  }, []);

  // 稳定的数据流配置（仅依赖布局，不依赖运行时状态）
  const flowConfigs = useMemo(() =>
    DATA_FLOWS.map(({ from, to }) => ({
      from, to,
      fromPos: AGENT_POSITIONS[from],
      toPos: AGENT_POSITIONS[to],
    })),
  []);

  return (
    <>
      <DynamicLighting params={dayNight} />

      {dayNight.isNight && (
        <Stars radius={50} depth={30} count={800} factor={3} fade speed={0.5} />
      )}

      <Zones3D />
      <Office3D dayNight={dayNight} />

      {/* 数据流 — 粒子动画由 useFrame 内部读 ref，不触发 React 重渲染 */}
      {flowConfigs.map(({ from, to, fromPos, toPos }, i) => (
        <DataFlowLine key={i} from={from} to={to} fromPos={fromPos} toPos={toPos} employeesRef={employeesRef} />
      ))}

      {/* 角色 — SCREEN_ONLY 不渲染，inspector 用机器人 */}
      {employeeConfigs.map((cfg) => {
        if (SCREEN_ONLY_AGENTS.has(cfg.id)) return null;
        const pos = AGENT_POSITIONS[cfg.id];
        if (!pos) return null;

        // inspector → 机器人
        if (cfg.id === "inspector") {
          return <RobotInspector key={cfg.id} position={pos} onClick={getClickHandler(cfg.id)} />;
        }

        const dx = -pos[0];
        const dz = -6 - pos[2];
        const rotY = Math.atan2(dx, dz);
        return (
          <group key={cfg.id} position={pos} rotation={[0, rotY, 0]}>
            <CharacterModel
              role={cfg.id}
              position={[0, 0, 0]}
              onClick={getClickHandler(cfg.id)}
            />
          </group>
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
        camera={{ position: [0, 14, 12], fov: 45, near: 0.1, far: 80 }}
        onPointerMissed={() => setSelected(null)}
        style={{ background: bgHex }}
      >
        <Scene dayNight={dayNight} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.1}
          minDistance={5}
          maxDistance={35}
          target={[0, 0.5, 0]}
        />
        <fog attach="fog" args={[dayNight.bgColor, 18, 35]} />
      </Canvas>
    </div>
  );
}
