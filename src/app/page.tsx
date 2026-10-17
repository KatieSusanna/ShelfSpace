'use client';

import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { Player } from '@/components/scene/Player';
import { Room } from '@/components/scene/Room';
import { ScanBookButton } from '@/components/ui/scanBookButton';
import { returnBook, type ShelfBook, useSelectionState } from '@/lib/useBookSelection';
import { useReviewStore } from '@/store/reviews';
import { BookBarcodeScanner } from '@/components/ui/BookBarcodeScanner';

function PointerHint() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const updateLock = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', updateLock);
    return () => document.removeEventListener('pointerlockchange', updateLock);
  }, []);
  return locked ? null : <div className="pointer-hint">WASD to move · Ctrl to crouch · click the room to look around · Esc to release</div>;
}

function Crosshair() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const updateLock = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', updateLock);
    return () => document.removeEventListener('pointerlockchange', updateLock);
  }, []);
  return locked ? <div className="aim-crosshair" aria-hidden="true"><i /></div> : null;
}

export default function Home() {
  const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);
  const [returning, setReturning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const savedCount = useReviewStore((state) => Object.keys(state.reviews).length);
  const isTaking = useSelectionState((state) => state.isTaking);
  const onBookSelected = useCallback((book: ShelfBook) => setSelectedBook(book), []);
  const openBookScanner = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setScannedIsbn(null);
    setScannerOpen(true);
  }, []);
  const closePanel = useCallback(() => {
    if (!selectedBook || returning) return;
    setReturning(true);
    returnBook(selectedBook.id, () => { setSelectedBook(null); setReturning(false); });
  }, [returning, selectedBook]);

  useEffect(() => {
    if (!selectedBook) return;
    const returnOnRightClick = (event: MouseEvent) => {
      if (event.button !== 2 || returning) return;
      event.preventDefault();
      event.stopPropagation();
      closePanel();
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    window.addEventListener('pointerdown', returnOnRightClick, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      window.removeEventListener('pointerdown', returnOnRightClick, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [closePanel, returning, selectedBook]);

  return (
    <main className="app-shell">
      <Canvas camera={{ position: [0, 1.7, 3.1], fov: 70 }} dpr={[1, 2]}>
        <Room onBookSelected={onBookSelected} />
        <Player />
      </Canvas>
      <PointerHint />
      <Crosshair />
      {isTaking && <div className="scene-dim" aria-hidden="true" />}
      <div className="book-debug-hint">Press B to show book placement boxes</div>
      <div className="library-status">Reviews saved: {savedCount}</div>
      <ScanBookButton onClick={openBookScanner} />
      {scannerOpen && (
        <BookBarcodeScanner
          onISBN={(isbn) => {
            setScannedIsbn(isbn);
            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {scannedIsbn && (
        <div className="library-status" style={{ top: 124 }}>
          Scanned ISBN: {scannedIsbn}
        </div>
      )}
      {selectedBook && <div className="return-book-prompt">{returning ? 'Returning book to shelf…' : 'Right-click to return book to shelf'}</div>}
    </main>
  );
}
