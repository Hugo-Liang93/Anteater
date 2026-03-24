/**
 * 3D 工作室主场景
 *
 * R3F Canvas + 相机 + 灯光 + 角色 + 办公室 + 数据流
 */

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { employeeConfigs } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";
import { Character3D } from "./Character3D";
import { Office3D } from "./Office3D";
import { DataFlowParticle, FlowLine } from "./DataFlow3D";
import type { EmployeeRoleType } from "@/config/employees";

/** 角色在 3D 空间中的工位位置 */
const POSITIONS: Record<EmployeeRoleType, [number, number, number]> = {
  collector:         [-3, 0, -1],
  analyst:           [-1, 0, -1],
  strategist:        [1, 0, -1.5],
  voter:             [1, 0, 0.2],
  risk_officer:      [3, 0, -1],
  trader:            [3, 0, 1],
  position_manager:  [1, 0, 2],
  accountant:        [-2.5, 0, 2],
  calendar_reporter: [-3.5, 0, 1],
  inspector:         [-1, 0, 2],
};

/** 数据流连接 */
const FLOWS: { from: EmployeeRoleType; to: EmployeeRoleType }[] = [
  { from: "collector", to: "analyst" },
  { from: "analyst", to: "strategist" },
  { from: "strategist", to: "voter" },
  { from: "voter", to: "risk_officer" },
  { from: "risk_officer", to: "trader" },
  { from: "trader", to: "position_manager" },
];

function Scene() {
  const employees = useEmployeeStore((s) => s.employees);
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  return (
    <>
      {/* 暖色环境光 */}
      <ambientLight intensity={0.5} color="#fff5e6" />
      {/* 主光源（模拟室内照明） */}
      <directionalLight
        position={[3, 8, 3]}
        intensity={0.6}
        color="#ffe8cc"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* 暖色补光 */}
      <hemisphereLight args={["#ffe4b5", "#c4a882", 0.3]} />

      {/* 办公室 */}
      <Office3D />

      {/* 数据流 */}
      {FLOWS.map(({ from, to }, i) => {
        const fromPos = POSITIONS[from];
        const toPos = POSITIONS[to];
        const fromEmp = employees[from];
        return (
          <group key={i}>
            <FlowLine from={fromPos} to={toPos} />
            <DataFlowParticle
              from={fromPos}
              to={toPos}
              active={fromEmp?.status === "working"}
            />
          </group>
        );
      })}

      {/* 角色 */}
      {employeeConfigs.map((cfg) => {
        const emp = employees[cfg.id];
        const pos = POSITIONS[cfg.id];
        if (!emp || !pos) return null;

        return (
          <Character3D
            key={cfg.id}
            role={cfg.id}
            position={pos}
            status={emp.status}
            currentTask={emp.currentTask}
            onClick={() => setSelected(cfg.id)}
          />
        );
      })}
    </>
  );
}

export function Studio3D() {
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{ position: [0, 8, 8], fov: 50, near: 0.1, far: 50 }}
        onPointerMissed={() => setSelected(null)}
        style={{ background: "#e8ddd0" }}
      >
        <Scene />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={15}
          target={[0, 0, 0.5]}
        />
        <fog attach="fog" args={["#e8ddd0", 14, 22]} />
      </Canvas>
    </div>
  );
}
