'use client';

import { useLoader } from '@react-three/fiber';
import { Component, Suspense, type ReactNode, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export type BookcaseKind = 'tall' | 'small';

type BookcaseProps = {
  kind: BookcaseKind;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

function useBookcaseScene() {
  return useLoader(FBXLoader, '/models/bookcase.fbx', (loader) => {
    loader.setResourcePath('/models/bookcase/textures/');
    // The FBX embeds texture names with spaces; the ZIP stores the same names with underscores.
    const textureNameFixes: Record<string, string> = {
      'Victorian Bookcase Tall_BaseColor_sRGB.png': 'Victorian_Bookcase_Tall_BaseColor_sRGB.png',
      'Victorian Bookcase Tall_Normal_Raw.png': 'Victorian_Bookcase_Tall_Normal_Raw.png',
      'Victorian Bookcase Tall_Roughness_Raw.png': 'Victorian_Bookcase_Tall_Roughness_Raw.png',
    };
    loader.manager.setURLModifier((url) => {
      for (const [fbxName, fileName] of Object.entries(textureNameFixes)) {
        if (url.endsWith(fbxName)) return `${url.slice(0, -fbxName.length)}${fileName}`;
      }
      return url;
    });
  });
}

function LoadedBookcase() {
  const scene = useBookcaseScene();
  const sourceName = 'Victorian_Bookcase_Tall';
  const source = scene.getObjectByName(sourceName);
  if (!source) throw new Error(`The FBX model does not contain ${sourceName}.`);

  const bookcase = useMemo(() => {
    const clone = source.clone(true);
    // Normalize the FBX's centimetre scale. Its height becomes about 1.95 m before room scaling.
    clone.position.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    // The source file stores the book rows as a few large merged meshes, not individual books.
    clone.traverse((object) => {
      // The actual shelf mesh says "Bookcase"; only hide children named "Books_*".
      if (object instanceof THREE.Mesh && /[_\s]Books(?:[_\s]|$)/i.test(object.name)) object.visible = false;
    });
    return clone;
  }, [source]);
  useEffect(() => {
    bookcase.updateMatrixWorld(true);
    const rows: Array<{ name: string; type: string; parent: string; worldPosition: string; bounds: string; visible: boolean }> = [];
    let bookLike = 0;
    let mergedBookGroups = 0;
    bookcase.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && object.type !== 'Group') return;
      const bounds = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const position = new THREE.Vector3();
      bounds.getSize(size);
      object.getWorldPosition(position);
      const looksLikeBook = /[_\s]Books(?:[_\s]|$)/i.test(object.name);
      if (looksLikeBook) {
        bookLike += 1;
        if (size.x > 0.25 || size.y > 0.25 || size.z > 0.25) mergedBookGroups += 1;
      }
      rows.push({ name: object.name || '(unnamed object)', type: object.type, parent: object.parent?.name || '(scene root)', worldPosition: position.toArray().map((n) => n.toFixed(2)).join(', '), bounds: size.toArray().map((n) => n.toFixed(2)).join(' × '), visible: object.visible });
    });
    console.group('Bookcase model inspection');
    console.table(rows);
    console.info(`${bookLike} book mesh group(s); ${mergedBookGroups} are large merged groups. Only those groups are hidden. Shelf mesh remains visible.`);
    console.groupEnd();
  }, [bookcase]);
  return <primitive object={bookcase} />;
}

function PlaceholderBookcase({ kind }: { kind: BookcaseKind }) {
  const tall = kind === 'tall';
  const width = 0.96;
  const height = tall ? 1.95 : 1.2;
  const depth = 0.36;
  const rows = tall ? 6 : 3;
  const shelfColor = '#5b402b';

  return (
    <group>
      {/* A small box shelf keeps the scene visible if loading the FBX fails. */}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]}>
          <boxGeometry args={[0.07, height, depth]} />
          <meshStandardMaterial color={shelfColor} roughness={0.9} />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, row) => (
        <mesh key={row} position={[0, (height / rows) * row, 0]}>
          <boxGeometry args={[width, 0.07, depth]} />
          <meshStandardMaterial color="#765638" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, height / 2, -depth / 2 + 0.035]}>
        <boxGeometry args={[width - 0.08, height - 0.08, 0.07]} />
        <meshStandardMaterial color="#39291d" roughness={1} />
      </mesh>
    </group>
  );
}

function CompactBookcase() {
  const scene = useBookcaseScene();
  const shelfMaterial = useMemo(() => {
    const source = scene.getObjectByName('Victorian_Bookcase_Tall');
    const sourceMesh = source?.getObjectByProperty('isMesh', true) as THREE.Mesh | undefined;
    const sourceMaterial = sourceMesh
      ? Array.isArray(sourceMesh.material) ? sourceMesh.material[0] : sourceMesh.material
      : null;
    if (!sourceMaterial) return new THREE.MeshStandardMaterial({ color: '#49301f', roughness: 0.82 });
    return sourceMaterial.clone();
  }, [scene]);
  useEffect(() => () => shelfMaterial.dispose(), [shelfMaterial]);
  // A separate three tier frame avoids the six merged shelf boards in the FBX.
  // Its top and plinth echo the tall case, with the same narrow depth and width.
  const width = 0.97;
  const depth = 0.357;
  const height = 0.96;
  return (
    <group>
      <mesh position={[-width / 2 + 0.035, height / 2, 0]} material={shelfMaterial}>
        <boxGeometry args={[0.07, height, depth]} />
      </mesh>
      <mesh position={[width / 2 - 0.035, height / 2, 0]} material={shelfMaterial}>
        <boxGeometry args={[0.07, height, depth]} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 + 0.025]}>
        <boxGeometry args={[width - 0.07, height - 0.07, 0.05]} />
        <meshStandardMaterial color="#241811" roughness={0.95} />
      </mesh>
      {[0.1, 0.39, 0.68].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={shelfMaterial}>
          <boxGeometry args={[width, 0.045, depth]} />
        </mesh>
      ))}
      <mesh position={[0, 0.935, 0]} material={shelfMaterial}>
        <boxGeometry args={[width + 0.06, 0.05, depth + 0.025]} />
      </mesh>
      <mesh position={[0, 0.035, 0]} material={shelfMaterial}>
        <boxGeometry args={[width + 0.04, 0.07, depth + 0.02]} />
      </mesh>
    </group>
  );
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// The same room transform is used for both the downloaded model and the fallback.
export function Bookcase({ kind, position, rotation = [0, 0, 0], scale = 1 }: BookcaseProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {kind === 'small' ? <CompactBookcase /> : (
        <ModelErrorBoundary fallback={<PlaceholderBookcase kind={kind} />}>
          <Suspense fallback={<PlaceholderBookcase kind={kind} />}>
            <LoadedBookcase />
          </Suspense>
        </ModelErrorBoundary>
      )}
    </group>
  );
}
