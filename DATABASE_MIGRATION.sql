-- Pesira Task Tracker - consolidated PostgreSQL database script
-- This script creates a fresh database schema and development seed data.
-- For an existing installation, use the Flyway migrations under:
-- backend/src/main/resources/db/migration/
--
-- Run after creating the database:
--   psql -U tasktracker_user -d tasktracker -f DATABASE_MIGRATION.sql

BEGIN;

-- Users
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
    first_name  VARCHAR(50),
    last_name   VARCHAR(50),
    avatar_url  VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Default administrator
-- Password: Admin@123
INSERT INTO users (username, email, password, role, first_name, last_name)
VALUES (
    'admin',
    'admin@pesira.com',
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi',
    'ADMIN',
    'System',
    'Admin'
);

-- Projects
CREATE TABLE projects (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    status      VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    color       VARCHAR(7)   DEFAULT '#6366f1',
    icon        VARCHAR(10)  DEFAULT '📋',
    owner_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_approval_status ON projects(approval_status);

-- Project membership
CREATE TABLE project_members (
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_pm_user ON project_members(user_id);

-- Tasks
CREATE TABLE tasks (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    status       VARCHAR(30)  NOT NULL DEFAULT 'TODO',
    priority     VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date     DATE,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_by   BIGINT NOT NULL REFERENCES users(id),
    tags         VARCHAR(500),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX idx_tasks_title_search
    ON tasks USING GIN(to_tsvector('english', title));

-- Development/demo projects
INSERT INTO projects
    (name, description, status, color, icon, owner_id)
VALUES
    ('Platform Redesign',
     'Redesigning the core platform UI/UX for better user experience',
     'ACTIVE', '#6366f1', '🎨', 1),
    ('API Gateway',
     'Building a unified API gateway for all microservices',
     'ACTIVE', '#10b981', '⚡', 1),
    ('Mobile App v2',
     'Next version of the mobile application with offline support',
     'PLANNING', '#f59e0b', '📱', 1);

-- Development/demo tasks
INSERT INTO tasks
    (title, description, status, priority, due_date, project_id, created_by)
VALUES
    ('Design new dashboard layout',
     'Create wireframes and high-fidelity mockups for the new dashboard',
     'IN_PROGRESS', 'HIGH', '2026-10-30', 1, 1),
    ('Implement dark mode',
     'Add system-wide dark mode support with user preference persistence',
     'TODO', 'MEDIUM', '2026-11-05', 1, 1),
    ('Component library audit',
     'Review and document all existing UI components',
     'DONE', 'LOW', '2026-10-15', 1, 1),
    ('Set up rate limiting',
     'Implement rate limiting per client and per endpoint',
     'IN_PROGRESS', 'HIGH', '2026-10-25', 2, 1),
    ('Add request logging',
     'Centralized request/response logging with correlation IDs',
     'TODO', 'MEDIUM', '2026-11-01', 2, 1),
    ('API documentation',
     'Generate and publish OpenAPI 3.0 documentation',
     'DONE', 'HIGH', '2026-10-10', 2, 1),
    ('Offline sync strategy',
     'Design the data synchronization strategy for offline mode',
     'TODO', 'HIGH', '2026-11-15', 3, 1),
    ('Push notifications',
     'Integrate Firebase Cloud Messaging for push notifications',
     'TODO', 'MEDIUM', '2026-11-20', 3, 1);

COMMIT;
