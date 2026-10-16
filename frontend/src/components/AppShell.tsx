'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
  topbarRight?: React.ReactNode;
}

export default function AppShell({ children, breadcrumb, topbarRight }: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Array<{ id: number; name: string; color: string; icon: string }>>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      projectsApi.list().then(ps =>
        setProjects(ps.map(p => ({ id: p.id, name: p.name, color: p.color, icon: p.icon })))
      ).catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar projects={projects} />

      <main className="main-content">
        {/* Top Bar */}
        <div className="topbar">
          <div className="topbar-breadcrumb">
            {breadcrumb || <span>Pesira</span>}
          </div>
          <div className="topbar-actions">
            {topbarRight}
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
