/**
 * 3D 功能区域组件 — 对齐 TASKS Phase B3
 *
 * 在地面渲染半透明区域标记 + 区域名牌，
 * 让 6 个功能区在 3D 场景中清晰可见。
 */

import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SCENE_ZONES } from "@/config/layout";
import { useMemo } from "react";

/** 单个区域地面标记 */
function ZoneFloor({ center, size, color, label }: {
  center: [number, number, number];
  size: [number, number];
  color: string;
  label: string;
}) {
  const mat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    }),
  [color]);

  const borderMat = useMemo(() =>
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
    }),
  [color]);

  const borderGeo = useMemo(() => {
    const hw = size[0] / 2;
    const hd = size[1] / 2;
    const points = [
      new THREE.Vector3(-hw, 0, -hd),
      new THREE.Vector3(hw, 0, -hd),
      new THREE.Vector3(hw, 0, hd),
      new THREE.Vector3(-hw, 0, hd),
      new THREE.Vector3(-hw, 0, -hd),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [size]);

  return (
    <group position={center}>
      {/* 半透明地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[size[0], size[1]]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* 边框线 */}
      <line>
        <primitive object={borderGeo} attach="geometry" />
        <primitive object={borderMat} attach="material" />
      </line>

      {/* 区域名牌 */}
      <Html
        position={[0, 0.05, -size[1] / 2 + 0.2]}
        center
        distanceFactor={12}
        sprite
      >
        <div
          style={{
            color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            opacity: 0.5,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

/** 渲染所有功能区域 */
export function Zones3D() {
  return (
    <group>
      {SCENE_ZONES.map((zone) => (
        <ZoneFloor
          key={zone.id}
          center={zone.center}
          size={zone.size}
          color={zone.color}
          label={zone.label}
        />
      ))}
    </group>
  );
}
