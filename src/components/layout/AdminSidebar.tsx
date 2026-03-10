import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, LogOut, BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NEULogo } from '@/components/NEULogo';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/logs',      icon: ClipboardList,   label: 'Visitor Logs' },
  { to: '/admin/users',     icon: Users,           label: 'User Management' },
];

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/admin/login'); };
  const initial = profile?.full_name?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-neu-border">
        <div className="flex items-center gap-3">
          <NEULogo size={44} />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase truncate">New Era University</p>
            <p className="text-[10px] text-slate-400 truncate">Library System</p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Navigation</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User strip + Sign out */}
      <div className="px-3 pb-5 pt-4 border-t border-neu-border space-y-2">
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-neu-gray border border-neu-border">
          <div className="w-8 h-8 rounded-full bg-neu-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{profile?.full_name ?? 'Admin'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="nav-link text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 z-30 border-r border-neu-border">
        <SidebarInner />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-card border border-neu-border"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-neu-blue" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 z-50 shadow-2xl transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-slate-400"
        >
          <X size={17} />
        </button>
        <SidebarInner onClose={() => setOpen(false)} />
      </aside>
    </>
  );
}

// Page header shown inside admin pages
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7 pl-10 lg:pl-0">
      <h1 className="text-xl lg:text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
        <BookOpen size={11} />
        {subtitle ?? 'NEU Library Management System'}
      </p>
    </div>
  );
}
