/**
 * 3D 动漫风角色
 *
 * 日系 Q 版比例：大圆头、小身体、圆润四肢
 * 按 ANIMATION_SPEC.md 实现完整的状态驱动动画：
 * - idle: 呼吸浮动 + 身体微摆
 * - working: 加速动作 + 前倾 + 头顶齿轮图标
 * - thinking: 摆头 + 思考图标
 * - reviewing: 减弱动作 + 扫描线效果
 * - warning: 黄灯闪烁 + 黄环脉冲
 * - error: 红灯快闪 + 抖动
 * - success: 绿色短闪 + 扩散光圈
 * - selected: 底部高亮环
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EmployeeRoleType } from "@/config/employees";
import { employeeConfigMap, statusColor } from "@/config/employees";
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

/** 所有角色共享的材质（模块级单例，避免重复创建） */
const SHARED_MATERIALS = {
  shoe: new THREE.MeshStandardMaterial({ color: "#3a3a3a" }),
  eye: new THREE.MeshStandardMaterial({ color: "#1a1a2e" }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: "#ffffff" }),
  blush: new THREE.MeshStandardMaterial({ color: "#ffb0b0", transparent: true, opacity: 0.4 }),
  // 选中高亮环
  selectRing: new THREE.MeshStandardMaterial({
    color: "#00d4aa", emissive: "#00d4aa", emissiveIntensity: 1.5,
    transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  }),
  // 成功扩散光圈
  successRing: new THREE.MeshStandardMaterial({
    color: "#66bb6a", emissive: "#66bb6a", emissiveIntensity: 2,
    transparent: true, opacity: 0, side: THREE.DoubleSide,
  }),
  // 警告脉冲环
  warningRing: new THREE.MeshStandardMaterial({
    color: "#ffa726", emissive: "#ffa726", emissiveIntensity: 1.5,
    transparent: true, opacity: 0, side: THREE.DoubleSide,
  }),
};

export function Character3D({ role, position, onClick }: Character3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const statusLightRef = useRef<THREE.Mesh>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);
  const successRingRef = useRef<THREE.Mesh>(null);
  const warningRingRef = useRef<THREE.Mesh>(null);

  // 成功扩散效果的状态追踪
  const successAnimRef = useRef({ active: false, startTime: 0, lastStatus: "" });

  const colors = ROLE_COLORS[role];
  const cfg = employeeConfigMap.get(role);

  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
    shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
    pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
    hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [role]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const store = useEmployeeStore.getState();
    const emp = store.employees[role];
    const status = emp?.status ?? "idle";
    const isSelected = store.selectedEmployee === role;

    // ─── 成功扩散光圈触发检测 ───
    const sa = successAnimRef.current;
    if (status === "success" && sa.lastStatus !== "success") {
      sa.active = true;
      sa.startTime = t;
    }
    sa.lastStatus = status;

    // ─── 身体动画 ───
    if (bodyGroupRef.current) {
      const body = bodyGroupRef.current;

      if (status === "error") {
        // error: 抖动
        body.position.x = Math.sin(t * 30) * 0.015;
        body.position.y = Math.sin(t * 2) * 0.005;
        body.rotation.z = 0;
        body.rotation.x = 0;
      } else if (status === "working") {
        // working: 加速浮动 + 前倾
        body.position.x = 0;
        body.position.y = Math.abs(Math.sin(t * 5)) * 0.02;
        body.rotation.x = 0.06; // 前倾
        body.rotation.z = 0;
      } else if (status === "alert") {
        // alert/warning: 轻微停顿感
        body.position.x = 0;
        body.position.y = Math.sin(t * 1.5) * 0.005;
        body.rotation.x = 0;
        body.rotation.z = 0;
      } else {
        // idle: 呼吸浮动 + 身体左右微摆
        body.position.x = 0;
        body.position.y = Math.sin(t * 2) * 0.01;
        body.rotation.z = Math.sin(t * 1.2) * 0.02; // 左右微摆
        body.rotation.x = 0;
      }
    }

    // ─── 头部动画 (thinking 摆头) ───
    if (headRef.current) {
      if (status === "success") {
        // success: 轻微抬升
        headRef.current.position.y = 1.35 + Math.max(0, 0.03 * Math.sin((t - sa.startTime) * 4));
        headRef.current.rotation.y = 0;
      } else {
        headRef.current.position.y = 1.35;
        headRef.current.rotation.y = 0;
      }
    }

    // ─── 四肢动画 ───
    const isWorking = status === "working";
    const isReviewing = status === "success"; // reviewing 用减弱的动作
    const speed = isWorking ? 5 : isReviewing ? 1 : 1.5;
    const armAmp = isWorking ? 0.5 : status === "alert" ? 0.02 : 0.04;
    const legAmp = isWorking ? 0.3 : 0.02;
    if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * speed) * armAmp;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * speed) * armAmp;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t * speed) * legAmp;
    if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * speed) * legAmp;

    // ─── 衣服发光（warning 黄 / error 红 / alert 红） ───
    if (status === "alert") {
      // warning 级别：黄灯闪烁
      const flash = Math.sin(t * 4) > 0;
      materials.shirt.emissive.set(flash ? "#ffaa00" : "#000000");
      materials.shirt.emissiveIntensity = flash ? 0.35 : 0;
    } else if (status === "error") {
      // error 级别：红灯快速闪烁
      const flash = Math.sin(t * 8) > 0;
      materials.shirt.emissive.set(flash ? "#ff2222" : "#000000");
      materials.shirt.emissiveIntensity = flash ? 0.5 : 0;
    } else if (status === "success") {
      // success: 绿色短闪
      const elapsed = t - sa.startTime;
      if (elapsed < 1.5) {
        const intensity = Math.max(0, 0.5 * (1 - elapsed / 1.5));
        materials.shirt.emissive.set("#00ff88");
        materials.shirt.emissiveIntensity = intensity;
      } else {
        materials.shirt.emissive.set("#000000");
        materials.shirt.emissiveIntensity = 0;
      }
    } else {
      materials.shirt.emissive.set("#000000");
      materials.shirt.emissiveIntensity = 0;
    }

    // ─── 状态灯颜色 ───
    if (statusLightRef.current) {
      const mat = statusLightRef.current.material as THREE.MeshStandardMaterial;
      const c = statusColor(status);
      mat.color.set(c);
      mat.emissive.set(c);
      mat.emissiveIntensity = status === "idle" ? 0.3 : 0.8 + Math.sin(t * 4) * 0.2;
    }

    // ─── 选中高亮环 ───
    if (selectRingRef.current) {
      selectRingRef.current.visible = isSelected;
      if (isSelected) {
        selectRingRef.current.rotation.y = t * 1.5;
        const mat = selectRingRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.4 + Math.sin(t * 3) * 0.2;
      }
    }

    // ─── 成功扩散光圈 ───
    if (successRingRef.current) {
      if (sa.active) {
        const elapsed = t - sa.startTime;
        if (elapsed < 1.2) {
          successRingRef.current.visible = true;
          const scale = 0.5 + elapsed * 2;
          successRingRef.current.scale.set(scale, scale, scale);
          const mat = successRingRef.current.material as THREE.MeshStandardMaterial;
          mat.opacity = Math.max(0, 0.7 * (1 - elapsed / 1.2));
        } else {
          successRingRef.current.visible = false;
          sa.active = false;
        }
      } else {
        successRingRef.current.visible = false;
      }
    }

    // ─── 警告脉冲环 ───
    if (warningRingRef.current) {
      if (status === "alert") {
        warningRingRef.current.visible = true;
        const pulse = (t * 1.5) % 1; // 0..1 循环
        const scale = 0.6 + pulse * 1.0;
        warningRingRef.current.scale.set(scale, scale, scale);
        const mat = warningRingRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 0.5 * (1 - pulse));
      } else if (status === "error") {
        warningRingRef.current.visible = true;
        const pulse = (t * 2.5) % 1;
        const scale = 0.6 + pulse * 1.2;
        warningRingRef.current.scale.set(scale, scale, scale);
        const mat = warningRingRef.current.material as THREE.MeshStandardMaterial;
        mat.color.set("#ff4444");
        mat.emissive.set("#ff4444");
        mat.opacity = Math.max(0, 0.6 * (1 - pulse));
      } else {
        warningRingRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {/* 选中高亮环（底部） */}
      <mesh ref={selectRingRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <primitive object={SHARED_MATERIALS.selectRing} attach="material" />
      </mesh>

      {/* 成功扩散光圈 */}
      <mesh ref={successRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <primitive object={SHARED_MATERIALS.successRing.clone()} attach="material" />
      </mesh>

      {/* 警告/错误脉冲环 */}
      <mesh ref={warningRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.25, 0.35, 32]} />
        <primitive object={SHARED_MATERIALS.warningRing.clone()} attach="material" />
      </mesh>

      <group ref={bodyGroupRef}>
        {/* ─── 大圆头（Q版比例） ─── */}
        <group ref={headRef} position={[0, 1.35, 0]}>
          <mesh material={materials.skin} castShadow>
            <sphereGeometry args={[0.3, 16, 16]} />
          </mesh>

          {/* 头发（半球覆盖） */}
          <mesh position={[0, 0.13, 0]} material={materials.hair}>
            <sphereGeometry args={[0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>

          {/* 刘海 */}
          <mesh position={[0, 0.13, 0.18]} material={materials.hair}>
            <boxGeometry args={[0.5, 0.1, 0.1]} />
          </mesh>

          {/* 眼白 */}
          <mesh position={[-0.1, 0.01, 0.26]} material={SHARED_MATERIALS.eyeWhite}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          <mesh position={[0.1, 0.01, 0.26]} material={SHARED_MATERIALS.eyeWhite}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>

          {/* 瞳孔 */}
          <mesh position={[-0.1, 0.01, 0.31]} material={SHARED_MATERIALS.eye}>
            <sphereGeometry args={[0.035, 8, 8]} />
          </mesh>
          <mesh position={[0.1, 0.01, 0.31]} material={SHARED_MATERIALS.eye}>
            <sphereGeometry args={[0.035, 8, 8]} />
          </mesh>

          {/* 眼睛高光 */}
          <mesh position={[-0.085, 0.025, 0.33]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.115, 0.025, 0.33]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>

          {/* 腮红 */}
          <mesh position={[-0.18, -0.05, 0.22]} material={SHARED_MATERIALS.blush}>
            <sphereGeometry args={[0.04, 8, 8]} />
          </mesh>
          <mesh position={[0.18, -0.05, 0.22]} material={SHARED_MATERIALS.blush}>
            <sphereGeometry args={[0.04, 8, 8]} />
          </mesh>

          {/* 嘴巴 */}
          <mesh position={[0, -0.09, 0.28]}>
            <sphereGeometry args={[0.025, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#e07070" />
          </mesh>
        </group>

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
          <mesh position={[0, -0.24, 0.02]} material={SHARED_MATERIALS.shoe}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
          </mesh>
        </group>

        {/* 右腿 */}
        <group ref={rightLegRef} position={[0.08, 0.7, 0]}>
          <mesh position={[0, -0.1, 0]} material={materials.pants} castShadow>
            <capsuleGeometry args={[0.06, 0.12, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.24, 0.02]} material={SHARED_MATERIALS.shoe}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
          </mesh>
        </group>

        {/* 状态灯 */}
        <mesh ref={statusLightRef} position={[0, 1.75, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#5a6d7e" emissive="#5a6d7e" emissiveIntensity={0.3} />
        </mesh>

        {/* 名牌 */}
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
