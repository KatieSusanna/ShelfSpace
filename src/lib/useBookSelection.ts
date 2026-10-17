'use client';

import { create } from 'zustand';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ANIMATE_BOOK } from '@/config/interaction';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';

export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  assetPiece: number;
  position: [number, number, number];
  rotationY: number;
  height: number;
  depth: number;
  thickness: number;
  lean: number;
  leather: string;
  roughness: number;
  brightness: number;
};
type SelectionState = { hoveredId: string | null; isTaking: boolean; setHovered: (id: string | null) => void; setTaking: (taking: boolean) => void };
export const useSelectionState = create<SelectionState>((set) => ({ hoveredId: null, isTaking: false, setHovered: (hoveredId) => set({ hoveredId }), setTaking: (isTaking) => set({ isTaking }) }));

type OriginalTransform = { position: THREE.Vector3; rotation: THREE.Euler; quaternion: THREE.Quaternion; scale: THREE.Vector3; visible: boolean; parent: THREE.Object3D };
const bookMeshes = new Map<string, THREE.Object3D>();
const originalTransforms = new Map<string, OriginalTransform>();
let activeTimeline: gsap.core.Timeline | null = null;
let selectionBusy = false;

export function registerBook(id: string, mesh: THREE.Object3D | null) {
  if (mesh) bookMeshes.set(id, mesh);
  else bookMeshes.delete(id);
}

export function takeBook(id: string, camera: THREE.Camera, onReady: () => void) {
  const mesh = bookMeshes.get(id);
  if (!mesh || !mesh.parent) return;
  selectionBusy = true;
  useSelectionState.getState().setTaking(ANIMATE_BOOK);
  activeTimeline?.kill();
  originalTransforms.set(id, { position: mesh.position.clone(), rotation: mesh.rotation.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone(), visible: mesh.visible, parent: mesh.parent });
  document.exitPointerLock();

  if (!ANIMATE_BOOK) {
    mesh.visible = false;
    useSelectionState.getState().setTaking(false);
    onReady();
    return;
  }

  // The scene root is the parent, so these local positions are also world positions.
  const target = new THREE.Vector3();
  camera.getWorldDirection(target);
  target.multiplyScalar(0.8).add(camera.position);
  // The shelf shows the spine (+Z). Turn the broad cover (+X) toward the camera while reading.
  const faceCameraQuaternion = camera.getWorldQuaternion(new THREE.Quaternion())
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2));
  const cameraWorldRotation = new THREE.Euler().setFromQuaternion(faceCameraQuaternion);
  activeTimeline = gsap.timeline({ onComplete: () => { useSelectionState.getState().setTaking(false); onReady(); } });
  activeTimeline.to(mesh.position, { z: mesh.position.z + 0.3, duration: 0.2, ease: 'power3.inOut' });
  activeTimeline.to(mesh.position, { x: target.x, y: target.y, z: target.z, duration: 0.5, ease: 'power3.inOut' });
  activeTimeline.to(mesh.rotation, { x: cameraWorldRotation.x, y: cameraWorldRotation.y, z: cameraWorldRotation.z, duration: 0.5, ease: 'power3.inOut' }, '<');
}

export function returnBook(id: string, onDone: () => void) {
  const mesh = bookMeshes.get(id);
  const original = originalTransforms.get(id);
  activeTimeline?.kill();
  if (!mesh || !original) { selectionBusy = false; onDone(); return; }
  if (mesh.parent !== original.parent) original.parent.add(mesh);
  if (!ANIMATE_BOOK) {
    mesh.position.copy(original.position);
    mesh.quaternion.copy(original.quaternion);
    mesh.scale.copy(original.scale);
    mesh.visible = original.visible;
    selectionBusy = false;
    onDone();
    return;
  }
  activeTimeline = gsap.timeline({ onComplete: () => {
    mesh.position.copy(original.position);
    mesh.quaternion.copy(original.quaternion);
    mesh.scale.copy(original.scale);
    mesh.visible = original.visible;
    selectionBusy = false;
    onDone();
  } });
  activeTimeline.to(mesh.position, { x: original.position.x, y: original.position.y, z: original.position.z, duration: 0.55, ease: 'power3.inOut' });
  activeTimeline.to(mesh.rotation, { x: original.rotation.x, y: original.rotation.y, z: original.rotation.z, duration: 0.55, ease: 'power3.inOut' }, '<');
}

export function stopBookAnimation() { activeTimeline?.kill(); activeTimeline = null; }

// Finds the book under the crosshair while locked, or under the mouse before locking.
export function useBookSelection(onSelect: (book: ShelfBook) => void, books: ShelfBook[]) {
  const { camera, gl, pointer } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const center = useRef(new THREE.Vector2(0, 0));
  const candidate = useRef<ShelfBook | null>(null);
  const setHovered = useSelectionState((state) => state.setHovered);
  const updatePointer = useCallback((event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    const rect = gl.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, [gl.domElement, pointer]);
  const findBook = useCallback((usePointerPosition = false) => {
    const point = document.pointerLockElement === gl.domElement && !usePointerPosition ? center.current : pointer;
    camera.updateWorldMatrix(true, false);
    raycaster.current.setFromCamera(point, camera);
    const meshes = books.map((book) => bookMeshes.get(book.id)).filter((mesh): mesh is THREE.Object3D => mesh !== undefined && mesh.visible);
    meshes.forEach((mesh) => mesh.updateWorldMatrix(true, true));
    const hit = raycaster.current.intersectObjects(meshes, true).find((entry) => entry.distance <= 3);
    let hitObject: THREE.Object3D | null = hit?.object ?? null;
    let id: string | undefined;
    while (hitObject && !id) {
      id = hitObject.userData.bookId as string | undefined;
      hitObject = hitObject.parent;
    }
    candidate.current = books.find((book) => book.id === id) ?? null;
    setHovered(candidate.current?.id ?? null);
    gl.domElement.style.cursor = candidate.current && document.pointerLockElement !== gl.domElement ? 'pointer' : 'crosshair';
  }, [books, camera, gl.domElement, pointer, setHovered]);

  useFrame(() => findBook());
  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = (event: MouseEvent) => {
      // Use the click position itself, including the click that starts pointer lock.
      updatePointer(event);
      findBook(true);
      if (selectionBusy || !candidate.current) return;
      event.preventDefault();
      event.stopPropagation();
      const selected = candidate.current;
      takeBook(selected.id, camera, () => onSelect(selected));
    };
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = '';
    };
  }, [camera, findBook, gl.domElement, onSelect, updatePointer]);
}
