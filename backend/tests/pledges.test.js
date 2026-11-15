// ─────────────────────────────────────────────────────────────────────────────
// tests/pledges.test.js — API behavior tests with a lightweight database fake
// ─────────────────────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';

let mockDb;
jest.mock('../db', () => ({
  getDb: () => mockDb,
}));

const request = require('supertest');
const app = require('../server');

const ANON_ID = 'test_anon_abc123';
const ANON_ID2 = 'test_anon_xyz456';
const PLEDGE_ID = 'pledge-seed';

function createMockDatabase() {
  const pledges = [{
    id: PLEDGE_ID,
    uid: ANON_ID,
    displayName: 'SeedWarrior',
    message: 'A pledge for testing.',
    streak: 1,
    hearts: 0,
    hearted: false,
    createdAt: new Date(),
  }];
  const hearts = [];

  const client = {
    async query(sql, params = []) {
      const statement = sql.trim().toUpperCase();
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(statement)) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes('SELECT ID FROM PLEDGES WHERE ID = $1 FOR UPDATE')) {
        const row = pledges.find((pledge) => pledge.id === params[0]);
        return { rowCount: row ? 1 : 0, rows: row ? [{ id: row.id }] : [] };
      }
      if (statement.includes('SELECT 1 FROM PLEDGE_HEARTS')) {
        const row = hearts.find((heart) => heart.pledgeId === params[0] && heart.uid === params[1]);
        return { rowCount: row ? 1 : 0, rows: row ? [{ '?column?': 1 }] : [] };
      }
      if (statement.startsWith('INSERT INTO PLEDGE_HEARTS')) {
        hearts.push({ pledgeId: params[0], uid: params[1] });
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith('DELETE FROM PLEDGE_HEARTS')) {
        const index = hearts.findIndex((heart) => heart.pledgeId === params[0] && heart.uid === params[1]);
        if (index >= 0) hearts.splice(index, 1);
        return { rowCount: index >= 0 ? 1 : 0, rows: [] };
      }
      if (statement.startsWith('UPDATE PLEDGES SET HEARTS = HEARTS + 1')) {
        pledges.find((pledge) => pledge.id === params[0]).hearts += 1;
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith('UPDATE PLEDGES SET HEARTS = GREATEST')) {
        const row = pledges.find((pledge) => pledge.id === params[0]);
        row.hearts = Math.max(row.hearts - 1, 0);
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith('SELECT HEARTS FROM PLEDGES')) {
        const row = pledges.find((pledge) => pledge.id === params[0]);
        return { rowCount: row ? 1 : 0, rows: row ? [{ hearts: row.hearts }] : [] };
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
    release() {},
  };

  return {
    async query(sql, params = []) {
      const statement = sql.trim().toUpperCase();
      if (statement === 'SELECT 1') {
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }
      if (statement.includes('FROM PLEDGES P') && statement.includes('LEFT JOIN PLEDGE_HEARTS')) {
        const [uid, limit, offset] = params;
        const rows = [...pledges]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(offset, offset + limit)
          .map((pledge) => ({
            ...pledge,
            hearted: hearts.some((heart) => heart.pledgeId === pledge.id && heart.uid === uid),
          }));
        return { rows, rowCount: rows.length };
      }
      if (statement.startsWith('SELECT COUNT(*) AS N FROM PLEDGES')) {
        return { rows: [{ n: String(pledges.length) }], rowCount: 1 };
      }
      if (statement.startsWith('INSERT INTO PLEDGES')) {
        const [uid, displayName, message, streak] = params;
        const row = {
          id: `pledge-${pledges.length + 1}`,
          uid,
          displayName,
          message,
          streak,
          hearts: 0,
          hearted: false,
          createdAt: new Date(),
        };
        pledges.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (statement.startsWith('SELECT UID FROM PLEDGES')) {
        const row = pledges.find((pledge) => pledge.id === params[0]);
        return { rows: row ? [{ uid: row.uid }] : [], rowCount: row ? 1 : 0 };
      }
      if (statement.startsWith('DELETE FROM PLEDGES')) {
        const index = pledges.findIndex((pledge) => pledge.id === params[0]);
        if (index >= 0) pledges.splice(index, 1);
        return { rows: [], rowCount: index >= 0 ? 1 : 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    async connect() {
      return client;
    },
  };
}

beforeEach(() => {
  mockDb = createMockDatabase();
});

describe('GET /health', () => {
  it('returns ok when the database responds', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Pledges API', () => {
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
  });

  it('POST /api/pledges — rejects short and missing messages', async () => {
    const shortMessage = await request(app)
      .post('/api/pledges')
      .set('x-anon-id', ANON_ID)
      .send({ message: 'Hi' });
    const missingMessage = await request(app)
      .post('/api/pledges')
      .set('x-anon-id', ANON_ID)
      .send({ streak: 1 });

    expect(shortMessage.status).toBe(400);
    expect(missingMessage.status).toBe(400);
  });

  it('GET /api/pledges — lists and paginates pledges', async () => {
    const res = await request(app)
      .get('/api/pledges?limit=1&offset=0')
      .set('x-anon-id', ANON_ID);

    expect(res.status).toBe(200);
    expect(res.body.pledges).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('POST /api/pledges/:id/heart — toggles a heart', async () => {
    const first = await request(app)
      .post(`/api/pledges/${PLEDGE_ID}/heart`)
      .set('x-anon-id', ANON_ID2);
    const second = await request(app)
      .post(`/api/pledges/${PLEDGE_ID}/heart`)
      .set('x-anon-id', ANON_ID2);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ hearted: true, hearts: 1 });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ hearted: false, hearts: 0 });
  });

  it('POST /api/pledges/:id/heart — returns 404 for an unknown pledge', async () => {
    const res = await request(app)
      .post('/api/pledges/does_not_exist/heart')
      .set('x-anon-id', ANON_ID);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/pledges/:id — enforces ownership and deletes the pledge', async () => {
    const denied = await request(app)
      .delete(`/api/pledges/${PLEDGE_ID}`)
      .set('x-anon-id', ANON_ID2);
    const deleted = await request(app)
      .delete(`/api/pledges/${PLEDGE_ID}`)
      .set('x-anon-id', ANON_ID);
    const missing = await request(app)
      .delete(`/api/pledges/${PLEDGE_ID}`)
      .set('x-anon-id', ANON_ID);

    expect(denied.status).toBe(403);
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toBe(true);
    expect(missing.status).toBe(404);
  });
});
