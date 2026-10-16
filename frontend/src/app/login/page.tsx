'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    try {
      await login(username, password);
      toast('Welcome back! 👋', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setErrors({ general: err.message || 'Invalid credentials' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: 'linear-gradient(135deg, #52525b, #3f3f46)' }}>P</div>
          <span className="auth-logo-name">Pesira</span>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Use <strong>admin</strong> / <strong>Admin@123</strong> to try as admin
        </p>

        {errors.general && (
          <div style={{
            background: 'var(--accent-red-lt)',
            border: '1px solid rgba(239,68,68,.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--accent-red)',
          }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
            {errors.username && <span className="form-error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-lg"
            style={{
              width: '100%',
              marginTop: '8px',
              background: '#3f3f46',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.18)',
            }}
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : null}
            {isLoading ? 'Signing in…' : 'Continue →'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0 20px' }} />

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: '#52525b', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#d4d4d8' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
