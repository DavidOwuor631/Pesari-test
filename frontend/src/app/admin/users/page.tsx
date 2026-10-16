'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { usersApi, projectsApi, tasksApi, type User, type Project, type Task, type Role } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

export default function AdminUsersPage({ approvalOnly = false }: { approvalOnly?: boolean }) {
  const [users, setUsers]     = useState<User[]>([]);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', firstName: '', lastName: '', role: 'USER' as Role });
  const [activeTab, setActiveTab] = useState<'users' | 'approvals'>('users');
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const updateRole = async (target: User) => {
    const role = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change ${target.username}'s role to ${role}?`)) return;
    try {
      const updated = await usersApi.updateRole(target.id, role);
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
      toast('Role updated', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to update role', 'error');
    }
  };

  const deleteUser = async (target: User) => {
    if (!window.confirm(`Delete ${target.username}? This cannot be undone.`)) return;
    try {
      await usersApi.delete(target.id);
      setUsers(current => current.filter(item => item.id !== target.id));
      toast('User deleted', 'info');
    } catch (error: any) {
      toast(error.message || 'Failed to delete user', 'error');
    }
  };

  const loadPending = async () => {
    const [all, projects, tasksPage, tasks] = await Promise.all([
      projectsApi.list(), projectsApi.pending(), tasksApi.list({ size: 100 }), tasksApi.pending()
    ]);
    const projectsById = new Map(all.map(project => [project.id, project]));
    projects.forEach(project => projectsById.set(project.id, project));
    setAllProjects(Array.from(projectsById.values()));
    setPendingProjects(projects);
    setPendingTasks(tasks);
    const tasksById = new Map(tasksPage.content.map(task => [task.id, task]));
    tasks.forEach(task => tasksById.set(task.id, task));
    setAllTasks(Array.from(tasksById.values()));
  };

  const reviewProject = async (project: Project, approved: boolean) => {
    try {
      const reviewed = await projectsApi.review(project.id, approved);
      setAllProjects(items => items.map(item => item.id === reviewed.id ? reviewed : item));
      setPendingProjects(items => items.filter(item => item.id !== project.id));
      toast(approved ? 'Project approved' : 'Project rejected', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to review project', 'error');
    }
  };

  const reviewTask = async (task: Task, approved: boolean) => {
    await tasksApi.review(task.id, approved);
    setPendingTasks(items => items.filter(item => item.id !== task.id));
    toast(approved ? 'Task approved' : 'Task rejected', 'success');
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await usersApi.create(newUser);
      setUsers(items => [...items, created]);
      setNewUser({ username: '', email: '', password: '', firstName: '', lastName: '', role: 'USER' });
      setShowCreateUser(false);
      toast('User created', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to create user', 'error');
    }
  };

  useEffect(() => {
    setActiveTab(approvalOnly || new URLSearchParams(window.location.search).get('tab') === 'approvals' ? 'approvals' : 'users');
    if (user && user.role !== 'ADMIN') { router.replace('/dashboard'); return; }
    usersApi.list()
      .then(setUsers)
      .catch(() => toast('Failed to load users', 'error'))
      .finally(() => setIsLoading(false));
    loadPending().catch(() => toast('Failed to load approval queue', 'error'));
  }, [user, router, approvalOnly]);

  /* ── Derived data ─────────────────────────────────── */
  const filtered = users.filter(u => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const userCount  = users.filter(u => u.role === 'USER').length;

  /* ── Export ───────────────────────────────────────── */
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const data = filtered.map(u => ({
        id: u.id, username: u.username, email: u.email,
        firstName: u.firstName, lastName: u.lastName, role: u.role,
      }));

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'users.json'; a.click(); URL.revokeObjectURL(a.href);
      } else {
        const header = 'ID,Username,Email,First Name,Last Name,Role';
        const rows = data.map(u =>
          [u.id, `"${u.username}"`, `"${u.email}"`, `"${u.firstName||''}"`, `"${u.lastName||''}"`, u.role].join(',')
        );
        const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'users.csv'; a.click(); URL.revokeObjectURL(a.href);
      }
      toast(`Users exported as ${format.toUpperCase()} ✓`, 'success');
    } finally {
      setIsExporting(false);
    }
  };

  /* ── Render ────────────────────────────────────────── */
  return (
    <AppShell
      breadcrumb={
        <>
          <span style={{ color: 'var(--text-secondary)' }}>Admin</span>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span>{approvalOnly ? 'Approvals' : 'Users'}</span>
        </>
      }
      topbarRight={
        <div style={{ display: approvalOnly ? 'none' : 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCreateUser(true)}
          >
            + Create user
          </button>
          <button
            className="btn btn-secondary btn-sm"
            id="export-users-csv"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            ↓ CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            id="export-users-json"
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            ↓ JSON
          </button>
        </div>
      }
    >
      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <form className="modal" onSubmit={createUser} onClick={event => event.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Create user</h2></div>
            <div className="modal-body">
              {(['username', 'email', 'password', 'firstName', 'lastName'] as const).map(field => (
                <div className="form-group" key={field}>
                  <label className="form-label">{field === 'firstName' ? 'First name' : field === 'lastName' ? 'Last name' : field}</label>
                  <input className="form-input" type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} required={['username', 'email', 'password'].includes(field)} value={newUser[field]} onChange={event => setNewUser(current => ({ ...current, [field]: event.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input form-select" value={newUser.role} onChange={event => setNewUser(current => ({ ...current, role: event.target.value as Role }))}>
                  <option value="USER">User</option><option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateUser(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Create user</button>
            </div>
          </form>
        </div>
      )}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedProject.icon} {selectedProject.name}</h2>
                <p className="page-subtitle">Project submission details</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                <div>
                  <div className="form-label">Project name</div>
                  <div>{selectedProject.name}</div>
                </div>
                <div>
                  <div className="form-label">Approval status</div>
                  <div>{selectedProject.approvalStatus}</div>
                </div>
                <div>
                  <div className="form-label">Submitted by</div>
                  <div>{selectedProject.ownerName} (User ID: {selectedProject.ownerId})</div>
                </div>
                <div>
                  <div className="form-label">Project status</div>
                  <div>{selectedProject.status}</div>
                </div>
                <div>
                  <div className="form-label">Appearance</div>
                  <div>{selectedProject.icon} · {selectedProject.color}</div>
                </div>
                <div>
                  <div className="form-label">Project ID</div>
                  <div>{selectedProject.id}</div>
                </div>
                <div>
                  <div className="form-label">Created</div>
                  <div>{new Date(selectedProject.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="form-label">Last updated</div>
                  <div>{new Date(selectedProject.updatedAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="form-label">Tasks</div>
                  <div>{selectedProject.totalTasks} total · {selectedProject.completedTasks} completed</div>
                </div>
                <div>
                  <div className="form-label">Members</div>
                  <div>{selectedProject.memberCount}</div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <div className="form-label">Description</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  {selectedProject.description || 'No description was provided.'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedProject.approvalStatus === 'PENDING' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => { reviewProject(selectedProject, false); setSelectedProject(null); }}>Reject</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { reviewProject(selectedProject, true); setSelectedProject(null); }}>Approve project</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{activeTab === 'users' ? 'User Management' : 'Approval Center'}</h1>
        <p className="page-subtitle">
          {activeTab === 'users' ? 'Manage workspace members and their roles' : 'Review projects and tasks before they become active'}
        </p>
      </div>

      {!approvalOnly && <div className="view-toggle" style={{ marginBottom: '24px', width: 'fit-content' }}>
        <button className={`view-toggle-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Users
        </button>
        <button className={`view-toggle-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
          Approvals {pendingProjects.length + pendingTasks.length > 0 ? `(${pendingProjects.length + pendingTasks.length})` : ''}
        </button>
      </div>}

      {activeTab === 'approvals' && (
        <div className="data-table-wrapper" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 className="section-title">Awaiting approval</h2>
              <p className="page-subtitle">Approving a project makes it active for its owner and eligible for tasks.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadPending()}>Refresh</button>
          </div>
          {allProjects.length === 0 && pendingTasks.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-title">Nothing awaiting approval</p>
              <p className="empty-state-desc">New user projects and tasks will appear here.</p>
            </div>
          )}
          {allProjects.map(project => (
            <div key={`project-${project.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
              <div>
                <strong>{project.icon} {project.name}</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Project · {project.ownerName} · {project.approvalStatus}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProject(project)}>View details</button>
                {project.approvalStatus === 'PENDING' ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => reviewProject(project, true)}>Approve project</button>
                    <button className="btn btn-danger btn-sm" onClick={() => reviewProject(project, false)}>Reject</button>
                  </>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/projects/${project.id}`)}>Open project</button>
                )}
              </div>
            </div>
          ))}
          {pendingTasks.map(task => (
            <div key={`task-${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
              <div>
                <strong>✅ {task.title}</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>Task · {task.projectName} · {task.createdByName}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => reviewTask(task, true)}>Approve task</button>
                <button className="btn btn-danger btn-sm" onClick={() => reviewTask(task, false)}>Reject</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '28px' }}>
            <h2 className="section-title">Task progress</h2>
            <p className="page-subtitle">Monitor every task created in the workspace and its current status.</p>
            {allTasks.map(task => (
              <div key={`progress-${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div>
                  <strong>{task.title}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {task.projectName} · {task.createdByName} · {task.approvalStatus}
                  </div>
                </div>
                <span className="badge">{task.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && !approvalOnly && <>
      {/* Stats row */}
      {!isLoading && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f4f4f5' }}>👥</div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f4f4f5' }}>🛡️</div>
            <div className="stat-value">{adminCount}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f4f4f5' }}>👤</div>
            <div className="stat-value">{userCount}</div>
            <div className="stat-label">Regular Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f4f4f5' }}>🔍</div>
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-label">Matching Filter</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: '320px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="form-input"
            placeholder="Search by name, username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="users-search"
          />
        </div>

        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          id="users-role-filter"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>

        {(search || roleFilter) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setRoleFilter(''); }}
          >
            Clear filters ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <table className="data-table" id="users-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">👥</div>
                      <p className="empty-state-title">No users found</p>
                      <p className="empty-state-desc">Try a different search term or role filter</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => {
                const initials = [u.firstName?.[0], u.lastName?.[0]]
                  .filter(Boolean).join('').toUpperCase() || u.username[0].toUpperCase();
                const fullName = u.firstName || u.lastName
                  ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                  : null;
                return (
                  <tr key={u.id}>
                    {/* Avatar + name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="avatar"
                          style={{
                            background: u.role === 'ADMIN'
                              ? 'linear-gradient(135deg, #71717a, #52525b)'
                              : 'linear-gradient(135deg, #a1a1aa, #71717a)',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '13.5px' }}>
                            {fullName || u.username}
                          </div>
                          {fullName && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              @{u.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Username */}
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {u.username}
                      </span>
                    </td>

                    {/* Email */}
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>

                    {/* Role badge — always grey */}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: '#f4f4f5',
                        color: '#52525b',
                        border: '1px solid #e4e4e7',
                      }}>
                        {u.role === 'ADMIN' ? '🛡️' : '👤'} {u.role}
                      </span>
                    </td>

                    {/* ID */}
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        #{u.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateRole(u)} disabled={u.id === user?.id}>
                          Make {u.role === 'ADMIN' ? 'User' : 'Admin'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u)} disabled={u.id === user?.id} style={{ color: 'var(--accent-red)' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-default)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}>
            Showing {filtered.length} of {users.length} member{users.length !== 1 ? 's' : ''}
            {(search || roleFilter) && ' (filtered)'}
          </div>
        )}
      </div>
      </>}
    </AppShell>
  );
}
