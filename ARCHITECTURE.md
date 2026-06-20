# 🏗️ Architecture — Task Assignment API

This document explains the system architecture, design decisions, and key implementation details.

---

## System Overview

The API follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT REQUEST                     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              EXPRESS MIDDLEWARE STACK                 │
│  ┌─────────┐ ┌──────┐ ┌────────┐ ┌───────────────┐ │
│  │ Helmet  │ │ CORS │ │ Morgan │ │ Body Parser   │ │
│  └─────────┘ └──────┘ └────────┘ └───────────────┘ │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                 ROUTE LAYER                          │
│  Routes define endpoints and apply middleware chain: │
│  authenticate → authorize → validate → controller   │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              CONTROLLER LAYER                        │
│  Business logic: processes request, calls services,  │
│  interacts with models, returns standardized response│
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│         SERVICE LAYER (Audit & Redis Services)       │
│  Encapsulates cross-cutting concerns like audit      │
│  logging and caching. Calls Redis to bypass DB reads.│
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│       CACHE LAYER (Redis / Upstash)                  │
│  Caches heavy reads (e.g., Audit logs) with 24h TTL. │
│  Auto-reconnects with exponential backoff & jitter.  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              MODEL LAYER (Sequelize ORM)             │
│  Data access, validation, hooks (password hashing)   │
│  Associations, soft delete, timestamps               │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              DATABASE (Supabase PostgreSQL)           │
│  Cloud-hosted PostgreSQL with SSL. Tests use          │
│  in-memory SQLite for speed and isolation.             │
└─────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

Every API request follows this flow:

1. **Global Middleware**: Helmet (security headers), CORS, Rate Limiting, Morgan (logging), body parsing
2. **Route Matching**: Express matches the URL to a registered route
3. **Authentication** (`auth.js`): Verifies JWT, attaches `req.user`
4. **Authorization** (`authorize.js`): Checks `req.user.role` against allowed roles
5. **Validation** (`validate.js`): Validates request body/query/params with Joi schema
6. **Controller**: Executes business logic, interacts with models/services
7. **Response**: Returns standardized JSON via `ApiResponse` helper
8. **Error Handling**: Any thrown `ApiError` is caught by the centralized `errorHandler`

---

## Authentication Flow

```
┌──────┐                    ┌──────────┐                ┌────────┐
│Client│                    │  Server  │                │Database│
└──┬───┘                    └────┬─────┘                └───┬────┘
   │  POST /auth/login           │                          │
   │  {email, password}          │                          │
   │────────────────────────────►│                          │
   │                             │  Find user by email      │
   │                             │─────────────────────────►│
   │                             │◄─────────────────────────│
   │                             │  Compare password hash   │
   │                             │                          │
   │                             │  Generate access token   │
   │                             │  (JWT, 15min expiry)     │
   │                             │                          │
   │                             │  Generate refresh token  │
   │                             │  (JWT, 7d expiry)        │
   │                             │                          │
   │                             │  Store hashed refresh    │
   │                             │  token in DB             │
   │                             │─────────────────────────►│
   │  {accessToken, refreshToken}│                          │
   │◄────────────────────────────│                          │
   │                             │                          │
   │  GET /api/tasks             │                          │
   │  Authorization: Bearer xxx  │                          │
   │────────────────────────────►│                          │
   │                             │  Verify JWT signature    │
   │                             │  Check expiry            │
   │                             │  Attach req.user         │
   │  {tasks: [...]}             │                          │
   │◄────────────────────────────│                          │
   │                             │                          │
   │  POST /auth/refresh         │                          │
   │  {refreshToken}             │                          │
   │────────────────────────────►│                          │
   │                             │  Verify refresh JWT      │
   │                             │  Compare with stored hash│
   │                             │─────────────────────────►│
   │                             │  Generate NEW tokens     │
   │                             │  (token rotation)        │
   │                             │  Store new refresh hash  │
   │                             │─────────────────────────►│
   │  {new accessToken,          │                          │
   │   new refreshToken}         │                          │
   │◄────────────────────────────│                          │
```

### Security Features
- Passwords hashed with **bcryptjs** (12 rounds)
- Refresh tokens stored as **bcrypt hashes** (not plaintext)
- Token rotation on refresh (old refresh token becomes invalid)
- Access tokens are short-lived (15 minutes)
- No sensitive data (password, refresh token) in API responses
- **Rate limiting** on auth endpoints (10 login attempts / 15min)

---

## Database Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    USERS     │     │  PROJECTS   │     │    TASKS     │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ ownerId(FK) │     │ id (PK)     │
│ name        │     │ id (PK)     │◄────│ projectId   │
│ email (UQ)  │     │ name        │     │ title       │
│ password    │     │ description │     │ description │
│ role        │     │ deletedAt   │     │ priority    │
│ refreshToken│     │ createdAt   │     │ status      │
│ deletedAt   │     │ updatedAt   │     │ assigneeId  │──►│ USERS │
│ createdAt   │     └─────────────┘     │ dueDate     │
│ updatedAt   │                         │ deletedAt   │
└─────────────┘                         │ createdAt   │
      │                                 │ updatedAt   │
      │                                 └──────┬──────┘
      │                                        │
      │         ┌──────────────┐    ┌──────────┴──────┐
      │         │   COMMENTS   │    │   AUDIT_LOGS    │
      │         ├──────────────┤    ├─────────────────┤
      │         │ id (PK)      │    │ id (PK)         │
      ├────────►│ authorId(FK) │    │ taskId (FK)     │
      │         │ taskId (FK)  │──► │ action          │
      │         │ body         │    │ field           │
      │         │ deletedAt    │    │ oldValue        │
      │         │ createdAt    │    │ newValue         │
      │         │ updatedAt    │    │ changedById(FK) │◄──┘
      │         └──────────────┘    │ createdAt       │
      │                             └─────────────────┘
      └──────────────────────────────────────┘
```

### Key Design Decisions

1. **UUIDs for Primary Keys**: Prevents ID enumeration attacks and enables distributed ID generation.

2. **Soft Delete (Paranoid Mode)**: All models (except AuditLog) use Sequelize's `paranoid: true` which adds a `deletedAt` column. Deleted records are hidden from queries but remain in the database.

3. **AuditLog is Immutable**: Audit logs have no `updatedAt` field and are never soft-deleted. They are permanent, append-only records.

4. **Composite Database Indexes**: The `tasks` table includes compound indexes (e.g., `['assigneeId', 'status']`, `['projectId', 'status']`) to optimize the most common API queries without needing index merges.

5. **Attribute Projection**: To optimize network throughput and payload parsing, the `GET /api/tasks` list endpoint explicitly excludes large text fields (like `description`), which are only fetched on specific task-detail requests.

6. **Supabase PostgreSQL**: Cloud-hosted, fully managed PostgreSQL database with SSL encryption. Connected via `DATABASE_URL` connection string. Tests use in-memory SQLite for speed and isolation — Sequelize abstracts the dialect differences.

---

## Audit Trail Design

The audit trail captures **what changed, who changed it, and when**:

```
┌─────────────────┐
│  Controller:     │
│  PATCH /tasks/:id│
├─────────────────┤
│ 1. Find task    │
│ 2. Compare old  │──► For each tracked field (status, priority, assigneeId):
│    vs new values│    if changed → queue audit entry
│ 3. Update task  │
│ 4. Log changes  │──► auditService.logMultipleChanges()
│    to audit     │         │
│ 5. Return task  │         ▼
└─────────────────┘    ┌──────────────────┐
                       │  AuditLog.create  │
                       │  {                │
                       │    taskId,        │
                       │    action,        │
                       │    field,         │
                       │    oldValue,      │
                       │    newValue,      │
                       │    changedById,   │
                       │    createdAt      │
                       │  }                │
                       └──────────────────┘
```

### Tracked Actions
- `STATUS_CHANGE` — Task status transitions (todo → in_progress → done)
- `PRIORITY_CHANGE` — Priority escalation/de-escalation
- `ASSIGNEE_CHANGE` — Task reassignment
- `TASK_CREATED` / `TASK_DELETED` — Task lifecycle events
- `COMMENT_ADDED` / `COMMENT_UPDATED` / `COMMENT_DELETED` — Comment activity

### Caching Strategy (Redis)
Because audit logs are frequently read but rarely change compared to task queries, they are heavily cached:
1. **Cache Read (Cache-Aside)**: The API first checks `audit:<taskId>` in Redis.
2. **Cache Miss**: If empty, the DB is queried, and the result is cached for 24 hours.
3. **Cache Invalidation**: Whenever `auditService.logChange` is called, the specific `audit:<taskId>` key is immediately deleted (`del()`) to ensure no stale data is ever presented. If Redis goes offline, the API elegantly downgrades to PostgreSQL reads.

---

## Error Handling Strategy

All errors flow through the centralized `errorHandler` middleware:

```
  Thrown Error
       │
       ▼
  ┌────────────────────┐
  │ Is it an ApiError?  │──Yes──► Return { success: false, message, errors } with statusCode
  └────────────────────┘
       │ No
       ▼
  ┌─────────────────────────────┐
  │ Is it a Sequelize error?     │──Yes──► Map to 400/409 with field-level messages
  └─────────────────────────────┘
       │ No
       ▼
  ┌─────────────────────────────┐
  │ Unknown error                │──► 500 Internal Server Error
  │ (hide stack in production)   │    (include stack in development)
  └─────────────────────────────┘
```

### Response Format (Errors)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Title must be at least 2 characters",
    "Project ID is required"
  ]
}
```

### Response Format (Success)
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [...],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Middleware Chain

Each request passes through a chain of middleware before reaching the controller:

```
Request → [Helmet] → [CORS] → [Rate Limiter] → [Morgan] → [Body Parser]
  → [Route Match]
    → [authenticate]  ← Verify JWT, attach req.user
    → [authorize]     ← Check role against allowed list
    → [validate]      ← Validate body/query/params with Joi
    → [controller]    ← Business logic
  → [errorHandler]    ← Catch and format all errors
→ Response
```

This design ensures:
- **Security** is applied before any business logic runs
- **Validation** rejects bad data before it reaches the database
- **Errors** are consistently formatted regardless of where they occur
