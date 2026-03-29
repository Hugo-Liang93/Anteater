/**
 * 巡检机器人 — 替代 inspector 角色的卡通机器人
 *
 * 方块头 + 天线 + 圆眼 + 金属身体 + 浮动动画
 * 放在大屏前旁边，像一个值班的小机器人。
 */

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useEmployeeStore } from "@/store/employees";
import { statusColor } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";

// ─── 共享几何体/材质（模块级） ───

const _bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.35);
const _headGeo = new THREE.BoxGeometry(0.45, 0.4, 0.38);
const _eyeGeo = new THREE.SphereGeometry(0.06, 12, 12);
const _pupilGeo = new THREE.SphereGeometry(0.03, 8, 8);
const _antennaStickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6);
const _antennaBallGeo = new THREE.SphereGeometry(0.04, 8, 8);
const _armGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
const _legGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
const _footGeo = new THREE.BoxGeometry(0.15, 0.06, 0.18);
const _chestLightGeo = new THREE.CircleGeometry(0.06, 16);

const _bodyMat = new THREE.MeshStandardMaterial({ color: "#b0bec5", metalness: 0.6, roughness: 0.3 });
const _headMat = new THREE.MeshStandardMaterial({ color: "#cfd8dc", metalness: 0.5, roughness: 0.3 });
const _eyeWhiteMat = new THREE.MeshStandardMaterial({ color: "#e0f7fa", emissive: "#80deea", emissiveIntensity: 0.3 });
const _pupilMat = new THREE.MeshStandardMaterial({ color: "#00695c", emissive: "#00bfa5", emissiveIntensity: 0.5 });
const _antennaMat = new THREE.MeshStandardMaterial({ color: "#78909c", metalness: 0.7 });
const _limbMat = new THREE.MeshStandardMaterial({ color: "#90a4ae", metalness: 0.5, roughness: 0.4 });

interface RobotInspectorProps {
  position: [number, number, number];
  onClick?: () => void;
}

export function RobotInspector({ position, onClick }: RobotInspectorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const antennaBallRef = useRef<THREE.Mesh>(null);
  const chestLightRef = useRef<THREE.Mesh>(null);

  // store 缓存
  const cachedRef = useRef<{ status: ActivityStatus }>({ status: "idle" });

  useEffect(() => {
    const unsub = useEmployeeStore.subscribe((s) => {
      cachedRef.current.status = s.employees.inspector?.status ?? "idle";
    });
    cachedRef.current.status = useEmployeeStore.getState().employees.inspector?.status ?? "idle";
    return unsub;
  }, []);

  // 胸灯材质（需 per-instance）
  const chestMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#26c6da", emissive: "#26c6da", emissiveIntensity: 0.5,
    transparent: true, side: THREE.DoubleSide,
  }), []);

  // 天线球材质
  const antennaBallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ff5252", emissive: "#ff5252", emissiveIntensity: 0.6,
  }), []);

  useEffect(() => {
    return () => { chestMat.dispose(); antennaBallMat.dispose(); };
  }, [chestMat, antennaBallMat]);

  const [hovered, setHovered] = useState(false);
  const onOver = useCallback(() => setHovered(true), []);
  const onOut = useCallback(() => setHovered(false), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const { status } = cachedRef.current;

    // 浮动
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.03;

    // 头部扫描转动
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.3;
      headRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
    }

    // 手臂摆动
    const armSpeed = status === "working" || status === "reviewing" ? 2.5 : 1;
    if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * armSpeed) * 0.15;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * armSpeed) * 0.15;

    // 天线球闪烁
    if (antennaBallRef.current) {
      const isAlert = status === "alert" || status === "error";
      antennaBallMat.emissiveIntensity = isAlert
        ? 0.8 + Math.sin(t * 8) * 0.5
        : 0.3 + Math.sin(t * 2) * 0.2;
      antennaBallMat.color.set(isAlert ? "#ff1744" : "#ff5252");
      antennaBallMat.emissive.set(isAlert ? "#ff1744" : "#ff5252");
    }

    // 胸灯颜色跟随状态
    if (chestLightRef.current) {
      const c = statusColor(status);
      chestMat.color.set(c);
      chestMat.emissive.set(c);
      chestMat.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.2;
    }
  });

  const currentTask = useEmployeeStore((s) => s.employees.inspector?.currentTask ?? "");
  const status = useEmployeeStore((s) => s.employees.inspector?.status ?? "idle");

  return (
    <group ref={groupRef} position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={onOver} onPointerOut={onOut}
    >
      {/* 身体 */}
      <mesh position={[0, 0.7, 0]} geometry={_bodyGeo} material={_bodyMat} castShadow />

      {/* 胸灯 */}
      <mesh ref={chestLightRef} position={[0, 0.75, 0.18]} geometry={_chestLightGeo} material={chestMat} />

      {/* 头 */}
      <group ref={headRef} position={[0, 1.15, 0]}>
        <mesh geometry={_headGeo} material={_headMat} castShadow />
        {/* 眼睛 */}
        <mesh position={[-0.1, 0.02, 0.2]} geometry={_eyeGeo} material={_eyeWhiteMat} />
        <mesh position={[0.1, 0.02, 0.2]} geometry={_eyeGeo} material={_eyeWhiteMat} />
        <mesh position={[-0.1, 0.02, 0.25]} geometry={_pupilGeo} material={_pupilMat} />
        <mesh position={[0.1, 0.02, 0.25]} geometry={_pupilGeo} material={_pupilMat} />
        {/* 天线 */}
        <mesh position={[0, 0.3, 0]} geometry={_antennaStickGeo} material={_antennaMat} />
        <mesh ref={antennaBallRef} position={[0, 0.42, 0]} geometry={_antennaBallGeo} material={antennaBallMat} />
      </group>

      {/* 手臂 */}
      <mesh ref={leftArmRef} position={[-0.35, 0.7, 0]} geometry={_armGeo} material={_limbMat} castShadow />
      <mesh ref={rightArmRef} position={[0.35, 0.7, 0]} geometry={_armGeo} material={_limbMat} castShadow />

      {/* 腿 */}
      <mesh position={[-0.12, 0.25, 0]} geometry={_legGeo} material={_limbMat} castShadow />
      <mesh position={[0.12, 0.25, 0]} geometry={_legGeo} material={_limbMat} castShadow />

      {/* 脚 */}
      <mesh position={[-0.12, 0.1, 0.03]} geometry={_footGeo} material={_limbMat} />
      <mesh position={[0.12, 0.1, 0.03]} geometry={_footGeo} material={_limbMat} />

      {/* 名牌 */}
      <Html position={[0, 1.65, 0]} center distanceFactor={7} sprite zIndexRange={[24, 0]}>
        <div style={{
          background: hovered ? "rgba(10,20,30,0.95)" : "rgba(15,25,35,0.88)",
          border: "1.5px solid #26c6da",
          borderRadius: 8, padding: hovered ? "6px 12px" : "4px 10px",
          whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none",
          textAlign: "center", minWidth: 90,
        }}>
          <div style={{ color: "#26c6da", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(status), display: "inline-block" }} />
            Inspector Bot
          </div>
          <div style={{ color: "#8899aa", fontSize: 9, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
            {hovered ? currentTask : currentTask.length > 25 ? currentTask.slice(0, 24) + "..." : currentTask}
          </div>
        </div>
      </Html>
    </group>
  );
}
