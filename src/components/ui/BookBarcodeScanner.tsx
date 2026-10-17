'use client';

import { useEffect, useId, useRef, useState } from 'react';

type BookBarcodeScannerProps = {
  onISBN: (isbn: string) => void;
  onClose: () => void;
};

export function BookBarcodeScanner({ onISBN, onClose }: BookBarcodeScannerProps) {
  const generatedId = useId().replace(/:/g, '');
  const readerId = `book-barcode-reader-${generatedId}`;
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const onISBNRef = useRef(onISBN);
  const onCloseRef = useRef(onClose);
  const completedRef = useRef(false);
  const [message, setMessage] = useState('Allow camera access, then point it at the barcode on the back of the book.');

  onISBNRef.current = onISBN;
  onCloseRef.current = onClose;
  console.log('open scanner clicked')

  useEffect(() => {
    let disposed = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (disposed) return;

        const activeScanner = new Html5Qrcode(readerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
          verbose: false,
        });
        scanner = activeScanner;
        scannerRef.current = activeScanner;

        await activeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => ({
              width: Math.floor(Math.min(width * 0.9, 440)),
              height: Math.floor(Math.min(height * 0.48, 180)),
            }),
          },
          (decodedText) => {
            if (completedRef.current) return;
            const isbn = getValidIsbn13(decodedText);
            if (!isbn) {
              setMessage('That barcode is not a valid ISBN-13. Keep scanning or try the barcode on the back cover.');
              return;
            }

            completedRef.current = true;
            setMessage(`ISBN found: ${isbn}`);
            void stopAndClear(activeScanner).then(() => {
              scannerRef.current = null;
              if (!disposed) onISBNRef.current(isbn);
            });
          },
          () => {
          
          },
        );

        if (disposed) await stopAndClear(activeScanner);
      } catch {
        if (!disposed) {
          setMessage('Could not start the camera. Check camera permission and use this page over HTTPS or localhost.');
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    void startScanner();

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner) void stopAndClear(activeScanner);
    };
  }, [readerId]);

  return (
    <div className="book-scanner-backdrop" role="presentation">
      <section className="book-scanner-panel" role="dialog" aria-modal="true" aria-labelledby="book-scanner-title">
        <button className="review-close" type="button" onClick={onClose} aria-label="Close barcode scanner">×</button>
        <p className="panel-eyebrow">Add a volume to the stacks</p>
        <h1 id="book-scanner-title">Scan a book</h1>
        <p className="book-scanner-instructions">Hold the barcode steady inside the frame.</p>
        <div id={readerId} className="book-scanner-reader" />
        <p className="book-scanner-message" aria-live="polite">{message}</p>
        <div className="book-scanner-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function getValidIsbn13(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (!/^97[89]\d{10}$/.test(digits)) return null;

  const checksum = digits
    .slice(0, 12)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  return (10 - (checksum % 10)) % 10 === Number(digits[12]) ? digits : null;
}

async function stopAndClear(scanner: import('html5-qrcode').Html5Qrcode) {
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    // The camera may already have stopped during unmount or a successful scan.
  }
  try {
    scanner.clear();
  } catch {
    // The reader element may already have been removed during unmount.
  }
}
