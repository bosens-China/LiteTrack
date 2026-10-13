function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function npmRelease(metadata: unknown, current?: string) {
  if (
    !record(metadata) ||
    !record(metadata['dist-tags']) ||
    typeof metadata['dist-tags'].latest !== 'string' ||
    !record(metadata.versions)
  )
    throw new Error('npm 发布信息格式无效');
  return {
    latest: metadata['dist-tags'].latest,
    currentPublished: Boolean(
      current && Object.hasOwn(metadata.versions, current),
    ),
  };
}
export async function getNpmRelease(
  current: string | undefined,
  signal: AbortSignal,
) {
  const response = await fetch(
    'https://registry.npmjs.org/@boses%2Flitetrack-sdk',
    { signal, headers: { Accept: 'application/vnd.npm.install-v1+json' } },
  );
  if (!response.ok) throw new Error('无法查询 npm 发布状态，请重试');
  return npmRelease(await response.json(), current);
}
