// src/pages/visitor/SuccessPage.tsx
// Dedicated success screen after Time-In or Time-Out.
// Reads action data from URL params (no state loss on redirect).
// 3-second countdown with manual "Back to Home" override.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, LogOut, Clock, Home, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();

  const action    = params.get('action') as 'in' | 'out' | null; // 'in' or 'out'
  const name      = params.get('name') ?? '';
  const timeStr   = params.get('time') ?? '';
  const duration  = params.get('duration') ?? '';

  const isTimeIn  = action === 'in';
  const firstName = name ? decodeURIComponent(name).split(' ')[0] : '';

  const [count, setCount] = useState(3);

  // 3-second countdown then auto-redirect
  useEffect(() => {
    if (count <= 0) { navigate('/', { replace: true }); return; }
    const id = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, navigate]);

  const goHome = () => navigate('/', { replace: true });

  return (
    <div className="min-h-screen relative">
      {/* Fixed background — never moves */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/Neu-Lib_Building.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
        aria-hidden
      />
      {/* Fixed overlay */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(160deg,rgba(0,20,80,.82) 0%,rgba(0,50,160,.76) 50%,rgba(0,20,80,.86) 100%)',
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">

          {/* Logo */}
          <div className="text-center">
            <img
              src="/NEU%20Library%20logo.png"
              alt="NEU"
              className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-2xl"
              onError={e => {
                const i = e.currentTarget as HTMLImageElement;
                if (!i.dataset.t) { i.dataset.t = '1'; i.src = '/neu-logo.svg'; }
                else i.style.display = 'none';
              }}
            />
            <h1 className="text-white font-bold text-2xl tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>
              NEU Library
            </h1>
          </div>

          {/* Success card — solid white, fully opaque so text is always readable */}
          <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Coloured top strip */}
            <div className={`h-2 w-full ${isTimeIn ? 'bg-green-500' : 'bg-amber-500'}`} />

            <div className="px-8 py-8 text-center">
              {/* Icon */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
                isTimeIn ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {isTimeIn
                  ? <CheckCircle size={40} className="text-green-500" />
                  : <LogOut     size={36} className="text-amber-500" />}
              </div>

              {/* Headline */}
              <h2 className="text-slate-900 font-black text-xl mb-2 leading-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}>
                {isTimeIn
                  ? 'Welcome to the NEU Library!'
                  : 'Thank You for Visiting!'}
              </h2>

              {/* Sub-message */}
              <p className="text-slate-500 text-sm leading-relaxed mb-1">
                {isTimeIn
                  ? <>Your entry has been recorded{firstName ? `, <strong className="text-slate-700">${firstName}</strong>` : ''}.</>
                  : <>Your exit has been recorded{firstName ? `, ${firstName}` : ''}.</>}
              </p>
              <p className="text-slate-500 text-sm mb-5">
                {isTimeIn ? 'Enjoy your time here!' : 'Have a great day!'}
              </p>

              {/* Time / Duration badge */}
              {timeStr && (
                <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 mb-6 ${
                  isTimeIn
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <Clock size={13} className={isTimeIn ? 'text-green-600' : 'text-amber-600'} />
                  <span className={`font-bold text-sm ${isTimeIn ? 'text-green-700' : 'text-amber-700'}`}>
                    {isTimeIn ? `Time In: ${decodeURIComponent(timeStr)}` : `Time Out: ${decodeURIComponent(timeStr)}`}
                  </span>
                </div>
              )}

              {duration && !isTimeIn && (
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-6 ml-2">
                  <Clock size={13} className="text-slate-500" />
                  <span className="text-slate-600 font-bold text-sm">Duration: {decodeURIComponent(duration)}</span>
                </div>
              )}

              {/* Manual back-to-home button */}
              <button
                onClick={goHome}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm transition-all shadow-md mb-3 ${
                  isTimeIn
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Home size={16} /> Back to Home
              </button>

              {/* Countdown indicator */}
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                {/* Countdown ring */}
                <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                  <circle
                    cx="10" cy="10" r="8" fill="none"
                    stroke={isTimeIn ? '#22C55E' : '#F59E0B'} strokeWidth="2.5"
                    strokeDasharray={`${(count / 3) * 50.27} 50.27`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
                <span>Returning to home in <strong className="text-slate-600">{count}s</strong>…</span>
              </div>
            </div>
          </div>

          {/* Skip link */}
          <button onClick={goHome} className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs font-medium transition-colors">
            Skip <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}