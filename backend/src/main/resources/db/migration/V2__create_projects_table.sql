-- V2: Create projects table
CREATE TABLE projects (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    status      VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    color       VARCHAR(7)   DEFAULT '#6366f1',
    icon        VARCHAR(10)  DEFAULT '📋',
    owner_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Project members (many-to-many: users <-> projects)
CREATE TABLE project_members (
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_projects_owner   ON projects(owner_id);
CREATE INDEX idx_projects_status  ON projects(status);
CREATE INDEX idx_pm_user          ON project_members(user_id);
