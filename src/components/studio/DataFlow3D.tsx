/**
 * 3D 数据流粒子
 *
 * 在工位之间绘制发光粒子流动效果。
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FlowProps {
  from: [number, number, number];
  to: [number, number, number];
  active: boolean;
  color?: string;
}

export function DataFlowParticle({ from, to, active, color = "#00d4aa" }: FlowProps) {
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!active) {
      if (ref1.current) ref1.current.visible = false;
      if (ref2.current) ref2.current.visible = false;
      return;
    }

    const t = (performance.now() / 1000) * 0.4;

    // 粒子 1
    if (ref1.current) {
      ref1.current.visible = true;
      const p1 = t % 1;
      ref1.current.position.set(
        from[0] + (to[0] - from[0]) * p1,
        0.8 + Math.sin(p1 * Math.PI) * 0.3,
        from[2] + (to[2] - from[2]) * p1,
      );
    }

    // 粒子 2（偏移半周期）
    if (ref2.current) {
      ref2.current.visible = true;
      const p2 = (t + 0.5) % 1;
      ref2.current.position.set(
        from[0] + (to[0] - from[0]) * p2,
        0.8 + Math.sin(p2 * Math.PI) * 0.3,
        from[2] + (to[2] - from[2]) * p2,
      );
    }
  });

  return (
    <>
      <mesh ref={ref1}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      <mesh ref={ref2}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} transparent opacity={0.7} />
      </mesh>
    </>
  );
}

/** 两点之间的虚线连接 */
export function FlowLine({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = [
    new THREE.Vector3(from[0], 0.3, from[2]),
    new THREE.Vector3(to[0], 0.3, to[2]),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line>
      <bufferGeometry attach="geometry" {...geo} />
      <lineDashedMaterial color="#2a3f52" dashSize={0.15} gapSize={0.1} transparent opacity={0.4} />
    </line>
  );
}
