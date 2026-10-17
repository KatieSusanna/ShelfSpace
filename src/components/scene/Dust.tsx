'use client';

import { Sparkles } from '@react-three/drei';

// Small shader particles give the room a firefly-like dust shimmer at low cost.
export function Dust() {
  return (
    <Sparkles
      count={130}
      position={[0, 1.55, -1]}
      scale={[10, 3.2, 10]}
      size={2}
      speed={0.22}
      opacity={0.52}
      color="#ffd58c"
      noise={0.8}
    />
  );
}
