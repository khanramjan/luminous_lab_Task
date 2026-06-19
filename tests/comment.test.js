/**
 * Comment Endpoint Tests
 *
 * Tests for:
 * - Comment CRUD operations
 * - Role-based access control
 * - Members can only comment on assigned tasks
 * - Only authors and admins can edit/delete comments
 * - Pagination response structure
 * - Soft delete behavior
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

let adminToken, managerToken, memberToken;
let adminId, managerId, memberId;
let projectId, taskId, unassignedTaskId;
let commentId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Register admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'Password123!' });
  adminToken = adminRes.body.data.accessToken;
  adminId = adminRes.body.data.user.id;

  // Promote admin
  const { User } = require('../src/models');
  await User.update({ role: 'admin' }, { where: { id: adminId } });
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Register manager
  const managerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Manager', email: 'manager@test.com', password: 'Password123!' });
  managerToken = managerRes.body.data.accessToken;
  managerId = managerRes.body.data.user.id;

  // Promote to manager
  await User.update({ role: 'manager' }, { where: { id: managerId } });
  const managerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@test.com', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  // Register member
  const memberRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Member', email: 'member@test.com', password: 'Password123!' });
  memberToken = memberRes.body.data.accessToken;
  memberId = memberRes.body.data.user.id;

  // Create a project
  const projectRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ name: 'Comment Test Project' });
  projectId = projectRes.body.data.id;

  // Create a task assigned to member
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      title: 'Task for Comments',
      assigneeId: memberId,
      projectId,
    });
  taskId = taskRes.body.data.id;

  // Create an unassigned task (for member access restriction tests)
  const unassignedRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      title: 'Unassigned Task',
      projectId,
    });
  unassignedTaskId = unassignedRes.body.data.id;
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

describe('Comment Endpoints', () => {
  // =============================================
  // Comment Creation Tests
  // =============================================
  describe('POST /api/tasks/:taskId/comments', () => {
    it('should add a comment as admin', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Admin comment on this task' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.body).toBe('Admin comment on this task');
      expect(res.body.data.author).toBeDefined();
      expect(res.body.data.author.id).toBe(adminId);
    });

    it('should add a comment as member on assigned task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Member working on this task' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.body).toBe('Member working on this task');

      commentId = res.body.data.id;
    });

    it('should reject member commenting on unassigned task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${unassignedTaskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Should not be allowed' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject comment with empty body', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject comment on non-existent task', async () => {
      const res = await request(app)
        .post('/api/tasks/00000000-0000-0000-0000-000000000000/comments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'This task does not exist' });

      expect(res.statusCode).toBe(404);
    });

    it('should reject comment without authentication', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .send({ body: 'No token' });

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================
  // Comment Listing Tests
  // =============================================
  describe('GET /api/tasks/:taskId/comments', () => {
    it('should list comments for a task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('should respect pagination limits', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments?page=1&limit=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.pagination.itemsPerPage).toBe(1);
    });

    it('should reject member listing comments on unassigned task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${unassignedTaskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // =============================================
  // Comment Update Tests
  // =============================================
  describe('PATCH /api/tasks/:taskId/comments/:commentId', () => {
    it('should update own comment as author', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Updated member comment' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.body).toBe('Updated member comment');
    });

    it('should update any comment as admin', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Admin edited this comment' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.body).toBe('Admin edited this comment');
    });

    it('should reject updating comment by non-author/non-admin', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ body: 'Manager trying to edit' });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/comments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Ghost comment' });

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================
  // Comment Deletion Tests
  // =============================================
  describe('DELETE /api/tasks/:taskId/comments/:commentId', () => {
    it('should reject deletion by non-author/non-admin', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should soft delete comment as author', async () => {
      // Create a comment to delete
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Comment to delete' });

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/comments/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it('should soft delete any comment as admin', async () => {
      // Create a comment by manager, delete as admin
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Admin comment to delete' });

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/comments/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.statusCode).toBe(200);
    });
  });
});

// =============================================
// Member Access Restriction Tests
// =============================================
describe('Member Task Access Restrictions', () => {
  let adminToken2, memberToken2, memberId2;
  let projectId2, assignedTaskId2, unassignedTaskId2;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const { User } = require('../src/models');

    // Register and promote admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin2', email: 'admin2@test.com', password: 'Password123!' });
    const adminId2 = adminRes.body.data.user.id;
    await User.update({ role: 'admin' }, { where: { id: adminId2 } });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin2@test.com', password: 'Password123!' });
    adminToken2 = adminLogin.body.data.accessToken;

    // Register member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Member2', email: 'member2@test.com', password: 'Password123!' });
    memberToken2 = memberRes.body.data.accessToken;
    memberId2 = memberRes.body.data.user.id;

    // Create project as admin
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken2}`)
      .send({ name: 'Access Control Project' });
    projectId2 = projectRes.body.data.id;

    // Create task assigned to member
    const assignedRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken2}`)
      .send({ title: 'Assigned to Member', assigneeId: memberId2, projectId: projectId2 });
    assignedTaskId2 = assignedRes.body.data.id;

    // Create task NOT assigned to member
    const unassignedRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken2}`)
      .send({ title: 'Not Assigned to Member', projectId: projectId2 });
    unassignedTaskId2 = unassignedRes.body.data.id;
  }, 30000);

  it('should allow member to view assigned task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${assignedTaskId2}`)
      .set('Authorization', `Bearer ${memberToken2}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(assignedTaskId2);
  });

  it('should block member from viewing unassigned task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${unassignedTaskId2}`)
      .set('Authorization', `Bearer ${memberToken2}`);

    expect(res.statusCode).toBe(403);
  });

  it('should block member from updating unassigned task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${unassignedTaskId2}`)
      .set('Authorization', `Bearer ${memberToken2}`)
      .send({ status: 'in_progress' });

    expect(res.statusCode).toBe(403);
  });

  it('should allow member to update status on assigned task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${assignedTaskId2}`)
      .set('Authorization', `Bearer ${memberToken2}`)
      .send({ status: 'in_progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('member listing should only return assigned tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${memberToken2}`);

    expect(res.statusCode).toBe(200);
    res.body.data.forEach((task) => {
      expect(task.assigneeId).toBe(memberId2);
    });
    // Should NOT include the unassigned task
    const ids = res.body.data.map((t) => t.id);
    expect(ids).not.toContain(unassignedTaskId2);
  });
});
