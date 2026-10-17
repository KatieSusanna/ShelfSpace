'use client';

import { useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import { useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { FIREPLACE } from '@/config/layout';

function LoadedFireplace() {
  const source = useLoader(FBXLoader, '/models/fireplace/fireplace.fbx');
  const [baseColor, normalMap, roughnessMap, aoMap] = useLoader(THREE.TextureLoader, [
    '/models/fireplace/fireplace_basecolor.jpg',
    '/models/fireplace/fireplace_normal.jpg',
    '/models/fireplace/fireplace_roughness.jpg',
    '/models/fireplace/fireplace_ao.jpg',
  ]);

  const model = useMemo(() => {
    baseColor.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    roughnessMap.colorSpace = THREE.NoColorSpace;
    aoMap.colorSpace = THREE.NoColorSpace;

    const clone = source.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry = object.geometry.clone();
      const uv = object.geometry.getAttribute('uv');
      if (uv) object.geometry.setAttribute('uv2', uv);

      const withTextures = (material: THREE.Material) => {
        const next = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: baseColor,
          normalMap,
          roughnessMap,
          aoMap,
          aoMapIntensity: 0.7,
          roughness: 0.9,
          side: material.side,
        });
        next.needsUpdate = true;
        return next;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(withTextures)
        : withTextures(object.material);
    });
    return clone;
  }, [aoMap, baseColor, normalMap, roughnessMap, source]);

  return (
    <group position={FIREPLACE.position} rotation={FIREPLACE.rotation} scale={FIREPLACE.scale}>
      <primitive object={model} />
    </group>
  );
}

export function Fireplace() {
  return <Suspense fallback={null}><LoadedFireplace /></Suspense>;
}
