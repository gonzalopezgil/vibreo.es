/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api-proxy/[...path]/route';

describe('api proxy route', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('forwards allowed paths to the public API with client IP and CDN caching', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await GET(
      new NextRequest('https://vibreo.es/api-proxy/charting/songs?limit=5', {
        headers: {
          Origin: 'https://vibreo.es',
          'X-Forwarded-For': '203.0.113.10, 198.51.100.20',
        },
      }),
      { params: Promise.resolve({ path: ['charting', 'songs'] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith('https://api.vibreo.es/charting/songs?limit=5', {
      cache: 'force-cache',
      headers: {
        Origin: 'https://vibreo.es',
        'X-Vibreo-Client-IP': '203.0.113.10',
      },
      next: { revalidate: 1800 },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://vibreo.es');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('public, max-age=1800, stale-while-revalidate=300');
    expect(response.headers.get('Vary')).toBe('Origin');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects browser requests from unknown origins before contacting the API', async () => {
    const response = await GET(
      new NextRequest('https://vibreo.es/api-proxy/latest', {
        headers: { Origin: 'https://evil.example' },
      }),
      { params: Promise.resolve({ path: ['latest'] }) },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://vibreo.es');
  });

  it('rejects unlisted API paths before contacting the API', async () => {
    const response = await GET(
      new NextRequest('https://vibreo.es/api-proxy/internal/users', {
        headers: { Origin: 'https://vibreo.es' },
      }),
      { params: Promise.resolve({ path: ['internal', 'users'] }) },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
  });

  it('allows preflight requests from the production origin', async () => {
    const response = await OPTIONS(
      new NextRequest('https://vibreo.es/api-proxy/latest', {
        headers: { Origin: 'https://vibreo.es' },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://vibreo.es');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });

  it('rejects preflight requests from unknown origins', async () => {
    const response = await OPTIONS(
      new NextRequest('https://vibreo.es/api-proxy/latest', {
        headers: { Origin: 'https://evil.example' },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://vibreo.es');
  });
});
