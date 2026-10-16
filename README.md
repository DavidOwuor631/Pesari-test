# 🚀 Pesira Task Tracker

A **Notion-inspired** full-stack project and task management application built for the Pesira Technical Assessment.

---

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | Next.js 14 (App Router) · TypeScript · Vanilla CSS |
| Backend    | Java 17 · Spring Boot 3.2 · Spring Security · JWT  |
| Database   | PostgreSQL 15                                     |
| ORM        | Spring Data JPA (Hibernate)                       |
| Migrations | Flyway                                            |
| Auth       | JWT (JJWT 0.12.x) with Role-based Access Control  |

---

## Prerequisites

- Java 17+
- Maven 3.8+ (or use the included `./mvnw` wrapper)
- Node.js 18+
- PostgreSQL 15+

---

## Quick Start

### 1. Database Setup

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE tasktracker;
CREATE USER tasktracker_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tasktracker TO tasktracker_user;
```

### 2. Backend

```bash
cd backend

# Configure database credentials (edit or set env vars)
# DB_USERNAME, DB_PASSWORD, JWT_SECRET

# Run with Maven wrapper (downloads Maven automatically)
./mvnw spring-boot:run

# Or with Maven if installed
mvn spring-boot:run
```

The API will start at `http://localhost:8080`.

Flyway will automatically run migrations on startup:
- `V1`: Creates `users` table + seeds admin user
- `V2`: Creates `projects` and `project_members` tables
- `V3`: Creates `tasks` table with full-text search index
- `V4`: Seeds sample projects and tasks
- `V5`: Adds project and task approval statuses and indexes

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`.

---

## Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | `admin`  | `Admin@123` |

---

## API Reference

### Authentication
| Method | Endpoint            | Description         |
|--------|---------------------|---------------------|
| POST   | `/api/auth/register` | Register new user   |
| POST   | `/api/auth/login`    | Login, get JWT token |
| GET    | `/api/auth/me`       | Get current user    |

### Projects
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/projects`            | Get all accessible projects |
| GET    | `/api/projects/paged`      | Paginated projects with search |
| GET    | `/api/projects/{id}`       | Get project by ID        |
| POST   | `/api/projects`            | Create project           |
| PUT    | `/api/projects/{id}`       | Update project           |
| DELETE | `/api/projects/{id}`       | Delete project           |
| GET    | `/api/projects/admin/pending` | Admin: list projects awaiting approval |
| PATCH  | `/api/projects/admin/{id}/approval?approved=true` | Admin: approve or reject a project |

### Tasks
| Method | Endpoint                      | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | `/api/tasks`                  | Get tasks with filter/sort/paginate |
| GET    | `/api/tasks/{id}`             | Get task by ID                    |
| POST   | `/api/tasks`                  | Create task                       |
| PUT    | `/api/tasks/{id}`             | Update task                       |
| DELETE | `/api/tasks/{id}`             | Delete task                       |
| GET    | `/api/tasks/export/json`      | Export tasks as JSON              |
| GET    | `/api/tasks/export/csv`       | Export tasks as CSV               |
| GET    | `/api/tasks/admin/pending`    | Admin: list tasks awaiting approval |
| PATCH  | `/api/tasks/admin/{id}/approval?approved=true` | Admin: approve or reject a task |

### Users (Admin only)
| Method | Endpoint      | Description       |
|--------|---------------|-------------------|
| GET    | `/api/users`  | List all users    |
| GET    | `/api/users/{id}` | Get user by ID |
| POST   | `/api/users` | Create a user |
| PATCH  | `/api/users/{id}/role` | Change a user's role |
| DELETE | `/api/users/{id}` | Delete a user |

### Approval workflow

Projects and tasks created by regular users start with `PENDING` approval status and are
hidden from active task workflows until an administrator approves them. Administrators
can create users, review the approval queue, approve or reject projects and tasks, and
manage user roles. Records created by administrators are approved immediately.

---

## Environment Variables

### Backend
| Variable     | Default         | Description              |
|--------------|-----------------|--------------------------|
| `DB_USERNAME`| `postgres`      | PostgreSQL username      |
| `DB_PASSWORD`| `postgres`      | PostgreSQL password      |
| `JWT_SECRET` | (default key)   | HMAC-SHA256 signing key  |

---

## Design Decisions & Technical Notes

### Authentication
- **JWT over sessions** — stateless auth suits REST APIs and enables horizontal scaling without sticky sessions
- **Spring Security Filter Chain** — JWT filter runs before `UsernamePasswordAuthenticationFilter`; failed validation logs a warning but doesn't block the request (returns 401 downstream)
- **Role-based access** — two roles (`ADMIN`, `USER`) enforced both at the filter chain and method level via `@PreAuthorize`

### Database
- **Flyway versioned migrations** — all schema changes are tracked and versioned, making it trivial to reproduce the exact database state in any environment
- **Composite key for project_members** — using `@EmbeddedId` properly represents the many-to-many relationship without an artificial surrogate key
- **GIN index on tasks.title** — PostgreSQL full-text search index for fast ILIKE queries on large datasets
- **UUID vs BIGSERIAL** — chose `BIGSERIAL` for simplicity and foreign key clarity; UUIDs would be better for distributed systems

### API Design
- **Consistent pagination** — all list endpoints return `PageResponse<T>` with metadata (totalElements, totalPages, isFirst, isLast)
- **Null-safe JPQL** — search parameters use `:param IS NULL OR ...` guard to make them optional without separate query methods
- **HTTP status codes** — `201 Created` for POST, `204 No Content` for DELETE, `400/401/403/404` for errors

### Frontend Architecture
- **App Router** (Next.js 14) — file-system routing with server/client component split
- **Centralized API client** — single `src/lib/api.ts` module handles token injection and error normalization
- **Context-based state** — AuthContext persists JWT to localStorage and re-validates on mount; ToastContext provides global notifications
- **CSS Custom Properties** — design tokens allow instant dark mode switching via `[data-theme="dark"]` attribute
- **No external UI library** — all components (modals, tables, kanban, badges) built from scratch per assessment requirements

### Export
- **CSV** — uses OpenCSV library for proper escaping of commas/quotes in field values
- **JSON** — returns structured `List<TaskResponse>` with Content-Disposition header for download

---

## Project Structure

```
Pesira/
├── backend/
│   ├── src/main/java/com/pesira/tasktracker/
│   │   ├── config/          # Security & application beans
│   │   ├── controller/      # REST endpoints
│   │   ├── dto/             # Request/Response objects
│   │   ├── entity/          # JPA entities
│   │   ├── exception/       # Global error handling
│   │   ├── repository/      # Spring Data JPA repositories
│   │   ├── security/        # JWT provider & filter
│   │   └── service/         # Business logic
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/    # Flyway SQL scripts (V1-V4)
└── frontend/
    └── src/
        ├── app/             # Next.js App Router pages
        │   ├── login/
        │   ├── register/
        │   ├── dashboard/
        │   ├── projects/
        │   │   └── [id]/    # Dynamic project detail
        │   ├── tasks/
        │   └── admin/users/
        ├── components/      # Reusable React components
        │   ├── AppShell.tsx  # Auth guard + layout
        │   ├── Sidebar.tsx
        │   └── TaskModal.tsx
        ├── context/         # React Context providers
        │   ├── AuthContext.tsx
        │   └── ToastContext.tsx
        ├── lib/
        │   └── api.ts       # Typed HTTP client
        └── styles/
            └── globals.css  # Design system (1000+ lines)
```
