'use client';

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import colorTextureAsset from '@/assets/windows/stone-bricks/Bricks008_1K-JPG_Color.jpg';
import normalTextureAsset from '@/assets/windows/stone-bricks/Bricks008_1K-JPG_NormalGL.jpg';
import roughnessTextureAsset from '@/assets/windows/stone-bricks/Bricks008_1K-JPG_Roughness.jpg';
import aoTextureAsset from '@/assets/windows/stone-bricks/Bricks008_1K-JPG_AmbientOcclusion.jpg';

type Props = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
};

// Gothic Window 06's characteristic nested pointed arch, built as a light
// architectural frame so it fits the room's actual wall openings.
export function GothicWindow6({ position, rotation = [0, 0, 0], width = 1.3, height = 2.2 }: Props) {
  const [stone, normal, roughness, ao] = useTexture([
    colorTextureAsset.src,
    normalTextureAsset.src,
    roughnessTextureAsset.src,
    aoTextureAsset.src,
  ]);
  useEffect(() => {
    stone.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [stone, normal, roughness, ao]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1.5);
      texture.needsUpdate = true;
    }
    normal.colorSpace = THREE.NoColorSpace;
    roughness.colorSpace = THREE.NoColorSpace;
    ao.colorSpace = THREE.NoColorSpace;
  }, [ao, normal, roughness, stone]);

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
        map={stone}
        normalMap={normal}
        roughnessMap={roughness}
        aoMap={ao}
        aoMapIntensity={0.7}
        normalScale={new THREE.Vector2(0.45, 0.45)}
        color="#ffffff"
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
