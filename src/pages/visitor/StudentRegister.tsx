// =====================================================================
// NEU Library — Student / Faculty / Staff Registration
// File: src/pages/visitor/StudentRegister.tsx
// =====================================================================
// CHANGES:
//   + "I am a…" visitor type selector (Student / Faculty / Staff)
//   + Faculty/Staff: program_id = null (no program needed)
//   + Faculty/Staff: employee ID field instead of student number
//   + All types get a QR code for library check-in
// =====================================================================

import { useState, FormEvent } from 'react';
import {
  Loader2, UserPlus, QrCode, Download,
  ArrowLeft, CheckCircle2, AlertCircle, ChevronDown,
  GraduationCap, Briefcase, Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeDisplay } from '@/components/visitor/QRCodeDisplay';
import { useColleges, usePrograms } from '@/hooks/useStats';
import {
  validateNEUEmail, encodeQR,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';
import { VisitorType } from '@/types';

type Step = 'form' | 'done';

interface FormState {
  visitorType: VisitorType;
  name:        string;
  email:       string;
  idNumber:    string;     // student_number or employee ID
  collegeId:   number | null;
  programId:   number | null;
}

const VISITOR_TYPE_CONFIG: Record<VisitorType, {
  label: string; icon: typeof GraduationCap; idLabel: string;
  idPlaceholder: string; idHint: string;
}> = {
  Student: {
    label: 'Student', icon: GraduationCap,
    idLabel: 'Student Number', idPlaceholder: '24-13005-502',
    idHint: 'Format: YY-NNNNN-NNN — hyphens added automatically',
  },
  Faculty: {
    label: 'Faculty / Teacher', icon: Users,
    idLabel: 'Employee ID', idPlaceholder: 'e.g. FAC-2024-001',
    idHint: 'Enter your NEU employee identification number',
  },
  Staff: {
    label: 'Staff / Personnel', icon: Briefcase,
    idLabel: 'Employee ID', idPlaceholder: 'e.g. STF-2024-001',
    idHint: 'Enter your NEU employee identification number',
  },
};

export default function StudentRegister() {
  const [step,    setStep]    = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [qrData,  setQrData]  = useState('');
  const [regName, setRegName] = useState('');

  const [form, setForm] = useState<FormState>({
    visitorType: 'Student',
    name:        '',
    email:       '',
    idNumber:    '',
    collegeId:   null,
    programId:   null,
  });

  const isStudent = form.visitorType === 'Student';
  const snHint    = isStudent ? studentNumberHint(form.idNumber) : null;
  const typeConfig = VISITOR_TYPE_CONFIG[form.visitorType];

  const { data: colleges = [], isLoading: collegesLoading } = useColleges();
  const { data: programs = [], isLoading: programsLoading } = usePrograms(form.collegeId);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setError('');
    if (k === 'visitorType') {
      // Reset dependent fields when type changes
      setForm(prev => ({ ...prev, visitorType: v as VisitorType, idNumber: '', collegeId: null, programId: null }));
    } else if (k === 'collegeId') {
      setForm(prev => ({ ...prev, collegeId: v as number | null, programId: null }));
    } else {
      setForm(prev => ({ ...prev, [k]: v }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // ── Validation ─────────────────────────────────────────────────
    if (!form.name.trim())             { setError('Full name is required.'); return; }
    if (!validateNEUEmail(form.email)) { setError('Please use your @neu.edu.ph email address.'); return; }
    if (!form.idNumber.trim())         { setError(`${typeConfig.idLabel} is required.`); return; }
    if (isStudent && !validateStudentNumber(form.idNumber)) {
      setError('Invalid format. Must be: YY-NNNNN-NNN (e.g. 24-13005-502)');
      return;
    }
    if (isStudent && !form.collegeId)  { setError('Please select your college.'); return; }
    if (isStudent && !form.programId)  { setError('Please select your program.'); return; }

    setLoading(true);
    try {
      const emailLc = form.email.toLowerCase().trim();
      const idClean = form.idNumber.trim();

      // Check email duplicate
      const { data: existing } = await supabase
        .from('students')
        .select('id, qr_code_data, name')
        .eq('email', emailLc)
        .maybeSingle();

      if (existing) {
        // Already registered — return their QR code
        setQrData(existing.qr_code_data ?? encodeQR(emailLc, idClean));
        setRegName(existing.name);
        setStep('done');
        return;
      }

      // Check ID duplicate
      const { data: idExists } = await supabase
        .from('students')
        .select('id')
        .eq('student_number', idClean)
        .maybeSingle();

      if (idExists) {
        setError('This ID number is already registered. Please use email login instead.');
        return;
      }

      const qr = encodeQR(emailLc, idClean);
      const { error: insertError } = await supabase.from('students').insert({
        name:           form.name.trim(),
        email:          emailLc,
        student_number: idClean,
        program_id:     isStudent ? form.programId : null,
        visitor_type:   form.visitorType,
        qr_code_data:   qr,
        is_blocked:     false,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This email or ID is already registered. Please log in at the kiosk.');
        } else {
          setError('Registration failed: ' + insertError.message);
        }
        return;
      }

      setQrData(qr);
      setRegName(form.name.trim());
      setStep('done');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href     = canvas.toDataURL('image/png');
    a.download = `NEU_Library_QR_${form.idNumber || 'visitor'}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <a href="/" className="p-2 rounded-lg hover:bg-neu-light text-slate-400 hover:text-neu-blue transition-all" aria-label="Back">
            <ArrowLeft size={18} />
          </a>
          <img src="/NEU%20Library%20logo.png" alt="NEU Library" className="h-10 w-auto object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">Library Registration</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Get your library access QR code</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <div className="animate-fade-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-neu-blue flex items-center justify-center mx-auto mb-3 shadow-card-md">
                  <UserPlus size={24} className="text-white" />
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Register for Library Access</h1>
                <p className="text-sm text-slate-500 mt-1">Students, faculty, and staff are welcome</p>
              </div>

              <div className="card-p">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* ── I am a… selector ── */}
                  <div>
                    <label className="label">I am a…</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Student', 'Faculty', 'Staff'] as VisitorType[]).map(vt => {
                        const Icon = VISITOR_TYPE_CONFIG[vt].icon;
                        return (
                          <button
                            key={vt}
                            type="button"
                            onClick={() => setField('visitorType', vt)}
                            className={`py-2.5 px-2 rounded-xl border-2 text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                              form.visitorType === vt
                                ? 'border-neu-blue bg-neu-light text-neu-blue'
                                : 'border-slate-200 text-slate-600 hover:border-neu-blue/30 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={18} />
                            <span>{vt}</span>
                          </button>
                        );
                      })}
                    </div>
                    {!isStudent && (
                      <p className="text-[11px] text-slate-400 mt-2">
                        {form.visitorType === 'Faculty' ? 'For professors and instructors' : 'For non-teaching staff'}
                      </p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" className="input" placeholder="Juan dela Cruz"
                      value={form.name} onChange={e => setField('name', e.target.value)} required />
                  </div>

                  {/* NEU Email */}
                  <div>
                    <label className="label">NEU Email Address</label>
                    <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                      value={form.email} onChange={e => setField('email', e.target.value)} required />
                    <p className="text-[11px] text-slate-400 mt-1">Must be your official @neu.edu.ph email</p>
                  </div>

                  {/* ID Number */}
                  <div>
                    <label className="label">{typeConfig.idLabel}</label>
                    <input
                      type="text"
                      className={`input ${isStudent ? 'font-mono tracking-wider' : ''} ${
                        isStudent && form.idNumber && snHint  ? 'border-amber-300' : ''
                      } ${
                        isStudent && form.idNumber && !snHint ? 'border-green-300' : ''
                      }`}
                      placeholder={typeConfig.idPlaceholder}
                      value={form.idNumber}
                      onChange={e => setField('idNumber', isStudent ? formatStudentNumber(e.target.value) : e.target.value)}
                      maxLength={isStudent ? 12 : 50}
                      required
                    />
                    {isStudent && form.idNumber && snHint  && (
                      <p className="text-[11px] text-amber-600 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle size={10} />{snHint}
                      </p>
                    )}
                    {isStudent && form.idNumber && !snHint && (
                      <p className="text-[11px] text-green-600 mt-1 font-medium">Valid format</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">{typeConfig.idHint}</p>
                  </div>

                  {/* College + Program (Students only) */}
                  {isStudent && (
                    <>
                      <div>
                        <label className="label">College</label>
                        <div className="relative">
                          <select
                            className="select appearance-none pr-9"
                            value={form.collegeId ?? ''}
                            onChange={e => setField('collegeId', e.target.value ? Number(e.target.value) : null)}
                            disabled={collegesLoading}
                            required
                          >
                            <option value="">{collegesLoading ? 'Loading…' : 'Select your college'}</option>
                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="label">
                          Program / Course
                          {!form.collegeId && <span className="text-[10px] text-slate-400 font-normal ml-1">(select college first)</span>}
                        </label>
                        <div className="relative">
                          <select
                            className={`select appearance-none pr-9 ${!form.collegeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={form.programId ?? ''}
                            onChange={e => setField('programId', e.target.value ? Number(e.target.value) : null)}
                            disabled={!form.collegeId || programsLoading}
                            required
                          >
                            <option value="">{!form.collegeId ? 'Select college first' : programsLoading ? 'Loading…' : 'Select your program'}</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Faculty/Staff info note */}
                  {!isStudent && (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                      {form.visitorType === 'Faculty'
                        ? '👨‍🏫 Faculty members can use the library with their employee ID and NEU email.'
                        : '👔 Staff members can use the library with their employee ID and NEU email.'}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full py-3.5 mt-2" disabled={loading}>
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" />Registering…</>
                      : <><QrCode size={17} />Generate My QR Code</>}
                  </button>
                </form>

                <p className="text-xs text-slate-400 text-center mt-4">
                  Already registered?{' '}
                  <a href="/" className="text-neu-blue font-semibold hover:underline">Back to login</a>
                </p>
              </div>
            </div>
          )}

          {/* ── DONE STEP ── */}
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
                  1st scan = Time In &nbsp;·&nbsp; 2nd scan = Time Out
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}