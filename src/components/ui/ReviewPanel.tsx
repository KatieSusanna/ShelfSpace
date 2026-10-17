'use client';

import { useEffect, useState } from 'react';
import type { ShelfBook } from '@/lib/useBookSelection';
import { useReviewStore } from '@/store/reviews';

export function ReviewPanel({ book, onClose }: { book: ShelfBook; onClose: () => void }) {
  const saved = useReviewStore((state) => state.reviews[book.id]);
  const saveReview = useReviewStore((state) => state.saveReview);
  const [rating, setRating] = useState(saved?.rating ?? 0);
  const [review, setReview] = useState(saved?.review ?? '');

  useEffect(() => {
    setRating(saved?.rating ?? 0);
    setReview(saved?.review ?? '');
  }, [book.id, saved?.rating, saved?.review]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const save = () => { saveReview(book.id, rating, review); onClose(); };
  return (
    <div className="review-backdrop">
      <section className="review-panel" aria-labelledby="review-title">
        <button className="review-close" type="button" onClick={onClose} aria-label="Close review">×</button>
        <p className="panel-eyebrow">A book from the stacks</p>
        <h1 id="review-title">{book.title}</h1>
        <p className="panel-author">by {book.author}</p>
        <label className="field-label">Your rating</label>
        <div className="star-row" role="radiogroup" aria-label="Rating from 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} star${star === 1 ? '' : 's'}`} className={star <= rating ? 'star selected' : 'star'} onClick={() => setRating(star)}>★</button>
          ))}
        </div>
        <label className="field-label" htmlFor="book-review">Your review</label>
        <textarea id="book-review" rows={5} value={review} onChange={(event) => setReview(event.target.value)} placeholder="What did you think of this book?" />
        <div className="review-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
          <button className="primary-button" type="button" onClick={save} disabled={rating === 0}>Save review</button>
        </div>
      </section>
    </div>
  );
}
