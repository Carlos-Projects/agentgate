/**
 * JSONL Logger
 * Writes log entries to a JSON Lines file
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogEntry } from '../core/types';

export interface JsonlLoggerOptions {
  filePath?: string;
  maxFileSize?: number;
  rotate?: boolean;
}

const DEFAULT_OPTIONS: Required<JsonlLoggerOptions> = {
  filePath: './agentgate-logs.jsonl',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  rotate: true,
};

export class JsonlLogger implements Logger {
  private options: Required<JsonlLoggerOptions>;

  constructor(options: JsonlLoggerOptions = {}) {
    if (options.filePath && options.filePath.includes('..')) {
      console.warn('Path traversal detected in log file path, using default')
      delete options.filePath
    }
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async log(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    const filePath = this.getFilePath();

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (this.options.rotate && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.options.maxFileSize) {
          this.rotateFile();
        }
      }

      fs.appendFileSync(filePath, line, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async getLogs(limit: number = 1000): Promise<LogEntry[]> {
    const filePath = this.getFilePath();

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter((line) => line);
      const entries = lines
        .slice(-limit)
        .map((line) => JSON.parse(line) as LogEntry);
      return entries;
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  private getFilePath(): string {
    return path.resolve(this.options.filePath);
  }

  private rotateFile(): void {
    const filePath = this.getFilePath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${filePath}.${timestamp}`;

    try {
      fs.renameSync(filePath, rotatedPath);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

export function createJsonlLogger(options?: JsonlLoggerOptions): JsonlLogger {
  return new JsonlLogger(options);
}
