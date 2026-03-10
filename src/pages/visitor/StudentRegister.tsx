import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, QrCode, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NEULogo } from '@/components/NEULogo';
import { QRCodeDisplay } from '@/components/visitor/QRCodeDisplay';
import { COLLEGES, COURSES } from '@/types';
import { validateNEUEmail, encodeQR } from '@/lib/utils';

type Step = 'form' | 'done';

export default function StudentRegister() {
  const [step,    setStep]    = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({ name: '', email: '', sn: '', college: '', course: '' });
  const [qrData, setQrData] = useState('');
  const [regName, setRegName] = useState('');

  const set = (k: keyof typeof form, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(form.email)) { setError('Please use your @neu.edu.ph email.'); return; }
    if (!form.name.trim() || !form.sn.trim() || !form.college || !form.course) { setError('Please fill all fields.'); return; }

    setLoading(true);
    const qr = encodeQR(form.email, form.sn);

    // Existing check
    const { data: ex } = await supabase.from('students').select('id, qr_code_data, name')
      .or(`email.eq.${form.email.toLowerCase().trim()},student_number.eq.${form.sn.trim()}`).single();

    if (ex) {
      setQrData(ex.qr_code_data ?? qr);
      setRegName(ex.name);
      setLoading(false); setStep('done'); return;
    }

    const { error: ins } = await supabase.from('students').insert({
      name: form.name.trim(), email: form.email.toLowerCase().trim(),
      student_number: form.sn.trim(), college: form.college, course: form.course,
      qr_code_data: qr, is_blocked: false,
    });
    setLoading(false);
    if (ins) {
      setError(ins.code === '23505' ? 'Already registered. Please log in instead.' : 'Registration failed. Try again.');
      return;
    }
    setQrData(qr); setRegName(form.name.trim()); setStep('done');
  };

  const navigate = useNavigate();

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `NEU_Library_QR_${form.sn || 'student'}.png`;
    a.click();
  };

  const handleTapQRCode = async () => {
    // Copy QR payload to clipboard and navigate to home with raw param to simulate a scan
    try {
      await navigator.clipboard.writeText(qrData);
    } catch {}
    // Navigate to home and pass raw qr so VisitorHome can process it
    navigate('/?raw=' + encodeURIComponent(qrData), { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <a href="/" className="p-2 rounded-lg hover:bg-neu-light text-slate-400 hover:text-neu-blue transition-all">
            <ArrowLeft size={18} />
          </a>
          <NEULogo size={36} />
          <div>
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase">Student Registration</p>
            <p className="text-[10px] text-slate-400 hidden sm:block">Get your library QR code</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          {step === 'form' && (
            <div className="animate-fade-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-neu-blue flex items-center justify-center mx-auto mb-3 shadow-card-md">
                  <UserPlus size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Register for Library Access</h1>
                <p className="text-sm text-slate-500 mt-1">Fill in your details to get a unique QR code</p>
              </div>

              <div className="card-p">
                {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
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
                    <input inputMode="numeric" type="tel" pattern="[0-9]*" className="input" placeholder="e.g., 202312345"
                      value={form.sn} onChange={e => set('sn', e.target.value)} required />
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
                    {loading ? <><Loader2 size={16} className="animate-spin" />Registering…</> : <><QrCode size={17} />Generate My QR Code</>}
                  </button>
                </form>
                <p className="text-xs text-slate-400 text-center mt-4">
                  Already registered? <a href="/" className="text-neu-blue font-semibold hover:underline">Go back to login</a>
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
                <p className="text-xs text-slate-400 mb-5">
                  Save or screenshot your QR code. Show it at the library kiosk each visit.
                  <br/><span className="font-semibold text-neu-blue">1st scan = Time In · 2nd scan = Time Out</span>
                </p>
                <div id="qr-canvas" className="inline-block cursor-pointer" role="button" tabIndex={0}
                  onClick={handleTapQRCode} onKeyDown={(e) => { if (e.key === 'Enter') handleTapQRCode(); }}>
                  <QRCodeDisplay data={qrData} size={200} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Tap QR code to copy & use this device to sign in</p>
                <p className="text-[11px] text-slate-400 mt-4 font-mono bg-neu-gray rounded-lg px-3 py-2 break-all">{qrData}</p>
              </div>
              <div className="space-y-3">
                <button onClick={downloadQR} className="btn-primary w-full">
                  <Download size={16} />Download QR Code
                </button>
                <a href="/" className="btn-secondary w-full">
                  <ArrowLeft size={15} />Back to Library Login
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-4">Keep your QR code safe. You can always re-register to retrieve it.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
