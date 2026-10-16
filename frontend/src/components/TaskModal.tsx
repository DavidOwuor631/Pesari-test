'use client';

import React, { useState, useEffect } from 'react';
import { type Task, type Priority, type TaskStatus, projectsApi, type Project } from '@/lib/api';

interface TaskModalProps {
  task?: Task;
  projectId?: number;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW',   label: 'In Review' },
  { value: 'DONE',        label: 'Done' },
  { value: 'CANCELLED',   label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; icon: string }[] = [
  { value: 'URGENT', label: 'Urgent', icon: '🔴' },
  { value: 'HIGH',   label: 'High',   icon: '🟠' },
  { value: 'MEDIUM', label: 'Medium', icon: '🟡' },
  { value: 'LOW',    label: 'Low',    icon: '🟢' },
];

export default function TaskModal({ task, projectId, onClose, onSave, onDelete }: TaskModalProps) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'TODO' as TaskStatus,
    priority: task?.priority || 'MEDIUM' as Priority,
    dueDate: task?.dueDate || '',
    tags: task?.tags || '',
    projectId: projectId || task?.projectId || 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!projectId) {
      projectsApi.list().then(setProjects).catch(() => {});
    }
  }, [projectId]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (form.title.length > 200) e.title = 'Title must be under 200 characters';
    if (!form.projectId) e.projectId = 'Project is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        tags: form.tags || undefined,
        projectId: form.projectId,
      });
      onClose();
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to save task' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEdit && onDelete && (
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(); onClose(); }}>
                🗑 Delete
              </button>
            )}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {errors.general && (
            <div style={{ background: 'var(--accent-red-lt)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '16px', fontSize: '13px', color: 'var(--accent-red)' }}>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              className="form-input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className="form-input form-textarea"
              placeholder="Add more details about this task…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-status">Status</label>
              <select id="task-status" className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select id="task-priority" className="form-input form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-due">Due Date</label>
              <input
                id="task-due"
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {!projectId && (
              <div className="form-group">
                <label className="form-label" htmlFor="task-project">Project *</label>
                <select id="task-project" className="form-input form-select" value={form.projectId} onChange={e => set('projectId', Number(e.target.value))}>
                  <option value={0}>Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
                {errors.projectId && <span className="form-error">{errors.projectId}</span>}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-tags">Tags</label>
            <input
              id="task-tags"
              className="form-input"
              placeholder="design, frontend, bug (comma-separated)"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} id="task-save-btn">
            {isSaving ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  );
}
