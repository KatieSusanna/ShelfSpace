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

// Finds the book under the crosshair while locked, or under the mouse before locking.
export function useBookSelection(onSelect: (book: ShelfBook) => void, books: ShelfBook[]) {
  const { camera, gl, pointer } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const center = useRef(new THREE.Vector2(0, 0));
  const candidate = useRef<ShelfBook | null>(null);
  const lastRaycast = useRef(0);
  const targets = useRef<THREE.Object3D[]>([]);
  const intersections = useRef<THREE.Intersection[]>([]);
  const updatePointer = useCallback((event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    const rect = gl.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, [gl.domElement, pointer]);
<<<<<<< HEAD
  const findBook = useCallback((usePointerPosition = false) => {
    const locked = document.pointerLockElement !== null;
    const point = locked && !usePointerPosition ? center.current : pointer;
    camera.updateWorldMatrix(true, false);
    raycaster.current.setFromCamera(point, camera);
    const heldId = useSelectionState.getState().heldBookId;
    const meshes = books
      .filter((book) => book.id !== heldId)
      .map((book) => bookMeshes.get(book.id))
      .filter((mesh): mesh is THREE.Object3D => mesh !== undefined && mesh.visible);
    meshes.forEach((mesh) => mesh.updateWorldMatrix(true, true));
    const intersections = raycaster.current.intersectObjects(meshes, true);
    const inRange = (intersection: THREE.Intersection) => intersection.distance <= MAX_BOOK_PICK_DISTANCE;
    const visibleBookHit = intersections.find((intersection) => inRange(intersection) && !intersection.object.userData.bookPickTarget);
    const forgivingCursorHit = intersections.find((intersection) => inRange(intersection) && intersection.object.userData.bookPickTarget);
    // The real surface wins when available; the double-sided box catches books whose model mesh is hard to raycast.
    const hit = visibleBookHit ?? forgivingCursorHit;
=======
  const findBook = useCallback(() => {
    const locked = document.pointerLockElement === gl.domElement;
    const point = locked ? center.current : pointer;
    camera.updateWorldMatrix(true, false);
    raycaster.current.setFromCamera(point, camera);
    const heldId = useSelectionState.getState().heldBookId;
    const pickTargets = targets.current;
    pickTargets.length = 0;
    for (const book of books) {
      if (book.id === heldId) continue;
      const mesh = bookHitMeshes.get(book.id);
      if (!mesh) continue;
      mesh.updateWorldMatrix(true, false);
      pickTargets.push(mesh);
    }
    const hits = intersections.current;
    hits.length = 0;
    const nearestHit = raycaster.current.intersectObjects(pickTargets, false, hits)[0];
    const hit = nearestHit && nearestHit.distance <= 3 ? nearestHit : undefined;
>>>>>>> 2f112e96da979dd266ec28ed2c5005451a604215
    let hitObject: THREE.Object3D | null = hit?.object ?? null;
    let id: string | undefined;
    while (hitObject && !id) {
      id = hitObject.userData.bookId as string | undefined;
      hitObject = hitObject.parent;
    }
    candidate.current = books.find((book) => book.id === id) ?? null;
    const hoveredId = candidate.current?.id ?? null;
    setHoveredBook(hoveredId);
    gl.domElement.style.cursor = candidate.current && !locked ? 'pointer' : 'crosshair';
<<<<<<< HEAD
    return candidate.current;
  }, [books, camera, gl.domElement, pointer, setHovered]);
=======
  }, [books, camera, gl.domElement, pointer]);
>>>>>>> 2f112e96da979dd266ec28ed2c5005451a604215

  useFrame(({ clock }) => {
    const heldId = useSelectionState.getState().heldBookId;
    if (heldId && heldCamera) {
      const heldMesh = bookMeshes.get(heldId);
      if (heldMesh) followCamera(heldMesh, heldCamera);
    }
    // Mouse hover is event-driven below; only the locked crosshair needs frame polling.
    if (document.pointerLockElement !== gl.domElement) return;
    if (clock.elapsedTime - lastRaycast.current < 1 / 30) return;
    lastRaycast.current = clock.elapsedTime;
    findBook();
  }, -1);
  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerMove = (event: PointerEvent) => {
<<<<<<< HEAD
      if (document.pointerLockElement !== null) return;
      updatePointer(event);
      findBook(true);
    };
    const onPointerLeave = () => {
      if (document.pointerLockElement !== null) return;
      candidate.current = null;
      setHovered(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const locked = document.pointerLockElement !== null;
      if (locked) {
        event.preventDefault();
        event.stopPropagation();
      } else if (event.target !== canvas) {
        return;
      }
      if (!locked) {
        updatePointer(event);
      }
      const selected = findBook(!locked);
      if (selectionBusy) return;
      if (!selected) return;
      takeBook(selected.id, camera, () => onSelect(selected));
    };
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('contextmenu', preventContextMenu);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('contextmenu', preventContextMenu);
=======
      if (document.pointerLockElement === canvas) return;
      updatePointer(event);
      findBook();
    };
    const onPointerLeave = () => {
      if (document.pointerLockElement === canvas) return;
      candidate.current = null;
      setHoveredBook(null);
      canvas.style.cursor = '';
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      updatePointer(event);
      findBook();
      if (selectionBusy || !candidate.current) return;
      event.preventDefault();
      event.stopPropagation();
      const selected = candidate.current;
      takeBook(selected.id, camera, () => onSelect(selected));
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) canvas.requestPointerLock();
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
>>>>>>> 2f112e96da979dd266ec28ed2c5005451a604215
      canvas.style.cursor = '';
    };
  }, [books, camera, findBook, gl.domElement, onSelect, setHovered, updatePointer]);
}
