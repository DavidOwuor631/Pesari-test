-- V4: Seed sample data for development/demo purposes
-- Sample projects owned by admin
INSERT INTO projects (name, description, status, color, icon, owner_id)
VALUES
    ('Platform Redesign', 'Redesigning the core platform UI/UX for better user experience', 'ACTIVE', '#6366f1', '🎨', 1),
    ('API Gateway', 'Building a unified API gateway for all microservices', 'ACTIVE', '#10b981', '⚡', 1),
    ('Mobile App v2', 'Next version of the mobile application with offline support', 'PLANNING', '#f59e0b', '📱', 1);

-- Sample tasks
INSERT INTO tasks (title, description, status, priority, due_date, project_id, created_by)
VALUES
    ('Design new dashboard layout', 'Create wireframes and high-fidelity mockups for the new dashboard', 'IN_PROGRESS', 'HIGH', '2026-10-30', 1, 1),
    ('Implement dark mode', 'Add system-wide dark mode support with user preference persistence', 'TODO', 'MEDIUM', '2026-11-05', 1, 1),
    ('Component library audit', 'Review and document all existing UI components', 'DONE', 'LOW', '2026-10-15', 1, 1),
    ('Set up rate limiting', 'Implement rate limiting per client and per endpoint', 'IN_PROGRESS', 'HIGH', '2026-10-25', 2, 1),
    ('Add request logging', 'Centralized request/response logging with correlation IDs', 'TODO', 'MEDIUM', '2026-11-01', 2, 1),
    ('API documentation', 'Generate and publish OpenAPI 3.0 documentation', 'DONE', 'HIGH', '2026-10-10', 2, 1),
    ('Offline sync strategy', 'Design the data synchronization strategy for offline mode', 'TODO', 'HIGH', '2026-11-15', 3, 1),
    ('Push notifications', 'Integrate Firebase Cloud Messaging for push notifications', 'TODO', 'MEDIUM', '2026-11-20', 3, 1);
