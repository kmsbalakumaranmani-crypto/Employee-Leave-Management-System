const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

let employeeToken = '';
let managerToken = '';
let createdLeaveId = null;

beforeAll(async () => {
  await db.initDb();

  // Login employee
  const empRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'john.doe@company.com', password: 'password123' });
  employeeToken = empRes.body.token;

  // Login manager
  const mgrRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@company.com', password: 'manager123' });
  managerToken = mgrRes.body.token;
});

afterAll(async () => {
  await db.closeDb();
});

describe('Leave Management Workflow Suite', () => {
  test('GET /api/leaves/balance returns employee leave balances', async () => {
    const res = await request(app)
      .get('/api/leaves/balance')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.balances)).toBe(true);
    expect(res.body.balances.length).toBeGreaterThan(0);
  });

  test('POST /api/leaves submits a new leave request (Status = PENDING)', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        leave_type_id: 1, // Casual Leave
        from_date: '2026-12-01',
        to_date: '2026-12-03',
        reason: 'Family wedding ceremony'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('leave_id');
    expect(res.body.days_requested).toBe(3);
    createdLeaveId = res.body.leave_id;
  });

  test('POST /api/leaves rejects invalid date range', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        leave_type_id: 1,
        from_date: '2026-12-10',
        to_date: '2026-12-05',
        reason: 'Backwards dates test'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/leaves returns submitted leaves', async () => {
    const res = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.leaves)).toBe(true);
    const found = res.body.leaves.find(l => l.leave_id === createdLeaveId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
  });

  test('PUT /api/leaves/:id/status allows Manager to APPROVE leave', async () => {
    const res = await request(app)
      .put(`/api/leaves/${createdLeaveId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: 'APPROVED',
        manager_remarks: 'Approved by Engineering Manager'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('APPROVED');
  });

  test('Employee cannot approve/reject leave requests', async () => {
    const res = await request(app)
      .put(`/api/leaves/${createdLeaveId}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        status: 'APPROVED'
      });

    expect(res.statusCode).toBe(403);
  });
});
