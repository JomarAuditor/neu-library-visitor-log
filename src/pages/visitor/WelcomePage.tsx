import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, BookOpen, LogIn, LogOut, Timer } from 'lucide-react';
import { format } from 'date-fns';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const action = params.get('action') as 'in' | 'out' | null;
  const name   = params.get('name') ?? 'Student';
  const dur    = params.get('dur');

  const isTimeIn  = action === 'in' || !action;
  const isTimeOut = action === 'out';

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 8000);
    return () => clearTimeout(t);
  }, [navigate]);

  const now = new Date();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: isTimeOut
        ? 'linear-gradient(135deg, #D97706 0%, #92400E 100%)'
        : 'linear-gradient(135deg, #003087 0%, #001A5E 100%)' }}
    >
      {/* Decorative circles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute rounded-full border border-white/[0.06]"
          style={{ width: `${150 + i * 90}px`, height: `${150 + i * 90}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      ))}

      <div className="relative z-10 text-center max-w-sm mx-auto animate-scale-in">
        {/* Logo */}
        <img src="/NEU-Library-logo.png" alt="NEU Library" className="mx-auto mb-5 drop-shadow-lg" style={{ width: 124, height: 'auto' }} />

        {/* Icon */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl
          ${isTimeOut ? 'bg-amber-100' : 'bg-white'}`}
          style={{ animation: 'pulseDot 2.5s ease-in-out infinite' }}>
          {isTimeOut
            ? <LogOut size={46} className="text-amber-600" strokeWidth={2.5} />
            : <CheckCircle2 size={46} className="text-green-500" strokeWidth={2.5} />
          }
        </div>

        {/* Message */}
        {isTimeIn && (
          <>
            <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-1.5 mb-3">
              <LogIn size={13} className="text-white/80" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Time In Recorded</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to NEU Library!</h1>
            <p className="text-white/70 text-base">
              Hello, <span className="font-semibold text-white">{decodeURIComponent(name)}</span>! Enjoy your visit.
            </p>
          </>
        )}

        {isTimeOut && (
          <>
            <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-1.5 mb-3">
              <LogOut size={13} className="text-white/80" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Time Out Recorded</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Thank You!</h1>
            <p className="text-white/70 text-base">
              See you next time, <span className="font-semibold text-white">{decodeURIComponent(name)}</span>!
            </p>
          </>
        )}

        {/* Time info cards */}
        <div className="flex gap-3 justify-center mt-6 mb-5">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
            <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
              <Clock size={11} />
              {isTimeOut ? 'Time Out' : 'Time In'}
            </div>
            <p className="text-white font-bold text-sm">{format(now, 'hh:mm a')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
            <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
              <BookOpen size={11} /> Date
            </div>
            <p className="text-white font-bold text-sm">{format(now, 'MMM dd, yyyy')}</p>
          </div>
          {isTimeOut && dur && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/15">
              <div className="flex items-center gap-1.5 text-white/60 text-[10px] mb-1">
                <Timer size={11} /> Duration
              </div>
              <p className="text-white font-bold text-sm">
                {Number(dur) < 60 ? `${dur}m` : `${Math.floor(Number(dur)/60)}h ${Number(dur)%60}m`}
              </p>
            </div>
          )}
        </div>

        {/* Reminders (only on time in) */}
        {isTimeIn && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/15 text-left mb-5">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Library Reminders</p>
            <ul className="text-white/55 text-xs space-y-1">
              <li>📵 Keep your phone on silent mode</li>
              <li>🤫 Maintain silence in reading areas</li>
              <li>🎒 Leave bags at the baggage counter</li>
              <li>📚 Handle library materials with care</li>
            </ul>
          </div>
        )}

        {/* Loader dots */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
        <p className="text-white/35 text-xs">Redirecting in 8 seconds…</p>
        <button onClick={() => navigate('/', { replace: true })}
          className="mt-3 text-white/50 text-xs hover:text-white/80 transition-colors underline underline-offset-2">
          Skip
        </button>
      </div>
    </div>
  );
}
