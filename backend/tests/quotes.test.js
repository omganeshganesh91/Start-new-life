process.env.NODE_ENV = 'test';

let mockDb;
jest.mock('../db', () => ({
  getDb: () => mockDb,
}));

const request = require('supertest');
const app = require('../server');

describe('GET /api/quotes/random', () => {
  beforeEach(() => {
    mockDb = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 'quote-00001', category: 'recovery', quote: 'Choose your next step with courage.' }],
      }),
    };
  });

  it('returns a quote selected from the database', async () => {
    const res = await request(app).get('/api/quotes/random');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'quote-00001',
      category: 'recovery',
      quote: 'Choose your next step with courage.',
    });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(mockDb.query.mock.calls[0][0]).toMatch(/ORDER BY RANDOM\(\)/);
  });

  it('reports an actionable error if the database has not been seeded', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/quotes/random');

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/npm run migrate/);
  });
});
