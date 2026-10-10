const memory = new Map<string, string>();
export function createId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Date.now().toString(36) + Math.random().toString(36).slice(2)
  );
}
function readIdentity(key: string): string {
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{8,100}$/.test(existing)) {
      memory.set(key, existing);
      return existing;
    }
    const id = memory.get(key) ?? createId();
    window.localStorage.setItem(key, id);
    memory.set(key, id);
    return id;
  } catch {
    const id = memory.get(key) ?? createId();
    memory.set(key, id);
    return id;
  }
}
export async function visitorId(siteToken: string): Promise<string> {
  const key = 'lt:visitor:' + siteToken;
  // 首次多标签页共用同一把锁，避免同时写入不同匿名身份。
  if (typeof navigator !== 'undefined' && navigator.locks) {
    try {
      return await navigator.locks.request(key, () => readIdentity(key));
    } catch {
      /* 隐私模式允许降级。 */
    }
  }
  return readIdentity(key);
}
