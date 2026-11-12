// ─────────────────────────────────────────────────────────────────────────────
// tests/pledges.test.js — Integration tests for /api/pledges
// Uses in-memory SQLite (via env var override) + supertest
// ─────────────────────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.DB_PATH  = ':memory:'; // in-memory DB per test run

const request = require('supertest');
const app     = require('../server');

const ANON_ID  = 'test_anon_abc123';
const ANON_ID2 = 'test_anon_xyz456';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Pledges API', () => {
  let pledgeId;

  // ── Create ─────────────────────────────────────────────────────────────────
  it('POST /api/pledges — creates a pledge', async () => {
    const res = await request(app)
      .post('/api/pledges')
      .set('x-anon-id', ANON_ID)
      .send({ message: 'Day 1. I choose freedom.', streak: 3, displayName: 'BraveWarrior42' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Day 1. I choose freedom.');
    expect(res.body.streak).toBe(3);
    expect(res.body.displayName).toBe('BraveWarrior42');
    expect(res.body.hearts).toBe(0);
    expect(res.body.id).toBeTruthy();
    pledgeId = res.body.id;
  });

  it('POST /api/pledges — rejects short message', async () => {
    const res = await request(app)
      .post('/api/pledges')
      .set('x-anon-id', ANON_ID)
      .send({ message: 'Hi' });
    expect(res.status).toBe(400);
  });

  it('POST /api/pledges — rejects missing message', async () => {
    const res = await request(app)
      .post('/api/pledges')
      .set('x-anon-id', ANON_ID)
      .send({ streak: 1 });
    expect(res.status).toBe(400);
  });

  // ── List ───────────────────────────────────────────────────────────────────
  it('GET /api/pledges — returns list', async () => {
    const res = await request(app)
      .get('/api/pledges')
      .set('x-anon-id', ANON_ID);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pledges)).toBe(true);
    expect(res.body.pledges.length).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/pledges — supports pagination', async () => {
    const res = await request(app)
      .get('/api/pledges?limit=1&offset=0')
      .set('x-anon-id', ANON_ID);

    expect(res.status).toBe(200);
    expect(res.body.pledges.length).toBeLessThanOrEqual(1);
  });

  // ── Heart ──────────────────────────────────────────────────────────────────
  it('POST /api/pledges/:id/heart — adds a heart', async () => {
    const res = await request(app)
      .post(`/api/pledges/${pledgeId}/heart`)
      .set('x-anon-id', ANON_ID2);

    expect(res.status).toBe(200);
    expect(res.body.hearted).toBe(true);
    expect(res.body.hearts).toBe(1);
  });

  it('POST /api/pledges/:id/heart — removes heart on second toggle', async () => {
    const res = await request(app)
      .post(`/api/pledges/${pledgeId}/heart`)
      .set('x-anon-id', ANON_ID2);

    expect(res.status).toBe(200);
    expect(res.body.hearted).toBe(false);
    expect(res.body.hearts).toBe(0);
  });

  it('POST /api/pledges/:id/heart — returns 404 for unknown id', async () => {
    const res = await request(app)
      .post('/api/pledges/does_not_exist/heart')
      .set('x-anon-id', ANON_ID);
    expect(res.status).toBe(404);
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  it('DELETE /api/pledges/:id — rejects deletion by non-owner', async () => {
    const res = await request(app)
      .delete(`/api/pledges/${pledgeId}`)
      .set('x-anon-id', ANON_ID2);
    expect(res.status).toBe(403);
  });

  it('DELETE /api/pledges/:id — owner can delete', async () => {
    const res = await request(app)
      .delete(`/api/pledges/${pledgeId}`)
      .set('x-anon-id', ANON_ID);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  it('DELETE /api/pledges/:id — returns 404 after deletion', async () => {
    const res = await request(app)
      .delete(`/api/pledges/${pledgeId}`)
      .set('x-anon-id', ANON_ID);
    expect(res.status).toBe(404);
  });
});
