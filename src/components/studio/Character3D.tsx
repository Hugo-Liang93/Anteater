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

import { useRef, useMemo, useEffect, useState, useCallback, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EmployeeRoleType } from "@/config/employees";
import { employeeConfigMap, statusColor } from "@/config/employees";
import { CHARACTER_APPEARANCES } from "@/config/assets";
import { useEmployeeStore } from "@/store/employees";
import { useLiveStore } from "@/store/live";
import type { ActivityStatus } from "@/store/employees";

interface Character3DProps {
  role: EmployeeRoleType;
  position: [number, number, number];
  onClick?: () => void;
}

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

export const Character3D = memo(function Character3D({ role, position, onClick }: Character3DProps) {
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

  // 缓存 store 状态到 ref，避免 useFrame 中每帧调用 getState()
  const cachedStateRef = useRef<{ status: ActivityStatus; isSelected: boolean }>({
    status: "idle",
    isSelected: false,
  });
  // 缓存状态灯颜色，仅在 status 变化时更新
  const cachedStatusColorRef = useRef<string>(statusColor("idle"));
  const prevStatusRef = useRef<ActivityStatus>("idle");

  // 订阅 store 变化，更新 ref（不触发 React 重渲染）
  useEffect(() => {
    const unsub = useEmployeeStore.subscribe((state) => {
      const emp = state.employees[role];
      const newStatus = emp?.status ?? "idle";
      const newSelected = state.selectedEmployee === role;
      cachedStateRef.current.status = newStatus;
      cachedStateRef.current.isSelected = newSelected;
      // 仅在 status 变化时重新计算颜色
      if (newStatus !== prevStatusRef.current) {
        prevStatusRef.current = newStatus;
        cachedStatusColorRef.current = statusColor(newStatus);
      }
    });
    // 初始化
    const state = useEmployeeStore.getState();
    const emp = state.employees[role];
    cachedStateRef.current.status = emp?.status ?? "idle";
    cachedStateRef.current.isSelected = state.selectedEmployee === role;
    cachedStatusColorRef.current = statusColor(cachedStateRef.current.status);
    prevStatusRef.current = cachedStateRef.current.status;
    return unsub;
  }, [role]);

  // Hover 状态
  const [hovered, setHovered] = useState(false);
  const onPointerOver = useCallback(() => setHovered(true), []);
  const onPointerOut = useCallback(() => setHovered(false), []);

  const colors = CHARACTER_APPEARANCES[role];
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
    const { status, isSelected } = cachedStateRef.current;

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

    // ─── 状态灯颜色（使用缓存颜色，避免每帧转换） ───
    if (statusLightRef.current) {
      const mat = statusLightRef.current.material as THREE.MeshStandardMaterial;
      const c = cachedStatusColorRef.current;
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
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick?.(); }} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
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

          {/* ─── 角色专属头部配件 ─── */}
          <RoleAccessory role={role} />
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

        {/* 策略师 BUY/SELL/HOLD 指示器 */}
        {role === "strategist" && <SignalIndicator />}

        {/* 名牌 */}
        <NameTag role={role} color={cfg?.color ?? "#888"} name={cfg?.name ?? role} title={cfg?.title ?? ""} hovered={hovered} />
      </group>
    </group>
  );
});

/** 名牌组件 — 独立从 store 读取，hover 时显示扩展信息 */
function NameTag({ role, color, name, title, hovered }: {
  role: EmployeeRoleType; color: string; name: string; title: string; hovered: boolean;
}) {
  // 合并为单个 selector，减少订阅次数
  const { currentTask, status } = useEmployeeStore((s) => ({
    currentTask: s.employees[role]?.currentTask ?? "",
    status: s.employees[role]?.status ?? "idle" as ActivityStatus,
  }));

  return (
    <Html position={[0, 1.95, 0]} center distanceFactor={7} sprite>
      <div
        style={{
          background: hovered ? "rgba(10,20,30,0.95)" : "rgba(15,25,35,0.88)",
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          padding: hovered ? "6px 12px" : "4px 10px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          minWidth: hovered ? 120 : 80,
          textAlign: "center",
          transition: "all 0.2s ease",
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
        {/* Hover 时显示职称 */}
        {hovered && title && (
          <div style={{ color: "#667788", fontSize: 9, marginTop: 1 }}>
            {title}
          </div>
        )}
        <div style={{
          color: "#8899aa",
          fontSize: 9,
          maxWidth: hovered ? 200 : 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: 1,
        }}>
          {hovered
            ? currentTask
            : currentTask.length > 22 ? currentTask.slice(0, 21) + "…" : currentTask}
        </div>
        {/* Hover 时显示状态文字 */}
        {hovered && (
          <div style={{
            color: statusColor(status),
            fontSize: 8,
            marginTop: 2,
            fontWeight: 600,
          }}>
            {status.toUpperCase()}
          </div>
        )}
      </div>
    </Html>
  );
}

/** 角色专属头部配件 — 对齐 CHARACTER_ROSTER 识别元素 */
function RoleAccessory({ role }: { role: EmployeeRoleType }) {
  switch (role) {
    case "collector":
      // 通信耳机：左右耳罩 + 头顶连接条
      return (
        <group>
          <mesh position={[-0.32, 0, 0]}>
            <boxGeometry args={[0.06, 0.1, 0.08]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[0.32, 0, 0]}>
            <boxGeometry args={[0.06, 0.1, 0.08]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <capsuleGeometry args={[0.02, 0.5, 4, 8]} />
            <meshStandardMaterial color="#546e7a" />
          </mesh>
          {/* 麦克风 */}
          <mesh position={[-0.28, -0.08, 0.12]}>
            <capsuleGeometry args={[0.015, 0.1, 4, 6]} />
            <meshStandardMaterial color="#455a64" />
          </mesh>
        </group>
      );

    case "analyst":
      // 眼镜：两个镜片 + 镜桥
      return (
        <group position={[0, 0, 0.02]}>
          <mesh position={[-0.1, 0.01, 0.25]}>
            <torusGeometry args={[0.065, 0.01, 6, 12]} />
            <meshStandardMaterial color="#90a4ae" metalness={0.6} />
          </mesh>
          <mesh position={[0.1, 0.01, 0.25]}>
            <torusGeometry args={[0.065, 0.01, 6, 12]} />
            <meshStandardMaterial color="#90a4ae" metalness={0.6} />
          </mesh>
          {/* 鼻梁 */}
          <mesh position={[0, 0, 0.27]}>
            <boxGeometry args={[0.06, 0.01, 0.01]} />
            <meshStandardMaterial color="#90a4ae" metalness={0.6} />
          </mesh>
        </group>
      );

    case "risk_officer":
      // 胸章/印章：胸前的圆形徽章
      return (
        <group position={[0.1, -0.35, 0.16]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.01, 12]} />
            <meshStandardMaterial color="#ff5252" emissive="#ff5252" emissiveIntensity={0.3} metalness={0.4} />
          </mesh>
        </group>
      );

    case "inspector":
      // 手持平板：右手位置的小平板
      return (
        <group position={[0.28, -0.2, 0.1]} rotation={[0.2, -0.3, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.16, 0.015]} />
            <meshStandardMaterial color="#263238" />
          </mesh>
          {/* 屏幕 */}
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[0.1, 0.13, 0.002]} />
            <meshStandardMaterial color="#4dd0e1" emissive="#4dd0e1" emissiveIntensity={0.5} />
          </mesh>
        </group>
      );

    case "trader":
      // 胸前执行按钮
      return (
        <group position={[0, -0.35, 0.17]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
            <meshStandardMaterial color="#f9a825" emissive="#f9a825" emissiveIntensity={0.4} metalness={0.5} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

/** 策略师 BUY/SELL/HOLD 头顶指示器 */
function SignalIndicator() {
  const signals = useLiveStore((s) => s.signals);
  const latest = signals[0];

  if (!latest || latest.direction === "hold") return null;

  const isBuy = latest.direction === "buy";
  const color = isBuy ? "#00d4aa" : "#ff4757";
  const label = isBuy ? "BUY" : "SELL";

  return (
    <Html position={[0, 2.15, 0]} center distanceFactor={7} sprite>
      <div
        style={{
          background: color,
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
          padding: "2px 6px",
          borderRadius: 4,
          pointerEvents: "none",
          userSelect: "none",
          boxShadow: `0 0 8px ${color}`,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </Html>
  );
}
