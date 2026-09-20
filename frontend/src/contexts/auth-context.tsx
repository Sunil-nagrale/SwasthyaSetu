'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthUser, UserRole } from '@/types';
import { authApi, LoginResponse, SignUpPayload } from '@/lib/api/auth';
import { setApiAuthToken, getApiAuthToken } from '@/lib/api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  logout: () => void;
  loginAsDemo: (type: 'patient' | 'hospital_admin' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = {
  patient: {
    email: 'patient@example.com',
    password: 'Password123!',
    label: 'Patient (Ravi Kumar)',
  },
  hospital_admin: {
    email: 'sharda-admin@example.com',
    password: 'AdminPassword123!',
    label: 'Hospital Admin (Sharda Hospital)',
  },
  admin: {
    email: 'superadmin@example.com',
    password: 'SuperAdmin123!',
    label: 'Super Admin',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Helper to resolve primary role
  const getPrimaryRole = (roles: string[]): UserRole => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('hospital_admin')) return 'hospital_admin';
    return 'patient';
  };

  const handleLoginSuccess = useCallback((data: LoginResponse) => {
    const primaryRole = getPrimaryRole(data.roles);
    const authUser: AuthUser = {
      userId: data.userId,
      email: data.email,
      roles: data.roles as UserRole[],
      // Hospital admin assignment
      hospitalId: primaryRole === 'hospital_admin' ? '11111111-1111-1111-1111-111111111111' : undefined,
    };

    const token = data.idToken || data.accessToken;
    setToken(token);
    setApiAuthToken(token);
    setUser(authUser);

    if (typeof window !== 'undefined') {
      localStorage.setItem('swasthya_user', JSON.stringify(authUser));
    }
  }, []);

  // Initialize from storage on mount
  useEffect(() => {
    try {
      const storedToken = getApiAuthToken();
      const storedUser = localStorage.getItem('swasthya_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Clear invalid state
      setApiAuthToken(null);
      localStorage.removeItem('swasthya_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      handleLoginSuccess(data);

      const primary = getPrimaryRole(data.roles);
      if (primary === 'hospital_admin') {
        router.push('/hospital-admin');
      } else if (primary === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    setIsLoading(true);
    try {
      await authApi.signUp(payload);
      // Auto login after sign up
      await login(payload.email, payload.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setApiAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swasthya_user');
    }
    router.push('/auth');
  }, [router]);

  const loginAsDemo = async (type: 'patient' | 'hospital_admin' | 'admin') => {
    const creds = DEMO_CREDENTIALS[type];
    await login(creds.email, creds.password);
  };

  const role = user ? getPrimaryRole(user.roles) : null;
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        login,
        signUp,
        logout,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
