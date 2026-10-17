'use client';

import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { Player } from '@/components/scene/Player';
import { Room } from '@/components/scene/Room';
import { ScanBookButton } from '@/components/ui/scanBookButton';
import { returnBook, type ShelfBook, useSelectionState } from '@/lib/useBookSelection';
import { useReviewStore } from '@/store/reviews';
import { BookBarcodeScanner } from '@/components/ui/BookBarcodeScanner';
import { BookPageReview } from '@/components/ui/BookPageReview';

function PointerHint() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const updateLock = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', updateLock);
    return () => document.removeEventListener('pointerlockchange', updateLock);
  }, []);
  return locked ? null : <div className="pointer-hint">Click the room to aim. The circle in the middle highlights a book; left-click to pick it up.</div>;
}

function Crosshair() {
  const [locked, setLocked] = useState(false);
  const hoveringBook = useSelectionState((state) => state.hoveredId !== null);
  const showingBook = useSelectionState((state) => state.heldBookId !== null || state.isTaking);
  useEffect(() => {
    const updateLock = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', updateLock);
    return () => document.removeEventListener('pointerlockchange', updateLock);
  }, []);
  return locked && !showingBook ? <div className={`aim-crosshair${hoveringBook ? ' aim-crosshair--book' : ''}`} aria-hidden="true"><i /></div> : null;
}

export default function Home() {
  const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);
  const [returning, setReturning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const savedCount = useReviewStore((state) => Object.keys(state.reviews).length);
  const isTaking = useSelectionState((state) => state.isTaking);
  const heldBook = useSelectionState((state) => state.heldBookId !== null);
  const openBookId = useSelectionState((state) => state.openBookId);
  const bookIsActive = isTaking || heldBook || selectedBook !== null;
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
      <Canvas camera={{ position: [0, 1.7, 3.1], fov: 70 }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <Room onBookSelected={onBookSelected} />
        <Player />
      </Canvas>
      {selectedBook && openBookId === selectedBook.id && <BookPageReview book={selectedBook} />}
      {!bookIsActive && <PointerHint />}
      <Crosshair />
      {!bookIsActive && <div className="book-debug-hint">Press B to show book placement boxes</div>}
      {!bookIsActive && <div className="library-status">Reviews saved: {savedCount}</div>}
      {!bookIsActive && <ScanBookButton onClick={openBookScanner} />}
      {!bookIsActive && scannerOpen && (
        <BookBarcodeScanner
          onISBN={(isbn) => {
            setScannedIsbn(isbn);
            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {!bookIsActive && scannedIsbn && (
        <div className="library-status" style={{ top: 124 }}>
          Scanned ISBN: {scannedIsbn}
        </div>
      )}
    </main>
  );
}
