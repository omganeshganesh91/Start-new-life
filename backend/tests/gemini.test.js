// ─────────────────────────────────────────────────────────────────────────────
// tests/gemini.test.js — Gemini proxy API tests; no live API key or network use
// ─────────────────────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.GEMINI_API_KEY = 'unit-test-key';

jest.mock('../db', () => ({
  getDb: () => {
    throw new Error('Database should not be used by Gemini tests');
  },
}));

jest.mock('../middleware/redisCache', () => ({
  redisCache: () => (_req, _res, next) => next(),
}));

const request = require('supertest');
const app = require('../server');

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

let fetchSpy;

const upstreamResponse = (status, data) => ({
  status,
  json: async () => data,
});

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'unit-test-key';
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('Gemini proxy', () => {
  it('returns 503 without a configured key and does not call Gemini', async () => {
    process.env.GEMINI_API_KEY = '';

    const res = await request(app)
      .post('/api/gemini/generate')
      .send({ prompt: 'Give me a short encouragement.' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/key not configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects missing or blank prompts without calling Gemini', async () => {
    const missing = await request(app).post('/api/gemini/generate').send({});
    const blank = await request(app).post('/api/gemini/generate').send({ prompt: '  ' });

    expect(missing.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a trimmed prompt with merged generation settings and returns generated text', async () => {
    fetchSpy.mockResolvedValue(upstreamResponse(200, {
      candidates: [{ content: { parts: [{ text: 'Keep going.' }] } }],
    }));

    const safetySettings = [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }];
    const res = await request(app)
      .post('/api/gemini/motivation')
      .send({
        prompt: '  Help me stay focused.  ',
        generationConfig: { temperature: 0.2 },
        safetySettings,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'Keep going.' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${GEMINI_URL}?key=unit-test-key`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      contents: [{ parts: [{ text: 'Help me stay focused.' }] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
      },
      safetySettings,
    });
  });

  it('uses the default safety settings when none are provided', async () => {
    fetchSpy.mockResolvedValue(upstreamResponse(200, {
      candidates: [{ content: { parts: [{ text: 'You can do this.' }] } }],
    }));

    const res = await request(app)
      .post('/api/gemini/generate')
      .send({ prompt: 'Encourage me.' });

    expect(res.status).toBe(200);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).safetySettings).toHaveLength(4);
  });

  it('forwards upstream error status and message', async () => {
    fetchSpy.mockResolvedValue(upstreamResponse(429, {
      error: { message: 'Quota exceeded' },
    }));

    const res = await request(app)
      .post('/api/gemini/generate')
      .send({ prompt: 'Encourage me.' });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Quota exceeded', status: 429 });
  });

  it('returns 502 when Gemini succeeds without generated text', async () => {
    fetchSpy.mockResolvedValue(upstreamResponse(200, { candidates: [] }));

    const res = await request(app)
      .post('/api/gemini/generate')
      .send({ prompt: 'Encourage me.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Empty response from Gemini');
  });

  it('forwards network failures to the error handler', async () => {
    fetchSpy.mockRejectedValue(new Error('Gemini network unavailable'));

    const res = await request(app)
      .post('/api/gemini/generate')
      .send({ prompt: 'Encourage me.' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Gemini network unavailable');
  });
});
