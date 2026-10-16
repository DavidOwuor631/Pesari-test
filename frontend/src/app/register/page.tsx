'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name required';
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      toast('Account created! Welcome to Pesira 🎉', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({ id, label, type = 'text', field, placeholder }: any) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="form-input"
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={e => set(field, e.target.value)}
      />
      {errors[field] && <span className="form-error">{errors[field]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: 'linear-gradient(135deg, #52525b, #3f3f46)' }}>P</div>
          <span className="auth-logo-name">Pesira</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your projects today</p>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field id="reg-firstname" label="First name" field="firstName" placeholder="John" />
            <Field id="reg-lastname" label="Last name" field="lastName" placeholder="Doe" />
          </div>
          <Field id="reg-username" label="Username" field="username" placeholder="johndoe" />
          <Field id="reg-email" label="Email" type="email" field="email" placeholder="john@example.com" />
          <Field id="reg-password" label="Password" type="password" field="password" placeholder="Min 8 characters" />
          <Field id="reg-confirm" label="Confirm password" type="password" field="confirmPassword" placeholder="Repeat password" />

          <button
            id="register-submit"
            type="submit"
            className="btn btn-lg"
            style={{
              width: '100%',
              marginTop: '8px',
              background: '#3f3f46',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.18)',
              borderRadius: 'var(--radius-md)',
            }}
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : null}
            {isLoading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0 20px' }} />

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#52525b', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#d4d4d8' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
