export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'refreshtoken',
  'accesstoken',
  'idtoken',
  'secret',
  'patientvisitnote',
  'symptoms',
  'diagnosis',
  'medicines',
  'findings',
  'rawextractedtext',
  'ssn',
  'creditcard',
]);

export function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  const sanitizedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitizedObj[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitizedObj[key] = sanitize(value);
    } else {
      sanitizedObj[key] = value;
    }
  }

  return sanitizedObj;
}

export class Logger {
  private context: string;

  constructor(context = 'App') {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta !== undefined ? { data: sanitize(meta) } : {}),
    };

    const serialized = JSON.stringify(entry);
    switch (level) {
      case 'error':
        console.error(serialized);
        break;
      case 'warn':
        console.warn(serialized);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.debug(serialized);
        }
        break;
      default:
        console.log(serialized);
        break;
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta);
  }
}

export const logger = new Logger('SwasthyaSetu');
