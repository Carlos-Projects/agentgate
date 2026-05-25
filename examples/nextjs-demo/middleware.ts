import { NextRequest, NextResponse } from 'next/server';
import {
  createAgentGate,
  loadPolicy,
  createJsonlLogger,
  createConsoleLogger,
  handleNextMiddleware,
  normalizeNextRequest,
} from '../../../src/index';
import * as path from 'path';

// Load policy from config file
const policyPath = path.join(process.cwd(), 'agent-policy.yaml');
const policy = loadPolicy(policyPath);

// Create logger (JSONL for production, console for dev)
const logger = process.env.NODE_ENV === 'production'
  ? createJsonlLogger({ filePath: './agentgate-logs.jsonl' })
  : createConsoleLogger({ colors: true, verbose: true });

// Create AgentGate instance
const agentGate = createAgentGate({
  policy,
  logger,
});

export async function middleware(request: NextRequest) {
  // Skip AgentGate for static assets and AgentGate routes
  const pathname = request.nextUrl.pathname;
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.startsWith('/agentgate-dashboard') ||
    pathname.startsWith('/agent-access') ||
    pathname.startsWith('/agent-sandbox')
  ) {
    return NextResponse.next();
  }

  // Normalize request
  const adapterRequest = normalizeNextRequest(request);

  // Process through AgentGate
  const result = await agentGate.processRequest(adapterRequest);

  // Handle response
  const middlewareResult = handleNextMiddleware(request, result);

  if (!middlewareResult.shouldContinue) {
    return middlewareResult.response;
  }

  // Continue to next middleware/route
  const response = NextResponse.next({
    headers: middlewareResult.response.headers,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
