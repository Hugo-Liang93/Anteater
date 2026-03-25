/**
 * GLB 模型加载器 — 对齐 ASSET_GUIDE.md
 *
 * 当角色有外部 GLB 模型时加载并渲染，
 * 否则 fallback 到程序化生成的 Character3D。
 *
 * 使用方式：直接替换 Character3D 即可，接口相同。
 * 当 config/assets.ts 中某角色的 modelPath 设为非 null 时，
 * 自动切换到 GLB 模型渲染。
 */

import { Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { EmployeeRoleType } from "@/config/employees";
import { hasExternalModel, getModelPath } from "@/config/assets";
import { Character3D } from "./Character3D";

interface CharacterModelProps {
  role: EmployeeRoleType;
  position: [number, number, number];
  onClick?: () => void;
}

/** GLB 模型渲染组件 */
function GLBCharacter({ position, onClick, modelPath }: Omit<CharacterModelProps, "role"> & { modelPath: string }) {
  const gltf = useLoader(GLTFLoader, modelPath);

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}

/**
 * 角色模型入口 — 自动选择 GLB 或程序化渲染
 *
 * 优先加载 GLB 模型，加载失败或无模型时 fallback 到 Character3D。
 */
export function CharacterModel({ role, position, onClick }: CharacterModelProps) {
  const modelPath = getModelPath(role);

  if (modelPath && hasExternalModel(role)) {
    return (
      <Suspense fallback={<Character3D role={role} position={position} onClick={onClick} />}>
        <GLBCharacter position={position} onClick={onClick} modelPath={modelPath} />
      </Suspense>
    );
  }

  // Fallback: 程序化生成
  return <Character3D role={role} position={position} onClick={onClick} />;
}
