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
 *
 * 所有几何体/材质从 engine/shared3d.ts 共享注册表获取。
 */

import { useRef, useMemo, useEffect, useState, useCallback, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EmployeeRoleType } from "@/config/employees";
import { employeeConfigMap, statusColor } from "@/config/employees";
import { CHARACTER_APPEARANCES } from "@/config/assets";
import { useEmployeeStore } from "@/store/employees";
import { useUIStore } from "@/store/ui";
import { useLiveStore } from "@/store/live";
import type { ActivityStatus } from "@/store/employees";
import { CharGeo, CharMat, CharMatTemplates } from "@/engine/shared3d";

interface Character3DProps {
  role: EmployeeRoleType;
  position: [number, number, number];
  onClick?: () => void;
}

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
    // 订阅 employee store（status / currentTask）
    const unsub1 = useEmployeeStore.subscribe((state) => {
      const emp = state.employees[role];
      const newStatus = emp?.status ?? "idle";
      cachedStateRef.current.status = newStatus;
      if (newStatus !== prevStatusRef.current) {
        prevStatusRef.current = newStatus;
        cachedStatusColorRef.current = statusColor(newStatus);
      }
    });
    // 订阅 UI store（isSelected 从右面板状态派生）
    const unsub2 = useUIStore.subscribe((state) => {
      const sel = state.rightPanel.kind === "employee" ? state.rightPanel.employeeId : null;
      cachedStateRef.current.isSelected = sel === role;
    });
    // 初始化
    const empState = useEmployeeStore.getState();
    const emp = empState.employees[role];
    cachedStateRef.current.status = emp?.status ?? "idle";
    cachedStatusColorRef.current = statusColor(cachedStateRef.current.status);
    prevStatusRef.current = cachedStateRef.current.status;
    const uiState = useUIStore.getState();
    const selEmployee = uiState.rightPanel.kind === "employee" ? uiState.rightPanel.employeeId : null;
    cachedStateRef.current.isSelected = selEmployee === role;
    return () => { unsub1(); unsub2(); };
  }, [role]);

  // Hover 状态
  const [hovered, setHovered] = useState(false);
  const onPointerOver = useCallback(() => setHovered(true), []);
  const onPointerOut = useCallback(() => setHovered(false), []);

  const colors = CHARACTER_APPEARANCES[role];
  const cfg = employeeConfigMap.get(role);

  // 每角色独立的颜色材质（skin/shirt/pants/hair 不同颜色需独立实例）
  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
    shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
    pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
    hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
    successRing: CharMatTemplates.successRing.clone(),
    warningRing: CharMatTemplates.warningRing.clone(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [role]);

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

  // 追踪上一帧状态，仅在变化时更新静态材质属性
  const lastFrameStatusRef = useRef<ActivityStatus | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const { status, isSelected } = cachedStateRef.current;
    const statusChanged = status !== lastFrameStatusRef.current;
    if (statusChanged) lastFrameStatusRef.current = status;

    // ─── 成功扩散光圈触发检测 ───
    const sa = successAnimRef.current;
    if (status === "success" && sa.lastStatus !== "success") {
      sa.active = true;
      sa.startTime = t;
    }
    sa.lastStatus = status;

    // ─── 整体透明度（仅在 status 变化时更新，避免每帧写材质属性） ───
    if (statusChanged) {
      const dimming = status === "disconnected" ? 0.5 : 1.0;
      materials.skin.opacity = dimming;
      materials.skin.transparent = dimming < 1;
      materials.shirt.opacity = dimming;
      materials.shirt.transparent = true;
      materials.pants.opacity = dimming;
      materials.pants.transparent = dimming < 1;
    }

    // ─── 身体动画 ───
    if (bodyGroupRef.current) {
      const body = bodyGroupRef.current;
      switch (status) {
        case "error":
          body.position.x = Math.sin(t * 30) * 0.015;
          body.position.y = Math.sin(t * 2) * 0.005;
          body.rotation.z = 0; body.rotation.x = 0;
          break;
        case "working":
          body.position.x = 0;
          body.position.y = Math.abs(Math.sin(t * 5)) * 0.02;
          body.rotation.x = 0.06; body.rotation.z = 0;
          break;
        case "thinking":
          body.position.x = 0;
          body.position.y = Math.sin(t * 1) * 0.005;
          body.rotation.x = Math.sin(t * 0.8) * 0.03; body.rotation.z = 0;
          break;
        case "reviewing":
          body.position.x = 0;
          body.position.y = Math.sin(t * 1.5) * 0.005;
          body.rotation.x = 0.04; body.rotation.z = 0;
          break;
        case "blocked":
          body.position.x = 0; body.position.y = 0;
          body.rotation.x = -0.05; body.rotation.z = 0;
          break;
        case "alert":
          body.position.x = 0;
          body.position.y = Math.sin(t * 1.5) * 0.005;
          body.rotation.x = 0; body.rotation.z = 0;
          break;
        case "disconnected":
          body.position.x = 0; body.position.y = -0.02;
          body.rotation.x = 0.03; body.rotation.z = 0;
          break;
        case "reconnecting":
          body.position.x = 0;
          body.position.y = Math.abs(Math.sin(t * 3)) * 0.01;
          body.rotation.x = 0; body.rotation.z = Math.sin(t * 2) * 0.01;
          break;
        default:
          body.position.x = 0;
          body.position.y = Math.sin(t * 2) * 0.01;
          body.rotation.z = Math.sin(t * 1.2) * 0.02; body.rotation.x = 0;
          break;
      }
    }

    // ─── 头部动画 ───
    if (headRef.current) {
      switch (status) {
        case "thinking":
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = Math.sin(t * 1.5) * 0.15;
          headRef.current.rotation.x = Math.sin(t * 0.7) * 0.05;
          break;
        case "reviewing":
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = 0;
          headRef.current.rotation.x = Math.sin(t * 2) * 0.06;
          break;
        case "success": {
          const elapsed = t - sa.startTime;
          headRef.current.position.y = 1.35 + Math.max(0, 0.03 * Math.sin(elapsed * 4));
          headRef.current.rotation.y = 0; headRef.current.rotation.x = 0;
          break;
        }
        case "blocked":
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = Math.sin(t * 6) * 0.08;
          headRef.current.rotation.x = 0;
          break;
        case "disconnected":
          headRef.current.position.y = 1.33;
          headRef.current.rotation.y = 0; headRef.current.rotation.x = 0.1;
          break;
        default:
          headRef.current.position.y = 1.35;
          headRef.current.rotation.y = 0; headRef.current.rotation.x = 0;
          break;
      }
    }

    // ─── 四肢动画 ───
    let limbSpeed = 1.5, armAmp = 0.04, legAmp = 0.02;
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

    // ─── 衣服发光（动画状态每帧更新，静态状态仅在变化时设置一次） ───
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
        } else if (statusChanged || elapsed < 1.6) {
          materials.shirt.emissive.set("#000000");
          materials.shirt.emissiveIntensity = 0;
        }
        break;
      }
      case "blocked":
        materials.shirt.emissive.set("#ff1744");
        materials.shirt.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.1;
        break;
      case "thinking":
        materials.shirt.emissive.set("#42a5f5");
        materials.shirt.emissiveIntensity = 0.1 + Math.sin(t * 2) * 0.08;
        break;
      case "reviewing":
        materials.shirt.emissive.set("#ab47bc");
        materials.shirt.emissiveIntensity = 0.1 + Math.sin(t * 1.5) * 0.08;
        break;
      case "reconnecting": {
        const phase = Math.sin(t * 3) > 0;
        materials.shirt.emissive.set(phase ? "#ff9100" : "#42a5f5");
        materials.shirt.emissiveIntensity = 0.3;
        break;
      }
      default:
        // 静态状态仅在 status 变化时更新一次
        if (statusChanged) {
          if (status === "disconnected") {
            materials.shirt.emissive.set("#b71c1c");
            materials.shirt.emissiveIntensity = 0.2;
          } else {
            materials.shirt.emissive.set("#000000");
            materials.shirt.emissiveIntensity = 0;
          }
        }
        break;
    }

    // ─── 状态灯颜色（仅 status 变化时更新颜色，动画每帧更新亮度） ───
    if (statusLightRef.current) {
      const mat = statusLightRef.current.material as THREE.MeshStandardMaterial;
      if (statusChanged) {
        const c = cachedStatusColorRef.current;
        mat.color.set(c);
        mat.emissive.set(c);
      }
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

    // ─── 状态脉冲环 ───
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
        warningRingRef.current.visible = true;
        const pulse = (t * 3) % 1;
        warningRingRef.current.scale.setScalar(1.2 - pulse * 0.6);
        mat.color.set("#ff1744"); mat.emissive.set("#ff1744");
        mat.opacity = 0.4 + Math.sin(t * 6) * 0.2;
      } else if (status === "reconnecting") {
        warningRingRef.current.visible = true;
        const pulse = (t * 1) % 1;
        warningRingRef.current.scale.setScalar(0.5 + pulse * 0.8);
        mat.color.set("#ff9100"); mat.emissive.set("#ff9100");
        mat.opacity = Math.max(0, 0.4 * (1 - pulse));
      } else if (status === "disconnected") {
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
      <mesh ref={selectRingRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}
        geometry={CharGeo.selectRing} material={CharMat.selectRing}
      />

      {/* 成功扩散光圈 */}
      <mesh ref={successRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <primitive object={CharGeo.successRing} attach="geometry" />
        <primitive object={materials.successRing} attach="material" />
      </mesh>

      {/* 警告/错误脉冲环 */}
      <mesh ref={warningRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <primitive object={CharGeo.warningRing} attach="geometry" />
        <primitive object={materials.warningRing} attach="material" />
      </mesh>

      <group ref={bodyGroupRef}>
        {/* ─── 大圆头（Q版比例） ─── */}
        <group ref={headRef} position={[0, 1.35, 0]}>
          <mesh material={materials.skin} castShadow geometry={CharGeo.head} />
          <mesh position={[0, 0.13, 0]} material={materials.hair} geometry={CharGeo.hairTop} />
          <mesh position={[0, 0.13, 0.18]} material={materials.hair} geometry={CharGeo.bangs} />

          {/* 眼白 */}
          <mesh position={[-0.1, 0.01, 0.26]} material={CharMat.eyeWhite} geometry={CharGeo.eyeWhite} />
          <mesh position={[0.1, 0.01, 0.26]} material={CharMat.eyeWhite} geometry={CharGeo.eyeWhite} />

          {/* 瞳孔 */}
          <mesh position={[-0.1, 0.01, 0.31]} material={CharMat.eye} geometry={CharGeo.pupil} />
          <mesh position={[0.1, 0.01, 0.31]} material={CharMat.eye} geometry={CharGeo.pupil} />

          {/* 眼睛高光 */}
          <mesh position={[-0.085, 0.025, 0.33]} material={CharMat.eyeHighlight} geometry={CharGeo.eyeHighlight} />
          <mesh position={[0.115, 0.025, 0.33]} material={CharMat.eyeHighlight} geometry={CharGeo.eyeHighlight} />

          {/* 腮红 */}
          <mesh position={[-0.18, -0.05, 0.22]} material={CharMat.blush} geometry={CharGeo.blush} />
          <mesh position={[0.18, -0.05, 0.22]} material={CharMat.blush} geometry={CharGeo.blush} />

          {/* 嘴巴 */}
          <mesh position={[0, -0.09, 0.28]} material={CharMat.mouth} geometry={CharGeo.mouth} />

          {/* ─── 角色专属头部配件 ─── */}
          <RoleAccessory role={role} />
        </group>

        {/* ─── 小身体 ─── */}
        <mesh position={[0, 0.92, 0]} material={materials.shirt} castShadow geometry={CharGeo.body} />

        {/* 左臂 */}
        <group ref={leftArmRef} position={[-0.24, 1.05, 0]}>
          <mesh position={[0, -0.12, 0]} material={materials.shirt} castShadow geometry={CharGeo.arm} />
          <mesh position={[0, -0.28, 0]} material={materials.skin} geometry={CharGeo.hand} />
        </group>

        {/* 右臂 */}
        <group ref={rightArmRef} position={[0.24, 1.05, 0]}>
          <mesh position={[0, -0.12, 0]} material={materials.shirt} castShadow geometry={CharGeo.arm} />
          <mesh position={[0, -0.28, 0]} material={materials.skin} geometry={CharGeo.hand} />
        </group>

        {/* 左腿 */}
        <group ref={leftLegRef} position={[-0.08, 0.7, 0]}>
          <mesh position={[0, -0.1, 0]} material={materials.pants} castShadow geometry={CharGeo.leg} />
          <mesh position={[0, -0.24, 0.02]} material={CharMat.shoe} geometry={CharGeo.shoe} />
        </group>

        {/* 右腿 */}
        <group ref={rightLegRef} position={[0.08, 0.7, 0]}>
          <mesh position={[0, -0.1, 0]} material={materials.pants} castShadow geometry={CharGeo.leg} />
          <mesh position={[0, -0.24, 0.02]} material={CharMat.shoe} geometry={CharGeo.shoe} />
        </group>

        {/* 状态灯 */}
        <mesh ref={statusLightRef} position={[0, 1.75, 0]}
          geometry={CharGeo.statusLight} material={CharMat.statusLightDefault}
        />

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
  const currentTask = useEmployeeStore((s) => s.employees[role]?.currentTask ?? "");
  const status = useEmployeeStore((s) => s.employees[role]?.status ?? ("idle" as ActivityStatus));

  return (
    <Html position={[0, 1.95, 0]} center distanceFactor={2.33} sprite zIndexRange={[24, 0]}>
      <div
        style={{
          background: hovered ? "rgba(10,20,30,0.95)" : "rgba(15,25,35,0.88)",
          border: `2px solid ${color}`,
          borderRadius: 24,
          padding: hovered ? "18px 36px" : "12px 30px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          minWidth: hovered ? 360 : 240,
          textAlign: "center",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ color, fontSize: 33, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%",
            backgroundColor: statusColor(status),
            display: "inline-block",
            boxShadow: status === "working" ? `0 0 12px ${statusColor(status)}` : "none",
          }} />
          {name}
        </div>
        {hovered && title && (
          <div style={{ color: "#667788", fontSize: 27, marginTop: 3 }}>{title}</div>
        )}
        <div style={{ color: "#8899aa", fontSize: 27, maxWidth: hovered ? 600 : 450, overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>
          {hovered ? currentTask : currentTask.length > 22 ? currentTask.slice(0, 21) + "…" : currentTask}
        </div>
        {hovered && (
          <div style={{ color: statusColor(status), fontSize: 24, marginTop: 6, fontWeight: 600 }}>
            {status.toUpperCase()}
          </div>
        )}
      </div>
    </Html>
  );
}

/** 角色专属头部配件 — 使用共享几何体/材质 */
function RoleAccessory({ role }: { role: EmployeeRoleType }) {
  switch (role) {
    case "collector":
      return (
        <group>
          <mesh position={[-0.32, 0, 0]} geometry={CharGeo.headphonePad} material={CharMat.headphoneDark} />
          <mesh position={[0.32, 0, 0]} geometry={CharGeo.headphonePad} material={CharMat.headphoneDark} />
          <mesh position={[0, 0.18, 0]} geometry={CharGeo.headphoneBand} material={CharMat.headphoneBand} />
          <mesh position={[-0.28, -0.08, 0.12]} geometry={CharGeo.mic} material={CharMat.headphoneMic} />
        </group>
      );
    case "analyst":
      return (
        <group position={[0, 0, 0.02]}>
          <mesh position={[-0.1, 0.01, 0.25]} geometry={CharGeo.glassLens} material={CharMat.glassFrame} />
          <mesh position={[0.1, 0.01, 0.25]} geometry={CharGeo.glassLens} material={CharMat.glassFrame} />
          <mesh position={[0, 0, 0.27]} geometry={CharGeo.glassBridge} material={CharMat.glassFrame} />
        </group>
      );
    case "risk_officer":
      return (
        <group position={[0.1, -0.35, 0.16]}>
          <mesh geometry={CharGeo.badge} material={CharMat.badgeRed} />
        </group>
      );
    case "inspector":
      return (
        <group position={[0.28, -0.2, 0.1]} rotation={[0.2, -0.3, 0]}>
          <mesh geometry={CharGeo.tabletBody} material={CharMat.tabletBody} />
          <mesh position={[0, 0, 0.008]} geometry={CharGeo.tabletScreen} material={CharMat.tabletScreen} />
        </group>
      );
    case "trader":
      return (
        <group position={[0, -0.35, 0.17]}>
          <mesh geometry={CharGeo.traderButton} material={CharMat.traderButton} />
        </group>
      );
    default:
      return null;
  }
}

/** 策略师头顶指示器：显示置信度最高的信号（TF + 方向 + 置信度） */
function SignalIndicator() {
  const signals = useLiveStore((s) => s.signals);

  const top = signals.reduce<(typeof signals)[number] | null>((best, s) => {
    if (s.direction === "hold") return best;
    if (!best) return s;
    return s.confidence > best.confidence ? s : best;
  }, null);

  if (!top) return null;

  const isBuy = top.direction === "buy";
  const color = isBuy ? "#00d4aa" : "#ff4757";
  const pct = `${(top.confidence * 100).toFixed(0)}%`;

  return (
    <Html position={[0, 2.15, 0]} center distanceFactor={2.33} sprite zIndexRange={[24, 0]}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(8,12,24,0.92)", border: `2px solid ${color}`,
        color: "#fff", fontSize: 27, fontWeight: 700,
        padding: "6px 21px", borderRadius: 15, pointerEvents: "none",
        userSelect: "none", boxShadow: `0 0 24px ${color}40`,
        fontFamily: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
      }}>
        <span style={{ color: "#8090a0", fontSize: 24 }}>{top.timeframe}</span>
        <span style={{ color, fontWeight: 800 }}>{isBuy ? "BUY" : "SELL"}</span>
        <span style={{ color: "#c8d0e0", fontSize: 24 }}>{pct}</span>
      </div>
    </Html>
  );
}
