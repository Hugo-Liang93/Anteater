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
import { useUIStore } from "@/store/ui";
import { getWorkflowByRole, workflowConfigMap } from "@/config/workflows";
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

function DataFlowLine({ from, to, fromPos, toPos, employeesRef, activeRoleSet }: {
  from: EmployeeRoleType; to: EmployeeRoleType;
  fromPos: [number, number, number]; toPos: [number, number, number];
  employeesRef: React.RefObject<Record<EmployeeRoleType, EmployeeState>>;
  activeRoleSet: ReadonlySet<EmployeeRoleType>;
}) {
  const fromStatus = employeesRef.current?.[from]?.status ?? "idle";
  const toStatus = employeesRef.current?.[to]?.status ?? "idle";
  const inFocus = activeRoleSet.has(from) || activeRoleSet.has(to);
  const isActive = fromStatus !== "idle" || inFocus;
  const isHighlight = inFocus || fromStatus === "success" || toStatus === "success";
  return (
    <group>
      <FlowLine from={fromPos} to={toPos} highlight={isHighlight} />
      <DataFlowParticle from={fromPos} to={toPos} active={isActive} sourceStatus={fromStatus} targetStatus={toStatus} />
    </group>
  );
}

function FocusMarker({
  position,
  color,
  active,
  strong,
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
  strong: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: active ? (strong ? 0.92 : 0.42) : 0,
        side: THREE.DoubleSide,
      }),
    [active, color, strong],
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: active ? (strong ? 0.16 : 0.06) : 0,
        side: THREE.DoubleSide,
      }),
    [active, color, strong],
  );

  useEffect(() => {
    return () => {
      ringMat.dispose();
      glowMat.dispose();
    };
  }, [glowMat, ringMat]);

  useFrame(() => {
    const t = performance.now() / 1000;
    if (ringRef.current) {
      ringRef.current.visible = active;
      if (active) {
        const scale = 1 + Math.sin(t * 3) * (strong ? 0.08 : 0.04);
        ringRef.current.scale.setScalar(scale);
      }
    }
    if (glowRef.current) {
      glowRef.current.visible = active;
      if (active) {
        const scale = 1 + Math.sin(t * 2 + 0.7) * (strong ? 0.14 : 0.08);
        glowRef.current.scale.setScalar(scale);
      }
    }
  });

  return (
    <group position={[position[0], 0.03, position[2]]}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}>
        <ringGeometry args={[0.58, 1.15, 48]} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.78, 0.9, 48]} />
      </mesh>
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
  const selectedEmployee = useEmployeeStore((s) => s.selectedEmployee);
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const activeWorkflow = selectedEmployee
    ? getWorkflowByRole(selectedEmployee)
    : selectedWorkflow;
  const activeRoles = useMemo(
    () => (selectedEmployee
      ? [selectedEmployee]
      : activeWorkflow
        ? (workflowConfigMap.get(activeWorkflow)?.roles ?? [])
        : []),
    [activeWorkflow, selectedEmployee],
  );
  const activeRoleSet = useMemo(() => new Set<EmployeeRoleType>(activeRoles), [activeRoles]);

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
        <DataFlowLine
          key={i}
          from={from}
          to={to}
          fromPos={fromPos}
          toPos={toPos}
          employeesRef={employeesRef}
          activeRoleSet={activeRoleSet}
        />
      ))}

      {/* 角色 — SCREEN_ONLY 不渲染，inspector 用机器人 */}
      {employeeConfigs.map((cfg) => {
        if (SCREEN_ONLY_AGENTS.has(cfg.id)) return null;
        const pos = AGENT_POSITIONS[cfg.id];
        if (!pos) return null;

        // inspector → 机器人
        if (cfg.id === "inspector") {
          const isFocused = activeRoleSet.has(cfg.id);
          return (
            <group key={cfg.id}>
              <FocusMarker
                position={pos}
                color={cfg.color}
                active={isFocused}
                strong={selectedEmployee === cfg.id}
              />
              <group scale={isFocused ? 1.04 : 1}>
                <RobotInspector position={pos} onClick={getClickHandler(cfg.id)} />
              </group>
            </group>
          );
        }

        const dx = -pos[0];
        const dz = -6 - pos[2];
        const rotY = Math.atan2(dx, dz);
        const isFocused = activeRoleSet.has(cfg.id);
        return (
          <group key={cfg.id}>
            <FocusMarker
              position={pos}
              color={cfg.color}
              active={isFocused}
              strong={selectedEmployee === cfg.id}
            />
            <group position={pos} rotation={[0, rotY, 0]} scale={isFocused ? 1.05 : 1}>
              <CharacterModel
                role={cfg.id}
                position={[0, 0, 0]}
                onClick={getClickHandler(cfg.id)}
              />
            </group>
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
      <div className="hidden">
        {dayNight.periodName} {dayNight.isNight ? "🌙" : "☀️"}
      </div>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 8.8, 15.4], fov: 34, near: 0.1, far: 80 }}
        onPointerMissed={() => setSelected(null)}
        style={{ background: bgHex }}
      >
        <Scene dayNight={dayNight} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          target={[0, 1.15, -0.2]}
        />
        <fog attach="fog" args={[dayNight.bgColor, 18, 35]} />
      </Canvas>
    </div>
  );
}
