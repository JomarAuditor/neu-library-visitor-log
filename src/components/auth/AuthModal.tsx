// src/components/auth/AuthModal.tsx
// Enterprise-grade authentication feedback modals
import { ReactNode } from 'react';
import { ShieldX, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';

interface AuthModalProps {
  type: 'email-denied' | 'unauthorized' | 'blocked';
  email?: string;
  message?: string;
  onClose: () => void;
  onBack?: () => void;
}

const modalConfig = {
  'email-denied': {
    icon: Mail,
    title: 'Access Denied',
    subtitle: 'Invalid institutional email',
    bgColor: 'bg-red-600',
    iconBg: 'bg-white/20',
  },
  'unauthorized': {
    icon: ShieldX,
    title: 'Unauthorized Access',
    subtitle: 'Admin privileges required',
    bgColor: 'bg-red-600',
    iconBg: 'bg-white/20',
  },
  'blocked': {
    icon: AlertTriangle,
    title: 'Account Suspended',
    subtitle: 'Library access blocked',
    bgColor: 'bg-orange-600',
    iconBg: 'bg-white/20',
  },
};

export function AuthModal({ type, email, message, onClose, onBack }: AuthModalProps) {
  const config = modalConfig[type];
  const IconComponent = config.icon;

  const getDefaultMessage = () => {
    switch (type) {
      case 'email-denied':
        return 'Only @neu.edu.ph email is accepted.';
      case 'unauthorized':
        return 'Only authorized admin.';
      case 'blocked':
        return 'Your account has been suspended from library access. Please contact the administrator.';
      default:
        return 'Access denied.';
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease-out',
        zIndex: 99999
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${config.bgColor} px-6 pt-6 pb-5 text-center relative`}>
          <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center mx-auto mb-3`}>
            <IconComponent size={32} className="text-white" />
          </div>
          <h2 className="text-white font-black text-xl tracking-tight">{config.title}</h2>
          <p className="text-white/80 text-sm mt-1 font-medium">{config.subtitle}</p>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-6 text-center">
          {email && (
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-1">Attempted email:</p>
              <p className="text-slate-800 font-bold text-sm truncate px-3 py-2 bg-slate-50 rounded-lg border">
                {email}
              </p>
            </div>
          )}
          
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {message || getDefaultMessage()}
          </p>

          {type === 'unauthorized' && (
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Contact: <strong className="text-slate-600">jomar.auditor@neu.edu.ph</strong>
            </p>
          )}

          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-2xl ${config.bgColor} hover:opacity-90 text-white font-bold text-sm transition-all`}
            >
              Understood
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.85) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}