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
const MAX_BOOK_PICK_DISTANCE = 10;
const bookMeshes = new Map<string, THREE.Object3D>();
const bookHitMeshes = new Map<string, THREE.Mesh>();
const bookHighlights = new Map<string, THREE.Object3D>();
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

export function registerBook(
  id: string,
  mesh: THREE.Object3D | null,
  hitMesh: THREE.Mesh | null,
  highlight: THREE.Object3D | null,
) {
  if (mesh && hitMesh && highlight) {
    bookMeshes.set(id, mesh);
    bookHitMeshes.set(id, hitMesh);
    bookHighlights.set(id, highlight);
    highlight.visible = useSelectionState.getState().hoveredId === id;
  } else {
    bookMeshes.delete(id);
    bookHitMeshes.delete(id);
    bookHighlights.delete(id);
  }
}

function setHoveredBook(id: string | null) {
  const previousId = useSelectionState.getState().hoveredId;
  if (previousId) {
    const previousHighlight = bookHighlights.get(previousId);
    if (previousHighlight) previousHighlight.visible = false;
  }
  if (id) {
    const nextHighlight = bookHighlights.get(id);
    if (nextHighlight) nextHighlight.visible = true;
  }
  if (previousId !== id) useSelectionState.getState().setHovered(id);
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
  const pulledOutWorld = shelfPosition.clone().add(cameraPosition.sub(shelfPosition).normalize().multiplyScalar(0.35));
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

// The centered reticle is the sole target while pointer lock is active.
export function useBookSelection(onSelect: (book: ShelfBook) => void, books: ShelfBook[]) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const center = useRef(new THREE.Vector2(0, 0));
  const candidate = useRef<ShelfBook | null>(null);
  const lastRaycast = useRef(0);
  const hitTargets = useRef<THREE.Object3D[]>([]);
  const intersections = useRef<THREE.Intersection[]>([]);

  const findBook = useCallback(() => {
    // Drei can lock the canvas or its configured selector. Treat any active
    // pointer lock as aim mode so the reticle and raycaster stay in sync.
    if (document.pointerLockElement === null) {
      candidate.current = null;
      setHoveredBook(null);
      return null;
    }

    camera.updateWorldMatrix(true, false);
    raycaster.current.setFromCamera(center.current, camera);
    const heldId = useSelectionState.getState().heldBookId;
    const targets = hitTargets.current;
    targets.length = 0;
    for (const book of books) {
      if (book.id === heldId) continue;
      const bookMesh = bookMeshes.get(book.id);
      if (!bookMesh?.visible) continue;
      bookMesh.updateWorldMatrix(true, true);
      targets.push(bookMesh);
    }

    const hits = intersections.current;
    hits.length = 0;
    const nearest = raycaster.current.intersectObjects(targets, true, hits)
      .find((hit) => hit.distance <= MAX_BOOK_PICK_DISTANCE);
    let hitObject: THREE.Object3D | null = nearest?.object ?? null;
    let id: string | undefined;
    while (hitObject && !id) {
      id = hitObject.userData.bookId as string | undefined;
      hitObject = hitObject.parent;
    }

    candidate.current = books.find((book) => book.id === id) ?? null;
    setHoveredBook(candidate.current?.id ?? null);
    return candidate.current;
  }, [books, camera, gl.domElement]);

  useFrame(({ clock }) => {
    const heldId = useSelectionState.getState().heldBookId;
    if (heldId && heldCamera) {
      const heldMesh = bookMeshes.get(heldId);
      if (heldMesh) followCamera(heldMesh, heldCamera);
    }
    if (document.pointerLockElement === null) return;
    if (clock.elapsedTime - lastRaycast.current < 1 / 30) return;
    lastRaycast.current = clock.elapsedTime;
    findBook();
  }, -1);

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (document.pointerLockElement === null) return;
      event.preventDefault();
      event.stopPropagation();
      const selected = findBook();
      if (!selected || selectionBusy) return;
      takeBook(selected.id, camera, () => onSelect(selected));
    };
    const onPointerLeave = () => {
      if (document.pointerLockElement !== null) return;
      candidate.current = null;
      setHoveredBook(null);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [camera, findBook, gl.domElement, onSelect]);
}
