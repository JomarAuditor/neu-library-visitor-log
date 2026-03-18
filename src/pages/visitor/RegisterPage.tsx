// src/pages/visitor/RegisterPage.tsx
// REGISTRATION RULES:
//   Student  → full name + email + student number + college + program
//   Faculty  → full name + email + college (optional) + department (optional)
//   Staff    → full name + email + job title (optional)
//   All get a QR code. Google email pre-filled if coming from Google flow.

import { useState, FormEvent, useEffect } from 'react';
import {
  Loader2, UserPlus, QrCode, Download, ArrowLeft,
  CheckCircle2, AlertCircle, ChevronDown, GraduationCap, Users, Briefcase,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase }       from '@/lib/supabase';
import { QRCodeDisplay }  from '@/components/visitor/QRCodeDisplay';
import { useColleges, usePrograms } from '@/hooks/useStats';
import {
  validateNEUEmail, encodeQR,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';
import { VisitorType } from '@/types';

type Step = 'form' | 'done';

export default function RegisterPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();

  const [step,       setStep]       = useState<Step>('form');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [qrData,     setQrData]     = useState('');
  const [regName,    setRegName]    = useState('');

  // Pre-fill from URL params (when coming from Google choose-type flow)
  const [vType,      setVType]      = useState<VisitorType>(
    (params.get('type') as VisitorType) ?? 'student'
  );
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState(params.get('email') ?? '');
  const [idNumber,   setIdNumber]   = useState('');
  const [collegeId,  setCollegeId]  = useState<number | null>(null);
  const [programId,  setProgramId]  = useState<number | null>(null);
  const [jobTitle,   setJobTitle]   = useState('');   // staff only
  const [department, setDepartment] = useState('');   // faculty optional

  const isStudent = vType === 'student';
  const isFaculty = vType === 'faculty';
  const isStaff   = vType === 'staff';
  const snHint    = isStudent ? studentNumberHint(idNumber) : null;

  const { data: colleges = [], isLoading: cLoading } = useColleges();
  const { data: programs = [], isLoading: pLoading  } = usePrograms(collegeId);

  const switchType = (t: VisitorType) => {
    setVType(t); setIdNumber(''); setCollegeId(null); setProgramId(null);
    setJobTitle(''); setDepartment(''); setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('');

    if (!name.trim())             { setError('Full name is required.'); return; }
    if (!validateNEUEmail(email)) { setError('Please use your @neu.edu.ph email.'); return; }

    if (isStudent) {
      if (!idNumber.trim())          { setError('Student number is required.'); return; }
      if (!validateStudentNumber(idNumber)) { setError('Format: YY-NNNNN-NNN (e.g. 24-13005-502)'); return; }
      if (!collegeId)                { setError('Please select your college.'); return; }
      if (!programId)                { setError('Please select your program.'); return; }
    }

    setLoading(true);
    try {
      const emailLc = email.toLowerCase().trim();
      const idClean = idNumber.trim();

      // Already registered?
      const { data: existing } = await supabase.from('visitors')
        .select('id, qr_data, full_name').eq('email', emailLc).maybeSingle();
      if (existing) {
        setQrData(existing.qr_data ?? encodeQR(emailLc, idClean || emailLc));
        setRegName(existing.full_name);
        setStep('done');
        return;
      }

      // Student number duplicate?
      if (isStudent && idClean) {
        const { data: dup } = await supabase.from('visitors')
          .select('id').eq('student_number', idClean).maybeSingle();
        if (dup) {
          setError('This student number is already registered. Use Email login at the kiosk.');
          return;
        }
      }

      // QR code uses email|studentnumber for students, email|email for others
      const qrKey = isStudent ? encodeQR(emailLc, idClean) : encodeQR(emailLc, emailLc);

      const { error: insertErr } = await supabase.from('visitors').insert({
        full_name:      name.trim(),
        email:          emailLc,
        visitor_type:   vType,
        student_number: isStudent ? idClean : null,
        program_id:     isStudent ? programId : null,
        college_id:     isStudent ? collegeId : (isFaculty && collegeId ? collegeId : null),
        department:     isFaculty ? department.trim() || null : null,
        job_title:      isStaff   ? jobTitle.trim()   || null : null,
        qr_data:        qrKey,
        is_blocked:     false,
      });

      if (insertErr) {
        setError(insertErr.code === '23505'
          ? 'This email is already registered. Use Email login at the kiosk.'
          : 'Registration failed: ' + insertErr.message);
        return;
      }

      setQrData(qrKey);
      setRegName(name.trim());
      setStep('done');
    } catch { setError('Network error. Please try again.'); }
    finally  { setLoading(false); }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href     = canvas.toDataURL('image/png');
    a.download = `NEU_Library_QR_${name || 'visitor'}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">

      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <a href="/"
            className="p-2 rounded-lg hover:bg-neu-light text-slate-400 hover:text-neu-blue transition-all">
            <ArrowLeft size={18} />
          </a>
          <img src="/NEU%20Library%20logo.png" alt="NEU Library" className="h-10 w-auto object-contain"
            onError={e => { const el = e.currentTarget as HTMLImageElement; el.onerror = null; el.src = '/neu-logo.svg'; }} />
          <div>
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">Library Registration</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Get your library access QR code</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">

          {step === 'form' && (
            <div className="animate-fade-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-neu-blue flex items-center justify-center mx-auto mb-3 shadow-card-md">
                  <UserPlus size={24} className="text-white" />
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Register for Library Access</h1>
                <p className="text-sm text-slate-500 mt-1">Fill in your details to get a QR code</p>
              </div>

              <div className="card-p">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Visitor type */}
                  <div>
                    <label className="label">I am a…</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['student', GraduationCap, 'Student'],
                        ['faculty', Users,         'Faculty'],
                        ['staff',   Briefcase,     'Staff'],
                      ] as [VisitorType, typeof GraduationCap, string][]).map(([vt, Icon, label]) => (
                        <button key={vt} type="button" onClick={() => switchType(vt)}
                          className={`py-2.5 px-2 rounded-xl border-2 text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            vType === vt
                              ? 'border-neu-blue bg-neu-light text-neu-blue'
                              : 'border-slate-200 text-slate-600 hover:border-neu-blue/30 hover:bg-slate-50'
                          }`}>
                          <Icon size={18} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full name */}
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" className="input" placeholder="Juan dela Cruz"
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label">NEU Email Address</label>
                    <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                    <p className="text-[11px] text-slate-400 mt-1">Must be your official @neu.edu.ph email</p>
                  </div>

                  {/* Student number (students only) */}
                  {isStudent && (
                    <div>
                      <label className="label">Student Number</label>
                      <input type="text"
                        className={`input font-mono tracking-wider ${idNumber && snHint ? 'border-amber-300' : ''} ${idNumber && !snHint ? 'border-green-300' : ''}`}
                        placeholder="24-13005-502"
                        value={idNumber}
                        onChange={e => setIdNumber(formatStudentNumber(e.target.value))}
                        maxLength={12} required />
                      {idNumber && snHint  && <p className="text-[11px] text-amber-600 mt-1">{snHint}</p>}
                      {idNumber && !snHint && <p className="text-[11px] text-green-600 mt-1">Valid format</p>}
                    </div>
                  )}

                  {/* College (students required, faculty optional) */}
                  {(isStudent || isFaculty) && (
                    <div>
                      <label className="label">
                        College
                        {isFaculty && <span className="text-[10px] text-slate-400 font-normal ml-1">(optional)</span>}
                      </label>
                      <div className="relative">
                        <select className="select appearance-none pr-9"
                          value={collegeId ?? ''}
                          disabled={cLoading}
                          required={isStudent}
                          onChange={e => { setCollegeId(e.target.value ? Number(e.target.value) : null); setProgramId(null); }}>
                          <option value="">{cLoading ? 'Loading…' : isStudent ? 'Select your college' : 'Select college (optional)'}</option>
                          {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Program (students required) */}
                  {isStudent && (
                    <div>
                      <label className="label">
                        Program / Course
                        {!collegeId && <span className="text-[10px] text-slate-400 font-normal ml-1">(select college first)</span>}
                      </label>
                      <div className="relative">
                        <select
                          className={`select appearance-none pr-9 ${!collegeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          value={programId ?? ''}
                          disabled={!collegeId || pLoading}
                          required
                          onChange={e => setProgramId(e.target.value ? Number(e.target.value) : null)}>
                          <option value="">{!collegeId ? 'Select college first' : pLoading ? 'Loading…' : 'Select your program'}</option>
                          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Department (faculty optional) */}
                  {isFaculty && (
                    <div>
                      <label className="label">
                        Department <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input type="text" className="input" placeholder="e.g. Department of Computer Science"
                        value={department} onChange={e => setDepartment(e.target.value)} />
                    </div>
                  )}

                  {/* Job title (staff optional) */}
                  {isStaff && (
                    <div>
                      <label className="label">
                        Job Title <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input type="text" className="input" placeholder="e.g. Library Staff, Administrative Officer"
                        value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
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
                  Save or screenshot your QR code. Use it at the library kiosk to check in and out.
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
                <a href="/" className="btn-secondary w-full block text-center">
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