/**
 * 3D 数据流粒子
 *
 * 按 ANIMATION_SPEC.md 实现状态驱动的粒子流动效果：
 * - normal/working: 稳定流动，中等速度
 * - busy: 粒子密度增加，速度加快
 * - warning/alert: 粒子变少，颜色偏黄
 * - error: 粒子中断/停止
 * - 事件演出: 信号通过时链路短暂增亮
 *
 * 几何体从 engine/shared3d.ts 共享注册表获取。
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ActivityStatus } from "@/store/employees";
import { FlowGeo } from "@/engine/shared3d";

interface FlowProps {
  from: [number, number, number];
  to: [number, number, number];
  active: boolean;
  sourceStatus?: ActivityStatus;
  targetStatus?: ActivityStatus;
  color?: string;
}

/** 根据状态返回粒子参数 — 按 ANIMATION_SPEC 完整映射 */
function getFlowParams(sourceStatus: ActivityStatus) {
  switch (sourceStatus) {
    case "working":
      return { speed: 0.5, count: 3, color: "#00d4aa", opacity: 0.9, size: [0.06, 0.05, 0.04] };
    case "thinking":
      return { speed: 0.2, count: 2, color: "#90caf9", opacity: 0.6, size: [0.04, 0.03] };
    case "reviewing":
      return { speed: 0.15, count: 2, color: "#ce93d8", opacity: 0.5, size: [0.04, 0.03] };
    case "alert":
      return { speed: 0.25, count: 2, color: "#ffa726", opacity: 0.7, size: [0.05, 0.04] };
    case "error":
      return { speed: 0.1, count: 1, color: "#ff4757", opacity: 0.4, size: [0.03] };
    case "success":
      return { speed: 0.6, count: 3, color: "#66bb6a", opacity: 0.95, size: [0.07, 0.05, 0.04] };
    case "blocked":
      return { speed: 0, count: 0, color: "#ff1744", opacity: 0, size: [] };
    case "disconnected":
      return { speed: 0, count: 0, color: "#b71c1c", opacity: 0, size: [] };
    case "reconnecting":
      return { speed: 0.15, count: 1, color: "#ff9100", opacity: 0.5, size: [0.04] };
    default:
      return { speed: 0.3, count: 2, color: "#00d4aa", opacity: 0.7, size: [0.05, 0.04] };
  }
}

export function DataFlowParticle({ from, to, active, sourceStatus = "idle", color }: FlowProps) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);

  // 预创建 3 个粒子 mesh 材质（生命周期与组件一致）
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ transparent: true }),
    new THREE.MeshStandardMaterial({ transparent: true }),
    new THREE.MeshStandardMaterial({ transparent: true }),
  ], []);

  useFrame(() => {
    if (!active && sourceStatus === "idle") {
      for (let i = 0; i < 3; i++) {
        if (meshRefs.current[i]) meshRefs.current[i]!.visible = false;
      }
      return;
    }

    const params = getFlowParams(sourceStatus);
    const flowColor = color ?? params.color;
    const t = (performance.now() / 1000) * params.speed;

    for (let i = 0; i < 3; i++) {
      const mesh = meshRefs.current[i];
      const mat = materials[i];
      if (!mesh || !mat) continue;

      if (i >= params.count) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;

      const phase = i / params.count;
      const p = (t + phase) % 1;

      mesh.position.set(
        from[0] + (to[0] - from[0]) * p,
        0.8 + Math.sin(p * Math.PI) * 0.3,
        from[2] + (to[2] - from[2]) * p,
      );

      const sz = params.size[i] ?? 0.04;
      const pulseSz = sz * (1 + Math.sin(t * 6 + i) * 0.15);
      mesh.scale.setScalar(pulseSz / 0.06);

      mat.color.set(flowColor);
      mat.emissive.set(flowColor);
      mat.emissiveIntensity = 1.5 + Math.sin(t * 4 + i * 2) * 0.5;
      mat.opacity = params.opacity;
    }
  });

  return (
    <>
      {materials.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          visible={false}
          geometry={FlowGeo.particle}
        >
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </>
  );
}

/** 两点之间的虚线连接 */
export function FlowLine({ from, to, highlight }: {
  from: [number, number, number];
  to: [number, number, number];
  highlight?: boolean;
}) {
  const lineObjRef = useRef<THREE.Line | null>(null);
  // 缓存上一次 highlight 值，避免每帧重复设置
  const prevHighlightRef = useRef<boolean | undefined>(undefined);

  const geo = useMemo(() => {
    const points = [
      new THREE.Vector3(from[0], 0.3, from[2]),
      new THREE.Vector3(to[0], 0.3, to[2]),
    ];
    const g = new THREE.BufferGeometry().setFromPoints(points);
    g.computeBoundingSphere();
    return g;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[2], to[0], to[2]]);

  const mat = useMemo(() =>
    new THREE.LineDashedMaterial({
      color: "#2a3f52",
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.4,
    }),
  []);

  const lineObj = useMemo(() => {
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [geo, mat]);

  lineObjRef.current = lineObj;

  useFrame(() => {
    // 仅在 highlight 变化时更新材质，避免每帧冗余操作
    if (highlight === prevHighlightRef.current) return;
    prevHighlightRef.current = highlight;
    if (highlight) {
      mat.color.set("#00d4aa");
      mat.opacity = 0.8;
    } else {
      mat.color.set("#2a3f52");
      mat.opacity = 0.4;
    }
  });

  return <primitive object={lineObj} />;
}
