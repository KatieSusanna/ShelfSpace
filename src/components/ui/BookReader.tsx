'use client';

import type { ShelfBook } from '@/lib/useBookSelection';

export function BookReader({ book, onClose }: { book: ShelfBook; onClose: () => void }) {
  return (
    <div className="reader-backdrop" role="dialog" aria-modal="true" aria-labelledby="reader-title">
      <section className="reader-window">
        <button className="reader-close" type="button" onClick={onClose} aria-label="Close book">×</button>
        <div className="open-book" aria-label={`An open book showing ${book.title}`}>
          <div className="book-page left-page" />
          <div className="book-gutter" />
          <div className="book-page right-page">
            <h1 id="reader-title" className="page-title">{book.title}</h1>
          </div>
        </div>
        <div className="reader-actions">
          <button className="primary-button" type="button" onClick={onClose}>Close book and return to shelf</button>
        </div>
      </section>
    </div>
  );
}
