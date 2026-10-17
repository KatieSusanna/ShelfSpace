'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LOUNGE_SEATS } from '@/config/layout';

const COLORS = ['#70202d', '#1d3154', '#244833'];
const FACING_YAWS = [Math.atan2(0.72, 0.4), Math.atan2(-0.72, 0.4), Math.PI];
const MODEL_SCALE = 0.0045;
const MODEL_FLOOR_OFFSET = 79.6 * MODEL_SCALE;

function makeNeutralTexture(source: THREE.Texture): THREE.CanvasTexture {
  const image = source.image as CanvasImageSource & { width?: number; height?: number };
  const canvas = document.createElement('canvas');
  canvas.width = image.width ?? 2048;
  canvas.height = image.height ?? 2048;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the beanbag fabric texture.');
  context.filter = 'grayscale(1)';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = source.flipY;
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.repeat.copy(source.repeat);
  texture.offset.copy(source.offset);
  return texture;
}

export function Beanbags() {
  const source = useLoader(FBXLoader, '/models/beanbag/beanbag.fbx');
  const fabricTexture = useLoader(THREE.TextureLoader, '/models/beanbag/beanbag_atlas.png');
  const neutralTexture = useMemo(() => makeNeutralTexture(fabricTexture), [fabricTexture]);
  const bags = useMemo(() => COLORS.map((color) => {
    const model = source.clone(true);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const makeMaterial = () => new THREE.MeshStandardMaterial({
        map: neutralTexture,
        color,
        roughness: 0.94,
      });
      object.material = Array.isArray(object.material)
        ? object.material.map(makeMaterial)
        : makeMaterial();
    });
    return model;
  }), [neutralTexture, source]);

  useEffect(() => () => {
    neutralTexture.dispose();
    bags.forEach((bag) => bag.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    }));
  }, [bags, neutralTexture]);

  return <>
    {LOUNGE_SEATS.map(([x, z], index) => (
      <group key={`${x}-${z}`} position={[x, MODEL_FLOOR_OFFSET, z]} rotation={[0, FACING_YAWS[index] ?? 0, 0]} scale={MODEL_SCALE}>
        <primitive object={bags[index]} />
      </group>
    ))}
  </>;
}
