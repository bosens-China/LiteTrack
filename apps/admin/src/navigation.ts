export function projectId(
  value: string | null | undefined,
): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

export function analyticsUrl(id: number | undefined, search = '') {
  const params = new URLSearchParams(search);
  if (id === undefined) params.delete('project');
  else params.set('project', String(id));
  return '/' + (params.size ? '?' + params : '');
}

export function navigationKey(pathname: string) {
  if (pathname === '/') return '/';
  if (pathname === '/integration') return '/integration';
  if (pathname === '/sites') return '/sites';
  if (
    pathname === '/sites/settings' ||
    /^\/sites\/[1-9]\d*\/settings$/.test(pathname)
  )
    return '/sites/settings';
  return undefined;
}
