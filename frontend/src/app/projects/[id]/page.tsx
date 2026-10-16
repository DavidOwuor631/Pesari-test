'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { projectsApi, tasksApi, type Project, type Task, type TaskStatus, type Priority } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import TaskModal from '@/components/TaskModal';

const STATUS_COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'TODO',        label: 'To Do',      color: '#9b9a97' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { key: 'IN_REVIEW',   label: 'In Review',   color: '#8b5cf6' },
  { key: 'DONE',        label: 'Done',        color: '#10b981' },
];

function getPriorityClass(p: Priority) {
  return { URGENT: 'badge-urgent', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' }[p] || 'badge-medium';
}

function formatDueDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'overdue' };
  if (days <= 3) return { label: `${days}d left`, cls: 'due-soon' };
  return { label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }), cls: '' };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; task?: Task } | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [proj, tasksPage] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.list({ projectId, size: 100 }),
      ]);
      setProject(proj);
      setTasks(tasksPage.content);
    } catch {
      toast('Failed to load project', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateTask = async (data: any) => {
    const task = await tasksApi.create({ ...data, projectId });
    setTasks(prev => [task, ...prev]);
    toast('Task created', 'success');
  };

  const handleUpdateTask = async (data: any) => {
    if (!taskModal?.task) return;
    const updated = await tasksApi.update(taskModal.task.id, data);
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    toast('Task updated', 'success');
  };

  const handleDeleteTask = async (task: Task) => {
    await tasksApi.delete(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    toast('Task deleted', 'info');
  };

  const filtered = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const progress = project ? (project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0) : 0;

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner spinner-lg" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="empty-state">
          <div className="empty-state-icon">😞</div>
          <p className="empty-state-title">Project not found</p>
          <Link href="/projects" className="btn btn-primary">Back to Projects</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumb={
        <>
          <Link href="/projects" style={{ color: 'var(--text-secondary)' }}>Projects</Link>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span>{project.name}</span>
        </>
      }
      topbarRight={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => tasksApi.exportCsv(projectId)}>
            ↓ CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => tasksApi.exportJson(projectId)}>
            ↓ JSON
          </button>
          <button
            className="btn btn-sm"
            id="create-task-btn"
            style={{ background: '#3f3f46', color: '#fff' }}
            onClick={() => setTaskModal({ mode: 'create' })}
          >
            + New Task
          </button>
        </div>
      }
    >
      {/* Project Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '56px', height: '56px', fontSize: '28px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `3px solid ${project.color}40`,
        }}>
          {project.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: '24px', marginBottom: '2px' }}>{project.name}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {project.description || 'No description'} · {project.totalTasks} tasks · {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="progress-bar" style={{ width: '200px' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: project.color } as React.CSSProperties} />
            </div>
            <span className="text-xs text-secondary">{progress}% complete</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="form-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} id="task-search" />
        </div>
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} data-tooltip="Board view">⊞</button>
          <button className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} data-tooltip="List view">≡</button>
        </div>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {STATUS_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column-header">
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span className="kanban-column-title">{col.label}</span>
                  <span className="kanban-column-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map(task => {
                    const due = formatDueDate(task.dueDate);
                    return (
                      <div key={task.id} className="task-card" onClick={() => setTaskModal({ mode: 'edit', task })}>
                        <div className="task-card-title">{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {task.description}
                          </div>
                        )}
                        <div className="task-card-meta">
                          <span className={`badge ${getPriorityClass(task.priority)}`}>{task.priority}</span>
                          {task.tags && task.tags.split(',').slice(0, 1).map(tag => (
                            <span key={tag} className="tag">{tag.trim()}</span>
                          ))}
                        </div>
                        <div className="task-card-footer">
                          {due ? (
                            <span className={`due-date ${due.cls}`}>📅 {due.label}</span>
                          ) : <span />}
                          {task.assigneeName ? (
                            <div className="avatar avatar-sm" data-tooltip={task.assigneeName}>
                              {task.assigneeName[0]}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'flex-start', width: '100%', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}
                    onClick={() => setTaskModal({ mode: 'create' })}
                  >
                    + Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Assignee</th>
                <th style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No tasks found
                  </td>
                </tr>
              ) : filtered.map(task => {
                const due = formatDueDate(task.dueDate);
                const statusBadgeMap: Record<string, string> = {
                  TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress',
                  IN_REVIEW: 'badge-in-review', DONE: 'badge-done', CANCELLED: 'badge-cancelled'
                };
                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      {task.tags && <div style={{ marginTop: '3px', display: 'flex', gap: '4px' }}>
                        {task.tags.split(',').map(t => <span key={t} className="tag">{t.trim()}</span>)}
                      </div>}
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeMap[task.status] || 'badge-todo'}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td><span className={`badge ${getPriorityClass(task.priority)}`}>{task.priority}</span></td>
                    <td>{due ? <span className={`due-date ${due.cls}`}>{due.label}</span> : '—'}</td>
                    <td>{task.assigneeName || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setTaskModal({ mode: 'edit', task })}>✎</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTask(task)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal.task}
          projectId={projectId}
          onClose={() => setTaskModal(null)}
          onSave={taskModal.mode === 'edit' ? handleUpdateTask : handleCreateTask}
          onDelete={taskModal.task ? () => handleDeleteTask(taskModal.task!) : undefined}
        />
      )}
    </AppShell>
  );
}
