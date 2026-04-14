import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class JsonLoggerService implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'App',
      message: this.formatMessage(message),
      trace,
    };

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  private formatMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    return JSON.stringify(message);
  }
}
