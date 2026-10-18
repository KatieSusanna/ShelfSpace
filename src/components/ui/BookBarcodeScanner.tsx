'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { BookMetadata } from '@/lib/bookMetadata';

type BookBarcodeScannerProps = {
  bookId: string;
  onBookScanned: (bookId: string, metadata: BookMetadata) => void;
  onClose: () => void;
};

type CaptureMode = 'barcode' | 'cover';

export function BookBarcodeScanner({ bookId, onBookScanned, onClose }: BookBarcodeScannerProps) {
  const generatedId = useId().replace(/:/g, '');
  const readerId = `book-barcode-reader-${generatedId}`;
  const [mode, setMode] = useState<CaptureMode>('barcode');
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const onBookScannedRef = useRef(onBookScanned);
  const onCloseRef = useRef(onClose);
  const completedRef = useRef(false);
  const [message, setMessage] = useState('');

  onBookScannedRef.current = onBookScanned;
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (disposed) return;

        const activeScanner = new Html5Qrcode(readerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
          verbose: false,
        });
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
            setMessage('ISBN found. Looking up book details…');
            void (async () => {
              try {
                const response = await fetch('/api/bookRetreival', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isbn }),
                });
                const result = await response.json().catch(() => null);
                if (!response.ok) throw new Error(result?.error ?? 'Book details could not be found.');

                await stopAndClear(activeScanner);
                scannerRef.current = null;
                if (!disposed) onBookScannedRef.current(bookId, result as BookMetadata);
              } catch (error) {
                completedRef.current = false;
                if (!disposed) setMessage(error instanceof Error ? error.message : 'Book lookup failed. Try scanning again.');
              }
            })();
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

    void startScanner();

    return () => {
      disposed = true;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner) void stopAndClear(activeScanner);
    };
  }, [bookId, mode, readerId]);

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
            Scan barcode
          </button>
          <button
            className={`capture-mode-tab${mode === 'cover' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={mode === 'cover'}
            onClick={() => setMode('cover')}
          >
            Use cover photo
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
          <CoverCapture bookId={bookId} onBookScanned={onBookScannedRef.current} />
        )}
        <div className="book-scanner-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function CoverCapture({
  bookId,
  onBookScanned,
}: {
  bookId: string;
  onBookScanned: BookBarcodeScannerProps['onBookScanned'];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognising, setRecognising] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState('');
  const captureTimerRef = useRef<number | null>(null);
  const recognitionAbortRef = useRef<AbortController | null>(null);

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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          if (!disposed) setCameraReady(true);
        }
      } catch {
        if (!disposed) {
          setError('Could not start the camera. Check camera permission and use this page over HTTPS or localhost.');
        }
      }
    };

    void startCamera();
    return () => {
      disposed = true;
      if (captureTimerRef.current !== null) window.clearInterval(captureTimerRef.current);
      recognitionAbortRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const captureCover = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('The camera is not ready yet. Try again in a moment.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not capture the cover image. Please try again.');
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(image);
    return image;
  };

  const recogniseCover = async (image = capturedImage) => {
    if (!image || recognising) return;
    setRecognising(true);
    setError('');
    const controller = new AbortController();
    recognitionAbortRef.current = controller;

    try {
      const response = await fetch('/api/recogniseCover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Could not identify this book. Try another cover photo.');

      onBookScanned(bookId, result as BookMetadata);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not identify this book. Try again.');
      setRecognising(false);
    } finally {
      if (recognitionAbortRef.current === controller) recognitionAbortRef.current = null;
    }
  };

  const retakeCover = () => {
    recognitionAbortRef.current?.abort();
    recognitionAbortRef.current = null;
    setRecognising(false);
    setCapturedImage(null);
    setError('');
  };

  const startCapture = () => {
    if (!cameraReady || recognising || countdown !== null) return;
    setError('');
    setCountdown(3);
    captureTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null || current <= 1) {
          if (captureTimerRef.current !== null) window.clearInterval(captureTimerRef.current);
          captureTimerRef.current = null;
          window.setTimeout(() => {
            const image = captureCover();
            if (image) void recogniseCover(image);
          }, 0);
          return null;
        }
        return current - 1;
      });
    }, 1000);
  };

  return (
    <div className="cover-capture">
      <h1 id="book-scanner-title">Add a book from its cover</h1>
      <p className="book-scanner-instructions">Fit the whole front cover inside the frame, then tap capture. You’ll have three seconds to line it up.</p>
      <div className="cover-camera-frame">
        <video ref={videoRef} className="book-scanner-reader cover-camera" autoPlay muted playsInline />
        <span className="cover-frame-guide" aria-hidden="true" />
        <span className="cover-camera-tip">Keep the full cover in view</span>
        {countdown !== null && <div className="cover-countdown" aria-live="assertive">{countdown}</div>}
      </div>
      <div className="cover-capture-actions">
        <button className="primary-button" type="button" onClick={startCapture} disabled={!cameraReady || recognising || countdown !== null}>
          {recognising ? <><span className="scanner-spinner" aria-hidden="true" /> Loading…</> : countdown !== null ? `Hold still… ${countdown}` : cameraReady ? 'Capture cover' : 'Starting camera…'}
        </button>
        {capturedImage && <button className="secondary-button" type="button" onClick={retakeCover}>Retake</button>}
      </div>
      {capturedImage && <img className="cover-capture-preview" src={capturedImage} alt="Captured book cover preview" />}
      {error && <p className="scanner-error" role="alert">{error}</p>}
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
