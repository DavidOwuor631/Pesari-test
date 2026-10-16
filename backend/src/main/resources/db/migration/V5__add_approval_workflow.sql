-- V5: Require administrator approval for user-created projects and tasks
ALTER TABLE projects
    ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

ALTER TABLE tasks
    ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

CREATE INDEX idx_projects_approval_status ON projects(approval_status);
CREATE INDEX idx_tasks_approval_status ON tasks(approval_status);
