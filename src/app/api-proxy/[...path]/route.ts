import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const apiPath = '/' + path.join('/');
  const queryString = request.nextUrl.search;
  const url = `https://api.vibreo.es${apiPath}${queryString}`;

  const res = await fetch(url, {
    headers: {
      Origin: 'https://vibreo.es',
    },
    cache: 'no-store',
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
