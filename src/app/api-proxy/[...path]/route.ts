import { NextRequest, NextResponse } from 'next/server';

const API_ORIGIN = 'https://api.vibreo.es';
const PUBLIC_ORIGIN = 'https://vibreo.es';

const ALLOWED_API_PATHS = [
  /^\/latest$/,
  /^\/search$/,
  /^\/charting\/(?:songs|artists|albums|market-streams|youtube-links|artist-channels)$/,
  /^\/charts\/(?:songs\/daily|artists\/daily|albums\/weekly)\/[a-z0-9-]+\/(?:latest|\d{4}-\d{2}-\d{2})$/i,
  /^\/(?:songs|artists|albums)\/[a-z0-9]+$/i,
];

function allowedOrigins() {
  const origins = new Set([PUBLIC_ORIGIN, 'https://www.vibreo.es']);
  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    origins.add(vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return !origin || allowedOrigins().has(origin);
}

function corsOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return origin && allowedOrigins().has(origin) ? origin : PUBLIC_ORIGIN;
}

function corsHeaders(request: NextRequest) {
  return {
    'Access-Control-Allow-Origin': corsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function isAllowedApiPath(path: string) {
  return ALLOWED_API_PATHS.some((pattern) => pattern.test(path));
}

export async function OPTIONS(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders(request) });
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const apiPath = '/' + path.join('/');
  const queryString = request.nextUrl.search;
  const url = `${API_ORIGIN}${apiPath}${queryString}`;

  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders(request) });
  }

  if (!isAllowedApiPath(apiPath)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders(request) });
  }

  const res = await fetch(url, {
    headers: {
      Origin: PUBLIC_ORIGIN,
    },
    cache: 'no-store',
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}
