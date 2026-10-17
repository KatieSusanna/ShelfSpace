'use client';

import { Sparkles } from '@react-three/drei';

// Small shader particles give the room a firefly-like dust shimmer at low cost.
export function Dust() {
  return (
    <Sparkles
      count={72}
      position={[0, 1.45, -0.5]}
      scale={[7, 2.8, 7.8]}
      size={2}
      speed={0.22}
      opacity={0.52}
      color="#ffc58b"
      noise={0.8}
    />
  );
}
