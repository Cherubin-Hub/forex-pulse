/** Only application-local paths are accepted, including after URL normalization. */
export function safeReturnPath(
  value: string | null,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value))
    return fallback;
  try {
    const base = "https://local.invalid";
    const url = new URL(value, base);
    return url.origin === base
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function gatewayBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_GATEWAY_URL?.trim().replace(
    /^['"`]+|['"`]+$/g,
    "",
  );
  if (!raw)
    return process.env.NODE_ENV === "production"
      ? null
      : "http://localhost:3000";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (
      process.env.NODE_ENV === "production" &&
      (url.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
