// =====================================================================
// NEU Library Visitor Log System
// Welcome / Goodbye Confirmation Page
// File: src/pages/visitor/WelcomePage.tsx
// =====================================================================
// FIXES:
//   - Redirect is now 3 SECONDS (was 8 seconds)
//   - Live countdown circle shows remaining seconds
//   - NEU Library logo.png shown from public folder
//   - No arrow characters anywhere
//   - Works for both Time In and Time Out screens
// =====================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, BookOpen, LogIn, LogOut, Timer } from 'lucide-react';
import { format } from 'date-fns';

// Change this constant to adjust the redirect delay (in seconds)
const REDIRECT_SECONDS = 3;

export default function WelcomePage() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();

  const action    = params.get('action') as 'in' | 'out' | null;
  const name      = decodeURIComponent(params.get('name') ?? 'Student');
  const dur       = params.get('dur');

  const isTimeIn  = action === 'in' || !action;
  const isTimeOut = action === 'out';

  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // Live countdown, then redirect to kiosk home
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const now = new Date();

  const formatDuration = (mins: string | null): string | null => {
    if (!mins) return null;
    const m = Number(mins);
    if (m < 60) return `${m}m`;
    const h   = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const formattedDuration = formatDuration(dur);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{
        background: isTimeOut
          ? 'linear-gradient(135deg, #D97706 0%, #92400E 100%)'
          : 'linear-gradient(135deg, #003087 0%, #001A5E 100%)',
      }}
    >
      {/* Decorative concentric rings */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/[0.06]"
          style={{
            width:     `${150 + i * 90}px`,
            height:    `${150 + i * 90}px`,
            top:       '50%',
            left:      '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      <div className="relative z-10 text-center max-w-sm mx-auto animate-scale-in">

        {/* NEU Library logo from public folder */}
        <img
          src="/NEU%20Library%20logo.png"
          alt="NEU Library"
          className="h-20 w-auto object-contain mx-auto mb-5 drop-shadow-2xl"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Status pill */}
        <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-1.5 mb-4">
          {isTimeIn
            ? <LogIn  size={13} className="text-white/80" />
            : <LogOut size={13} className="text-white/80" />}
          <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
            {isTimeIn ? 'Time In Recorded' : 'Time Out Recorded'}
          </span>
        </div>

        {/* Check / Logout icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl ${
            isTimeOut ? 'bg-amber-100' : 'bg-white'
          }`}
        >
          {isTimeOut
            ? <LogOut       size={40} className="text-amber-600"  strokeWidth={2.5} />
            : <CheckCircle2 size={40} className="text-green-500" strokeWidth={2.5} />}
        </div>

        {/* Greeting text */}
        {isTimeIn && (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to NEU Library!</h1>
            <p className="text-white/70 text-base">
              Hello, <span className="font-semibold text-white">{name}</span>! Enjoy your visit.
            </p>
          </>
        )}
        {isTimeOut && (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">Thank You!</h1>
            <p className="text-white/70 text-base">
              See you next time, <span className="font-semibold text-white">{name}</span>!
            </p>
          </>
        )}

        {/* Info cards: Time, Date, Duration */}
        <div className="flex gap-3 justify-center mt-6 mb-5 flex-wrap">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
            <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
              <Clock size={11} />
              {isTimeOut ? 'Time Out' : 'Time In'}
            </div>
            <p className="text-white font-bold text-sm">{format(now, 'hh:mm a')}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
            <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
              <BookOpen size={11} />Date
            </div>
            <p className="text-white font-bold text-sm">{format(now, 'MMM dd, yyyy')}</p>
          </div>

          {isTimeOut && formattedDuration && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
              <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
                <Timer size={11} />Duration
              </div>
              <p className="text-white font-bold text-sm">{formattedDuration}</p>
            </div>
          )}
        </div>

        {/* Library reminders -- shown only on Time In */}
        {isTimeIn && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/15 text-left mb-5">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">
              Library Reminders
            </p>
            <ul className="text-white/55 text-xs space-y-1.5">
              <li>&#128244; Keep your phone on silent mode</li>
              <li>&#129310; Maintain silence in reading areas</li>
              <li>&#127874; Leave bags at the baggage counter</li>
              <li>&#128218; Handle library materials with care</li>
            </ul>
          </div>
        )}

        {/* Countdown circle + redirect text */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center"
            style={{ boxShadow: '0 0 0 3px rgba(255,255,255,0.08)' }}
          >
            <span className="text-white font-bold text-base tabular-nums">{countdown}</span>
          </div>
          <p className="text-white/40 text-xs">
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        </div>

        <button
          onClick={() => navigate('/', { replace: true })}
          className="text-white/50 text-xs hover:text-white/80 transition-colors underline underline-offset-2"
        >
          Skip
        </button>
      </div>
    </div>
  );
}