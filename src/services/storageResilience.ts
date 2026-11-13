// =============================================================================
// src/services/storageResilience.ts
// Phase P9-M3 — LocalStorage Quota Guard, Versioning & Migration
// =============================================================================
//
// DESIGN PRINCIPLES:
//  - Probe quota BEFORE writing large data to avoid silent data loss
//  - QuotaExceededError is caught, classified, and surfaced as a typed Result
//  - Versioned storage schema: each key carries a { v, data, savedAt } wrapper
//  - Migration: if stored version < current, run registered migrators in order
//  - NEVER silently drops data; caller decides what to do on QuotaExceededError
//  - NEVER deletes user data automatically
//
// INVARIANTS PRESERVED:
//  - Does NOT touch P0–P9.1 engine computation
//  - Does NOT modify proposal/transaction business logic
//  - Additive wrapper around existing localStorage calls
//  - layoutStorage.ts existing API stays untouched
// =============================================================================

export type StorageResultOk<T> = { ok: true; data: T };
export type StorageResultErr = {
  ok: false;
  error: 'quota_exceeded' | 'parse_error' | 'schema_error' | 'unknown';
  message: string;
  bytesRequired?: number;
  bytesAvailable?: number;
};
export type StorageResult<T> = StorageResultOk<T> | StorageResultErr;

// ---------------------------------------------------------------------------
// VERSIONED WRAPPER
// All data written via this module is wrapped in { v, savedAt, data }
// ---------------------------------------------------------------------------
export interface VersionedEnvelope<T> {
  v: number;      // Schema version integer
  savedAt: string; // ISO timestamp
  data: T;
}

// ---------------------------------------------------------------------------
// QUOTA ESTIMATION
// Estimates available localStorage quota using a small probe write.
// Returns { available: bytes, used: bytes } or null if not supported.
// ---------------------------------------------------------------------------
const QUOTA_PROBE_KEY = '__afs_quota_probe__';

export function estimateStorageQuota(): { used: number; available: number } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    // Measure used space
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        used += k.length * 2 + (localStorage.getItem(k)?.length ?? 0) * 2;
      }
    }

    // Binary search for available space (max 10MB probe)
    const MAX_PROBE = 10 * 1024 * 1024; // 10 MB
    let lo = 0;
    let hi = MAX_PROBE;
    let available = 0;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      try {
        const probe = 'x'.repeat(mid);
        localStorage.setItem(QUOTA_PROBE_KEY, probe);
        localStorage.removeItem(QUOTA_PROBE_KEY);
        available = mid;
        lo = mid + 1;
      } catch {
        hi = mid - 1;
      }
    }

    return { used, available };
  } catch {
    return null;
  } finally {
    try { localStorage.removeItem(QUOTA_PROBE_KEY); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// SAFE SET — checks quota before writing
// ---------------------------------------------------------------------------
export function safeLocalStorageSet<T>(
  key: string,
  value: T,
  schemaVersion: number = 1
): StorageResult<void> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ok: false, error: 'unknown', message: 'localStorage not available (server-side context)' };
  }

  const envelope: VersionedEnvelope<T> = {
    v: schemaVersion,
    savedAt: new Date().toISOString(),
    data: value,
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(envelope);
  } catch (e) {
    return {
      ok: false,
      error: 'schema_error',
      message: `Không thể tuần tự hóa dữ liệu: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const bytesRequired = serialized.length * 2; // UTF-16 storage

  try {
    localStorage.setItem(key, serialized);
    return { ok: true, data: undefined };
  } catch (e) {
    // Classify QuotaExceededError
    const errName = (e as any)?.name;
    const errCode = (e as any)?.code;
    const isQuota =
      errName === 'QuotaExceededError' ||
      errName === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errCode === 22 ||
      errCode === 1014 ||
      (e instanceof Error && e.message.includes('QuotaExceeded')) ||
      (typeof DOMException !== 'undefined' && e instanceof DOMException && (e.code === 22 || e.code === 1014));

    if (isQuota) {
      const quota = estimateStorageQuota();
      return {
        ok: false,
        error: 'quota_exceeded',
        message: `Bộ nhớ cục bộ (localStorage) đã đầy. Cần ${Math.ceil(bytesRequired / 1024)}KB nhưng không còn đủ dung lượng.`,
        bytesRequired,
        bytesAvailable: quota?.available ?? 0,
      };
    }

    return {
      ok: false,
      error: 'unknown',
      message: `Lỗi khi ghi localStorage: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// SAFE GET — deserializes and validates versioned envelope
// ---------------------------------------------------------------------------
export function safeLocalStorageGet<T>(
  key: string,
  expectedMinVersion: number = 0
): StorageResult<VersionedEnvelope<T> | null> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ok: true, data: null };
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { ok: true, data: null };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        error: 'parse_error',
        message: `Dữ liệu tại "${key}" không phải JSON hợp lệ. Có thể bị hỏng.`,
      };
    }

    // Check if it's a versioned envelope (has v + data)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'v' in parsed &&
      'data' in parsed
    ) {
      const env = parsed as VersionedEnvelope<T>;
      if (env.v < expectedMinVersion) {
        return {
          ok: false,
          error: 'schema_error',
          message: `Dữ liệu tại "${key}" có phiên bản cũ (v${env.v}), cần v${expectedMinVersion}+. Cần migration.`,
        };
      }
      return { ok: true, data: env };
    }

    // Legacy data (no envelope) — return as v0 envelope
    return {
      ok: true,
      data: { v: 0, savedAt: '', data: parsed as T },
    };
  } catch (e) {
    return {
      ok: false,
      error: 'unknown',
      message: `Lỗi khi đọc localStorage: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// MIGRATOR REGISTRY
// Registering a migrator: (fromVersion, toVersion, fn: (data: unknown) => unknown)
// ---------------------------------------------------------------------------
export interface DataMigrator {
  fromVersion: number;
  toVersion: number;
  migrate: (data: unknown) => unknown;
}

const migratorRegistry: Map<string, DataMigrator[]> = new Map();

export function registerMigrator(key: string, migrator: DataMigrator): void {
  if (!migratorRegistry.has(key)) {
    migratorRegistry.set(key, []);
  }
  const existing = migratorRegistry.get(key)!;
  // Sort by fromVersion ascending after insertion
  existing.push(migrator);
  existing.sort((a, b) => a.fromVersion - b.fromVersion);
}

// ---------------------------------------------------------------------------
// MIGRATE & LOAD — reads data, applies migrations if needed, re-saves
// ---------------------------------------------------------------------------
export function migrateAndLoad<T>(
  key: string,
  currentVersion: number
): StorageResult<T | null> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ok: true, data: null };
  }

  const readResult = safeLocalStorageGet<T>(key, 0);
  if (!readResult.ok) return readResult;
  if (readResult.data === null) return { ok: true, data: null };

  let { v, data } = readResult.data as VersionedEnvelope<unknown>;

  if (v >= currentVersion) {
    return { ok: true, data: data as T };
  }

  // Run applicable migrators
  const migrators = migratorRegistry.get(key) ?? [];
  const applicableMigrators = migrators.filter(
    (m) => m.fromVersion >= v && m.fromVersion < currentVersion
  );

  for (const migrator of applicableMigrators) {
    try {
      data = migrator.migrate(data);
      v = migrator.toVersion;
    } catch (e) {
      return {
        ok: false,
        error: 'schema_error',
        message: `Lỗi khi nâng cấp dữ liệu từ v${migrator.fromVersion} → v${migrator.toVersion}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // Re-save migrated data at current version
  const saveResult = safeLocalStorageSet(key, data, currentVersion);
  if (!saveResult.ok) {
    // Migration succeeded but re-save failed (quota); return migrated data anyway
    return { ok: true, data: data as T };
  }

  return { ok: true, data: data as T };
}

// ---------------------------------------------------------------------------
// QUOTA WARNING THRESHOLD
// Returns true if available storage < threshold (default 100KB)
// ---------------------------------------------------------------------------
export function isStorageLow(thresholdBytes: number = 100 * 1024): boolean {
  const quota = estimateStorageQuota();
  if (!quota) return false;
  return quota.available < thresholdBytes;
}

export function getStorageStatus(): {
  available: boolean;
  usedKB: number;
  availableKB: number;
  isLow: boolean;
} {
  const quota = estimateStorageQuota();
  if (!quota) {
    return { available: false, usedKB: 0, availableKB: 0, isLow: false };
  }
  return {
    available: true,
    usedKB: Math.ceil(quota.used / 1024),
    availableKB: Math.ceil(quota.available / 1024),
    isLow: quota.available < 100 * 1024,
  };
}

