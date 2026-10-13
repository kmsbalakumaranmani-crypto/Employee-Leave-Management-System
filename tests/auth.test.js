const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeAll(async () => {
  await db.initDb();
});

afterAll(async () => {
  await db.closeDb();
});

describe('Authentication API Suite', () => {
  test('GET /api/auth/demo-users lists initial demo accounts', async () => {
    const res = await request(app).get('/api/auth/demo-users');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
  });

  test('POST /api/auth/login succeeds with valid employee credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@company.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('employee');
  });

  test('POST /api/auth/login succeeds with manager credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'manager@company.com',
        password: 'manager123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('manager');
  });

  test('POST /api/auth/login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@company.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
