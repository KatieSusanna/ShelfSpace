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
type SelectionState = { hoveredId: string | null; isTaking: boolean; heldBookId: string | null; setHovered: (id: string | null) => void; setTaking: (taking: boolean) => void; setHeldBook: (id: string | null) => void };
export const useSelectionState = create<SelectionState>((set) => ({ hoveredId: null, isTaking: false, heldBookId: null, setHovered: (hoveredId) => set({ hoveredId }), setTaking: (isTaking) => set({ isTaking }), setHeldBook: (heldBookId) => set({ heldBookId }) }));

type OriginalTransform = { position: THREE.Vector3; rotation: THREE.Euler; quaternion: THREE.Quaternion; scale: THREE.Vector3; visible: boolean; parent: THREE.Object3D };
const bookMeshes = new Map<string, THREE.Object3D>();
const originalTransforms = new Map<string, OriginalTransform>();
let activeTimeline: gsap.core.Timeline | null = null;
let selectionBusy = false;
let heldCamera: THREE.Camera | null = null;

function getHeldTransform(mesh: THREE.Object3D, camera: THREE.Camera) {
  camera.updateWorldMatrix(true, false);
  mesh.parent?.updateWorldMatrix(true, false);
  const worldPosition = camera.localToWorld(new THREE.Vector3(0, -0.12, -0.72));
  const localPosition = mesh.parent ? mesh.parent.worldToLocal(worldPosition) : worldPosition;
  const worldRotation = camera.getWorldQuaternion(new THREE.Quaternion())
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2));
  const parentRotation = mesh.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  const localRotation = parentRotation.invert().multiply(worldRotation);
  return { position: localPosition, rotation: localRotation };
}

function followCamera(mesh: THREE.Object3D, camera: THREE.Camera) {
  const transform = getHeldTransform(mesh, camera);
  mesh.position.copy(transform.position);
  mesh.quaternion.copy(transform.rotation);
  mesh.scale.setScalar(2.2);
}

export function registerBook(id: string, mesh: THREE.Object3D | null) {
  if (mesh) bookMeshes.set(id, mesh);
  else bookMeshes.delete(id);
}

export function takeBook(id: string, camera: THREE.Camera, onReady: () => void) {
  const mesh = bookMeshes.get(id);
  if (!mesh || !mesh.parent) return;
  selectionBusy = true;
  activeTimeline?.kill();
  originalTransforms.set(id, { position: mesh.position.clone(), rotation: mesh.rotation.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone(), visible: mesh.visible, parent: mesh.parent });
  const parent = mesh.parent;
  parent.updateWorldMatrix(true, false);
  camera.updateWorldMatrix(true, false);
  const targetTransform = getHeldTransform(mesh, camera);
  const targetEuler = new THREE.Euler().setFromQuaternion(targetTransform.rotation);
  const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
  const shelfPosition = mesh.getWorldPosition(new THREE.Vector3());
  const pulledOutWorld = shelfPosition.clone().add(cameraPosition.sub(shelfPosition).normalize().multiplyScalar(0.18));
  const pulledOutPosition = parent.worldToLocal(pulledOutWorld);
  useSelectionState.getState().setTaking(true);
  mesh.visible = true;
  activeTimeline = gsap.timeline({ onComplete: () => {
    mesh.position.copy(targetTransform.position);
    mesh.quaternion.copy(targetTransform.rotation);
    mesh.scale.setScalar(2.2);
    heldCamera = camera;
    useSelectionState.getState().setHeldBook(id);
    useSelectionState.getState().setTaking(false);
    onReady();
  } });
  activeTimeline.to(mesh.position, { x: pulledOutPosition.x, y: pulledOutPosition.y, z: pulledOutPosition.z, duration: 0.75, ease: 'power2.inOut' });
  activeTimeline.to(mesh.position, { x: targetTransform.position.x, y: targetTransform.position.y, z: targetTransform.position.z, duration: 1, ease: 'power2.inOut' });
  activeTimeline.to(mesh.rotation, { x: targetEuler.x, y: targetEuler.y, z: targetEuler.z, duration: 0.9, ease: 'power2.inOut' }, '<');
  activeTimeline.to(mesh.scale, { x: 2.2, y: 2.2, z: 2.2, duration: 1, ease: 'power2.inOut' }, '<');
}

export function returnBook(id: string, onDone: () => void) {
  const mesh = bookMeshes.get(id);
  const original = originalTransforms.get(id);
  activeTimeline?.kill();
  if (!mesh || !original) { selectionBusy = false; onDone(); return; }
  heldCamera = null;
  useSelectionState.getState().setHeldBook(null);
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
  activeTimeline.to(mesh.position, { x: original.position.x, y: original.position.y, z: original.position.z, duration: 1.35, ease: 'power2.inOut' });
  activeTimeline.to(mesh.rotation, { x: original.rotation.x, y: original.rotation.y, z: original.rotation.z, duration: 1.35, ease: 'power2.inOut' }, '<');
  activeTimeline.to(mesh.scale, { x: original.scale.x, y: original.scale.y, z: original.scale.z, duration: 1.35, ease: 'power2.inOut' }, '<');
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
    const locked = document.pointerLockElement === gl.domElement;
    const point = locked && !usePointerPosition ? center.current : pointer;
    camera.updateWorldMatrix(true, false);
    raycaster.current.setFromCamera(point, camera);
    const heldId = useSelectionState.getState().heldBookId;
    const meshes = books
      .filter((book) => book.id !== heldId)
      .map((book) => bookMeshes.get(book.id))
      .filter((mesh): mesh is THREE.Object3D => mesh !== undefined && mesh.visible);
    meshes.forEach((mesh) => mesh.updateWorldMatrix(true, true));
    const nearestHit = raycaster.current.intersectObjects(meshes, true)[0];
    const hit = nearestHit && nearestHit.distance <= 3 ? nearestHit : undefined;
    let hitObject: THREE.Object3D | null = hit?.object ?? null;
    let id: string | undefined;
    while (hitObject && !id) {
      id = hitObject.userData.bookId as string | undefined;
      hitObject = hitObject.parent;
    }
    candidate.current = books.find((book) => book.id === id) ?? null;
    const hoveredId = candidate.current?.id ?? null;
    if (useSelectionState.getState().hoveredId !== hoveredId) setHovered(hoveredId);
    gl.domElement.style.cursor = candidate.current && !locked ? 'pointer' : 'crosshair';
  }, [books, camera, gl.domElement, pointer, setHovered]);

  useFrame(() => {
    const heldId = useSelectionState.getState().heldBookId;
    if (heldId && heldCamera) {
      const heldMesh = bookMeshes.get(heldId);
      if (heldMesh) followCamera(heldMesh, heldCamera);
    }
    findBook();
  });
  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      updatePointer(event);
      findBook(true);
      if (selectionBusy || !candidate.current) return;
      event.preventDefault();
      event.stopPropagation();
      const selected = candidate.current;
      takeBook(selected.id, camera, () => onSelect(selected));
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) canvas.requestPointerLock();
    };
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = '';
    };
  }, [camera, findBook, gl.domElement, onSelect, updatePointer]);
}
