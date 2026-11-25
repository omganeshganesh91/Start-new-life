process.env.NODE_ENV = 'test';

let mockDb;
jest.mock('../db', () => ({
  getDb: () => mockDb,
}));

const request = require('supertest');
const app = require('../server');

describe('GET /api/quotes', () => {
  beforeEach(() => {
    mockDb = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'quote-00001', category: 'recovery', quote: 'Keep going.' }] })
        .mockResolvedValueOnce({ rows: [{ total: 5000 }] }),
    };
  });

  it('returns an ordered page and total count for the UI feed', async () => {
    const res = await request(app).get('/api/quotes?offset=30&limit=20');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      quotes: [{ id: 'quote-00001', category: 'recovery', quote: 'Keep going.' }],
      total: 5000,
      limit: 20,
      offset: 30,
      hasMore: true,
    });
    expect(mockDb.query.mock.calls[0][0]).toMatch(/ORDER BY id/);
    expect(mockDb.query.mock.calls[0][1]).toEqual([20, 30]);
  });

  it('caps page size and offset at the supported 50,000 quote range', async () => {
    mockDb.query
      .mockReset()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 75000 }] });
    const res = await request(app).get('/api/quotes?offset=999999&limit=999');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 50000, limit: 100, offset: 50000, hasMore: false });
    expect(mockDb.query.mock.calls[0][1]).toEqual([100, 50000]);
  });
});

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
