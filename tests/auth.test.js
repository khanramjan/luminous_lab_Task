/**
 * Auth Endpoint Tests
 *
 * Tests for:
 * - User registration (valid & invalid payloads)
 * - Login (correct & wrong credentials)
 * - Token refresh flow
 * - Protected route access without token
 * - Logout
 * - Password complexity requirements
 * - Registration role restriction (always member)
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize, User } = require('../src/models');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

let accessToken;
let refreshToken;
let userId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth Endpoints', () => {
  // =============================================
  // Registration Tests
  // =============================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('admin@test.com');
      expect(res.body.data.user.role).toBe('member'); // Registration always assigns member
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      userId = res.body.data.user.id;

      // Promote to admin for subsequent tests
      await User.update({ role: 'admin' }, { where: { id: userId } });
    });

    it('should always assign member role regardless of request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sneaky Admin',
          email: 'sneaky@test.com',
          password: 'Password123!',
          role: 'admin', // This should be ignored
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe('member');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'admin@test.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@test.com',
          password: 'Ab1!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Pass',
          email: 'weak@test.com',
          password: 'password123!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password (no special char)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Special',
          email: 'nospecial@test.com',
          password: 'Password123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'missing@test.com',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =============================================
  // Login Tests
  // =============================================
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@test.com');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login without email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  // =============================================
  // Token Refresh Tests
  // =============================================
  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject refresh without token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // =============================================
  // Protected Route Access Tests
  // =============================================
  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should reject access without token', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });

    it('should reject access with malformed authorization header', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'NotBearer token');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================
  // GET /api/users/me Tests
  // =============================================
  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe('admin@test.com');
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('refreshToken');
    });

    it('should reject /me without authentication', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================
  // Logout Tests
  // =============================================
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.statusCode).toBe(401);
    });
  });
});
