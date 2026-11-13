// =============================================================================
// src/services/logger.ts
// Phase P9-M3 — Structured JSON Logging with Redaction & Request Context
// =============================================================================
//
// DESIGN PRINCIPLES:
//  - Structured JSON output: { timestamp, level, requestId, module, event, ...extra }
//  - Levels: INFO, WARN, ERROR
//  - Secret redaction: API key, Authorization header, token, credential, secret
//  - No prompt content or personal data logged without explicit opt-in
//  - Zero impact on API response objects — log-only side effect
//  - Works in both Node.js (server) and browser (dev console) contexts
//
// INVARIANTS PRESERVED:
//  - Does NOT modify any P0–P9.1 engine outputs
//  - Does NOT touch proposal/transaction business logic
//  - Is purely additive — imported and used without changing call sites' behavior
// =============================================================================

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;      // ISO 8601
  level: LogLevel;
  requestId: string;      // Per-request correlation ID
  module: string;         // Caller module (e.g. "server", "proposalManager")
  event: string;          // Short machine-readable event name
  message?: string;       // Human-readable description (optional)
  durationMs?: number;    // Elapsed time for timed operations
  errorCode?: string;     // Gemini error category or HTTP status code
  statusCode?: number;    // HTTP status for request-related logs
  [key: string]: unknown; // Additional structured fields (redacted before logging)
}

// ---------------------------------------------------------------------------
// SECRET REDACTION
// Keys matching these patterns will have their values replaced.
// ---------------------------------------------------------------------------
const REDACTED_KEY_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /auth/i,
  /credential/i,
  /password/i,
  /passwd/i,
  /apikey/i,
];

export function redactValue(val: unknown): string {
  return '[REDACTED]';
}

export function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEEP]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item) => redactObject(item, depth + 1));
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(record)) {
    const needsRedaction = REDACTED_KEY_PATTERNS.some((p) => p.test(k));
    if (needsRedaction) {
      result[k] = redactValue(v);
    } else if (typeof v === 'object' && v !== null) {
      result[k] = redactObject(v, depth + 1);
    } else {
      result[k] = v;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// LOG SINK
// In Node.js: writes to stdout as JSON lines.
// In browser: writes to console with structured object.
// ---------------------------------------------------------------------------
function writeLine(entry: LogEntry): void {
  const sanitized = redactObject(entry) as LogEntry;

  if (typeof process !== 'undefined' && process.stdout) {
    // Server-side: structured JSON line
    try {
      process.stdout.write(JSON.stringify(sanitized) + '\n');
    } catch {
      // If stdout is closed (test teardown), silently ignore
    }
  } else if (typeof console !== 'undefined') {
    // Browser-side: coloured console output
    const prefix = `[${sanitized.level}][${sanitized.module}][${sanitized.event}]`;
    if (sanitized.level === 'ERROR') {
      console.error(prefix, sanitized);
    } else if (sanitized.level === 'WARN') {
      console.warn(prefix, sanitized);
    } else {
      console.log(prefix, sanitized);
    }
  }
}

// ---------------------------------------------------------------------------
// LOGGER CLASS
// Instantiated per module. All log entries carry the module name.
// ---------------------------------------------------------------------------
export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private build(
    level: LogLevel,
    requestId: string,
    event: string,
    extra?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      module: this.module,
      event,
      ...extra,
    };
  }

  info(requestId: string, event: string, extra?: Record<string, unknown>): void {
    writeLine(this.build('INFO', requestId, event, extra));
  }

  warn(requestId: string, event: string, extra?: Record<string, unknown>): void {
    writeLine(this.build('WARN', requestId, event, extra));
  }

  error(requestId: string, event: string, extra?: Record<string, unknown>): void {
    writeLine(this.build('ERROR', requestId, event, extra));
  }

  debug(requestId: string, event: string, extra?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      writeLine(this.build('DEBUG', requestId, event, extra));
    }
  }
}

// ---------------------------------------------------------------------------
// MODULE-LEVEL LOGGERS (singleton per module name)
// ---------------------------------------------------------------------------
const loggerCache = new Map<string, Logger>();

export function getLogger(module: string): Logger {
  if (!loggerCache.has(module)) {
    loggerCache.set(module, new Logger(module));
  }
  return loggerCache.get(module)!;
}

// ---------------------------------------------------------------------------
// REQUEST ID GENERATION
// Generates a unique per-request correlation ID for distributed tracing.
// ---------------------------------------------------------------------------
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `req_${ts}_${rnd}`;
}

// ---------------------------------------------------------------------------
// REQUEST-SCOPED CONTEXT (Node.js / server use)
// Wraps a request lifecycle with timing and standard start/end events.
// ---------------------------------------------------------------------------
export interface RequestContext {
  requestId: string;
  startMs: number;
  logger: Logger;

  logStart(event: string, extra?: Record<string, unknown>): void;
  logEnd(event: string, statusCode: number, extra?: Record<string, unknown>): void;
  logError(event: string, err: unknown, extra?: Record<string, unknown>): void;
  logWarn(event: string, extra?: Record<string, unknown>): void;
  elapsed(): number;
}

export function createRequestContext(module: string, requestId?: string): RequestContext {
  const rid = requestId || generateRequestId();
  const startMs = Date.now();
  const logger = getLogger(module);

  return {
    requestId: rid,
    startMs,
    logger,

    logStart(event: string, extra?: Record<string, unknown>): void {
      logger.info(rid, event, { ...extra });
    },

    logEnd(event: string, statusCode: number, extra?: Record<string, unknown>): void {
      logger.info(rid, event, { statusCode, durationMs: Date.now() - startMs, ...extra });
    },

    logError(event: string, err: unknown, extra?: Record<string, unknown>): void {
      const errMessage = err instanceof Error ? err.message : String(err);
      logger.error(rid, event, { error: errMessage, durationMs: Date.now() - startMs, ...extra });
    },

    logWarn(event: string, extra?: Record<string, unknown>): void {
      logger.warn(rid, event, { durationMs: Date.now() - startMs, ...extra });
    },

    elapsed(): number {
      return Date.now() - startMs;
    },
  };
}

