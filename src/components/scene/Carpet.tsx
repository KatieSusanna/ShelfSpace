'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const CARPET_SCALE = 1.85;
const MODEL_CENTER_X = 0.04329447;
const MODEL_BOTTOM_Y = 0.0001918;
const MODEL_CENTER_Z = -0.06389494;

export function Carpet() {
  const { scene } = useGLTF('/models/carpet/library-carpet.glb');
  const carpet = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const recolorMaterial = (source: THREE.Material) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          // Keep the carpet colors true under the room lighting instead of letting
          // the asset's white emissive map wash them out.
          material.emissiveMap = null;
          material.emissive.set('#000000');
          material.emissiveIntensity = 0;
        }
        return material;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(recolorMaterial)
        : recolorMaterial(object.material);
    });
    return clone;
  }, [scene]);

  useEffect(() => () => {
    carpet.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  }, [carpet]);

  return (
    <group
      position={[
        -MODEL_CENTER_X * CARPET_SCALE,
        0.014 - MODEL_BOTTOM_Y * CARPET_SCALE,
        -1.8 - MODEL_CENTER_Z * CARPET_SCALE,
      ]}
      scale={CARPET_SCALE}
    >
      <primitive object={carpet} />
    </group>
  );
}

useGLTF.preload('/models/carpet/library-carpet.glb');
