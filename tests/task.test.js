/**
 * Task Endpoint Tests
 *
 * Tests for:
 * - Task CRUD operations
 * - Role-based access control (admin, manager, member)
 * - Filtering by status and priority
 * - Pagination response structure
 * - Members can only view/update assigned tasks
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

let adminToken, managerToken, memberToken;
let adminId, managerId, memberId;
let projectId, taskId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Register admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
  adminToken = adminRes.body.data.accessToken;
  adminId = adminRes.body.data.user.id;

  // Register manager
  const managerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Manager', email: 'manager@test.com', password: 'password123', role: 'manager' });
  managerToken = managerRes.body.data.accessToken;
  managerId = managerRes.body.data.user.id;

  // Register member
  const memberRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Member', email: 'member@test.com', password: 'password123', role: 'member' });
  memberToken = memberRes.body.data.accessToken;
  memberId = memberRes.body.data.user.id;

  // Create a project
  const projectRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ name: 'Test Project', description: 'A test project' });
  projectId = projectRes.body.data.id;
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

describe('Task Endpoints', () => {
  // =============================================
  // Task Creation Tests
  // =============================================
  describe('POST /api/tasks', () => {
    it('should create a task as manager', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Implement login page',
          description: 'Build the login UI',
          priority: 'high',
          status: 'todo',
          assigneeId: memberId,
          projectId,
          dueDate: '2026-12-31',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement login page');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.assignee.id).toBe(memberId);
      expect(res.body.data.project.id).toBe(projectId);

      taskId = res.body.data.id;
    });

    it('should create a task as admin', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Setup CI/CD',
          priority: 'critical',
          projectId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.priority).toBe('critical');
    });

    it('should reject task creation by member', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Member task attempt',
          projectId,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject task creation with missing required fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          description: 'Missing title and projectId',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject task with invalid priority', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Bad priority',
          projectId,
          priority: 'ultra',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should create additional tasks for filtering tests', async () => {
      // Low priority, done
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Documentation update',
          priority: 'low',
          status: 'done',
          assigneeId: memberId,
          projectId,
        });

      // Medium priority, in_progress
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Write unit tests',
          priority: 'medium',
          status: 'in_progress',
          assigneeId: memberId,
          projectId,
        });
    });
  });

  // =============================================
  // Task Listing & Filtering Tests
  // =============================================
  describe('GET /api/tasks', () => {
    it('should list all tasks for admin', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination.currentPage).toBe(1);
      expect(res.body.meta.pagination.totalItems).toBeGreaterThanOrEqual(3);
    });

    it('should list only assigned tasks for member', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(200);
      // Member should only see tasks assigned to them
      res.body.data.forEach((task) => {
        expect(task.assigneeId).toBe(memberId);
      });
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/tasks?status=done')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((task) => {
        expect(task.status).toBe('done');
      });
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((task) => {
        expect(task.priority).toBe('high');
      });
    });

    it('should sort tasks by title ascending', async () => {
      const res = await request(app)
        .get('/api/tasks?sortBy=title&order=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const titles = res.body.data.map((t) => t.title);
      const sorted = [...titles].sort();
      expect(titles).toEqual(sorted);
    });

    it('should respect pagination limits', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.pagination.itemsPerPage).toBe(2);
    });
  });

  // =============================================
  // Task Get/Update Tests
  // =============================================
  describe('GET /api/tasks/:id', () => {
    it('should get task by ID as admin', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(taskId);
    });

    it('should get assigned task as member', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task status as member (assigned task)', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'in_progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('should reject member updating non-status fields', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ priority: 'critical' });

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to update any field', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 'critical', title: 'Updated Title' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.priority).toBe('critical');
      expect(res.body.data.title).toBe('Updated Title');
    });
  });

  // =============================================
  // Task Deletion Tests
  // =============================================
  describe('DELETE /api/tasks/:id', () => {
    it('should reject deletion by member', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should reject deletion by manager', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should soft delete task as admin', async () => {
      // Create a temporary task to delete
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task to delete', projectId });

      const deleteRes = await request(app)
        .delete(`/api/tasks/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify soft deleted — should not be found
      const getRes = await request(app)
        .get(`/api/tasks/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.statusCode).toBe(404);
    });
  });
});
