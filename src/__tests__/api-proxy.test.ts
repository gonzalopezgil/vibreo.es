/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api-proxy/[...path]/route';

describe('api proxy route', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('forwards path and query to the public API with no-store caching', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await GET(
      new NextRequest('https://vibreo.es/api-proxy/charting/songs?limit=5'),
      { params: Promise.resolve({ path: ['charting', 'songs'] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith('https://api.vibreo.es/charting/songs?limit=5', {
      cache: 'no-store',
      headers: { Origin: 'https://vibreo.es' },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
