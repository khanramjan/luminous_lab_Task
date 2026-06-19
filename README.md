# 🗂️ Task Assignment API with Audit Trail

A production-grade **Node.js REST API** for internal task tracking, built with Express.js, Supabase PostgreSQL (via Sequelize ORM), JWT authentication, role-based access control, and a comprehensive audit trail system.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Authentication](#-authentication)
- [Role-Based Access Control](#-role-based-access-control)
- [Audit Trail](#-audit-trail)
- [Filtering, Sorting & Pagination](#-filtering-sorting--pagination)
- [API Examples](#-api-examples)
- [Testing](#-testing)
- [Docker](#-docker)
- [API Documentation (Swagger)](#-api-documentation-swagger)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)

---

## ✨ Features

### Core
- ✅ RESTful APIs for **Users, Projects, Tasks, and Comments**
- ✅ **JWT Authentication** with access + refresh token rotation
- ✅ **Role-Based Access Control** (Admin, Manager, Member)
- ✅ **Audit Trail** for all task status/priority/assignee changes
- ✅ **Filtering, Sorting, and Pagination** on task listings
- ✅ **Centralized Error Handling** with consistent JSON responses
- ✅ **Request Validation** using Joi schemas
- ✅ **Rate Limiting** on auth endpoints (brute-force protection)

### Bonus
- ✅ **Refresh Token Support** with secure rotation
- ✅ **Swagger/OpenAPI Documentation** with interactive UI
- ✅ **Docker Support** (Dockerfile + docker-compose)
- ✅ **Soft Delete** on all resources (paranoid mode)
- ✅ **Activity Logging** for comments (create/update/delete)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | Supabase PostgreSQL via Sequelize ORM |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Validation | Joi |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + Supertest |
| Security | Helmet + CORS + Rate Limiting |
| Containerization | Docker |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm** installed
- **Supabase account** with a PostgreSQL database ([supabase.com](https://supabase.com))

### 1. Clone the repository
```bash
git clone <repository-url>
cd "Luminous Lab"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — Your Supabase PostgreSQL connection string  
  Format: `<your-supabase-connection-string>`
- `JWT_SECRET` — Secret for access tokens (change in production)
- `JWT_REFRESH_SECRET` — Separate secret for refresh tokens (change in production)

### 4. Start the server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Access the API
- **API Base URL**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## 🗄️ Database Migrations

The project includes proper versioned migration files in `migrations/`:

| File | Table | Description |
|------|-------|-------------|
| `01-create-users.js` | `users` | Users with role enum, email index |
| `02-create-projects.js` | `projects` | Projects with owner FK |
| `03-create-tasks.js` | `tasks` | Tasks with status/priority enums, indexes |
| `04-create-comments.js` | `comments` | Comments with task/author FKs |
| `05-create-audit-logs.js` | `audit_logs` | Append-only audit log table |

```bash
# Run migrations
npm run migrate

# Fresh migration (drop all tables and re-create)
npm run migrate -- --fresh
```

> **Note**: The server auto-syncs models on startup in development. Use migration files for production deployments.

---

## 🔑 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `default-dev-secret-change-me` | Access token signing secret (⚠️ change in production) |
| `JWT_REFRESH_SECRET` | Falls back to `JWT_SECRET` | Refresh token signing secret (⚠️ change in production) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `DATABASE_URL` | — | Supabase PostgreSQL connection string (required) |

---

## 📡 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user (always assigned `member` role) |
| POST | `/login` | Public | Login and get tokens |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Auth | Invalidate refresh token |

### Users (`/api/users`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/me` | Auth | Get current user's profile |
| GET | `/` | Admin | List all users |
| GET | `/:id` | Admin | Get user by ID |
| PATCH | `/:id` | Admin | Update user (including role promotion) |
| DELETE | `/:id` | Admin | Soft delete user |

### Projects (`/api/projects`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Admin, Manager | Create project |
| GET | `/` | Auth | List projects |
| GET | `/:id` | Auth | Get project |
| PATCH | `/:id` | Admin, Owner | Update project |
| DELETE | `/:id` | Admin | Soft delete project |

### Tasks (`/api/tasks`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Admin, Manager | Create task |
| GET | `/` | Auth* | List tasks (filtered) |
| GET | `/:id` | Auth* | Get task |
| PATCH | `/:id` | Auth* | Update task |
| DELETE | `/:id` | Admin | Soft delete task |
| GET | `/:id/audit` | Admin, Manager | Get audit history |

*\*Members only see/modify their assigned tasks*

### Comments (`/api/tasks/:taskId/comments`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Auth | Add comment |
| GET | `/` | Auth | List comments |
| PATCH | `/:commentId` | Author, Admin | Edit comment |
| DELETE | `/:commentId` | Author, Admin | Delete comment |

---

## 🔐 Authentication

This API uses **JWT (JSON Web Tokens)** with an access + refresh token pattern:

1. **Register** or **Login** to receive an `accessToken` (15min) and `refreshToken` (7d)
2. Include the access token in the `Authorization` header: `Bearer <token>`
3. When the access token expires, use the `/api/auth/refresh` endpoint to get new tokens
4. Refresh tokens are rotated on each use (one-time use)

---

## 👥 Role-Based Access Control

| Action | Admin | Manager | Member |
|--------|:-----:|:-------:|:------:|
| Manage all users | ✅ | ❌ | ❌ |
| Create/update projects | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |
| Create/assign tasks | ✅ | ✅ | ❌ |
| View all tasks | ✅ | ✅ | ❌ |
| View assigned tasks | ✅ | ✅ | ✅ |
| Update task (all fields) | ✅ | ✅ | ❌ |
| Update task status (assigned) | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ❌ | ❌ |
| View audit trail | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ✅* |

*\*Members can only comment on tasks assigned to them*

---

## 📝 Audit Trail

Every tracked change to a task is recorded in the audit log:

| Action | Tracked Fields |
|--------|---------------|
| `TASK_CREATED` | Task title |
| `STATUS_CHANGE` | `status` (old → new) |
| `PRIORITY_CHANGE` | `priority` (old → new) |
| `ASSIGNEE_CHANGE` | `assigneeId` (old → new) |
| `TASK_DELETED` | Task title |
| `COMMENT_ADDED` | Comment body |
| `COMMENT_UPDATED` | Comment body (old → new) |
| `COMMENT_DELETED` | Comment body |

Retrieve audit history: `GET /api/tasks/:id/audit`

---

## 🔍 Filtering, Sorting & Pagination

### Query Parameters for `GET /api/tasks`

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `status` | string | `todo`, `in_progress`, `in_review`, `done` | Filter by status |
| `priority` | string | `low`, `medium`, `high`, `critical` | Filter by priority |
| `assigneeId` | UUID | `abc-123-...` | Filter by assignee |
| `projectId` | UUID | `abc-123-...` | Filter by project |
| `search` | string | `login` | Search in title & description |
| `sortBy` | string | `createdAt`, `dueDate`, `priority`, `title` | Sort field |
| `order` | string | `asc`, `desc` | Sort direction |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` (max: 100) | Items per page |

**Example**: `GET /api/tasks?status=todo&priority=high&sortBy=dueDate&order=asc&page=1&limit=10`

---

## 💻 API Examples

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

> **Note:** Registration always assigns the `member` role. Admins can promote users via `PATCH /api/users/:id`.  
> Password must be 8+ characters with uppercase, lowercase, digit, and special character.

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secret123"
  }'
```

### Create a Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Website Redesign",
    "description": "Complete overhaul of the company website"
  }'
```

### Create a Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "title": "Implement login page",
    "description": "Build the login UI with email and password fields",
    "priority": "high",
    "status": "todo",
    "assigneeId": "<user-uuid>",
    "projectId": "<project-uuid>",
    "dueDate": "2026-07-01"
  }'
```

### Update Task Status (triggers audit)
```bash
curl -X PATCH http://localhost:3000/api/tasks/<task-uuid> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"status": "in_progress"}'
```

### Get Task Audit History
```bash
curl http://localhost:3000/api/tasks/<task-uuid>/audit \
  -H "Authorization: Bearer <access_token>"
```

### List Tasks with Filters
```bash
curl "http://localhost:3000/api/tasks?status=todo&priority=high&sortBy=dueDate&order=asc&page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

### Add a Comment
```bash
curl -X POST http://localhost:3000/api/tasks/<task-uuid>/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"body": "Working on this task now!"}'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh_token>"}'
```

---

## 🧪 Testing

Run the full test suite:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:coverage
```

### Test Suites
| Suite | File | Description |
|-------|------|-------------|
| Auth | `tests/auth.test.js` | Registration, login, token refresh, protected routes, /me, logout, password complexity, role restriction |
| Tasks | `tests/task.test.js` | CRUD, RBAC, filtering, sorting, pagination, soft delete |
| Projects | `tests/project.test.js` | CRUD, RBAC, validation, pagination, soft delete |
| Comments | `tests/comment.test.js` | CRUD, RBAC, member access restrictions, author-only edit/delete |
| Audit | `tests/audit.test.js` | Status/priority/assignee change logging, comment activity, access control |

---

## 🐳 Docker

### Build and run with Docker Compose
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Build manually
```bash
docker build -t task-assignment-api .
docker run -p 3000:3000 -e JWT_SECRET=my-secret task-assignment-api
```

---

## 📄 API Documentation (Swagger)

Interactive API documentation is available at:

**http://localhost:3000/api-docs**

Raw OpenAPI JSON spec: `http://localhost:3000/api-docs.json`

---

## 📁 Project Structure

```
├── src/
│   ├── config/           # Database, JWT, Swagger, and migration config
│   ├── controllers/      # Request handlers (business logic)
│   ├── middleware/        # Auth, authorization, validation, rate limiting, errors
│   ├── models/           # Sequelize models and associations
│   ├── routes/           # Express route definitions with Swagger JSDoc
│   ├── services/         # Business services (audit trail)
│   ├── utils/            # Helpers (ApiError, ApiResponse, pagination)
│   └── app.js            # Express app setup
├── migrations/           # Sequelize migration files (versioned, up/down)
├── tests/                # Jest + Supertest test suites
├── .env.example          # Environment variable template
├── Dockerfile            # Container build config
├── docker-compose.yml    # Container orchestration
├── server.js             # Entry point
├── ARCHITECTURE.md       # Architecture explanation
└── README.md             # This file
```

---

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed explanation of the system architecture, request lifecycle, authentication flow, and audit trail design.

---

## 📄 License

MIT
