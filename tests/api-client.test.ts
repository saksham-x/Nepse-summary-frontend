import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, buildUrl, CLIENT_ERROR } from '../src/lib/api-client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('buildUrl', () => {
  it('skips empty params and encodes values', () => {
    expect(buildUrl('/market-data/NICD83%2F84/candles', { interval: '1w', from: undefined, before: '', limit: 500 }, '/api/v1'))
      .toBe('/api/v1/market-data/NICD83%2F84/candles?interval=1w&limit=500');
  });
});

describe('apiGet', () => {
  it('returns the parsed body on success', async () => {
    const fetchImpl = vi.fn(async () => json({ data: [1] })) as unknown as typeof fetch;
    await expect(apiGet('/x', { fetchImpl })).resolves.toEqual({ data: [1] });
  });

  it('turns the backend error envelope into an ApiError', async () => {
    const fetchImpl = vi.fn(async () =>
      json({ error: { code: 'INSTRUMENT_NOT_FOUND', message: "Unknown symbol 'ZZZ'", requestId: 'abc' } }, 404),
    ) as unknown as typeof fetch;
    const err = await apiGet('/x', { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'INSTRUMENT_NOT_FOUND', requestId: 'abc' });
  });

  it('accepts listed non-2xx statuses as data (health 503)', async () => {
    const fetchImpl = vi.fn(async () => json({ data: { status: 'degraded' } }, 503)) as unknown as typeof fetch;
    await expect(apiGet('/health', { fetchImpl, acceptStatuses: [503] })).resolves.toEqual({ data: { status: 'degraded' } });
  });

  it('reports network failures and non-JSON responses distinctly', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(apiGet('/x', { fetchImpl: down })).rejects.toMatchObject({ code: CLIENT_ERROR.NETWORK_ERROR, status: 0 });

    const html = vi.fn(async () => new Response('<html>', { status: 502 })) as unknown as typeof fetch;
    await expect(apiGet('/x', { fetchImpl: html })).rejects.toMatchObject({ code: CLIENT_ERROR.INVALID_RESPONSE, status: 502 });
  });

  it('lets aborts propagate untouched', async () => {
    const aborted = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    }) as unknown as typeof fetch;
    await expect(apiGet('/x', { fetchImpl: aborted })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
