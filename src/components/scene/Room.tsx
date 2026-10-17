'use client';

import { Suspense, useEffect, useState } from 'react';
import { Lighting } from './Lighting';
import { BOOKCASES, ROOM } from '@/config/layout';
import { Bookcase } from '@/components/Bookcase';
import { Dust } from './Dust';
import { DoubleSide } from 'three';
import { BookShelf } from './Book';
import { SHELF_BOOKS } from '@/config/books';
import { BookSelectionController } from './BookSelectionController';
import type { ShelfBook } from '@/lib/useBookSelection';

// The room is made from basic boxes so the first scene stays fast and easy to edit.
export function Room({ onBookSelected }: { onBookSelected: (book: ShelfBook) => void }) {
  const wallColor = '#33291f';
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
      <fog attach="fog" args={['#171411', 8, 19]} />
      <Lighting />
      <Dust />

      {/* The room is 12 m wide, 12 m deep, and 4 m high. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#514235" roughness={0.95} />
      </mesh>
      <mesh position={[0, ROOM.height / 2, -ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.width, ROOM.height, ROOM.wallThickness]} />
        <meshStandardMaterial color={wallColor} side={DoubleSide} />
      </mesh>
      <mesh position={[-ROOM.width / 2, ROOM.height / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" side={DoubleSide} />
      </mesh>
      <mesh position={[ROOM.width / 2, ROOM.height / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" side={DoubleSide} />
      </mesh>
      <mesh position={[0, ROOM.height, 0]}>
        <boxGeometry args={[ROOM.width, ROOM.wallThickness, ROOM.depth]} />
        <meshStandardMaterial color="#29231d" side={DoubleSide} />
      </mesh>

      {BOOKCASES.map((bookcase, index) => (
        <Bookcase
          key={index}
          kind={bookcase.kind}
          position={bookcase.position}
          rotation={bookcase.rotation}
          scale={bookcase.scale}
        />
      ))}
      <BookSelectionController books={SHELF_BOOKS} onSelect={onBookSelected} />
      <Suspense fallback={null}><BookShelf books={SHELF_BOOKS} /></Suspense>
      {showBookSlots && SHELF_BOOKS.map((book) => (
        <mesh key={`slot-${book.id}`} position={book.position} rotation={[0, 0, book.lean]}>
          <boxGeometry args={[book.thickness, book.height, book.depth]} />
          <meshBasicMaterial color="#56d9ff" wireframe transparent opacity={0.45} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}
