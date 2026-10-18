'use client';

import { useEffect, useState } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';
import { getBookPageWidthStyle } from '@/lib/bookPageLayout';
import { useBookMetadata } from '@/store/bookMetadata';

export function BookPageDetails({ book }: { book: ShelfBook }) {
  const [pagesReady, setPagesReady] = useState(false);
  const scanned = useBookMetadata((state) => state.metadataByBookId[book.id]);

  useEffect(() => {
    setPagesReady(false);
    const timer = window.setTimeout(() => setPagesReady(true), 350);
    return () => window.clearTimeout(timer);
  }, [book.id]);

  if (!pagesReady || !scanned?.title) return null;

  const title = scanned.title;
  const authors = scanned.authors.join('; ');
  const description = scanned.description;

  return (
    <section className="book-page-details" style={getBookPageWidthStyle(book)} aria-label={`Details for ${title}`}>
      <p><span>Title</span> {title}</p>
      {authors && <p><span>Author</span> {authors}</p>}
      {scanned.publishDate && <p><span>Publication date</span> {scanned.publishDate}</p>}
      {scanned.pages && <p><span>Pages</span> {scanned.pages}</p>}
      {description && <div className="book-page-description">
        <span>Description</span>
        <div className="book-page-description-text" onWheel={(event) => event.stopPropagation()}>{description}</div>
      </div>}
    </section>
  );
}
