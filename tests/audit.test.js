/**
 * Audit Trail Tests
 *
 * Tests for:
 * - Audit log creation on status change
 * - Audit log creation on priority change
 * - Audit log creation on assignee change
 * - Correct old/new values in audit entries
 * - Multiple status changes → correct audit history
 * - Comment activity logging
 * - Audit history retrieval
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize, User } = require('../src/models');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

let adminToken, managerToken, memberToken;
let adminId, managerId, memberId;
let projectId, taskId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Register users
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'Password123!' });
  adminId = adminRes.body.data.user.id;

  // Promote to admin
  await User.update({ role: 'admin' }, { where: { id: adminId } });
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  const managerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Manager', email: 'manager@test.com', password: 'Password123!' });
  managerId = managerRes.body.data.user.id;

  // Promote to manager
  await User.update({ role: 'manager' }, { where: { id: managerId } });
  const managerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@test.com', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  const memberRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Member', email: 'member@test.com', password: 'Password123!' });
  memberToken = memberRes.body.data.accessToken;
  memberId = memberRes.body.data.user.id;

  // Create a project
  const projectRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ name: 'Audit Test Project' });
  projectId = projectRes.body.data.id;

  // Create a task
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      title: 'Audited Task',
      priority: 'medium',
      status: 'todo',
      assigneeId: memberId,
      projectId,
    });
  taskId = taskRes.body.data.id;
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

describe('Audit Trail', () => {
  // =============================================
  // Status Change Audit Tests
  // =============================================
  describe('Status Change Auditing', () => {
    it('should create audit entry when task status changes', async () => {
      // Change status from 'todo' to 'in_progress'
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'in_progress' });

      // Check audit history
      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.statusCode).toBe(200);
      expect(auditRes.body.success).toBe(true);

      const statusChanges = auditRes.body.data.filter(
        (entry) => entry.action === 'STATUS_CHANGE'
      );
      expect(statusChanges.length).toBeGreaterThanOrEqual(1);

      const lastChange = statusChanges[0];
      expect(lastChange.field).toBe('status');
      expect(lastChange.oldValue).toBe('todo');
      expect(lastChange.newValue).toBe('in_progress');
    });

    it('should track multiple sequential status changes', async () => {
      // Change to in_review
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'in_review' });

      // Change to done
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'done' });

      // Verify audit trail has all status changes
      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const statusChanges = auditRes.body.data.filter(
        (entry) => entry.action === 'STATUS_CHANGE'
      );

      // Should have 3 status changes: todo→in_progress, in_progress→in_review, in_review→done
      expect(statusChanges.length).toBe(3);

      // Newest first (sorted DESC by createdAt)
      expect(statusChanges[0].oldValue).toBe('in_review');
      expect(statusChanges[0].newValue).toBe('done');
      expect(statusChanges[1].oldValue).toBe('in_progress');
      expect(statusChanges[1].newValue).toBe('in_review');
      expect(statusChanges[2].oldValue).toBe('todo');
      expect(statusChanges[2].newValue).toBe('in_progress');
    });
  });

  // =============================================
  // Priority & Assignee Change Audit Tests
  // =============================================
  describe('Priority & Assignee Change Auditing', () => {
    it('should log priority change in audit trail', async () => {
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 'critical' });

      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const priorityChanges = auditRes.body.data.filter(
        (entry) => entry.action === 'PRIORITY_CHANGE'
      );
      expect(priorityChanges.length).toBeGreaterThanOrEqual(1);
      expect(priorityChanges[0].oldValue).toBe('medium');
      expect(priorityChanges[0].newValue).toBe('critical');
    });

    it('should log assignee change in audit trail', async () => {
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: managerId });

      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const assigneeChanges = auditRes.body.data.filter(
        (entry) => entry.action === 'ASSIGNEE_CHANGE'
      );
      expect(assigneeChanges.length).toBeGreaterThanOrEqual(1);
      expect(assigneeChanges[0].oldValue).toBe(memberId);
      expect(assigneeChanges[0].newValue).toBe(managerId);
    });
  });

  // =============================================
  // Comment Activity Audit Tests
  // =============================================
  describe('Comment Activity Auditing', () => {
    let commentId;

    it('should log comment creation in audit trail', async () => {
      const commentRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'This is a test comment' });

      expect(commentRes.statusCode).toBe(201);
      commentId = commentRes.body.data.id;

      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const commentAdded = auditRes.body.data.filter(
        (entry) => entry.action === 'COMMENT_ADDED'
      );
      expect(commentAdded.length).toBeGreaterThanOrEqual(1);
    });

    it('should log comment update in audit trail', async () => {
      await request(app)
        .patch(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Updated comment text' });

      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const commentUpdated = auditRes.body.data.filter(
        (entry) => entry.action === 'COMMENT_UPDATED'
      );
      expect(commentUpdated.length).toBeGreaterThanOrEqual(1);
    });

    it('should log comment deletion in audit trail', async () => {
      await request(app)
        .delete(`/api/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const commentDeleted = auditRes.body.data.filter(
        (entry) => entry.action === 'COMMENT_DELETED'
      );
      expect(commentDeleted.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================
  // Audit History Access Tests
  // =============================================
  describe('Audit History Access', () => {
    it('should include changedBy user info in audit entries', async () => {
      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.statusCode).toBe(200);
      auditRes.body.data.forEach((entry) => {
        expect(entry.changedBy).toBeDefined();
        expect(entry.changedBy).toHaveProperty('id');
        expect(entry.changedBy).toHaveProperty('name');
        expect(entry.changedBy).toHaveProperty('email');
      });
    });

    it('should reject audit access by member', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow audit access by manager', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return task creation audit entry', async () => {
      const auditRes = await request(app)
        .get(`/api/tasks/${taskId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`);

      const taskCreated = auditRes.body.data.filter(
        (entry) => entry.action === 'TASK_CREATED'
      );
      expect(taskCreated.length).toBe(1);
    });
  });
});
