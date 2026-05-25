declare module 'next/server' {
  export class NextRequest {
    constructor(input: string | URL, init?: RequestInit);
    readonly ip: string;
    readonly nextUrl: URL;
    readonly method: string;
    readonly headers: Headers;
    readonly cookies: {
      get(name: string): { value: string } | undefined;
      getAll(): Array<{ name: string; value: string }>;
    };
    json(): Promise<unknown>;
  }

  export class NextResponse {
    static next(): NextResponse;
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string, status?: number): NextResponse;
    static rewrite(url: string | URL): NextResponse;
    headers: Headers;
    status: number;
  }
}
