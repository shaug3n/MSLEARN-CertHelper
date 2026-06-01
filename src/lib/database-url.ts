export function isPostgresDatabaseUrl(url: string | undefined) {
  return Boolean(url?.startsWith("postgresql://") || url?.startsWith("postgres://"));
}
