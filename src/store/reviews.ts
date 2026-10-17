'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type BookReview = { rating: number; review: string };

type ReviewState = {
  reviews: Record<string, BookReview>;
  saveReview: (bookId: string, rating: number, review: string) => void;
};

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      reviews: {},
      saveReview: (bookId, rating, review) =>
        set((state) => ({ reviews: { ...state.reviews, [bookId]: { rating, review } } })),
    }),
    { name: 'library-reviews', storage: createJSONStorage(() => localStorage) },
  ),
);
