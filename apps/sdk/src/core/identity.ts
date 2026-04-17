import {
  SESSION_STORAGE_KEY,
  VISITOR_STORAGE_KEY,
} from './constants';
import { isBrowser } from './env';
import type { LiteTrackIdentity, StorageLike } from './types';

interface IdentityStore {
  get(): LiteTrackIdentity;
  set(identity: LiteTrackIdentity): LiteTrackIdentity;
}

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const memoryLocalStorage = new MemoryStorage();
const memorySessionStorage = new MemoryStorage();

function getSafeStorage(storage: StorageLike | undefined): StorageLike | null {
  if (!storage) {
    return null;
  }

  try {
    const probeKey = '__litetrack_probe__';
    storage.setItem(probeKey, '1');
    return storage;
  } catch {
    return null;
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function normalizeIdentityValue(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function getOrCreateIdentity(
  storage: StorageLike,
  key: string,
  prefix: string,
  explicitValue?: string,
): string {
  const normalizedExplicitValue = normalizeIdentityValue(explicitValue);
  if (normalizedExplicitValue) {
    storage.setItem(key, normalizedExplicitValue);
    return normalizedExplicitValue;
  }

  const stored = storage.getItem(key);
  if (stored) {
    return stored;
  }

  const nextValue = createId(prefix);
  storage.setItem(key, nextValue);
  return nextValue;
}

export function createIdentityStore(initialIdentity?: LiteTrackIdentity): IdentityStore {
  const visitorStorage =
    isBrowser() ? getSafeStorage(globalThis.localStorage) ?? memoryLocalStorage : memoryLocalStorage;
  const sessionStorageRef =
    isBrowser()
      ? getSafeStorage(globalThis.sessionStorage) ?? memorySessionStorage
      : memorySessionStorage;

  let currentIdentity: LiteTrackIdentity = {
    visitorId: getOrCreateIdentity(
      visitorStorage,
      VISITOR_STORAGE_KEY,
      'ltv',
      initialIdentity?.visitorId,
    ),
    sessionId: getOrCreateIdentity(
      sessionStorageRef,
      SESSION_STORAGE_KEY,
      'lts',
      initialIdentity?.sessionId,
    ),
  };

  return {
    get() {
      return { ...currentIdentity };
    },
    set(identity) {
      currentIdentity = {
        visitorId: getOrCreateIdentity(
          visitorStorage,
          VISITOR_STORAGE_KEY,
          'ltv',
          identity.visitorId ?? currentIdentity.visitorId,
        ),
        sessionId: getOrCreateIdentity(
          sessionStorageRef,
          SESSION_STORAGE_KEY,
          'lts',
          identity.sessionId ?? currentIdentity.sessionId,
        ),
      };

      return { ...currentIdentity };
    },
  };
}
