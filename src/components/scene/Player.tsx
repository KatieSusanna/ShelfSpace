'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { hitsObstacle, ROOM } from '@/config/layout';

const PLAYER_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
const PLAYER_RADIUS = 0.28;
const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight']);
const LETTER_KEYS: Record<string, string> = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD' };

// Keyboard movement uses elapsed frame time, so it feels the same on fast and slow laptops.
export function Player() {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const normalizeKey = (event: KeyboardEvent) => {
      if (MOVEMENT_KEYS.has(event.code)) return event.code;
      const letterKey = LETTER_KEYS[event.key.toLowerCase()];
      if (letterKey) return letterKey;
      if (event.key === 'Control') return event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT ? 'ControlRight' : 'ControlLeft';
      return event.code;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = normalizeKey(event);
      if (!MOVEMENT_KEYS.has(key)) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      keys.current.add(key);
    };
    window.addEventListener('keydown', onKeyDown);
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(normalizeKey(event));
    const onBlur = () => keys.current.clear();
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [gl.domElement]);

  useFrame((_, delta) => {
    // Ignore unusually large frame gaps to avoid a sudden jump after tab switching.
    const step = Math.min(delta, 0.05);
    const crouching = keys.current.has('ControlLeft') || keys.current.has('ControlRight');
    const targetHeight = crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetHeight, 12, step);

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
  });

  // Keep the 3D look controls on the canvas so overlay buttons remain clickable.
  return <PointerLockControls selector="canvas" />;
}
