'use client';

import { Suspense, useEffect, useState } from 'react';
import { DoubleSide } from 'three';
import { BOOKCASES, ROOM, WINDOW_SEAT } from '@/config/layout';
import { Bookcase } from '@/components/Bookcase';
import { Lighting } from './Lighting';
import { Dust } from './Dust';
import { BookShelf } from './Book';
import { SHELF_BOOKS } from '@/config/books';
import { BookSelectionController } from './BookSelectionController';
import type { ShelfBook } from '@/lib/useBookSelection';
import { Fireplace } from './Fireplace';
import { Beanbags } from './Beanbags';

function Doorway() {
  const sideWidth = (ROOM.width - ROOM.doorWidth) / 2;
  const sideX = ROOM.doorWidth / 2 + sideWidth / 2;
  const z = ROOM.depth / 2 - ROOM.wallThickness / 2;
  const wood = '#40271c';
  const trim = '#765334';
  return (
    <>
      {[-sideX, sideX].map((x) => (
        <mesh key={x} position={[x, ROOM.height / 2, ROOM.depth / 2]}>
          <boxGeometry args={[sideWidth, ROOM.height, ROOM.wallThickness]} />
          <meshStandardMaterial color="#33291f" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, (ROOM.height + ROOM.doorHeight) / 2, ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.doorWidth, ROOM.height - ROOM.doorHeight, ROOM.wallThickness]} />
        <meshStandardMaterial color="#33291f" roughness={0.92} />
      </mesh>
      <mesh position={[0, ROOM.doorHeight / 2, z]}>
        <boxGeometry args={[ROOM.doorWidth - 0.12, ROOM.doorHeight - 0.08, 0.08]} />
        <meshStandardMaterial color={wood} roughness={0.78} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ROOM.doorWidth / 2, ROOM.doorHeight / 2, z - 0.045]}>
          <boxGeometry args={[0.09, ROOM.doorHeight + 0.08, 0.12]} />
          <meshStandardMaterial color={trim} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, ROOM.doorHeight + 0.04, z - 0.045]}>
        <boxGeometry args={[ROOM.doorWidth + 0.09, 0.09, 0.12]} />
        <meshStandardMaterial color={trim} roughness={0.75} />
      </mesh>
      <mesh position={[0.52, 1.05, z - 0.08]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#c3974c" metalness={0.65} roughness={0.32} />
      </mesh>
    </>
  );
}

function EastWindow() {
  const centerZ = ROOM.windowCenterZ;
  const width = ROOM.windowWidth;
  const height = ROOM.windowHeight;
  const bottom = 1.08;
  const top = bottom + height;
  const wallX = ROOM.width / 2;
  const windowStart = centerZ - width / 2;
  const windowEnd = centerZ + width / 2;
  const leftDepth = windowStart + ROOM.depth / 2;
  const rightDepth = ROOM.depth / 2 - windowEnd;
  const sideSegments = [
    { depth: leftDepth, z: (-ROOM.depth / 2 + windowStart) / 2 },
    { depth: rightDepth, z: (windowEnd + ROOM.depth / 2) / 2 },
  ];
  const frame = '#765334';
  return (
    <>
      <mesh position={[wallX, bottom / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, bottom, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" roughness={0.92} />
      </mesh>
      <mesh position={[wallX, (ROOM.height + top) / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height - top, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" roughness={0.92} />
      </mesh>
      {sideSegments.map(({ depth, z }) => (
        <mesh key={z} position={[wallX, (bottom + top) / 2, z]}>
          <boxGeometry args={[ROOM.wallThickness, height, depth]} />
          <meshStandardMaterial color="#3c3025" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[wallX - 0.06, (bottom + top) / 2, centerZ]}>
        <boxGeometry args={[0.025, height - 0.08, width - 0.08]} />
        <meshStandardMaterial color="#78909a" emissive="#283b48" emissiveIntensity={0.25} roughness={0.22} metalness={0.12} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[wallX - 0.07, (bottom + top) / 2, centerZ + side * (width / 2 - 0.035)]}>
          <boxGeometry args={[0.09, height + 0.12, 0.07]} />
          <meshStandardMaterial color={frame} roughness={0.75} />
        </mesh>
      ))}
      {[bottom, top].map((y) => (
        <mesh key={y} position={[wallX - 0.07, y, centerZ]}>
          <boxGeometry args={[0.09, 0.07, width + 0.08]} />
          <meshStandardMaterial color={frame} roughness={0.75} />
        </mesh>
      ))}
    </>
  );
}

function LoungeAndWindowSeat() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -1.8]}>
        <circleGeometry args={[1.42, 48]} />
        <meshStandardMaterial color="#714332" roughness={0.98} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, -1.8]}>
        <circleGeometry args={[1.34, 48]} />
        <meshStandardMaterial color="#593327" roughness={0.98} />
      </mesh>
      <Beanbags />
      <mesh position={[WINDOW_SEAT.position[0], 0.21, WINDOW_SEAT.position[2]]} castShadow receiveShadow>
        <boxGeometry args={[WINDOW_SEAT.size[0], 0.42, WINDOW_SEAT.size[2]]} />
        <meshStandardMaterial color="#543724" roughness={0.82} />
      </mesh>
      <mesh position={[WINDOW_SEAT.position[0], 0.49, WINDOW_SEAT.position[2]]} castShadow receiveShadow>
        <boxGeometry args={[WINDOW_SEAT.size[0] + 0.04, 0.14, WINDOW_SEAT.size[2] + 0.04]} />
        <meshStandardMaterial color="#70402f" roughness={0.94} />
      </mesh>
      <group position={[0, 0, -1.8]}>
        <mesh position={[0, 2.86, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.62, 8]} />
          <meshStandardMaterial color="#725334" metalness={0.55} roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.48, 0]}>
          <sphereGeometry args={[0.13, 14, 12]} />
          <meshStandardMaterial color="#ffd18a" emissive="#ff9f43" emissiveIntensity={2.2} roughness={0.4} />
        </mesh>
        <pointLight position={[0, 2.42, 0]} color="#ffca82" intensity={18} distance={8} decay={2} />
      </group>
    </>
  );
}

export function Room({ onBookSelected }: { onBookSelected: (book: ShelfBook) => void }) {
  const [showBookSlots, setShowBookSlots] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyB' || event.repeat) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      setShowBookSlots((visible) => !visible);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <color attach="background" args={['#171411']} />
      <fog attach="fog" args={['#171411', 8, 18]} />
      <Lighting />
      <Dust />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
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
      <EastWindow />
      <Doorway />
      <mesh position={[0, ROOM.height, 0]}>
        <boxGeometry args={[ROOM.width, ROOM.wallThickness, ROOM.depth]} />
        <meshStandardMaterial color="#29231d" side={DoubleSide} roughness={0.95} />
      </mesh>
      <LoungeAndWindowSeat />

      {BOOKCASES.map((bookcase, index) => (
        <Bookcase
          key={index}
          kind={bookcase.kind}
          position={bookcase.position}
          rotation={bookcase.rotation}
          scale={bookcase.scale}
        />
      ))}
      <Fireplace />
      <BookSelectionController books={SHELF_BOOKS} onSelect={onBookSelected} />
      <Suspense fallback={null}><BookShelf books={SHELF_BOOKS} /></Suspense>
      {showBookSlots && SHELF_BOOKS.map((book) => (
        <mesh key={`slot-${book.id}`} position={book.position} rotation={[0, book.rotationY, book.lean]}>
          <boxGeometry args={[book.thickness, book.height, book.depth]} />
          <meshBasicMaterial color="#56d9ff" wireframe transparent opacity={0.45} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}
