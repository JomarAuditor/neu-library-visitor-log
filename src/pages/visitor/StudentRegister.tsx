import { useState, FormEvent } from 'react';
import { Loader2, UserPlus, QrCode, Download, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NEULogo } from '@/components/NEULogo';
import { QRCodeDisplay } from '@/components/visitor/QRCodeDisplay';
import { COLLEGES, COURSES } from '@/types';
import {
  validateNEUEmail, encodeQR,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';

type Step = 'form' | 'done';

export default function StudentRegister() {
  const [step,    setStep]    = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({ name: '', email: '', sn: '', college: '', course: '' });
  const [qrData,  setQrData]  = useState('');
  const [regName, setRegName] = useState('');

  const set = (k: keyof typeof form, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };
  const snHint = studentNumberHint(form.sn);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(form.email)) { setError('Please use your @neu.edu.ph email address.'); return; }
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!form.sn.trim()) { setError('Student number is required.'); return; }
    if (!validateStudentNumber(form.sn)) { setError('Invalid student number format. Must be: YY-NNNNN-NNN (e.g. 24-13005-502)'); return; }
    if (!form.college) { setError('Please select your college.'); return; }
    if (!form.course)  { setError('Please select your course.'); return; }

    setLoading(true);
    try {
      const qr = encodeQR(form.email, form.sn);
      const emailLc = form.email.toLowerCase().trim();

      // Check if already registered
      const { data: ex } = await supabase.from('students')
        .select('id, qr_code_data, name')
        .or(`email.eq.${emailLc},student_number.eq.${form.sn.trim()}`)
        .maybeSingle();

      if (ex) {
        setQrData(ex.qr_code_data ?? qr);
        setRegName(ex.name);
        setStep('done');
        return;
      }

      const { error: ins } = await supabase.from('students').insert({
        name:           form.name.trim(),
        email:          emailLc,
        student_number: form.sn.trim(),
        college:        form.college,
        course:         form.course,
        qr_code_data:   qr,
        is_blocked:     false,
      });

      if (ins) {
        if (ins.code === '23505') setError('This email or student number is already registered. Please log in instead.');
        else setError('Registration failed: ' + ins.message);
        return;
      }

      setQrData(qr); setRegName(form.name.trim()); setStep('done');
    } catch (err: any) {
      setError('An error occurred: ' + (err?.message || 'Please try again.'));
    } finally { setLoading(false); }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `NEU_Library_QR_${form.sn || 'student'}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <a href="/" className="p-2 rounded-lg hover:bg-neu-light text-slate-400 hover:text-neu-blue transition-all">
            <ArrowLeft size={18} />
          </a>
          <NEULogo size={36} />
          <div>
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">Student Registration</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Get your library QR code</p>
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
                <p className="text-sm text-slate-500 mt-1">Fill in your details to get a unique QR code</p>
              </div>

              <div className="card-p">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" className="input" placeholder="Juan dela Cruz"
                      value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">NEU Email Address</label>
                    <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                      value={form.email} onChange={e => set('email', e.target.value)} required />
                    <p className="text-[11px] text-slate-400 mt-1">Must be your official @neu.edu.ph email</p>
                  </div>
                  <div>
                    <label className="label">Student Number</label>
                    <input type="text"
                      className={`input font-mono ${snHint && form.sn ? 'border-amber-300' : ''} ${!snHint && form.sn ? 'border-green-300' : ''}`}
                      placeholder="24-13005-502"
                      value={form.sn}
                      onChange={e => set('sn', formatStudentNumber(e.target.value))}
                      maxLength={12}
                      required />
                    {form.sn && snHint && <p className="text-[11px] text-amber-600 mt-1 font-medium">⚠ {snHint}</p>}
                    {form.sn && !snHint && <p className="text-[11px] text-green-600 mt-1 font-medium">✓ Valid format</p>}
                    <p className="text-[11px] text-slate-400 mt-1">Format: YY-NNNNN-NNN (hyphens auto-added)</p>
                  </div>
                  <div>
                    <label className="label">College</label>
                    <select className="select" value={form.college} onChange={e => set('college', e.target.value)} required>
                      <option value="">Select your college</option>
                      {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Course</label>
                    <select className="select" value={form.course} onChange={e => set('course', e.target.value)} required>
                      <option value="">Select your course</option>
                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
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
                  <span className="font-bold text-base">QR Code Ready!</span>
                </div>
                <p className="text-sm text-slate-600 mb-1">
                  Hi, <span className="font-bold text-slate-800">{regName}</span>!
                </p>
                <p className="text-xs text-slate-400 mb-1">Save or screenshot your QR code. Show it at the library kiosk each visit.</p>
                <p className="text-xs font-semibold text-neu-blue mb-5">1st scan = Time In · 2nd scan = Time Out</p>
                <div id="qr-canvas" className="flex justify-center">
                  <QRCodeDisplay data={qrData} size={200} />
                </div>
                <p className="text-[11px] text-slate-400 mt-4 font-mono bg-neu-gray rounded-lg px-3 py-2 break-all">{qrData}</p>
              </div>
              <div className="space-y-3">
                <button onClick={downloadQR} className="btn-primary w-full">
                  <Download size={16} />Download QR Code (PNG)
                </button>
                <a href="/" className="btn-secondary w-full">
                  <ArrowLeft size={15} />Back to Library Login
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-4">Keep your QR code safe. Re-register anytime if you lose it.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
