const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

let adminToken = '';
let employeeToken = '';

beforeAll(async () => {
  await db.initDb();

  // Login admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@company.com', password: 'admin123' });
  adminToken = adminRes.body.token;

  // Login employee
  const empRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'john.doe@company.com', password: 'password123' });
  employeeToken = empRes.body.token;
});

afterAll(async () => {
  await db.closeDb();
});

describe('Employee Management API Suite', () => {
  test('Admin can list all employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employees.length).toBeGreaterThanOrEqual(5);
  });

  test('Employee is forbidden from listing all employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('Admin can add a new employee', async () => {
    const uniqueEmail = `test.devops.${Date.now()}@company.com`;
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'DevOps Tester',
        email: uniqueEmail,
        password: 'securePass123',
        department: 'Quality Assurance',
        role: 'employee'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('employee_id');
  });

  test('Admin adding duplicate email returns 409 conflict', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Guy',
        email: 'john.doe@company.com',
        password: 'password123',
        department: 'Engineering',
        role: 'employee'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
