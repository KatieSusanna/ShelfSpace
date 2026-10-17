'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { Player } from '@/components/scene/Player';
import { Room } from '@/components/scene/Room';

function PointerHint() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const updateLock = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', updateLock);
    return () => document.removeEventListener('pointerlockchange', updateLock);
  }, []);

  return locked ? null : (
    <div className="pointer-hint">Click to look around · WASD to move · Esc to release</div>
  );
}

export default function Home() {
  return (
    <main className="app-shell">
      <Canvas camera={{ position: [0, 1.7, 4], fov: 70 }} dpr={[1, 2]}>
        <Room />
        <Player />
      </Canvas>
      <PointerHint />
      <div className="scene-label">Empty room · ready for assets</div>
    </main>
  );
}
