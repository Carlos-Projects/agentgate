/**
 * Console Logger
 * Writes log entries to console (for development)
 */

import { Logger, LogEntry } from '../core/types';

export interface ConsoleLoggerOptions {
  colors?: boolean;
  verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<ConsoleLoggerOptions> = {
  colors: true,
  verbose: false,
};

export class ConsoleLogger implements Logger {
  private options: Required<ConsoleLoggerOptions>;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async log(entry: LogEntry): Promise<void> {
    const actionColor = this.getActionColor(entry.action);
    const scoreColor = this.getScoreColor(entry.score);

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const actionStr = entry.action.toUpperCase();
    const scoreStr = entry.score.toString().padStart(3);

    if (this.options.colors) {
      console.log(
        `\x1b[90m[${timestamp}]\x1b[0m ` +
          `\x1b[${actionColor}m${actionStr}\x1b[0m ` +
          `\x1b[${scoreColor}m${scoreStr}\x1b[0m ` +
          `${entry.path} ` +
          `(${entry.signals.length} signals)`
      );
    } else {
      console.log(
        `[${timestamp}] ${actionStr} ${scoreStr} ${entry.path} (${entry.signals.length} signals)`
      );
    }

    if (this.options.verbose) {
      console.log('  Signals:', entry.signals.join(', '));
      console.log('  UA:', entry.userAgent.slice(0, 80));
    }
  }

  private getActionColor(action: string): number {
    const colors: Record<string, number> = {
      allow: 32, // green
      limited: 36, // cyan
      challenge: 33, // yellow
      sandbox: 35, // magenta
      block: 31, // red
      log_only: 90, // gray
    };
    return colors[action] || 37;
  }

  private getScoreColor(score: number): number {
    if (score < 30) return 32; // green
    if (score < 55) return 33; // yellow
    if (score < 70) return 35; // magenta
    return 31; // red
  }
}

export function createConsoleLogger(
  options?: ConsoleLoggerOptions
): ConsoleLogger {
  return new ConsoleLogger(options);
}
