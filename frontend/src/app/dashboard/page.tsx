'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { projectsApi, tasksApi, type Project, type Task } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20` }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress',
    IN_REVIEW: 'badge-in-review', DONE: 'badge-done', CANCELLED: 'badge-cancelled'
  };
  return map[status] || 'badge-todo';
}

function getPriorityClass(priority: string) {
  const map: Record<string, string> = {
    URGENT: 'badge-urgent', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low'
  };
  return map[priority] || 'badge-medium';
}

function formatStatusLabel(s: string) {
  const map: Record<string, string> = {
    TODO: 'To Do', IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review', DONE: 'Done', CANCELLED: 'Cancelled'
  };
  return map[s] || s;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.list(),
      tasksApi.list({ size: 6, sortBy: 'updatedAt', sortDir: 'desc' }),
    ]).then(([projs, tasksPage]) => {
      setProjects(projs);
      setRecentTasks(tasksPage.content);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const totalTasks = projects.reduce((s, p) => s + p.totalTasks, 0);
  const completedTasks = projects.reduce((s, p) => s + p.completedTasks, 0);
  const inProgressTasks = recentTasks.filter(t => t.status === 'IN_PROGRESS').length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppShell breadcrumb={<span>Home</span>}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          {greeting()}, {user?.firstName || user?.username} 👋
        </h1>
        <p className="page-subtitle">
          Here's what's happening in your workspace today.
        </p>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="stats-grid">
          <StatCard icon="📁" value={projects.length} label="Projects" color="#6366f1" />
          <StatCard icon="✅" value={totalTasks} label="Total Tasks" color="#10b981" />
          <StatCard icon="🔄" value={inProgressTasks} label="In Progress" color="#3b82f6" />
          <StatCard icon="🏆" value={completedTasks} label="Completed" color="#f59e0b" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="text-md font-semibold">Recent Projects</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">View all →</Link>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
              <div className="spinner" />
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <p className="empty-state-title">No projects yet</p>
              <Link href="/projects" className="btn btn-primary btn-sm">Create project</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.slice(0, 4).map(project => {
                const progress = project.totalTasks > 0
                  ? Math.round((project.completedTasks / project.totalTasks) * 100)
                  : 0;
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{project.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="font-medium" style={{ fontSize: '13.5px' }}>{project.name}</div>
                          <div className="text-xs text-secondary">{project.totalTasks} tasks</div>
                        </div>
                        <span className="badge badge-todo" style={{ fontSize: '10px' }}>
                          {project.status}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${progress}%`, background: project.color } as React.CSSProperties}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'right' }}>
                        {progress}% complete
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="text-md font-semibold">Recent Tasks</h2>
            <Link href="/tasks" className="btn btn-ghost btn-sm">View all →</Link>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
              <div className="spinner" />
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-title">No tasks yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentTasks.map(task => (
                <div key={task.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: task.projectColor || '#6366f1',
                      marginTop: '5px', flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', lineHeight: '1.3' }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`badge ${getStatusClass(task.status)}`}>
                          {formatStatusLabel(task.status)}
                        </span>
                        <span className={`badge ${getPriorityClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {task.projectName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
