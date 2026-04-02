import { useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SCENE_ZONES } from "@/config/layout";
import type { EmployeeRoleType } from "@/config/employees";
import { getWorkflowByRole, workflowConfigMap } from "@/config/workflows";
import { useUIStore, selectSelectedEmployee } from "@/store/ui";

function ZoneRug({
  center,
  size,
  color,
  label,
  active,
}: {
  center: [number, number, number];
  size: [number, number];
  color: string;
  label: string;
  active: boolean;
}) {
  const rugGeo = useMemo(() => new THREE.CircleGeometry(1, 48), []);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: active ? 0.18 : 0.08,
        side: THREE.DoubleSide,
        roughness: 1.0,
      }),
    [active, color],
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: active ? 0.1 : 0.03,
        side: THREE.DoubleSide,
      }),
    [active, color],
  );

  useEffect(() => {
    return () => {
      rugGeo.dispose();
      mat.dispose();
      glowMat.dispose();
    };
  }, [glowMat, mat, rugGeo]);

  return (
    <group position={center}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        scale={[size[0] / 2, size[1] / 2, 1]}
        geometry={rugGeo}
        material={mat}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
        scale={[size[0] / 2 + (active ? 0.55 : 0.3), size[1] / 2 + (active ? 0.55 : 0.3), 1]}
        geometry={rugGeo}
        material={glowMat}
      />

      <Html
        position={[0, 0.08, -size[1] / 2 + 0.15]}
        center
        distanceFactor={4}
        sprite
        zIndexRange={[18, 0]}
      >
        <div
          style={{
            color,
            fontSize: active ? 33 : 27,
            fontWeight: 700,
            letterSpacing: 9,
            opacity: active ? 0.9 : 0.38,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            textShadow: active ? `0 0 54px ${color}` : "none",
            transition: "all 160ms ease",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

export function Zones3D() {
  const selectedEmployee = useUIStore(selectSelectedEmployee);
  const selectedWorkflow = useUIStore((s) => s.selectedWorkflow);
  const activeWorkflow = selectedEmployee
    ? getWorkflowByRole(selectedEmployee as EmployeeRoleType)
    : selectedWorkflow;
  const activeZones = activeWorkflow
    ? (workflowConfigMap.get(activeWorkflow)?.sceneZones ?? [])
    : [];

  return (
    <group>
      {SCENE_ZONES.map((zone) => (
        <ZoneRug
          key={zone.id}
          center={zone.center}
          size={zone.size}
          color={zone.color}
          label={zone.label}
          active={activeZones.includes(zone.id)}
        />
      ))}
    </group>
  );
}
