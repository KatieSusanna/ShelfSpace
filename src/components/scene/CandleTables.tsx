'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CANDLE_TABLES } from '@/config/layout';

function CandleModel({
  url,
  position,
  height,
}: {
  url: string;
  position: [number, number, number];
  height: number;
}) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = height / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [height, scene]);

  return (
    <group position={position}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

function CandleCluster({
  position,
  variant,
  shelf = false,
}: {
  position: [number, number, number];
  variant: number;
  shelf?: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  const lightPhase = variant * 1.73;
  const largeCandleHeight = variant % 2 === 0 ? 0.44 : 0.4;
  const smallCandleHeight = 0.29;

  useFrame(({ clock }) => {
    if (light.current) {
      const time = clock.elapsedTime + lightPhase;
      const baseIntensity = shelf ? 7.2 : 10;
      light.current.intensity = baseIntensity + Math.sin(time * 5.8) * 0.4 + Math.sin(time * 11.2) * 0.18;
    }
  });

  return (
    <group position={position}>
      <CandleModel
        url="/models/candles/candle-07.glb"
        position={[0, 0, 0]}
        height={largeCandleHeight}
      />
      <CandleModel
        url="/models/candles/candle-11.glb"
        position={[-0.22, 0, 0.045]}
        height={smallCandleHeight}
      />
      <CandleModel
        url="/models/candles/candle-11.glb"
        position={[0.22, 0, -0.035]}
        height={smallCandleHeight}
      />
      {shelf && (
        <mesh position={[0, -0.012, 0]}>
          <boxGeometry args={[0.72, 0.024, 0.32]} />
          <meshStandardMaterial color="#956b3e" metalness={0.45} roughness={0.48} />
        </mesh>
      )}
      <pointLight
        ref={light}
        position={[0, shelf ? 0.53 : 0.51, 0]}
        color="#ffb653"
        intensity={shelf ? 7.2 : 10}
        distance={shelf ? 6.8 : 7.8}
        decay={1.65}
      />
    </group>
  );
}

function CandleTable({ position, variant }: { position: [number, number, number]; variant: number }) {
  return (
    <group position={position}>
      {/* A compact dark-wood pedestal table, sized as a candle placeholder. */}
      <mesh position={[0, 0.67, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.43, 0.1, 12]} />
        <meshStandardMaterial color="#382116" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.615, 0]}>
        <cylinderGeometry args={[0.42, 0.4, 0.025, 12]} />
        <meshStandardMaterial color="#9a6d3e" metalness={0.42} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.17, 0.12, 10]} />
        <meshStandardMaterial color="#412719" roughness={0.78} />
      </mesh>
      {Array.from({ length: 3 }, (_, index) => {
        const angle = (index / 3) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * 0.31;
        const z = Math.sin(angle) * 0.31;
        return (
          <mesh key={index} position={[x, 0.285, z]} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.075, 0.55, 0.075]} />
            <meshStandardMaterial color="#332016" roughness={0.8} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.055, 12]} />
        <meshStandardMaterial color="#332016" roughness={0.8} />
      </mesh>
      <CandleCluster position={[0, 0.72, 0]} variant={variant} />
    </group>
  );
}

export function BookshelfCandleCluster({ topY, variant }: { topY: number; variant: number }) {
  return <CandleCluster position={[0, topY + 0.024, 0]} variant={variant} shelf />;
}

export function CandleTables() {
  return (
    <>
      {CANDLE_TABLES.map(([x, z], index) => (
        <CandleTable key={`${x}-${z}`} position={[x, 0, z]} variant={index} />
      ))}
    </>
  );
}

useGLTF.preload('/models/candles/candle-07.glb');
useGLTF.preload('/models/candles/candle-11.glb');
