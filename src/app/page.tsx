'use client';

import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { Player } from '@/components/scene/Player';
import { Room } from '@/components/scene/Room';
import { returnBook, type ShelfBook, useSelectionState } from '@/lib/useBookSelection';
import type { BookMetadata } from '@/lib/bookMetadata';
import { useBookMetadata } from '@/store/bookMetadata';
import { BookBarcodeScanner } from '@/components/ui/BookBarcodeScanner';

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const setBookMetadata = useBookMetadata((state) => state.setBookMetadata);
  const isTaking = useSelectionState((state) => state.isTaking);
  const heldBookId = useSelectionState((state) => state.heldBookId);
  const heldBook = heldBookId !== null;
  const openBook = useSelectionState((state) => state.openBookId !== null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/bookSave')
      .then(async (response) => response.ok ? await response.json() as (BookMetadata & { bookId: string })[] : [])
      .then((savedBooks) => {
        if (cancelled) return;
        for (const saved of savedBooks) {
          if (!useBookMetadata.getState().metadataByBookId[saved.bookId]) {
            const { bookId, ...metadata } = saved;
            setBookMetadata(bookId, metadata);
          }
        }
      })
      .catch((error) => console.error('Could not load saved book metadata:', error));
    return () => { cancelled = true; };
  }, [setBookMetadata]);

  const onBookSelected = useCallback((book: ShelfBook) => {
    setSelectedBook(book);
    setSaveError(null);
    void fetch(`/api/bookSave?bookId=${encodeURIComponent(book.id)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as BookMetadata;
      })
      .then((metadata) => {
        if (metadata && !useBookMetadata.getState().metadataByBookId[book.id]) setBookMetadata(book.id, metadata);
      })
      .catch((error) => console.error('Could not load saved book metadata:', error));
  }, [setBookMetadata]);
  const openBookScanner = useCallback(() => {
    if (!selectedBook) return;
    if (document.pointerLockElement) document.exitPointerLock();
    setScannerOpen(true);
  }, [selectedBook]);
  useEffect(() => {
    if (!heldBook || !selectedBook || scannerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'b') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      openBookScanner();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [heldBook, openBookScanner, scannerOpen, selectedBook]);
  const onBookScanned = useCallback((bookId: string, metadata: BookMetadata) => {
    setBookMetadata(bookId, metadata);
    setScannerOpen(false);
  }, [setBookMetadata]);
  const closePanel = useCallback(() => {
    if (!selectedBook || returning) return;
    const bookId = selectedBook.id;
    setReturning(true);
    returnBook(bookId, () => {
      const metadata = useBookMetadata.getState().metadataByBookId[bookId];
      if (metadata) {
        void fetch('/api/bookSave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, metadata }),
        }).then(async (response) => {
          if (!response.ok) {
            const result = await response.json().catch(() => null);
            throw new Error(result?.error ?? 'Could not save this book to books.csv.');
          }
        }).catch((error) => {
          console.error('Could not save scanned book:', error);
          setSaveError(error instanceof Error ? error.message : 'Could not save this book to books.csv.');
        });
      }
      setSelectedBook(null);
      setReturning(false);
    });
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
      <Crosshair />
      {!scannerOpen && <div className={`return-book-prompt${heldBook && !isTaking ? ' return-book-prompt--right' : ''}`} aria-live="polite">
        {returning ? 'Returning book to the shelf…' : isTaking ? 'Picking up book…' : heldBook ? openBook ? 'Right-click to return the book to the shelf' : 'Right-click to return the book · Left-click to see inside' : 'Aim at a book and left-click to pick it up'}
      </div>}
      {saveError && <div className="library-status" role="alert">{saveError}</div>}
      {heldBook && selectedBook && scannerOpen && (
        <BookBarcodeScanner
          bookId={selectedBook.id}
          onBookScanned={onBookScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </main>
  );
}
