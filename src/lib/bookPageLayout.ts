import type { CSSProperties } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';

const HELD_BOOK_SCALE = 2.2;
const CAMERA_DISTANCE = 0.72;
const CAMERA_FOV = (70 * Math.PI) / 180;
const PROJECTION_DEPTH = 2 * CAMERA_DISTANCE * Math.tan(CAMERA_FOV / 2);

export function getBookPageWidthStyle(book: ShelfBook): CSSProperties & { '--book-page-width': string; '--book-page-height': string } {
  const pageWidth = book.depth * HELD_BOOK_SCALE;
  const pageHeight = 0.3 * HELD_BOOK_SCALE;
  return {
    '--book-page-width': `${(pageWidth / PROJECTION_DEPTH) * 100}vh`,
    '--book-page-height': `${(pageHeight / PROJECTION_DEPTH) * 100}vh`,
  };
}

export function getBookPageDistanceFactor(viewportHeight: number): number {
  return (PROJECTION_DEPTH * 400) / (viewportHeight * HELD_BOOK_SCALE);
}
