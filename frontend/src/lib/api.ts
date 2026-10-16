// API Client — centralized HTTP layer for all backend calls

const API_BASE = '/api';

export type Role = 'ADMIN' | 'USER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  icon: string;
  ownerId: number;
  ownerName: string;
  totalTasks: number;
  completedTasks: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  approvalStatus: ApprovalStatus;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: number;
  projectName: string;
  projectColor: string;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  createdById: number;
  createdByName: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  approvalStatus: ApprovalStatus;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

// ─── HTTP helper ──────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tt_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw { status: res.status, message: data.message || 'Request failed', errors: data.errors };
  }

  return data as T;
}

// ─── Auth API ────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (data: { username: string; email: string; password: string; firstName?: string; lastName?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<User>('/auth/me'),
};

// ─── Projects API ────────────────────────────────────────

export const projectsApi = {
  list: () => request<Project[]>('/projects'),

  paged: (params: { search?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page !== undefined) q.set('page', String(params.page));
    if (params.size !== undefined) q.set('size', String(params.size));
    return request<PageResponse<Project>>(`/projects/paged?${q}`);
  },

  get: (id: number) => request<Project>(`/projects/${id}`),

  create: (data: { name: string; description?: string; status?: ProjectStatus; color?: string; icon?: string }) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ name: string; description: string; status: ProjectStatus; color: string; icon: string }>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  pending: () => request<Project[]>('/projects/admin/pending'),
  review: (id: number, approved: boolean) =>
    request<Project>(`/projects/admin/${id}/approval?approved=${approved}`, { method: 'PATCH' }),
};

// ─── Tasks API ───────────────────────────────────────────

export interface TaskSearchParams {
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const tasksApi = {
  list: (params: TaskSearchParams = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return request<PageResponse<Task>>(`/tasks?${q}`);
  },

  get: (id: number) => request<Task>(`/tasks/${id}`),
  pending: () => request<Task[]>('/tasks/admin/pending'),
  review: (id: number, approved: boolean) =>
    request<Task>(`/tasks/admin/${id}/approval?approved=${approved}`, { method: 'PATCH' }),

  create: (data: {
    title: string; description?: string; projectId: number;
    status?: TaskStatus; priority?: Priority; dueDate?: string; assigneeId?: number; tags?: string;
  }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{
    title: string; description: string; status: TaskStatus;
    priority: Priority; dueDate: string; assigneeId: number; tags: string;
  }>) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  exportJson: async (projectId: number) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/tasks/export/json?projectId=${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportCsv: async (projectId: number) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/tasks/export/csv?projectId=${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Export all tasks visible to the current user using authenticated server-side exports.
  exportAllJson: async (params: TaskSearchParams) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const token = getToken();
    const res = await fetch(`${API_BASE}/tasks/export/all/json?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export request failed');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportAllCsv: async (params: TaskSearchParams) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const token = getToken();
    const res = await fetch(`${API_BASE}/tasks/export/all/csv?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export request failed');
    const blob = new Blob([await res.text()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks-export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

// ─── Users API ───────────────────────────────────────────

export const usersApi = {
  list: () => request<User[]>('/users'),
  create: (data: { username: string; email: string; password: string; firstName?: string; lastName?: string; role: Role }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: number) => request<User>(`/users/${id}`),
  updateRole: (id: number, role: Role) =>
    request<User>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  delete: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),
};
