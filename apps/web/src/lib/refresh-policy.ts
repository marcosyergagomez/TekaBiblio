function requestPath(url: string): string {
  const withoutQuery = url.split('?')[0] ?? url;

  try {
    return new URL(withoutQuery, 'http://localhost').pathname;
  } catch {
    return withoutQuery;
  }
}

const AUTH_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

export function shouldAttemptRefresh(
  url: string | undefined,
  status: number | undefined,
  alreadyRetried: boolean | undefined,
): boolean {
  if (status !== 401 || alreadyRetried) {
    return false;
  }

  return !AUTH_PATHS.has(requestPath(url ?? ''));
}
