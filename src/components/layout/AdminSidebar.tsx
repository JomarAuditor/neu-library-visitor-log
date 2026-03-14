// =====================================================================
// NEU Library Visitor Log System
// Admin Sidebar + Page Header
// File: src/components/layout/AdminSidebar.tsx
// =====================================================================
// FIX: User profile card + Sign Out is now TRULY pinned to the very
//      bottom of the sidebar. The sidebar uses h-screen + flex-col,
//      the nav uses flex-1 to fill available space, and the user strip
//      uses mt-auto + shrink-0 to anchor it at the bottom.
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

// ── Inner sidebar content (shared by desktop + mobile) ───────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const initial = (profile?.full_name?.[0] ?? 'A').toUpperCase();

  return (
    // CRITICAL: flex flex-col h-full — the three sections stack vertically
    // Section 1 (brand) + Section 2 (nav flex-1) + Section 3 (user, pinned bottom)
    <div className="flex flex-col h-full bg-white">

      {/* ── SECTION 1: Brand / Logo ── */}
      <div className="px-5 py-5 border-b border-neu-border shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/NEU%20Library%20logo.png"
            alt="NEU Library"
            className="h-10 w-auto object-contain shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none truncate">
              New Era University
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              Library Management System
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Navigation label + links ── */}
      {/* flex-1 makes this section expand to fill all remaining space */}
      {/* This is what PUSHES the user strip down to the bottom */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

      {/* ── SECTION 3: User profile + Sign Out ── */}
      {/* shrink-0 prevents this from being compressed */}
      {/* This section is always at the BOTTOM because Section 2 has flex-1 */}
      <div className="shrink-0 px-3 pb-5 pt-3 border-t border-neu-border space-y-1.5">

        {/* Profile card */}
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-neu-gray border border-neu-border">
          {/* Avatar circle with initial */}
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

        {/* Sign Out button */}
        <button
          onClick={handleSignOut}
          className="
            w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
            text-sm font-semibold text-red-500
            hover:bg-red-50 hover:text-red-600
            transition-all duration-150
          "
        >
          <LogOut size={16} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────
// fixed + h-screen ensures it spans full viewport height
export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: fixed left sidebar, full screen height */}
      <aside className="hidden lg:block w-64 h-screen fixed left-0 top-0 z-30 border-r border-neu-border shadow-sm overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile: hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-card border border-neu-border"
        aria-label="Open navigation menu"
      >
        <Menu size={20} className="text-neu-blue" />
      </button>

      {/* Mobile: backdrop overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in drawer */}
      <aside
        className={`
          lg:hidden fixed left-0 top-0 h-full w-64 z-50
          shadow-2xl overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button inside drawer */}
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

// ── Page header component ─────────────────────────────────────────────
// Used at the top of each admin page
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