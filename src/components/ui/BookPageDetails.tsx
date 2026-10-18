'use client';

import { useEffect, useState } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';
import { getBookPageWidthStyle } from '@/lib/bookPageLayout';

export function BookPageDetails({ book }: { book: ShelfBook }) {
  const [pagesReady, setPagesReady] = useState(false);

  useEffect(() => {
    setPagesReady(false);
    const timer = window.setTimeout(() => setPagesReady(true), 350);
    return () => window.clearTimeout(timer);
  }, [book.id]);

  if (!pagesReady) return null;

  return (
    <section className="book-page-details" style={getBookPageWidthStyle(book)} aria-label={`Details for ${book.title}`}>
      <p><span>Title</span> {book.title}</p>
      <p><span>Author</span> {book.author}</p>
      <div className="book-page-description">
        <span>Description</span>
        <div className="book-page-description-text" onWheel={(event) => event.stopPropagation()}>{book.description}</div>
      </div>
    </section>
  );
}
