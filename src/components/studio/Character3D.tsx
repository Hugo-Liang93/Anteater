/**
 * 3D 动漫风角色
 *
 * 日系 Q 版比例：大圆头、小身体、圆润四肢
 * 直接从 store 读取状态，避免 R3F reconciler 的 prop 更新问题。
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EmployeeRoleType } from "@/config/employees";
import { employeeConfigMap } from "@/config/employees";
import { useEmployeeStore } from "@/store/employees";

interface Character3DProps {
  role: EmployeeRoleType;
  position: [number, number, number];
  onClick?: () => void;
}

const ROLE_COLORS: Record<EmployeeRoleType, { shirt: string; pants: string; hair: string; skin: string }> = {
  collector:        { shirt: "#4fc3f7", pants: "#37474f", hair: "#5d4037", skin: "#ffe0c0" },
  analyst:          { shirt: "#ab47bc", pants: "#263238", hair: "#212121", skin: "#ffe0c0" },
  strategist:       { shirt: "#ffb74d", pants: "#37474f", hair: "#3e2723", skin: "#ffd8b0" },
  voter:            { shirt: "#fdd835", pants: "#455a64", hair: "#424242", skin: "#ffe0c0" },
  risk_officer:     { shirt: "#ef5350", pants: "#263238", hair: "#1a1a2e", skin: "#e8c4a0" },
  trader:           { shirt: "#66bb6a", pants: "#37474f", hair: "#4e342e", skin: "#ffe0c0" },
  position_manager: { shirt: "#26a69a", pants: "#37474f", hair: "#3e2723", skin: "#ffd8b0" },
  accountant:       { shirt: "#78909c", pants: "#263238", hair: "#616161", skin: "#ffe0c0" },
  calendar_reporter:{ shirt: "#7e57c2", pants: "#37474f", hair: "#4a148c", skin: "#e8c4a0" },
  inspector:        { shirt: "#8d6e63", pants: "#3e2723", hair: "#5d4037", skin: "#ffe0c0" },
};

function statusColor(status: string): string {
  switch (status) {
    case "working": return "#00d4aa";
    case "alert": return "#ffa726";
    case "error": return "#ff4757";
    default: return "#5a6d7e";
  }
}

export function Character3D({ role, position, onClick }: Character3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const statusLightRef = useRef<THREE.Mesh>(null);

  const colors = ROLE_COLORS[role];
  const cfg = employeeConfigMap.get(role);

  // 直接从 store 读取，避免 R3F prop 更新问题
  const getEmployee = () => useEmployeeStore.getState().employees[role];

  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
    shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
    pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
    hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
    shoe: new THREE.MeshStandardMaterial({ color: "#3a3a3a" }),
    eye: new THREE.MeshStandardMaterial({ color: "#1a1a2e" }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: "#ffffff" }),
    blush: new THREE.MeshStandardMaterial({ color: "#ffb0b0", transparent: true, opacity: 0.4 }),
  }), [colors]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const emp = getEmployee();
    const status = emp?.status ?? "idle";
    const working = status === "working";
    const isAlert = status === "alert" || status === "error";

    // 呼吸
    if (bodyGroupRef.current) {
      const bounce = working
        ? Math.abs(Math.sin(t * 5)) * 0.02
        : Math.sin(t * 2) * 0.01;
      bodyGroupRef.current.position.y = bounce;
    }

    // 四肢动画
    const speed = working ? 5 : 1.5;
    const amp = working ? 0.5 : 0.04;
    if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * speed) * amp;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * speed) * amp;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t * speed) * (working ? 0.3 : 0.02);
    if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * speed) * (working ? 0.3 : 0.02);

    // 告警闪烁
    if (isAlert) {
      const flash = Math.sin(t * 6) > 0;
      materials.shirt.emissive.set(flash ? "#ff2222" : "#000000");
      materials.shirt.emissiveIntensity = flash ? 0.4 : 0;
    } else {
      materials.shirt.emissive.set("#000000");
      materials.shirt.emissiveIntensity = 0;
    }

    // 状态灯颜色
    if (statusLightRef.current) {
      const mat = statusLightRef.current.material as THREE.MeshStandardMaterial;
      const c = statusColor(status);
      mat.color.set(c);
      mat.emissive.set(c);
      mat.emissiveIntensity = status === "idle" ? 0.3 : 0.8 + Math.sin(t * 4) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      <group ref={bodyGroupRef}>
        {/* ─── 大圆头（Q版比例） ─── */}
        <mesh position={[0, 1.35, 0]} material={materials.skin} castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
        </mesh>

        {/* 头发（半球覆盖） */}
        <mesh position={[0, 1.48, 0]} material={materials.hair}>
          <sphereGeometry args={[0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>

        {/* 刘海 */}
        <mesh position={[0, 1.48, 0.18]} material={materials.hair}>
          <boxGeometry args={[0.5, 0.1, 0.1]} />
        </mesh>

        {/* 眼白 */}
        <mesh position={[-0.1, 1.36, 0.26]} material={materials.eyeWhite}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
        <mesh position={[0.1, 1.36, 0.26]} material={materials.eyeWhite}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>

        {/* 瞳孔 */}
        <mesh position={[-0.1, 1.36, 0.31]} material={materials.eye}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
        <mesh position={[0.1, 1.36, 0.31]} material={materials.eye}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>

        {/* 眼睛高光 */}
        <mesh position={[-0.085, 1.375, 0.33]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.115, 1.375, 0.33]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>

        {/* 腮红 */}
        <mesh position={[-0.18, 1.3, 0.22]} material={materials.blush}>
          <sphereGeometry args={[0.04, 8, 8]} />
        </mesh>
        <mesh position={[0.18, 1.3, 0.22]} material={materials.blush}>
          <sphereGeometry args={[0.04, 8, 8]} />
        </mesh>

        {/* 嘴巴 */}
        <mesh position={[0, 1.26, 0.28]}>
          <sphereGeometry args={[0.025, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#e07070" />
        </mesh>

        {/* ─── 小身体 ─── */}
        <mesh position={[0, 0.92, 0]} material={materials.shirt} castShadow>
          <capsuleGeometry args={[0.16, 0.28, 8, 16]} />
        </mesh>

        {/* 左臂 */}
        <group ref={leftArmRef} position={[-0.24, 1.05, 0]}>
          <mesh position={[0, -0.12, 0]} material={materials.shirt} castShadow>
            <capsuleGeometry args={[0.055, 0.12, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.28, 0]} material={materials.skin}>
            <sphereGeometry args={[0.05, 8, 8]} />
          </mesh>
        </group>

        {/* 右臂 */}
        <group ref={rightArmRef} position={[0.24, 1.05, 0]}>
          <mesh position={[0, -0.12, 0]} material={materials.shirt} castShadow>
            <capsuleGeometry args={[0.055, 0.12, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.28, 0]} material={materials.skin}>
            <sphereGeometry args={[0.05, 8, 8]} />
          </mesh>
        </group>

        {/* 左腿 */}
        <group ref={leftLegRef} position={[-0.08, 0.7, 0]}>
          <mesh position={[0, -0.1, 0]} material={materials.pants} castShadow>
            <capsuleGeometry args={[0.06, 0.12, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.24, 0.02]} material={materials.shoe}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
          </mesh>
        </group>

        {/* 右腿 */}
        <group ref={rightLegRef} position={[0.08, 0.7, 0]}>
          <mesh position={[0, -0.1, 0]} material={materials.pants} castShadow>
            <capsuleGeometry args={[0.06, 0.12, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.24, 0.02]} material={materials.shoe}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
          </mesh>
        </group>

        {/* 状态灯 */}
        <mesh ref={statusLightRef} position={[0, 1.75, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#5a6d7e" emissive="#5a6d7e" emissiveIntensity={0.3} />
        </mesh>

        {/* 名牌 — 直接从 store 读 */}
        <NameTag role={role} color={cfg?.color ?? "#888"} name={cfg?.name ?? role} />
      </group>
    </group>
  );
}

/** 名牌组件 — 独立从 store 读取，确保响应性 */
function NameTag({ role, color, name }: { role: EmployeeRoleType; color: string; name: string }) {
  const currentTask = useEmployeeStore((s) => s.employees[role]?.currentTask ?? "");
  const status = useEmployeeStore((s) => s.employees[role]?.status ?? "idle");

  return (
    <Html position={[0, 1.95, 0]} center distanceFactor={7} sprite>
      <div
        style={{
          background: "rgba(15,25,35,0.88)",
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          padding: "4px 10px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          minWidth: 80,
          textAlign: "center",
        }}
      >
        <div style={{
          color,
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: statusColor(status),
              display: "inline-block",
              boxShadow: status === "working" ? `0 0 4px ${statusColor(status)}` : "none",
            }}
          />
          {name}
        </div>
        <div style={{
          color: "#8899aa",
          fontSize: 9,
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: 1,
        }}>
          {currentTask.length > 22 ? currentTask.slice(0, 21) + "…" : currentTask}
        </div>
      </div>
    </Html>
  );
}
