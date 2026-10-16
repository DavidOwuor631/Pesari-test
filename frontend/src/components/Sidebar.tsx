'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  count?: number;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/projects',  icon: '📁', label: 'Projects' },
  { href: '/tasks',     icon: '✅', label: 'All Tasks' },
];

const adminNavItems: NavItem[] = [
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/approvals', icon: '🛡️', label: 'Approvals' },
];

interface SidebarProps {
  projects?: Array<{ id: number; name: string; color: string; icon: string }>;
}

export default function Sidebar({ projects = [] }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase()
    || user?.username?.[0]?.toUpperCase() || '?';

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="sidebar">
      {/* Workspace Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">P</div>
        <div className="sidebar-workspace">
          <div className="sidebar-workspace-name">Pesira Workspace</div>
          <div className="sidebar-workspace-user">{user?.email}</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {/* Main Navigation */}
        <div className="sidebar-section">
          {mainNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="sidebar-item-count">{item.count}</span>
              )}
            </Link>
          ))}
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Projects</div>
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`sidebar-item ${pathname === `/projects/${project.id}` ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{project.icon}</span>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {project.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Admin Section */}
        {user?.role === 'ADMIN' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Admin</div>
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer" style={{ position: 'relative' }}>
        <button
          className="sidebar-item"
          style={{ width: '100%', margin: 0 }}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div
            className="avatar avatar-sm"
            style={{
              fontSize: '10px',
              background: 'linear-gradient(135deg, #71717a, #52525b)',
            }}
          >{initials}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  background: '#f4f4f5',
                  color: '#52525b',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  border: '1px solid #e4e4e7',
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>⋯</span>
        </button>

        {showUserMenu && (
          <div className="dropdown-menu" style={{ bottom: 'calc(100% + 6px)', top: 'auto' }}>
            <div className="dropdown-item" onClick={() => setShowUserMenu(false)}>
              <span>👤</span> Profile
            </div>
            <div className="dropdown-divider" />
            <div className="dropdown-item danger" onClick={logout}>
              <span>↩</span> Sign out
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
