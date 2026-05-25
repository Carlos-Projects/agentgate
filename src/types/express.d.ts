declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';
  export interface Request {
    ip?: string;
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
    body?: unknown;
  }
  export interface Response {
    status(code: number): Response;
    json(body: unknown): void;
    send(body: unknown): void;
    setHeader(name: string, value: string): void;
  }
  export type NextFunction = (err?: unknown) => void;
  export function Router(): unknown;
}
