'use client';

import { DoubleSide } from 'three';
import { ROOM } from '@/config/layout';
import { Dust } from './Dust';
import { Lighting } from './Lighting';

// A clean architectural shell for assets to be added to the scene later.
export function Room() {
  return (
    <>
      <color attach="background" args={['#171411']} />
      <fog attach="fog" args={['#171411', 9, 20]} />
      <Lighting />
      <Dust />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#514235" roughness={0.95} />
      </mesh>

      <mesh position={[0, ROOM.height / 2, -ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.width, ROOM.height, ROOM.wallThickness]} />
        <meshStandardMaterial color="#33291f" side={DoubleSide} roughness={0.92} />
      </mesh>
      <mesh position={[-ROOM.width / 2, ROOM.height / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" side={DoubleSide} roughness={0.92} />
      </mesh>
      <mesh position={[ROOM.width / 2, ROOM.height / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" side={DoubleSide} roughness={0.92} />
      </mesh>
      <mesh position={[0, ROOM.height, 0]}>
        <boxGeometry args={[ROOM.width, ROOM.wallThickness, ROOM.depth]} />
        <meshStandardMaterial color="#29231d" side={DoubleSide} roughness={0.95} />
      </mesh>
    </>
  );
}
