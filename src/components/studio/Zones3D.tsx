/**
 * 3D 功能区域组件 — 温暖卡通风格
 *
 * 用半透明圆形地毯（而非硬边矩形色带）标记功能区域，
 * 配合区域名牌，让分区在 3D 场景中柔和可见。
 */

import { useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SCENE_ZONES } from "@/config/layout";

/** 单个区域地毯标记 */
function ZoneRug({ center, size, color, label }: {
  center: [number, number, number];
  size: [number, number];
  color: string;
  label: string;
}) {
  // 椭圆地毯：width/2 为 X 半径，depth/2 为 Z 半径
  const rugGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 48);
    // 椭圆缩放在 mesh 层做
    return g;
  }, []);

  const mat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      roughness: 1.0,
    }),
  [color]);

  // 柔和光晕边缘（第二层更大更透明）
  const glowMat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
    }),
  [color]);

  useEffect(() => {
    return () => {
      rugGeo.dispose();
      mat.dispose();
      glowMat.dispose();
    };
  }, [rugGeo, mat, glowMat]);

  return (
    <group position={center}>
      {/* 主地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}
        scale={[size[0] / 2, size[1] / 2, 1]}
        geometry={rugGeo} material={mat}
      />
      {/* 外层光晕 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}
        scale={[size[0] / 2 + 0.3, size[1] / 2 + 0.3, 1]}
        geometry={rugGeo} material={glowMat}
      />

      {/* 区域名牌 */}
      <Html
        position={[0, 0.08, -size[1] / 2 + 0.15]}
        center
        distanceFactor={12}
        sprite
        zIndexRange={[0, 0]}
      >
        <div
          style={{
            color,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 3,
            opacity: 0.4,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
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
        <ZoneRug
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
