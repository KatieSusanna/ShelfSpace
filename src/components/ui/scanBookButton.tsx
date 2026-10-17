'use client';

type ScanBookButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
};

export function ScanBookButton({ onClick, disabled = false }: ScanBookButtonProps) {
  return (
    <button
      className="scan-book-button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Scan a book barcode"
    >
      <svg className="scan-book-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
        <path d="M7 9v6m3-6v6m2-6v6m3-6v6m2-6v6" />
      </svg>
      <span className="scan-book-copy">
        <span className="scan-book-label">Scan a book</span>
        <span className="scan-book-caption">Add it to your shelves</span>
      </span>
      <span className="scan-book-arrow" aria-hidden="true">→</span>
    </button>
  );
}
