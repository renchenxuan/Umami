export function safeProviderMessage(error: unknown, secrets: string[] = []): string {
  const raw = error instanceof Error ? error.message : String(error);
  let safe = raw;
  for (const secret of secrets.filter((value) => value.length >= 4)) safe = safe.split(secret).join("[redacted]");
  return safe
    .replace(/(?:sk-|AIza|Bearer\s+)[A-Za-z0-9._-]{8,}/gi, "[redacted]")
    .replace(/([?&](?:api_?key|key|token|access_token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(authorization\s*[:=]\s*)([^,;\s]+)/gi, "$1[redacted]")
    .slice(0, 500);
}
