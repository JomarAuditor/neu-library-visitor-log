import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props { data: string; size?: number; }

export function QRCodeDisplay({ data, size = 200 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !data) return;
    QRCode.toCanvas(ref.current, data, {
      width: size, margin: 2,
      color: { dark: '#003087', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  }, [data, size]);
  return (
    <div className="inline-block p-4 bg-white rounded-2xl shadow-card border border-neu-border">
      <canvas ref={ref} />
    </div>
  );
}
