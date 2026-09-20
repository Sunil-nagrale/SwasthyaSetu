'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/protected-route';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  Pill,
  Calendar,
  Sparkles,
  Clock,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const sidebarLinks = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Appointments', href: '/dashboard/appointments', icon: Clock },
    { label: 'Prescriptions & OCR', href: '/dashboard/prescriptions', icon: FileText },
    { label: 'Lab Reports', href: '/dashboard/reports', icon: FlaskConical },
    { label: 'Ongoing Medications', href: '/dashboard/medications', icon: Pill },
    { label: 'Health Calendar', href: '/dashboard/calendar', icon: Calendar },
    { label: 'Health AI Assistant', href: '/dashboard/assistant', icon: Sparkles },
  ];

  return (
    <ProtectedRoute allowedRoles={['patient', 'admin']}>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar */}
            <aside className="lg:col-span-3 space-y-4">
              {/* User Profile Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-xs font-bold text-slate-900 truncate">
                      {user?.email.split('@')[0]}
                    </span>
                    <span className="block text-[11px] text-slate-500 truncate">{user?.email}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase">
                    Patient Role
                  </span>
                  <button
                    onClick={logout}
                    className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 text-[11px] font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="p-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                        <span>{link.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Main Dashboard Content */}
            <main className="lg:col-span-9 space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
