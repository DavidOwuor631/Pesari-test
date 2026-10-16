'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import TaskModal from '@/components/TaskModal';
import {
  tasksApi, projectsApi,
  type Task, type TaskStatus, type Priority, type Project, type TaskSearchParams,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review',
  DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_BADGE: Record<string, string> = {
  TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress',
  IN_REVIEW: 'badge-in-review', DONE: 'badge-done', CANCELLED: 'badge-cancelled',
};
const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'badge-urgent', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low',
};

export default function TasksPage() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; task?: Task } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    search: '', status: '', priority: '', projectId: '',
    page: 0, size: 10, sortBy: 'createdAt', sortDir: 'desc' as 'asc' | 'desc',
  });

  const setFilter = (k: string, v: any) =>
    setFilters(f => ({ ...f, [k]: v, page: k !== 'page' ? 0 : f.page }));

  const activeFilterParams = (): TaskSearchParams => ({
    ...(filters.search    ? { search:    filters.search }              : {}),
    ...(filters.status    ? { status:    filters.status as TaskStatus } : {}),
    ...(filters.priority  ? { priority:  filters.priority as Priority } : {}),
    ...(filters.projectId ? { projectId: Number(filters.projectId) }   : {}),
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await tasksApi.list({
        ...activeFilterParams(),
        page: filters.page, size: filters.size,
        sortBy: filters.sortBy, sortDir: filters.sortDir,
      });
      setTasks(res.content);
      setTotal(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      toast('Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { projectsApi.list().then(setProjects).catch(() => {}); }, []);

  /* ── CRUD handlers ─────────────────────────────────── */
  const handleCreate = async (data: any) => {
    await tasksApi.create(data);
    toast('Task created ✓', 'success');
    load();
  };

  const handleUpdate = async (data: any) => {
    if (!taskModal?.task) return;
    await tasksApi.update(taskModal.task.id, data);
    toast('Task updated ✓', 'success');
    load();
  };

  const handleDelete = async (task: Task) => {
    await tasksApi.delete(task.id);
    setConfirmDelete(null);
    toast('Task deleted', 'info');
    load();
  };

  /* ── Export handlers ───────────────────────────────── */
  const handleExport = async (format: 'csv' | 'json') => {
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      const params = activeFilterParams();
      if (format === 'csv') await tasksApi.exportAllCsv(params);
      else                  await tasksApi.exportAllJson(params);
      toast(`Exported as ${format.toUpperCase()} ✓`, 'success');
    } catch {
      toast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /* ── Sort helpers ──────────────────────────────────── */
  const sortIcon = (field: string) => {
    if (filters.sortBy !== field) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon active">{filters.sortDir === 'asc' ? '↑' : '↓'}</span>;
  };
  const toggleSort = (field: string) => {
    if (filters.sortBy === field) {
      setFilters(f => ({ ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc', page: 0 }));
    } else {
      setFilters(f => ({ ...f, sortBy: field, sortDir: 'desc', page: 0 }));
    }
  };

  const startItem = filters.page * filters.size + 1;
  const endItem   = Math.min((filters.page + 1) * filters.size, total);

  /* ── Render ────────────────────────────────────────── */
  return (
    <AppShell
      breadcrumb={<span>All Tasks</span>}
      topbarRight={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Export dropdown */}
          <div className="dropdown">
            <button
              id="export-tasks-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(v => !v)}
              disabled={isExporting}
            >
              {isExporting ? <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} /> : '↓'}
              {isExporting ? ' Exporting…' : ' Export'}
            </button>
            {showExportMenu && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  id="export-csv-btn"
                  onClick={() => handleExport('csv')}
                >
                  <span>📄</span> Export as CSV
                  {filters.search || filters.status || filters.priority || filters.projectId
                    ? <span className="tag" style={{ marginLeft: '4px', fontSize: '10px' }}>filtered</span>
                    : null}
                </div>
                <div
                  className="dropdown-item"
                  id="export-json-btn"
                  onClick={() => handleExport('json')}
                >
                  <span>📋</span> Export as JSON
                  {filters.search || filters.status || filters.priority || filters.projectId
                    ? <span className="tag" style={{ marginLeft: '4px', fontSize: '10px' }}>filtered</span>
                    : null}
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-sm"
            id="create-task-global-btn"
            style={{ background: '#3f3f46', color: '#fff' }}
            onClick={() => setTaskModal({ mode: 'create' })}
          >
            + New Task
          </button>
        </div>
      }
    >
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">All Tasks</h1>
        <p className="page-subtitle">
          {total} task{total !== 1 ? 's' : ''} across all projects
          {(filters.search || filters.status || filters.priority || filters.projectId) && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--accent-indigo)' }}>
              · filters active
              <button
                onClick={() => setFilters(f => ({ ...f, search: '', status: '', priority: '', projectId: '', page: 0 }))}
                style={{ marginLeft: '6px', cursor: 'pointer', color: 'var(--text-tertiary)', background: 'none', border: 'none', fontSize: '12px' }}
              >
                Clear ✕
              </button>
            </span>
          )}
        </p>
      </div>

      {/* ── Filters toolbar ─────────────────────────────── */}
      <div className="toolbar" style={{ gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {/* Search */}
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '180px', maxWidth: '300px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="form-input"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            id="tasks-search"
          />
        </div>

        {/* Status */}
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          id="tasks-status-filter"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {/* Priority */}
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={filters.priority}
          onChange={e => setFilter('priority', e.target.value)}
          id="tasks-priority-filter"
        >
          <option value="">All Priorities</option>
          {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Project */}
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={filters.projectId}
          onChange={e => setFilter('projectId', e.target.value)}
          id="tasks-project-filter"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>

        {/* Page size */}
        <select
          className="form-input form-select"
          style={{ width: 'auto', marginLeft: 'auto' }}
          value={filters.size}
          onChange={e => setFilter('size', Number(e.target.value))}
          id="tasks-page-size"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {/* ── Data Table ──────────────────────────────────── */}
      <div className="data-table-wrapper">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <table className="data-table" id="tasks-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('title')}>
                  Task {sortIcon('title')}
                </th>
                <th className="sortable" onClick={() => toggleSort('status')}>
                  Status {sortIcon('status')}
                </th>
                <th className="sortable" onClick={() => toggleSort('priority')}>
                  Priority {sortIcon('priority')}
                </th>
                <th>Project</th>
                <th className="sortable" onClick={() => toggleSort('dueDate')}>
                  Due Date {sortIcon('dueDate')}
                </th>
                <th className="sortable" onClick={() => toggleSort('createdAt')}>
                  Created {sortIcon('createdAt')}
                </th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">🔍</div>
                      <p className="empty-state-title">No tasks match your filters</p>
                      <p className="empty-state-desc">Try adjusting your search or filters above</p>
                    </div>
                  </td>
                </tr>
              ) : tasks.map(task => (
                <tr key={task.id}>
                  {/* Title + tags */}
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13.5px', lineHeight: '1.3', marginBottom: task.tags ? '4px' : 0 }}>
                      {task.title}
                    </div>
                    {task.tags && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {task.tags.split(',').map(t => (
                          <span key={t} className="tag">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`badge ${STATUS_BADGE[task.status] || 'badge-todo'}`}>
                      {STATUS_LABEL[task.status] || task.status}
                    </span>
                  </td>

                  {/* Priority */}
                  <td>
                    <span className={`badge ${PRIORITY_BADGE[task.priority] || 'badge-medium'}`}>
                      {task.priority}
                    </span>
                  </td>

                  {/* Project */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '2px',
                        background: task.projectColor || '#6366f1', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '13px' }}>{task.projectName}</span>
                    </div>
                  </td>

                  {/* Due date */}
                  <td>
                    {task.dueDate ? (
                      <span style={{ fontSize: '13px' }}>
                        {new Date(task.dueDate).toLocaleDateString('en', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>

                  {/* Created */}
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(task.createdAt).toLocaleDateString('en', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setTaskModal({ mode: 'edit', task })}
                        data-tooltip="Edit task"
                        id={`edit-task-${task.id}`}
                      >✎</button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setConfirmDelete(task)}
                        data-tooltip="Delete task"
                        id={`delete-task-${task.id}`}
                        style={{ color: 'var(--accent-red)' }}
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {startItem}–{endItem} of {total} task{total !== 1 ? 's' : ''}
            </span>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => setFilter('page', filters.page - 1)}
                disabled={filters.page === 0}
                id="prev-page-btn"
              >‹</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (filters.page <= 2)               p = i;
                else if (filters.page >= totalPages - 3) p = totalPages - 5 + i;
                else                                 p = filters.page - 2 + i;
                p = Math.max(0, Math.min(p, totalPages - 1));
                return (
                  <button
                    key={p}
                    className={`page-btn ${p === filters.page ? 'active' : ''}`}
                    onClick={() => setFilter('page', p)}
                    id={`page-btn-${p}`}
                  >
                    {p + 1}
                  </button>
                );
              })}

              <button
                className="page-btn"
                onClick={() => setFilter('page', filters.page + 1)}
                disabled={filters.page >= totalPages - 1}
                id="next-page-btn"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Task Create/Edit Modal ───────────────────────── */}
      {taskModal && (
        <TaskModal
          task={taskModal.task}
          projectId={taskModal.task?.projectId}
          onClose={() => setTaskModal(null)}
          onSave={taskModal.mode === 'edit' ? handleUpdate : handleCreate}
          onDelete={taskModal.task ? () => setConfirmDelete(taskModal.task!) : undefined}
        />
      )}

      {/* ── Delete Confirmation Modal ───────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal"
            style={{ maxWidth: '420px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Delete Task?</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Are you sure you want to permanently delete{' '}
                <strong style={{ color: 'var(--text-primary)' }}>"{confirmDelete.title}"</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                id="confirm-delete-btn"
                onClick={() => handleDelete(confirmDelete)}
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
