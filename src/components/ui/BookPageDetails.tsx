'use client';

import { useEffect, useState } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';

export function BookPageDetails({ book }: { book: ShelfBook }) {
  const [pagesReady, setPagesReady] = useState(false);

  useEffect(() => {
    setPagesReady(false);
    const timer = window.setTimeout(() => setPagesReady(true), 1450);
    return () => window.clearTimeout(timer);
  }, [book.id]);

  if (!pagesReady) return null;

  return (
    <section className="book-page-details" aria-label={`Details for ${book.title}`}>
      <p><span>Title</span> {book.title}</p>
      <p><span>Author</span> {book.author}</p>
      <p className="book-page-description"><span>Description</span> {book.description}</p>
    </section>
  );
}
