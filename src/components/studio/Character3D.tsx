/**
 * 3D 积木人角色
 *
 * 低多边形风格：头部圆角方块、身体长方体、四肢圆柱
 * 动画状态：
 *   - idle: 轻微呼吸起伏
 *   - walking: 四肢摆动行走
 *   - working: 手臂敲击动画
 *   - alert: 身体红色闪烁
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EmployeeRoleType } from "@/config/employees";
import { employeeConfigMap } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";

interface Character3DProps {
  role: EmployeeRoleType;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  status: ActivityStatus;
  currentTask: string;
  onClick?: () => void;
}

/** 角色颜色配置 */
const ROLE_COLORS: Record<EmployeeRoleType, { shirt: string; pants: string; hair: string; skin: string }> = {
  collector:        { shirt: "#4fc3f7", pants: "#37474f", hair: "#5d4037", skin: "#f5d0a9" },
  analyst:          { shirt: "#ab47bc", pants: "#263238", hair: "#212121", skin: "#f5d0a9" },
  strategist:       { shirt: "#ffb74d", pants: "#37474f", hair: "#3e2723", skin: "#e8c49a" },
  voter:            { shirt: "#fff176", pants: "#455a64", hair: "#424242", skin: "#f5d0a9" },
  risk_officer:     { shirt: "#ef5350", pants: "#263238", hair: "#1a1a2e", skin: "#d7a98c" },
  trader:           { shirt: "#66bb6a", pants: "#37474f", hair: "#4e342e", skin: "#f5d0a9" },
  position_manager: { shirt: "#26a69a", pants: "#37474f", hair: "#3e2723", skin: "#e8c49a" },
  accountant:       { shirt: "#78909c", pants: "#263238", hair: "#616161", skin: "#f5d0a9" },
  calendar_reporter:{ shirt: "#7e57c2", pants: "#37474f", hair: "#4a148c", skin: "#d7a98c" },
  inspector:        { shirt: "#8d6e63", pants: "#3e2723", hair: "#5d4037", skin: "#f5d0a9" },
};

function statusColor(status: ActivityStatus): string {
  switch (status) {
    case "working": return "#00d4aa";
    case "alert": return "#ffa726";
    case "error": return "#ff4757";
    default: return "#5a6d7e";
  }
}

export function Character3D({ role, position, targetPosition, status, currentTask, onClick }: Character3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const colors = ROLE_COLORS[role];
  const cfg = employeeConfigMap.get(role);

  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
    shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
    pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
    hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
    shoe: new THREE.MeshStandardMaterial({ color: "#2d2d3d" }),
    eye: new THREE.MeshStandardMaterial({ color: "#1a1a2e" }),
  }), [colors]);

  const isWalking = useRef(false);
  const currentPos = useRef(new THREE.Vector3(...position));

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const t = performance.now() / 1000;
    const target = targetPosition
      ? new THREE.Vector3(...targetPosition)
      : new THREE.Vector3(...position);

    const curr = currentPos.current;
    const dist = curr.distanceTo(target);

    // 移动到目标位置
    if (dist > 0.05) {
      isWalking.current = true;
      const dir = target.clone().sub(curr).normalize();
      const step = Math.min(delta * 1.5, dist);
      curr.add(dir.multiplyScalar(step));

      // 面向移动方向
      const angle = Math.atan2(dir.x, dir.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y, angle, 0.1
      );
    } else {
      isWalking.current = false;
      curr.copy(target);
      // 面向前方
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y, 0, 0.05
      );
    }

    groupRef.current.position.copy(curr);

    // ─── 动画 ───
    const walking = isWalking.current;
    const working = status === "working" && !walking;
    const isAlert = status === "alert" || status === "error";

    // 呼吸 / 行走弹跳
    if (bodyRef.current) {
      const bounce = walking
        ? Math.abs(Math.sin(t * 8)) * 0.04
        : Math.sin(t * 2) * 0.015;
      bodyRef.current.position.y = bounce;
    }

    // 四肢摆动
    const limbSpeed = walking ? 8 : working ? 4 : 1.5;
    const limbAmp = walking ? 0.8 : working ? 0.4 : 0.05;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t * limbSpeed) * limbAmp;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -Math.sin(t * limbSpeed) * limbAmp;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = -Math.sin(t * limbSpeed) * (walking ? 0.6 : 0.03);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(t * limbSpeed) * (walking ? 0.6 : 0.03);
    }

    // 告警闪烁
    if (isAlert) {
      const flash = Math.sin(t * 6) > 0;
      materials.shirt.emissive.set(flash ? "#ff2222" : "#000000");
      materials.shirt.emissiveIntensity = flash ? 0.3 : 0;
    } else {
      materials.shirt.emissive.set("#000000");
      materials.shirt.emissiveIntensity = 0;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      <group ref={bodyRef}>
        {/* 头部 */}
        <mesh position={[0, 1.55, 0]} material={materials.skin} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
        </mesh>

        {/* 头发 */}
        <mesh position={[0, 1.8, 0]} material={materials.hair}>
          <boxGeometry args={[0.44, 0.12, 0.44]} />
        </mesh>

        {/* 眼睛 */}
        <mesh position={[-0.1, 1.56, 0.21]} material={materials.eye}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0.1, 1.56, 0.21]} material={materials.eye}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
        </mesh>

        {/* 身体 */}
        <mesh position={[0, 1.1, 0]} material={materials.shirt} castShadow>
          <boxGeometry args={[0.45, 0.55, 0.25]} />
        </mesh>

        {/* 左臂 */}
        <group ref={leftArmRef} position={[-0.32, 1.3, 0]}>
          <mesh position={[0, -0.2, 0]} material={materials.shirt} castShadow>
            <boxGeometry args={[0.15, 0.25, 0.15]} />
          </mesh>
          <mesh position={[0, -0.42, 0]} material={materials.skin}>
            <boxGeometry args={[0.12, 0.2, 0.12]} />
          </mesh>
        </group>

        {/* 右臂 */}
        <group ref={rightArmRef} position={[0.32, 1.3, 0]}>
          <mesh position={[0, -0.2, 0]} material={materials.shirt} castShadow>
            <boxGeometry args={[0.15, 0.25, 0.15]} />
          </mesh>
          <mesh position={[0, -0.42, 0]} material={materials.skin}>
            <boxGeometry args={[0.12, 0.2, 0.12]} />
          </mesh>
        </group>

        {/* 左腿 */}
        <group ref={leftLegRef} position={[-0.12, 0.75, 0]}>
          <mesh position={[0, -0.2, 0]} material={materials.pants} castShadow>
            <boxGeometry args={[0.18, 0.35, 0.18]} />
          </mesh>
          <mesh position={[0, -0.43, 0.03]} material={materials.shoe}>
            <boxGeometry args={[0.18, 0.12, 0.24]} />
          </mesh>
        </group>

        {/* 右腿 */}
        <group ref={rightLegRef} position={[0.12, 0.75, 0]}>
          <mesh position={[0, -0.2, 0]} material={materials.pants} castShadow>
            <boxGeometry args={[0.18, 0.35, 0.18]} />
          </mesh>
          <mesh position={[0, -0.43, 0.03]} material={materials.shoe}>
            <boxGeometry args={[0.18, 0.12, 0.24]} />
          </mesh>
        </group>

        {/* 头顶状态指示灯 */}
        <mesh position={[0, 2.0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color={statusColor(status)}
            emissive={statusColor(status)}
            emissiveIntensity={status === "idle" ? 0.3 : 0.8}
          />
        </mesh>

        {/* 名牌 HTML overlay */}
        <Html position={[0, 2.25, 0]} center distanceFactor={8} sprite>
          <div
            style={{
              background: "rgba(15,25,35,0.85)",
              border: `1px solid ${cfg?.color ?? "#2a3f52"}`,
              borderRadius: 6,
              padding: "3px 8px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div style={{ color: cfg?.color ?? "#e8edf2", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
              {cfg?.name ?? role}
            </div>
            <div style={{ color: "#8899aa", fontSize: 9, textAlign: "center", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentTask.length > 20 ? currentTask.slice(0, 19) + "…" : currentTask}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
