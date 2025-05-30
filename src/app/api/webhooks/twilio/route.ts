import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Log request details
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    body: await req.json(),
  });

  return NextResponse.json({ message: 'Request logged successfully' }, { status: 200 });
}

export async function GET(req: NextRequest) {
  // Log request details
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  return NextResponse.json({ message: 'Request logged successfully' }, { status: 200 });
}