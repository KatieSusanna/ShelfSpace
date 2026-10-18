'use client';

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
};

// Gothic Window 06's characteristic nested pointed arch, built as a light
// architectural frame so it fits the room's actual wall openings.
export function GothicWindow6({ position, rotation = [0, 0, 0], width = 1.3, height = 2.2 }: Props) {
  const [wood, normal, packed] = useTexture([
    '/textures/wooden-planks/T_vjisagn_2K_B.png',
    '/textures/wooden-planks/T_vjisagn_2K_N.png',
    '/textures/wooden-planks/T_vjisagn_2K_ORM.png',
  ]);
  useEffect(() => {
    wood.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    packed.colorSpace = THREE.NoColorSpace;
    for (const texture of [wood, normal, packed]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
    }
  }, [normal, packed, wood]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height * 0.68);
    shape.quadraticCurveTo(width / 2, height * 0.88, 0, height);
    shape.quadraticCurveTo(-width / 2, height * 0.88, -width / 2, height * 0.68);
    shape.closePath();

    const inset = Math.min(0.13, width * 0.1);
    const opening = new THREE.Path();
    opening.moveTo(-width / 2 + inset, inset);
    opening.lineTo(-width / 2 + inset, height * 0.67);
    opening.quadraticCurveTo(-width / 2 + inset, height * 0.83, 0, height - inset * 1.4);
    opening.quadraticCurveTo(width / 2 - inset, height * 0.83, width / 2 - inset, height * 0.67);
    opening.lineTo(width / 2 - inset, inset);
    opening.closePath();
    shape.holes.push(opening);

    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    result.setAttribute('uv2', result.getAttribute('uv').clone());
    result.computeVertexNormals();
    return result;
  }, [height, width]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        map={wood}
        normalMap={normal}
        roughnessMap={packed}
        aoMap={packed}
        aoMapIntensity={0.65}
        normalScale={new THREE.Vector2(0.3, 0.3)}
        color="#ffffff"
        roughness={0.82}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
