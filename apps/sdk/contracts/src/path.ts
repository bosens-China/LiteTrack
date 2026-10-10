export function normalizePath(value: string): string {
  const path = value.trim().split(/[?#]/, 1)[0] || '/';
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}
