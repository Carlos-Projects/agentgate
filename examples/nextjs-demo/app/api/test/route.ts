import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint is protected by the middleware
  // If an agent reaches here, they passed the checks
  
  return NextResponse.json({
    message: 'API access granted',
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    note: 'This endpoint is protected by AgentGate middleware',
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'POST request received',
    timestamp: new Date().toISOString(),
  });
}
