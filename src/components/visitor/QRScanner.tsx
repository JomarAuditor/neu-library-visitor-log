import { useEffect, useRef, useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Loader2 } from 'lucide-react';

interface Props {
  onResult: (data: string) => void;
  onError?: (err: string) => void;
  active: boolean;
}

export function QRScanner({ onResult, onError, active }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const running    = useRef(false);
  const mounted    = useRef(true);
  const [starting, setStarting] = useState(false);
  const containerId = 'neu-qr-reader';

  const stop = useCallback(async () => {
    if (scannerRef.current && running.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      running.current = false;
    }
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, [stop]);

  useEffect(() => {
    if (!active) { stop(); return; }

    const startScanner = async () => {
      if (!mounted.current) return;
      // Ensure previous instance is stopped
      await stop();
      if (!mounted.current) return;

      setStarting(true);
      try {
        const el = document.getElementById(containerId);
        if (!el) return;

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          if (onError) onError('No camera found. Please allow camera access.');
          setStarting(false);
          return;
        }

        // Prefer back camera on mobile
        const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
        const cameraId = backCam ? backCam.id : { facingMode: 'environment' };

        await scanner.start(
          cameraId as any,
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (decoded) => {
            if (!mounted.current) return;
            onResult(decoded);
            stop();
          },
          (_errMsg) => { /* Ignore per-frame decode errors */ }
        );

        if (mounted.current) {
          running.current = true;
          setStarting(false);
        } else {
          await scanner.stop().catch(() => {});
        }
      } catch (e: any) {
        if (!mounted.current) return;
        setStarting(false);
        const msg = e?.message || String(e);
        if (msg.toLowerCase().includes('permission')) {
          if (onError) onError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
          if (onError) onError('No camera found on this device.');
        } else {
          if (onError) onError('Could not start camera. ' + msg);
        }
      }
    };

    const timer = setTimeout(startScanner, 300);
    return () => { clearTimeout(timer); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div
        id={containerId}
        className="w-full rounded-2xl overflow-hidden bg-gray-900 min-h-[220px] flex items-center justify-center"
      />
      {starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 rounded-2xl">
          <Loader2 size={28} className="animate-spin text-white mb-2" />
          <p className="text-white text-xs font-medium">Starting camera…</p>
        </div>
      )}
    </div>
  );
}
