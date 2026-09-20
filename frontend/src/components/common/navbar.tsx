'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Activity,
  Building2,
  Stethoscope,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  LogIn,
  Menu,
  X,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, isAuthenticated, role, logout, loginAsDemo, isLoading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Find Hospitals', href: '/hospitals', icon: Building2 },
    { label: 'Symptom Diagnosis', href: '/get-diagnosed', icon: Stethoscope },
    { label: 'Patient Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Hospital Portal', href: '/hospital-admin', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-700 to-teal-500 text-white shadow-md shadow-primary-600/20 group-hover:scale-105 transition-transform">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
              Swasthya<span className="text-primary-600">Setu</span>
            </span>
            <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider -mt-1">
              National Health Gateway
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary-600' : 'text-slate-400')} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Demo Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Quick Demo Switcher */}
          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-primary-200 bg-primary-50/50 text-primary-800 hover:bg-primary-100 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-primary-600" />
              <span>Demo Persona</span>
              <ChevronDown className="w-3 h-3 text-primary-500" />
            </button>

            {demoMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2 shadow-xl border border-slate-200 text-xs z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setDemoMenuOpen(false)}
              >
                <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-100">
                  Switch Verified Demo Role
                </div>
                <button
                  onClick={() => {
                    loginAsDemo('patient');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-slate-900">Ravi Kumar (Patient)</span>
                  <span className="text-[11px] text-slate-500">patient@example.com</span>
                </button>
                <button
                  onClick={() => {
                    loginAsDemo('hospital_admin');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-slate-900">Sharda Hospital Admin</span>
                  <span className="text-[11px] text-slate-500">sharda-admin@example.com</span>
                </button>
                <button
                  onClick={() => {
                    loginAsDemo('admin');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-slate-900">Platform Super Admin</span>
                  <span className="text-[11px] text-slate-500">superadmin@example.com</span>
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-900 truncate max-w-[120px]">
                  {user?.email.split('@')[0]}
                </span>
                <span className="block text-[10px] font-semibold text-primary-600 uppercase">
                  {role}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-1.5 text-slate-600 hover:text-rose-600 hover:border-rose-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="w-5 h-5 text-primary-600" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Quick Demo Accounts</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loginAsDemo('patient');
                  setMobileMenuOpen(false);
                }}
              >
                Patient
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loginAsDemo('hospital_admin');
                  setMobileMenuOpen(false);
                }}
              >
                Hospital Admin
              </Button>
            </div>

            {isAuthenticated ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="mt-2 w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user?.email})
              </Button>
            ) : (
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="mt-2 w-full gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In / Register
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
