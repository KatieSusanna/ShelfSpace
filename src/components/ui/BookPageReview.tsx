'use client';

import { useEffect, useState } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';
import { useReviewStore } from '@/store/reviews';

export function BookPageReview({ book }: { book: ShelfBook }) {
  const [pagesReady, setPagesReady] = useState(false);
  const saved = useReviewStore((state) => state.reviews[book.id]);
  const saveReview = useReviewStore((state) => state.saveReview);
  const [rating, setRating] = useState(saved?.rating ?? 0);
  const [review, setReview] = useState(saved?.review ?? '');

  useEffect(() => {
    setRating(saved?.rating ?? 0);
    setReview(saved?.review ?? '');
  }, [book.id, saved?.rating, saved?.review]);

  useEffect(() => {
    setPagesReady(false);
    const timer = window.setTimeout(() => setPagesReady(true), 1100);
    return () => window.clearTimeout(timer);
  }, [book.id]);

  const updateRating = (value: number) => {
    setRating(value);
    saveReview(book.id, value, review);
  };
  const updateReview = (value: string) => {
    setReview(value);
    saveReview(book.id, rating, value);
  };

  if (!pagesReady) return null;

  return (
    <section className="book-page-review" aria-label={`Rate and review ${book.title}`}>
      <label className="book-page-review-title">Rating</label>
      <div className="book-page-stars" role="radiogroup" aria-label="Choose a rating out of five stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} out of 5 stars`} onClick={() => updateRating(star)}>
            <span className={star <= rating ? 'selected' : ''}>★</span>
          </button>
        ))}
      </div>
      <label className="book-page-review-title" htmlFor="book-page-review-text">Review</label>
      <textarea
        id="book-page-review-text"
        maxLength={280}
        rows={6}
        value={review}
        onChange={(event) => updateReview(event.target.value)}
        placeholder="Write a short paragraph..."
      />
    </section>
  );
}
