// =====================================================================
// NEU Library Visitor Log System
// Student Registration Page
// File: src/pages/visitor/StudentRegister.tsx
// =====================================================================
// FIXES:
//   - Duplicate email shows: "This email is already registered."
//   - Duplicate student number shows: "This student number is already registered."
//   - Both duplicates show errors instead of silently showing the QR
//   - Custom dropdown replaces native <select> (no giant browser popup)
//   - Dropdown has max-height scroll -- clean compact UI
//   - No arrow characters
// =====================================================================

import { useState, FormEvent, useRef, useEffect } from 'react';
import {
  Loader2, UserPlus, QrCode, Download,
  ArrowLeft, CheckCircle2, AlertCircle, ChevronDown, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeDisplay } from '@/components/visitor/QRCodeDisplay';
import { useColleges, usePrograms } from '@/hooks/useStats';
import {
  validateNEUEmail,
  encodeQR,
  validateStudentNumber,
  formatStudentNumber,
  studentNumberHint,
} from '@/lib/utils';

type Step = 'form' | 'done';

interface FormState {
  name:      string;
  email:     string;
  sn:        string;
  collegeId: number | null;
  programId: number | null;
}

// ── Custom scrollable dropdown ────────────────────────────────────────
// Replaces native <select> so the list is compact and scrollable
// instead of opening a giant browser-native popup
interface DropdownOption {
  id:    number;
  label: string;
}

interface CustomDropdownProps {
  options:     DropdownOption[];
  value:       number | null;
  onChange:    (id: number | null) => void;
  placeholder: string;
  disabled?:   boolean;
  loading?:    boolean;
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  loading  = false,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.id === value) ?? null;

  // Close when clicking outside
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const handlePick = (opt: DropdownOption) => {
    onChange(opt.id);
    setOpen(false);
  };

  const handleToggle = () => {
    if (!disabled && !loading) setOpen(prev => !prev);
  };

  return (
    <div ref={wrapRef} className="relative">

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between gap-2
          px-3.5 py-2.5 rounded-xl border text-sm text-left
          transition-all duration-150 bg-white
          ${disabled
            ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
            : open
              ? 'border-neu-blue ring-2 ring-neu-blue/15'
              : 'border-neu-border hover:border-neu-blue/40'
          }
        `}
      >
        <span className={selected ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {loading
            ? 'Loading...'
            : selected
              ? selected.label
              : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-neu-blue' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Dropdown list -- max 280px tall, scrollable */}
      {open && options.length > 0 && (
        <div
          className="
            absolute left-0 right-0 top-full mt-1.5 z-50
            bg-white border border-neu-border rounded-xl
            shadow-[0_8px_30px_rgba(0,0,0,0.12)]
            overflow-y-auto
          "
          style={{ maxHeight: '280px' }}
        >
          {options.map(opt => {
            const isActive = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePick(opt)}
                className={`
                  w-full flex items-center justify-between gap-3
                  px-4 py-2.5 text-left text-sm leading-snug
                  transition-colors duration-100
                  ${isActive
                    ? 'bg-neu-light text-neu-blue font-semibold'
                    : 'text-slate-700 hover:bg-neu-gray hover:text-slate-900'
                  }
                `}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <Check size={13} className="shrink-0 text-neu-blue" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Registration Component ───────────────────────────────────────
export default function StudentRegister() {
  const [step,    setStep]    = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [qrData,  setQrData]  = useState('');
  const [regName, setRegName] = useState('');

  const [form, setForm] = useState<FormState>({
    name: '', email: '', sn: '', collegeId: null, programId: null,
  });

  const snHint = studentNumberHint(form.sn);

  // Fetch colleges + programs from normalized DB
  const { data: colleges = [], isLoading: collegesLoading } = useColleges();
  const { data: programs = [], isLoading: programsLoading } = usePrograms(form.collegeId);

  const collegeOptions: DropdownOption[] = colleges.map(c => ({ id: c.id, label: c.name }));
  const programOptions: DropdownOption[] = programs.map(p => ({ id: p.id, label: p.name }));

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setError('');
    if (k === 'collegeId') {
      // Always reset programId when college changes
      setForm(prev => ({ ...prev, collegeId: v as number | null, programId: null }));
    } else {
      setForm(prev => ({ ...prev, [k]: v }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // ── Frontend validation ───────────────────────────────────────────
    if (!form.name.trim())               { setError('Full name is required.'); return; }
    if (!validateNEUEmail(form.email))   { setError('Please use your @neu.edu.ph email address.'); return; }
    if (!form.sn.trim())                 { setError('Student number is required.'); return; }
    if (!validateStudentNumber(form.sn)) { setError('Invalid format. Must be: YY-NNNNN-NNN (e.g. 24-13005-502)'); return; }
    if (!form.collegeId)                 { setError('Please select your college.'); return; }
    if (!form.programId)                 { setError('Please select your program.'); return; }

    setLoading(true);
    try {
      const emailLc = form.email.toLowerCase().trim();
      const snClean = form.sn.trim();

      // ── Check email duplicate FIRST ──────────────────────────────
      const { data: emailCheck } = await supabase
        .from('students')
        .select('id')
        .eq('email', emailLc)
        .maybeSingle();

      if (emailCheck) {
        setError(
          'This email is already registered. Please log in at the library kiosk instead.'
        );
        setLoading(false);
        return;
      }

      // ── Check student number duplicate ───────────────────────────
      const { data: snCheck } = await supabase
        .from('students')
        .select('id')
        .eq('student_number', snClean)
        .maybeSingle();

      if (snCheck) {
        setError(
          'This student number is already registered. Please log in at the library kiosk instead.'
        );
        setLoading(false);
        return;
      }

      // ── No duplicates -- create new student ──────────────────────
      const qr = encodeQR(emailLc, snClean);

      const { error: insertError } = await supabase.from('students').insert({
        name:           form.name.trim(),
        email:          emailLc,
        student_number: snClean,
        program_id:     form.programId,
        qr_code_data:   qr,
        is_blocked:     false,
      });

      if (insertError) {
        // Fallback for race conditions (two users register at the exact same second)
        if (insertError.code === '23505') {
          if (insertError.message.includes('email')) {
            setError('This email is already registered. Please log in at the kiosk.');
          } else if (insertError.message.includes('student_number')) {
            setError('This student number is already registered. Please log in at the kiosk.');
          } else {
            setError('This account already exists. Please log in at the kiosk instead.');
          }
        } else if (insertError.code === '23514') {
          setError('Invalid student number format. Must be: YY-NNNNN-NNN');
        } else {
          setError('Registration failed: ' + insertError.message);
        }
        return;
      }

      // Success
      setQrData(qr);
      setRegName(form.name.trim());
      setStep('done');

    } catch (err: any) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a      = document.createElement('a');
    a.href       = canvas.toDataURL('image/png');
    a.download   = `NEU_Library_QR_${form.sn || 'student'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-lg hover:bg-neu-light text-slate-400 hover:text-neu-blue transition-all"
            aria-label="Back to login"
          >
            <ArrowLeft size={18} />
          </a>
          <img
            src="/NEU%20Library%20logo.png"
            alt="NEU Library"
            className="h-10 w-auto object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">
              Student Registration
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Get your library QR code</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">

          {/* ──────────────────────────────────────────────────────── */}
          {/* FORM STEP                                                */}
          {/* ──────────────────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="animate-fade-up">

              {/* Title */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-neu-blue flex items-center justify-center mx-auto mb-3 shadow-card-md">
                  <UserPlus size={24} className="text-white" />
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
                  Register for Library Access
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill in your details to generate a unique QR code
                </p>
              </div>

              <div className="card-p">

                {/* Error banner */}
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Full Name */}
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Juan dela Cruz"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* NEU Email */}
                  <div>
                    <label className="label">NEU Email Address</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="yourname@neu.edu.ph"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Must be your official @neu.edu.ph email
                    </p>
                  </div>

                  {/* Student Number */}
                  <div>
                    <label className="label">Student Number</label>
                    <input
                      type="text"
                      className={`input font-mono tracking-wider ${
                        form.sn && snHint  ? 'border-amber-300 focus:border-amber-400' : ''
                      } ${
                        form.sn && !snHint ? 'border-green-300 focus:border-green-400' : ''
                      }`}
                      placeholder="24-13005-502"
                      value={form.sn}
                      onChange={e => setField('sn', formatStudentNumber(e.target.value))}
                      maxLength={12}
                      required
                    />
                    {form.sn && snHint && (
                      <p className="text-[11px] text-amber-600 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle size={11} />
                        {snHint}
                      </p>
                    )}
                    {form.sn && !snHint && (
                      <p className="text-[11px] text-green-600 mt-1 font-medium">
                        Valid format
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Format: YY-NNNNN-NNN -- hyphens are added automatically as you type
                    </p>
                  </div>

                  {/* College -- custom scrollable dropdown */}
                  <div>
                    <label className="label">College</label>
                    <CustomDropdown
                      options={collegeOptions}
                      value={form.collegeId}
                      onChange={id => setField('collegeId', id)}
                      placeholder={
                        collegesLoading ? 'Loading colleges...' : 'Select your college'
                      }
                      loading={collegesLoading}
                    />
                  </div>

                  {/* Program -- custom scrollable dropdown, disabled until college chosen */}
                  <div>
                    <label className="label">
                      Program / Course
                      {!form.collegeId && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (select college first)
                        </span>
                      )}
                    </label>
                    <CustomDropdown
                      options={programOptions}
                      value={form.programId}
                      onChange={id => setField('programId', id)}
                      placeholder={
                        !form.collegeId
                          ? 'Select college first'
                          : programsLoading
                            ? 'Loading programs...'
                            : 'Select your program'
                      }
                      disabled={!form.collegeId}
                      loading={programsLoading && !!form.collegeId}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full py-3.5 mt-2"
                    disabled={loading}
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" />Registering...</>
                      : <><QrCode size={17} />Generate My QR Code</>}
                  </button>
                </form>

                <p className="text-xs text-slate-400 text-center mt-4">
                  Already registered?{' '}
                  <a href="/" className="text-neu-blue font-semibold hover:underline">
                    Back to login
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* DONE STEP -- show QR code                                */}
          {/* ──────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="animate-scale-in text-center">
              <div className="card-p mb-4">

                <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                  <CheckCircle2 size={20} />
                  <span className="font-bold text-base">Registration Successful!</span>
                </div>

                <p className="text-sm text-slate-600 mb-1">
                  Hi, <span className="font-bold text-slate-800">{regName}</span>!
                </p>
                <p className="text-xs text-slate-400 mb-1">
                  Save or screenshot your QR code. Show it at the library kiosk each visit.
                </p>
                <p className="text-xs font-semibold text-neu-blue mb-5">
                  1st scan = Time In &nbsp;&middot;&nbsp; 2nd scan = Time Out
                </p>

                <div id="qr-canvas" className="flex justify-center">
                  <QRCodeDisplay data={qrData} size={200} />
                </div>

                <p className="text-[11px] text-slate-400 mt-4 font-mono bg-neu-gray rounded-lg px-3 py-2 break-all">
                  {qrData}
                </p>
              </div>

              <div className="space-y-3">
                <button onClick={downloadQR} className="btn-primary w-full">
                  <Download size={16} />Download QR Code (PNG)
                </button>
                <a href="/" className="btn-secondary w-full">
                  <ArrowLeft size={15} />Back to Library Login
                </a>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Keep your QR code safe. You can always log in at the kiosk using your
                email and student number.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}