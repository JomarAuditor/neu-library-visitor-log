// =====================================================================
// NEU Library Visitor Log System
// Admin Sidebar + Page Header
// File: src/components/layout/AdminSidebar.tsx
// =====================================================================

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users,
  LogOut, BookOpen, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/admin/logs',      icon: ClipboardList,   label: 'Visitor Logs'    },
  { to: '/admin/users',     icon: Users,           label: 'User Management' },
];

// NEU logo with PNG -> SVG fallback
function NEULogoImage({ className }: { className?: string }) {
  const [src,    setSrc]    = useState('/NEU%20Library%20logo.png');
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (src === '/NEU%20Library%20logo.png') {
      setSrc('/neu-logo.svg');
    } else {
      setFailed(true);
    }
  };

  if (failed) return null;

  return (
    <img
      src={src}
      alt="NEU Logo"
      className={className}
      onError={handleError}
    />
  );
}

// Shared inner content (used by both desktop sidebar and mobile drawer)
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const initial = (profile?.full_name?.[0] ?? 'A').toUpperCase();

  return (
    // flex-col h-full: three sections stack vertically
    // Section 1 (brand)   shrink-0 = fixed height
    // Section 2 (nav)     flex-1   = fills all remaining space, pushes section 3 down
    // Section 3 (user)    shrink-0 = fixed height, always at bottom
    <div className="flex flex-col h-full bg-white">

      {/* SECTION 1: Brand header */}
      <div className="px-5 py-4 border-b border-neu-border shrink-0">
        <div className="flex items-center gap-3">
          <NEULogoImage className="h-11 w-11 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-neu-blue tracking-widest uppercase leading-none truncate">
              New Era University
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              Library Management System
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Navigation - flex-1 pushes user strip to bottom */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-5 pt-5 pb-2 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">
            Navigation
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
      </div>

      {/* SECTION 3: User profile + Sign Out - always pinned at bottom */}
      <div className="shrink-0 px-3 pb-5 pt-3 border-t border-neu-border space-y-1.5">

        {/* Profile card */}
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-neu-gray border border-neu-border">
          <div className="w-9 h-9 rounded-full bg-neu-blue flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
              {profile?.full_name ?? 'Administrator'}
            </p>
            <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
              {profile?.email ?? ''}
            </p>
            <span className="inline-block text-[9px] font-bold text-neu-blue bg-neu-light px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-wider">
              {profile?.role ?? 'admin'}
            </span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={16} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar - fixed, full viewport height */}
      <aside className="hidden lg:block w-64 h-screen fixed left-0 top-0 z-30 border-r border-neu-border shadow-sm overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-card border border-neu-border"
        aria-label="Open navigation menu"
      >
        <Menu size={20} className="text-neu-blue" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 z-50 shadow-2xl overflow-hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 z-10"
          aria-label="Close menu"
        >
          <X size={17} />
        </button>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}

// Page header used at the top of each admin page
export function PageHeader({
  title,
  subtitle,
}: {
  title:     string;
  subtitle?: string;
}) {
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