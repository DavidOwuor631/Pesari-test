-- V1: Create users table
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

-- Index for faster lookup by email and username
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Seed admin user (password: Admin@123 - bcrypt hashed)
INSERT INTO users (username, email, password, role, first_name, last_name)
VALUES (
    'admin',
    'admin@pesira.com',
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi',
    'ADMIN',
    'System',
    'Admin'
);
