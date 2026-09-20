'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, DEMO_CREDENTIALS } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { Activity, ShieldCheck, UserCheck, Mail, Lock, User, Phone, Calendar } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { login, signUp, loginAsDemo, isLoading } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Successfully logged in!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials or login failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password || !name) {
      setFormError('Email, password, and full name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        email,
        password,
        name,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      toast.success('Account created and logged in successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = async (role: 'patient' | 'hospital_admin' | 'admin') => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await loginAsDemo(role);
      toast.success(`Logged in as demo ${DEMO_CREDENTIALS[role].label}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30">
            <Activity className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Swasthya<span className="text-primary-600">Setu</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            National Unified Digital Health Citizen & Admin Portal
          </p>
        </div>

        {/* Demo Account Quick-Fill Card */}
        <div className="p-4 rounded-2xl border border-primary-200 bg-primary-50/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary-900 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-primary-700" />
            <span>Instant Demo Access</span>
          </div>
          <p className="text-xs text-slate-600">
            Click to authenticate immediately with seeded backend test credentials:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleDemoClick('patient')}
              className="bg-white border-primary-200 text-xs py-2 hover:bg-primary-100"
            >
              Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleDemoClick('hospital_admin')}
              className="bg-white border-primary-200 text-xs py-2 hover:bg-primary-100"
            >
              Hospital Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleDemoClick('admin')}
              className="bg-white border-primary-200 text-xs py-2 hover:bg-primary-100"
            >
              Super Admin
            </Button>
          </div>
        </div>

        {/* Auth Box */}
        <Card className="shadow-lg border-slate-200/90">
          <CardHeader className="pb-4">
            <div className="flex rounded-xl bg-slate-100 p-1 mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>
            <CardTitle className="text-xl">
              {mode === 'login' ? 'Welcome Back' : 'Register for SwasthyaSetu'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Enter your credentials to access your health portal.'
                : 'Create an account to book consultations and preserve records.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold mt-2"
                  isLoading={isSubmitting || isLoading}
                >
                  Sign In to SwasthyaSetu
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <Input
                  label="Full Legal Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ravi Kumar"
                  icon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ravi@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold mt-3"
                  isLoading={isSubmitting || isLoading}
                >
                  Create Patient Account
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <MedicalDisclaimer />
      </div>
    </div>
  );
}
