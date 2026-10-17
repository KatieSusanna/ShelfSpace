'use client';

import { useBookSelection, type ShelfBook } from '@/lib/useBookSelection';

export function BookSelectionController({ books, onSelect }: { books: ShelfBook[]; onSelect: (book: ShelfBook) => void }) {
  useBookSelection(onSelect, books);
  return null;
}
