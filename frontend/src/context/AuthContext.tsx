'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type User, type AuthResponse } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = (response: AuthResponse) => {
    localStorage.setItem('tt_token', response.token);
    localStorage.setItem('tt_user', JSON.stringify({
      id: response.id,
      username: response.username,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      role: response.role,
    }));
    setToken(response.token);
    setUser({
      id: response.id,
      username: response.username,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      role: response.role,
    });
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('tt_token');
    const storedUser = localStorage.getItem('tt_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Re-validate token with the server
        authApi.me().catch(() => {
          localStorage.removeItem('tt_token');
          localStorage.removeItem('tt_user');
          setToken(null);
          setUser(null);
        });
      } catch {
        localStorage.removeItem('tt_token');
        localStorage.removeItem('tt_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    persistAuth(response);
  }, []);

  const register = useCallback(async (data: { username: string; email: string; password: string; firstName?: string; lastName?: string }) => {
    const response = await authApi.register(data);
    persistAuth(response);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tt_token');
    localStorage.removeItem('tt_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!token && !!user,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
