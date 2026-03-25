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

import { useRef, useMemo, useEffect } from "react";
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

  const materials = useMemo(() => {
    const mats = {
      skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
      shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
      pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
      hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
      // 每个角色独立的效果材质（不在 render 中 clone）
      successRing: SHARED_MATERIALS.successRing.clone(),
      warningRing: SHARED_MATERIALS.warningRing.clone(),
    };
    return mats;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // 组件卸载时释放材质，防止内存泄漏
  useEffect(() => {
    return () => {
      materials.skin.dispose();
      materials.shirt.dispose();
      materials.pants.dispose();
      materials.hair.dispose();
      materials.successRing.dispose();
      materials.warningRing.dispose();
    };
  }, [materials]);

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

    // ─── 整体透明度（disconnected 变暗） ───
    if (groupRef.current) {
      // disconnected 时降低整体可见度
      const dimming = status === "disconnected" ? 0.5 : 1.0;
      materials.skin.opacity = dimming;
      materials.skin.transparent = dimming < 1;
      materials.shirt.opacity = dimming;
      materials.shirt.transparent = true; // 始终 transparent 以支持 emissive
      materials.pants.opacity = dimming;
      materials.pants.transparent = dimming < 1;
    }

    // ─── 身体动画 ───
    if (bodyGroupRef.current) {
      const body = bodyGroupRef.current;

      switch (status) {
        case "error":
          // 抖动
          body.position.x = Math.sin(t * 30) * 0.015;
          body.position.y = Math.sin(t * 2) * 0.005;
          body.rotation.z = 0;
          body.rotation.x = 0;
          break;
        case "working":
          // 加速浮动 + 前倾
          body.position.x = 0;
          body.position.y = Math.abs(Math.sin(t * 5)) * 0.02;
          body.rotation.x = 0.06;
          body.rotation.z = 0;
          break;
        case "thinking":
          // 思考：短暂停顿 + 微前后摇
          body.position.x = 0;
          body.position.y = Math.sin(t * 1) * 0.005;
          body.rotation.x = Math.sin(t * 0.8) * 0.03;
          body.rotation.z = 0;
          break;
        case "reviewing":
          // 审核：减弱动作，略前倾
          body.position.x = 0;
          body.position.y = Math.sin(t * 1.5) * 0.005;
          body.rotation.x = 0.04;
          body.rotation.z = 0;
          break;
        case "blocked":
          // 被拦截：轻微后仰
          body.position.x = 0;
          body.position.y = 0;
          body.rotation.x = -0.05;
          body.rotation.z = 0;
          break;
        case "alert":
          // 警告：轻微停顿感
          body.position.x = 0;
          body.position.y = Math.sin(t * 1.5) * 0.005;
          body.rotation.x = 0;
          body.rotation.z = 0;
          break;
        case "disconnected":
          // 失联：完全停止，微下沉
          body.position.x = 0;
          body.position.y = -0.02;
          body.rotation.x = 0.03;
          body.rotation.z = 0;
          break;
        case "reconnecting":
          // 重连：周期性闪动尝试
          body.position.x = 0;
          body.position.y = Math.abs(Math.sin(t * 3)) * 0.01;
          body.rotation.x = 0;
          body.rotation.z = Math.sin(t * 2) * 0.01;
          break;
        default:
          // idle: 呼吸浮动 + 身体左右微摆
          body.position.x = 0;
          body.position.y = Math.sin(t * 2) * 0.01;
          body.rotation.z = Math.sin(t * 1.2) * 0.02;
          body.rotation.x = 0;
          break;
      }
    }

    // ─── 头部动画 ───
    if (headRef.current) {
      switch (status) {
        case "thinking":
          // 思考：左右缓慢摆头
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = Math.sin(t * 1.5) * 0.15;
          headRef.current.rotation.x = Math.sin(t * 0.7) * 0.05;
          break;
        case "reviewing":
          // 审核：点头动作
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = 0;
          headRef.current.rotation.x = Math.sin(t * 2) * 0.06;
          break;
        case "success": {
          // 轻微抬升
          const elapsed = t - sa.startTime;
          headRef.current.position.y = 1.35 + Math.max(0, 0.03 * Math.sin(elapsed * 4));
          headRef.current.rotation.y = 0;
          headRef.current.rotation.x = 0;
          break;
        }
        case "blocked":
          // 被拦截：轻微左右摇头（拒绝感）
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = Math.sin(t * 6) * 0.08;
          headRef.current.rotation.x = 0;
          break;
        case "disconnected":
          // 低头
          headRef.current.position.y = 1.33;
          headRef.current.rotation.y = 0;
          headRef.current.rotation.x = 0.1;
          break;
        default:
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = 0;
          headRef.current.rotation.x = 0;
          break;
      }
    }

    // ─── 四肢动画 ───
    let limbSpeed = 1.5;
    let armAmp = 0.04;
    let legAmp = 0.02;
    switch (status) {
      case "working": limbSpeed = 5; armAmp = 0.5; legAmp = 0.3; break;
      case "thinking": limbSpeed = 0.8; armAmp = 0.02; legAmp = 0.01; break;
      case "reviewing": limbSpeed = 1; armAmp = 0.03; legAmp = 0.01; break;
      case "alert": limbSpeed = 1.5; armAmp = 0.02; legAmp = 0.02; break;
      case "error": limbSpeed = 0.5; armAmp = 0.01; legAmp = 0.01; break;
      case "blocked": limbSpeed = 0; armAmp = 0; legAmp = 0; break;
      case "disconnected": limbSpeed = 0; armAmp = 0; legAmp = 0; break;
      case "reconnecting": limbSpeed = 3; armAmp = 0.1; legAmp = 0.05; break;
    }
    if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * limbSpeed) * armAmp;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * limbSpeed) * armAmp;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t * limbSpeed) * legAmp;
    if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * limbSpeed) * legAmp;

    // ─── 衣服发光 ───
    switch (status) {
      case "alert": {
        const flash = Math.sin(t * 4) > 0;
        materials.shirt.emissive.set(flash ? "#ffaa00" : "#000000");
        materials.shirt.emissiveIntensity = flash ? 0.35 : 0;
        break;
      }
      case "error": {
        const flash = Math.sin(t * 8) > 0;
        materials.shirt.emissive.set(flash ? "#ff2222" : "#000000");
        materials.shirt.emissiveIntensity = flash ? 0.5 : 0;
        break;
      }
      case "success": {
        const elapsed = t - sa.startTime;
        if (elapsed < 1.5) {
          materials.shirt.emissive.set("#00ff88");
          materials.shirt.emissiveIntensity = Math.max(0, 0.5 * (1 - elapsed / 1.5));
        } else {
          materials.shirt.emissive.set("#000000");
          materials.shirt.emissiveIntensity = 0;
        }
        break;
      }
      case "blocked": {
        // 被拦截：红色持续微弱发光
        materials.shirt.emissive.set("#ff1744");
        materials.shirt.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.1;
        break;
      }
      case "thinking": {
        // 思考：蓝色微弱脉冲
        materials.shirt.emissive.set("#42a5f5");
        materials.shirt.emissiveIntensity = 0.1 + Math.sin(t * 2) * 0.08;
        break;
      }
      case "reviewing": {
        // 审核：紫色微弱脉冲
        materials.shirt.emissive.set("#ab47bc");
        materials.shirt.emissiveIntensity = 0.1 + Math.sin(t * 1.5) * 0.08;
        break;
      }
      case "disconnected": {
        // 失联：红色恒亮
        materials.shirt.emissive.set("#b71c1c");
        materials.shirt.emissiveIntensity = 0.2;
        break;
      }
      case "reconnecting": {
        // 重连：橙色/蓝色交替闪烁
        const phase = Math.sin(t * 3) > 0;
        materials.shirt.emissive.set(phase ? "#ff9100" : "#42a5f5");
        materials.shirt.emissiveIntensity = 0.3;
        break;
      }
      default:
        materials.shirt.emissive.set("#000000");
        materials.shirt.emissiveIntensity = 0;
        break;
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

    // ─── 状态脉冲环（alert/error/blocked/reconnecting） ───
    if (warningRingRef.current) {
      const mat = warningRingRef.current.material as THREE.MeshStandardMaterial;
      if (status === "alert") {
        warningRingRef.current.visible = true;
        const pulse = (t * 1.5) % 1;
        warningRingRef.current.scale.setScalar(0.6 + pulse * 1.0);
        mat.color.set("#ffa726"); mat.emissive.set("#ffa726");
        mat.opacity = Math.max(0, 0.5 * (1 - pulse));
      } else if (status === "error") {
        warningRingRef.current.visible = true;
        const pulse = (t * 2.5) % 1;
        warningRingRef.current.scale.setScalar(0.6 + pulse * 1.2);
        mat.color.set("#ff4444"); mat.emissive.set("#ff4444");
        mat.opacity = Math.max(0, 0.6 * (1 - pulse));
      } else if (status === "blocked") {
        // 被拦截：红色快速收缩脉冲（拦截墙感）
        warningRingRef.current.visible = true;
        const pulse = (t * 3) % 1;
        warningRingRef.current.scale.setScalar(1.2 - pulse * 0.6);
        mat.color.set("#ff1744"); mat.emissive.set("#ff1744");
        mat.opacity = 0.4 + Math.sin(t * 6) * 0.2;
      } else if (status === "reconnecting") {
        // 重连：橙色慢速脉冲
        warningRingRef.current.visible = true;
        const pulse = (t * 1) % 1;
        warningRingRef.current.scale.setScalar(0.5 + pulse * 0.8);
        mat.color.set("#ff9100"); mat.emissive.set("#ff9100");
        mat.opacity = Math.max(0, 0.4 * (1 - pulse));
      } else if (status === "disconnected") {
        // 失联：红色恒定环（不脉冲）
        warningRingRef.current.visible = true;
        warningRingRef.current.scale.setScalar(0.8);
        mat.color.set("#b71c1c"); mat.emissive.set("#b71c1c");
        mat.opacity = 0.3;
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
        <primitive object={materials.successRing} attach="material" />
      </mesh>

      {/* 警告/错误脉冲环 */}
      <mesh ref={warningRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.25, 0.35, 32]} />
        <primitive object={materials.warningRing} attach="material" />
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
