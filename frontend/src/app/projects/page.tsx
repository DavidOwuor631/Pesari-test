'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { projectsApi, type Project, type ProjectStatus } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981', PLANNING: '#6366f1', ON_HOLD: '#f59e0b',
  COMPLETED: '#3b82f6', ARCHIVED: '#9b9a97'
};

const PROJECT_ICONS = ['📋', '🚀', '🎨', '⚡', '🔧', '📱', '🌐', '💡', '🏗️', '📊'];
const COLOR_OPTIONS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: (project?.status || 'ACTIVE') as ProjectStatus,
    color: project?.color || '#6366f1',
    icon: project?.icon || '📋',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Project name is required';
    if (form.name.length > 100) e.name = 'Name must be under 100 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { setErrors({ general: err.message }); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {errors.general && (
            <div style={{ background: 'var(--accent-red-lt)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '16px', fontSize: '13px', color: 'var(--accent-red)' }}>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROJECT_ICONS.map(icon => (
                <button key={icon} onClick={() => set('icon', icon)}
                  style={{ width: '36px', height: '36px', fontSize: '18px', border: `2px solid ${form.icon === icon ? 'var(--accent-indigo)' : 'transparent'}`, borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="proj-name">Project Name *</label>
            <input id="proj-name" className="form-input" placeholder="e.g. Mobile App Redesign" value={form.name} onChange={e => set('name', e.target.value)} />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="proj-desc">Description</label>
            <textarea id="proj-desc" className="form-input form-textarea" placeholder="What is this project about?" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="proj-status">Status</label>
            <select id="proj-status" className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <span className="spinner" /> : null}
            {isSaving ? 'Saving…' : (project ? 'Save Changes' : 'Create Project')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => toast('Failed to load projects', 'error'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    const p = await projectsApi.create(data);
    setProjects(prev => [p, ...prev]);
    toast('Project created! 🎉', 'success');
  };

  const handleUpdate = async (data: any) => {
    if (!editingProject) return;
    const p = await projectsApi.update(editingProject.id, data);
    setProjects(prev => prev.map(x => x.id === p.id ? p : x));
    toast('Project updated', 'success');
  };

  const handleDelete = async (project: Project) => {
    await projectsApi.delete(project.id);
    setProjects(prev => prev.filter(p => p.id !== project.id));
    setConfirmDelete(null);
    toast('Project deleted', 'info');
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      breadcrumb={<span>Projects</span>}
      topbarRight={
        <button className="btn btn-sm" id="create-project-btn" style={{ background: '#3f3f46', color: '#fff' }} onClick={() => setModal('create')}>
          + New Project
        </button>
      }
    >
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
      </div>

      {/* Search */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="form-input" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} id="project-search" />
        </div>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p className="empty-state-title">{search ? 'No projects found' : 'No projects yet'}</p>
          <p className="empty-state-desc">{search ? 'Try a different search term' : 'Create your first project to get started'}</p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Project</button>
          )}
        </div>
      ) : (
        <div className="project-grid">
          {filtered.map(project => {
            const progress = project.totalTasks > 0
              ? Math.round((project.completedTasks / project.totalTasks) * 100)
              : 0;
            return (
              <div
                key={project.id}
                className="project-card"
                style={{ '--project-color': project.color } as React.CSSProperties}
              >
                <div className="project-card-header">
                  <div className="project-card-icon">{project.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/projects/${project.id}`}>
                      <div className="project-card-title">{project.name}</div>
                    </Link>
                    <span className="badge" style={{
                      background: `${STATUS_COLORS[project.status]}20`,
                      color: STATUS_COLORS[project.status],
                      fontSize: '10px',
                    }}>
                      {project.status.replace('_', ' ')}
                    </span>
                    {project.approvalStatus === 'PENDING' && (
                      <span className="badge" style={{
                        marginLeft: '4px',
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: '10px',
                      }}>
                        AWAITING APPROVAL
                      </span>
                    )}
                    {project.approvalStatus === 'REJECTED' && (
                      <span className="badge" style={{
                        marginLeft: '4px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '10px',
                      }}>
                        REJECTED
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { setEditingProject(project); setModal('edit'); }}
                      data-tooltip="Edit"
                    >✎</button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setConfirmDelete(project)}
                      data-tooltip="Delete"
                    >🗑</button>
                  </div>
                </div>

                <p className="project-card-desc">
                  {project.description || 'No description provided.'}
                </p>

                <div className="project-progress">
                  <div className="project-progress-label">
                    <span>{project.completedTasks}/{project.totalTasks} tasks</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progress}%`, background: project.color } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <Link href={`/projects/${project.id}`} className="btn btn-ghost btn-sm">
                    Open →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <ProjectModal
          project={modal === 'edit' ? editingProject : null}
          onClose={() => { setModal(null); setEditingProject(null); }}
          onSave={modal === 'edit' ? handleUpdate : handleCreate}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Project</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
                This will permanently delete all tasks in this project. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Delete Project</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
