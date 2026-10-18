'use client';

import { create } from 'zustand';
import type { BookMetadata } from '@/lib/bookMetadata';

type BookMetadataState = {
  metadataByBookId: Record<string, BookMetadata>;
  setBookMetadata: (bookId: string, metadata: BookMetadata) => void;
};

export const useBookMetadata = create<BookMetadataState>((set) => ({
  metadataByBookId: {},
  setBookMetadata: (bookId, metadata) => set((state) => ({
    metadataByBookId: { ...state.metadataByBookId, [bookId]: metadata },
  })),
}));
