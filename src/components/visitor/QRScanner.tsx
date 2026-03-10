import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onResult: (data: string) => void;
  onError?: (err: string) => void;
  active: boolean;
}

export function QRScanner({ onResult, onError, active }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const running    = useRef(false);
  const id         = 'neu-qr-reader';

  const stop = useCallback(async () => {
    if (scannerRef.current && running.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) {}
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }

    const start = async () => {
      try {
        scannerRef.current = new Html5Qrcode(id);
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decodedText /*, decodedResult */) => { onResult(decodedText); stop(); },
          (errMsg)  => {
            // Ignore benign library-level not-found messages (camera noise, frames without codes)
            const ignore = [
              'No QR code found',
              'No MultiFormat Readers were able to detect the code',
              'NotFoundException',
            ];
            if (onError && !ignore.some(i => errMsg.includes(i))) onError(errMsg);
          }
        );
        running.current = true;
      } catch (e) {
        if (onError) onError(String(e));
      }
    };

    const t = setTimeout(start, 250);
    return () => { clearTimeout(t); stop(); };
  }, [active, onResult, onError, stop]);

  return <div id={id} className="w-full rounded-2xl overflow-hidden bg-gray-50" />;
}
