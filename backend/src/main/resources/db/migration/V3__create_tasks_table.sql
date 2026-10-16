-- V3: Create tasks table
CREATE TABLE tasks (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    status       VARCHAR(30)  NOT NULL DEFAULT 'TODO',
    priority     VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date     DATE,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id  BIGINT       REFERENCES users(id)       ON DELETE SET NULL,
    created_by   BIGINT NOT NULL REFERENCES users(id),
    tags         VARCHAR(500),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project    ON tasks(project_id);
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_priority   ON tasks(priority);
CREATE INDEX idx_tasks_due_date   ON tasks(due_date);

-- Full-text search index on title and description
CREATE INDEX idx_tasks_title_search ON tasks USING GIN(to_tsvector('english', title));
