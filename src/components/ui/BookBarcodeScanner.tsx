'use client';

import { useEffect, useId, useRef, useState } from 'react';

type BookBarcodeScannerProps = {
  onISBN: (isbn: string) => void;
  onClose: () => void;
};

type CaptureMode = 'barcode' | 'cover';

export function BookBarcodeScanner({ onISBN, onClose }: BookBarcodeScannerProps) {
  const generatedId = useId().replace(/:/g, '');
  const readerId = `book-barcode-reader-${generatedId}`;
  const [mode, setMode] = useState<CaptureMode>('barcode');
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const onISBNRef = useRef(onISBN);
  const onCloseRef = useRef(onClose);
  const completedRef = useRef(false);
  const [message, setMessage] = useState('');

  onISBNRef.current = onISBN;
  onCloseRef.current = onClose;
  console.log('open scanner clicked')

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage('');
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);


  useEffect(() => {
    if (mode !== 'barcode') return;

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
            void fetch('/api/bookRetreival', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ isbn }),
            });

            setMessage('ISBN found.');
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
  }, [mode, readerId]);

  return (
    <div className="book-scanner-backdrop" role="presentation">
      <section className="book-scanner-panel" role="dialog" aria-modal="true" aria-labelledby="book-scanner-title">
        <button className="review-close" type="button" onClick={onClose} aria-label="Close barcode scanner">×</button>
        <div className="capture-mode-tabs" role="tablist" aria-label="Choose how to add a book">
          <button
            className={`capture-mode-tab${mode === 'barcode' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={mode === 'barcode'}
            onClick={() => setMode('barcode')}
          >
            Barcode scanner
          </button>
          <button
            className={`capture-mode-tab${mode === 'cover' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={mode === 'cover'}
            onClick={() => setMode('cover')}
          >
            Cover recogniser
          </button>
        </div>
        <p className="panel-eyebrow">Add a volume to the stacks</p>
        {mode === 'barcode' ? (
          <>
            <h1 id="book-scanner-title">Scan a book</h1>
            <p className="book-scanner-instructions">Hold the barcode steady inside the frame.</p>
            <div id={readerId} className="book-scanner-reader" />
            <p className="book-scanner-message" aria-live="polite">{message}</p>
          </>
        ) : (
          <CoverCapture />
        )}
        <div className="book-scanner-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function CoverCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [message, setMessage] = useState('Position the full front cover in view, then capture it.');

  useEffect(() => {
    let disposed = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!disposed) {
          setMessage('Could not start the camera. Check camera permission and use this page over HTTPS or localhost.');
        }
      }
    };

    void startCamera();
    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const captureCover = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage('The camera is not ready yet. Try again in a moment.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setMessage('Could not capture the cover image.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    setMessage('Cover captured. AI recognition will be connected here next.');
  };

  return (
    <div className="cover-capture">
      <h1 id="book-scanner-title">Recognise a book cover</h1>
      <p className="book-scanner-instructions">Show the full front cover in good light. Keep it upright and fill most of the frame.</p>
      <video ref={videoRef} className="book-scanner-reader cover-camera" autoPlay muted playsInline />
      <div className="cover-capture-actions">
        <button className="primary-button" type="button" onClick={captureCover}>Capture cover</button>
        {capturedImage && (
          <button className="secondary-button" type="button" onClick={() => {
            setCapturedImage(null);
            setMessage('Position the full front cover in view, then capture it.');
          }}>Retake</button>
        )}
      </div>
      {capturedImage && <img className="cover-capture-preview" src={capturedImage} alt="Captured book cover preview" />}
      <p className="book-scanner-message" aria-live="polite">{message}</p>
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
