'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { hitsObstacle, ROOM } from '@/config/layout';

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.28;

// Keyboard movement uses elapsed frame time, so it feels the same on fast and slow laptops.
export function Player() {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => keys.current.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (document.pointerLockElement !== gl.domElement) return;

    // Ignore unusually large frame gaps to avoid a sudden jump after tab switching.
    const step = Math.min(delta, 0.05);
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
    const movement = new THREE.Vector3();

    if (keys.current.has('KeyW')) movement.add(direction);
    if (keys.current.has('KeyS')) movement.sub(direction);
    if (keys.current.has('KeyD')) movement.add(right);
    if (keys.current.has('KeyA')) movement.sub(right);
    if (movement.lengthSq() === 0) return;

    const speed = keys.current.has('ShiftLeft') || keys.current.has('ShiftRight') ? 5 : 2.8;
    movement.normalize().multiplyScalar(speed * step);
    const roomEdgeX = ROOM.width / 2 - ROOM.wallThickness - PLAYER_RADIUS;
    const roomEdgeZ = ROOM.depth / 2 - ROOM.wallThickness - PLAYER_RADIUS;
    const nextX = THREE.MathUtils.clamp(camera.position.x + movement.x, -roomEdgeX, roomEdgeX);
    const nextZ = THREE.MathUtils.clamp(camera.position.z + movement.z, -roomEdgeZ, roomEdgeZ);

    // Test the two directions separately so the player can slide along a shelf edge.
    if (!hitsObstacle(nextX, camera.position.z, PLAYER_RADIUS)) camera.position.x = nextX;
    if (!hitsObstacle(camera.position.x, nextZ, PLAYER_RADIUS)) camera.position.z = nextZ;
    camera.position.y = PLAYER_HEIGHT;
  });

  // Keep the 3D look controls on the canvas so overlay buttons remain clickable.
  return <PointerLockControls selector="canvas" />;
}
