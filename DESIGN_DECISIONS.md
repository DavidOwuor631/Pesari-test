# Pesira Task Tracker — Design Decisions & Architecture Guide

## Overview

This document explains the key technical decisions made while building the full-stack Project & Task Tracker. It covers the backend architecture, frontend design, security model, and database design with rationale for every significant choice.

---

## 1. Authentication & Security

### JWT (JSON Web Tokens) over Sessions

**Decision:** Use stateless JWT authentication instead of server-side sessions.

**Rationale:**
- REST APIs are inherently stateless — JWT fits this model naturally
- No server-side session store needed (no Redis dependency for horizontal scaling)
- JWT payload carries role information, reducing database lookups on every request
- Tokens expire automatically (24h access token lifetime configured)

**Implementation:**
```
Login Request → AuthenticationManager validates credentials
             → JwtTokenProvider generates signed token (HMAC-SHA256)
             → Token returned to client
             → Client stores in localStorage, sends as `Authorization: Bearer <token>`
             → JwtAuthenticationFilter intercepts every request, validates token
             → Sets SecurityContext → Controller receives authenticated principal
```

**JWT Library Choice: JJWT 0.12.x**
The latest JJWT API (0.12+) uses a cleaner builder pattern (`Jwts.builder()`, `Jwts.parser()`) compared to older versions, and handles key management more safely with explicit `SecretKey` objects instead of raw byte arrays.

### Two-Role RBAC

**Decision:** Simple `ADMIN` / `USER` enum stored on the User entity.

**Rationale:**
- Assessment requires exactly two roles
- Enum stored as string (`@Enumerated(EnumType.STRING)`) is human-readable in the database and safe across schema changes
- Spring Security's `ROLE_` prefix convention applied via `getAuthorities()` returning `"ROLE_ADMIN"` or `"ROLE_USER"`
- Method-level security via `@EnableMethodSecurity` + `@PreAuthorize("hasRole('ADMIN')")` on sensitive endpoints

### Ownership vs. Membership Access Control

**Decision:** Two tiers of project access — **owner** (full control) vs. **member** (read/write).

**Rationale:**
- Real project tools distinguish between project creators and collaborators
- `ProjectService.checkAccess()` allows any member to view
- `ProjectService.checkOwnership()` restricts edit/delete to owners (admins bypass via flag)
- Admin users can delete any project regardless of ownership

---

## 2. Database Design

### PostgreSQL Choice

PostgreSQL offers advanced features used in this project:
- **GIN index** for full-text search on task titles
- **BIGSERIAL** for auto-incrementing primary keys with sequence
- **Partial indexes** support for future optimizations
- ACID compliance for transactional integrity

### Flyway Versioned Migrations

**Decision:** All schema changes managed through Flyway SQL scripts, never through JPA `ddl-auto: create`.

**Rationale:**
- `ddl-auto: validate` in production — JPA validates schema but never modifies it
- Every schema state is reproducible from scratch by running migrations in order
- Team collaboration is safe — no silent schema drift between developers
- Rollback path exists (though Flyway CE doesn't auto-rollback, scripts are documented)

**Migration Sequence:**
```
V1 → users table + seed admin
V2 → projects + project_members (composite PK join table)
V3 → tasks table + GIN full-text index
V4 → sample data for demo
V5 → project and task approval workflow statuses and indexes
```

### Composite Key for Project Members

**Decision:** `project_members` uses a composite primary key `(project_id, user_id)` modeled as `@EmbeddedId`.

**Rationale:**
- The relationship between project and user IS the identity — no artificial surrogate key needed
- Prevents duplicate memberships at the database level
- `@EmbeddedId` with `@MapsId` is the correct JPA pattern for composite key join tables

### Entity Relationships

```
User (1) ──────────────── (*) Project      [owner]
User (*) ──── ProjectMember ──── (*) Project  [member]
Project (1) ───────────── (*) Task
User (1) ──────────────── (*) Task          [assignee]
User (1) ──────────────── (*) Task          [createdBy]
```

**Fetch Strategy:** All `@ManyToOne` relationships use `FetchType.LAZY` to avoid N+1 queries. Data is loaded only when explicitly accessed within a transaction.

---

## 3. Backend API Design

### DTO Pattern (Data Transfer Objects)

**Decision:** Separate DTO classes for requests and responses — entities never exposed directly.

**Rationale:**
- Prevents accidental exposure of sensitive fields (e.g., password hash)
- Allows independent evolution of API contract vs. database schema
- Validation annotations live on DTOs, not entities
- Response DTOs can include computed fields (e.g., `totalTasks`, `completedTasks`, `progress`)

### Validation Strategy

**Decision:** Jakarta Validation (`@NotBlank`, `@Size`, `@Email`) on request DTOs with `@Valid` in controllers.

**Rationale:**
- Declarative validation is cleaner than imperative if-checks
- Constraint violations are caught by `GlobalExceptionHandler.handleValidationErrors()` which returns structured field-level error messages
- Example response for validation failure:
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "title": "Task title is required",
    "email": "Invalid email format"
  }
}
```

### Pagination Design

**Decision:** All list endpoints that could return large datasets support server-side pagination.

**Implementation:** Spring Data `Pageable` + custom `PageResponse<T>` wrapper (not Spring's `Page<T>` directly, which includes implementation internals).

```json
{
  "content": [...],
  "page": 0,
  "size": 10,
  "totalElements": 87,
  "totalPages": 9,
  "first": true,
  "last": false
}
```

### CORS Configuration

**Decision:** CORS configured to allow `http://localhost:3000` and `http://localhost:3001`.

**Rationale:**
- Next.js dev server runs on port 3000 by default
- Port 3001 is a common fallback when 3000 is taken
- In production, this would be replaced with the actual domain

---

## 4. Frontend Architecture

### Next.js 14 with App Router

**Decision:** Use Next.js 14's App Router instead of Pages Router.

**Rationale:**
- File-system based routing with dynamic segments (`[id]`)
- Server Components by default (opted out for interactive pages via `'use client'`)
- Built-in TypeScript support
- API proxy rewrites — `next.config.js` proxies `/api/*` to the Spring Boot backend, avoiding CORS issues during development

### Vanilla CSS Design System

**Decision:** Build all styling from scratch using CSS Custom Properties (variables), no Tailwind, no UI library.

**Rationale:**
- Assessment requirement
- Full control over design system tokens
- CSS custom properties enable instant dark mode via single attribute change
- No build-time CSS-in-JS overhead

**Design Tokens Architecture:**
```css
:root {
  /* Semantic color tokens instead of palette tokens */
  --bg-primary, --bg-secondary      /* Backgrounds */
  --text-primary, --text-secondary  /* Typography */
  --border-default, --border-strong /* Borders */
  --accent-indigo, --accent-green   /* Actions/status */
}

[data-theme="dark"] {
  /* Override tokens for dark mode — components unchanged */
}
```

### Notion-Inspired Design

Key design choices inspired by Notion's aesthetic:
- **Minimal chrome** — content-first, sidebar is light and unobtrusive
- **Typography first** — Inter font, tight spacing, proper type hierarchy
- **Hover reveals** — action buttons appear on row hover (table) or card hover
- **Color dots/badges** — small visual indicators instead of large colored buttons
- **Progress bars** — thin progress indicators on project cards
- **Kanban columns** — subtle background differentiation, not heavy borders

### State Management Strategy

**Decision:** React Context only — no Redux, no Zustand.

**Rationale:**
- App state is simple: authenticated user + toast notifications
- Server data is fetched per-page (not cached globally) — prevents stale data issues
- Context re-renders are acceptable at this scale
- `AuthContext` handles JWT persistence + server re-validation on mount

### API Client Design

**Decision:** Centralized `src/lib/api.ts` with typed interfaces for all entities.

**Rationale:**
- Single file to update if backend contract changes
- Token injection happens once in the `request()` helper
- Type-safe parameters and responses prevent runtime errors
- All API functions are clearly separated by domain (`authApi`, `projectsApi`, `tasksApi`)

---

## 5. Data Export

### CSV Export (OpenCSV)

**Decision:** Use OpenCSV library instead of manual string concatenation.

**Rationale:**
- Handles edge cases: commas in values, quotes, newlines in descriptions
- Proper RFC 4180 compliant CSV output
- Returns as HTTP response with `Content-Disposition: attachment` header

### JSON Export

**Decision:** Return `List<TaskResponse>` with Content-Disposition header.

**Rationale:**
- Reuses existing DTO serialization — no duplicate mapping code
- Jackson auto-serializes to formatted JSON
- Same endpoint behavior — browser triggers download dialog

---

## 6. Error Handling

**Decision:** `@RestControllerAdvice` global exception handler catching all exception types.

**Exception → HTTP Status mapping:**
| Exception                     | Status |
|-------------------------------|--------|
| `ResourceNotFoundException`   | 404    |
| `BadCredentialsException`     | 401    |
| `AccessDeniedException`       | 403    |
| `MethodArgumentNotValidException` | 400 |
| `IllegalArgumentException`    | 400    |
| Uncaught `Exception`          | 500    |

Every error response follows the same structure: `{ status, message, timestamp, errors? }`.

---

## 7. Assumptions Made

1. **Single workspace** — all users share a single workspace (no tenant isolation)
2. **Task assignee is optional** — tasks can be unassigned
3. **Members can create tasks** — no read-only member role in this version
4. **Search is case-insensitive LIKE** — not full-text weighted search (PostgreSQL GIN index created for future upgrade)
5. **Password requirements** — minimum 8 characters (configurable in validation annotation)
6. **Token storage** — localStorage (simpler for demo; production would use httpOnly cookies)
7. **No refresh tokens** — 24-hour expiry; users re-login after expiry
