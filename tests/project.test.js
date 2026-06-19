/**
 * Project Endpoint Tests
 *
 * Tests for:
 * - Project CRUD operations
 * - Role-based access control (admin, manager, member)
 * - Validation for required fields
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
let projectId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Register admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'Password123!' });
  adminToken = adminRes.body.data.accessToken;
  adminId = adminRes.body.data.user.id;

  // Promote admin (direct DB update since registration now forces 'member')
  const { User } = require('../src/models');
  await User.update({ role: 'admin' }, { where: { id: adminId } });

  // Re-login to get token with updated role
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
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

describe('Project Endpoints', () => {
  // =============================================
  // Project Creation Tests
  // =============================================
  describe('POST /api/projects', () => {
    it('should create a project as manager', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Website Redesign', description: 'Overhaul the company website' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Website Redesign');
      expect(res.body.data.owner).toBeDefined();
      expect(res.body.data.owner.id).toBe(managerId);

      projectId = res.body.data.id;
    });

    it('should create a project as admin', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mobile App', description: 'Build a mobile app' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe('Mobile App');
    });

    it('should reject project creation by member', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Project Attempt' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject project creation with missing name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ description: 'No name provided' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject project creation with too short name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'A' });

      expect(res.statusCode).toBe(400);
    });
  });

  // =============================================
  // Project Listing Tests
  // =============================================
  describe('GET /api/projects', () => {
    it('should list all projects for authenticated user', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('should respect pagination limits', async () => {
      const res = await request(app)
        .get('/api/projects?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.pagination.itemsPerPage).toBe(1);
    });

    it('should reject listing without authentication', async () => {
      const res = await request(app).get('/api/projects');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================
  // Project Get by ID Tests
  // =============================================
  describe('GET /api/projects/:id', () => {
    it('should get project by ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(projectId);
      expect(res.body.data.name).toBe('Website Redesign');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/projects/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  // =============================================
  // Project Update Tests
  // =============================================
  describe('PATCH /api/projects/:id', () => {
    it('should update project as admin', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Website Redesign' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Website Redesign');
    });

    it('should update project as owner (manager)', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ description: 'Updated description' });

      expect(res.statusCode).toBe(200);
    });

    it('should reject update with empty payload', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // =============================================
  // Project Deletion Tests
  // =============================================
  describe('DELETE /api/projects/:id', () => {
    it('should reject deletion by member', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should reject deletion by manager', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should soft delete project as admin', async () => {
      // Create a temporary project to delete
      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Project to Delete' });

      const deleteRes = await request(app)
        .delete(`/api/projects/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify soft deleted — should not be found
      const getRes = await request(app)
        .get(`/api/projects/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.statusCode).toBe(404);
    });
  });
});
