'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type PointLight } from 'three';

// A tiny intensity change makes the lamps feel alive without heavy effects.
export function Lighting() {
  const leftLamp = useRef<PointLight>(null);
  const rightLamp = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    // Keep the flicker gentle: enough to feel like candlelight, not a broken bulb.
    if (leftLamp.current) {
      leftLamp.current.intensity = 34 + Math.sin(time * 7) * 1.2 + Math.sin(time * 13) * 0.5;
    }
    if (rightLamp.current) {
      rightLamp.current.intensity = 32 + Math.sin(time * 6 + 1) * 1.1 + Math.sin(time * 11) * 0.4;
    }
  });

  return (
    <>
      {/* Soft room light keeps the darker corners and wood grain visible. */}
      <ambientLight intensity={0.85} color="#d6b98f" />

      {/* Warm point lights hang over the shelves like small gothic lanterns. */}
      <pointLight ref={leftLamp} position={[-3.25, 2.4, -1.8]} color="#ffbd73" distance={12} decay={2} />
      <pointLight ref={rightLamp} position={[3.25, 2.4, -1.8]} color="#ffc47c" distance={12} decay={2} />

      {[-3, 3].map((x) => (
        <group key={x} position={[x * 1.08, 0, -1.8]}>
          <mesh position={[0, 2.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.38, 8]} />
            <meshStandardMaterial color="#725334" metalness={0.55} roughness={0.55} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial
              color="#ffd18a"
              emissive="#ff9f43"
              emissiveIntensity={2.5}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 2.38, 0]}>
            <cylinderGeometry args={[0.2, 0.12, 0.2, 8, 1, true]} />
            <meshStandardMaterial color="#60452c" metalness={0.35} roughness={0.65} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}
