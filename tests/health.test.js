const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeAll(async () => {
  await db.initDb();
});

afterAll(async () => {
  await db.closeDb();
});

describe('DevOps Probes & Monitoring Endpoints', () => {
  test('GET /health returns 200 with UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('database');
  });

  test('GET /metrics returns Prometheus format metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('leave_app_http_requests_total');
  });

  test('GET /api/stats/system returns DevOps architecture info', async () => {
    const res = await request(app).get('/api/stats/system');
    expect(res.statusCode).toBe(200);
    expect(res.body.system.devops_pipeline.ci_cd).toBe('Jenkins');
    expect(res.body.system.devops_pipeline.containerization).toBe('Docker');
  });
});
