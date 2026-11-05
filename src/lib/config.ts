export function resolveApiBaseUrl(value: string | undefined, environment: string | undefined): string {
  const candidate = value ?? (environment === "development" || environment === "test" ? "http://localhost:3001" : undefined);
  if (!candidate) throw new Error("NEXT_PUBLIC_API_BASE_URL is required for production builds.");
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.");
  }
  return url.origin;
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL, process.env.NODE_ENV);
}
